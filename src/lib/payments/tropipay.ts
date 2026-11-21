import "server-only";

import crypto from "node:crypto";

import { getStorePrivateConfig } from "@/lib/notifications/order-notifications";
import { encryptOrderTrackingToken } from "@/lib/orders/tracking-token";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Cents, CurrencyCode, Uuid } from "@/types/catalog";

export type TropiPayEnvironment = "sandbox" | "production";
export type TropiPayEnv = TropiPayEnvironment;

export interface TropiPayCredentials {
  clientId: string;
  clientSecret: string;
  env: TropiPayEnvironment;
  source: "database" | "env";
}

interface StoredCredentialsRow {
  store_id: Uuid;
  tropipay_client_id: string | null;
  tropipay_client_secret: string | null;
  tropipay_env: string | null;
}

function normalizeEnv(raw: string | null | undefined): TropiPayEnvironment {
  return raw?.trim().toLowerCase() === "production" ? "production" : "sandbox";
}

function getBaseUrls(env: TropiPayEnvironment): ReadonlyArray<string> {
  if (env === "production") {
    return ["https://www.tropipay.com/api/v3", "https://www.tropipay.com/api/v2"];
  }
  return [
    "https://tropipay-dev.herokuapp.com/api/v3",
    "https://tropipay-dev.herokuapp.com/api/v2",
  ];
}

/**
 * Resolves the TropiPay credentials specific to `storeId`:
 * 1. First checks `public.store_payment_credentials` or private storage bucket (`store-private-config`).
 * 2. Falls back to this deployment's `TROPIPAY_CLIENT_ID` and `TROPIPAY_CLIENT_SECRET` env vars.
 */
export async function getStoreTropiPayCredentials(
  storeId: Uuid,
): Promise<TropiPayCredentials | null> {
  try {
    const supabase = createServiceRoleClient();

    // 1a. Dedicated private table `public.store_payment_credentials`
    const { data: row, error } = await supabase
      .from("store_payment_credentials")
      .select("store_id, tropipay_client_id, tropipay_client_secret, tropipay_env")
      .eq("store_id", storeId)
      .maybeSingle<StoredCredentialsRow>();

    if (!error && row?.tropipay_client_id?.trim() && row?.tropipay_client_secret?.trim()) {
      return {
        clientId: row.tropipay_client_id.trim(),
        clientSecret: row.tropipay_client_secret.trim(),
        env: normalizeEnv(row.tropipay_env),
        source: "database",
      };
    }

    // 1b. Private Supabase storage config (`store-private-config/{storeId}.json`)
    const privateCfg = await getStorePrivateConfig(storeId);
    if (privateCfg.tropipayClientId?.trim() && privateCfg.tropipayClientSecret?.trim()) {
      return {
        clientId: privateCfg.tropipayClientId.trim(),
        clientSecret: privateCfg.tropipayClientSecret.trim(),
        env: normalizeEnv(privateCfg.tropipayEnv),
        source: "database",
      };
    }
  } catch {
    // Table may not exist yet or service role key missing; fall through to env vars.
  }

  const envClientId = process.env.TROPIPAY_CLIENT_ID?.trim();
  const envClientSecret = process.env.TROPIPAY_CLIENT_SECRET?.trim();
  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      env: normalizeEnv(process.env.TROPIPAY_ENV),
      source: "env",
    };
  }

  return null;
}

/**
 * Obtains an OAuth2 Bearer token from TropiPay using `client_credentials`.
 */
export async function getTropiPayAccessToken(
  creds: TropiPayCredentials,
): Promise<{ accessToken: string; baseUrl: string; scope?: string }> {
  const baseUrls = getBaseUrls(creds.env);
  let lastError = "No se pudo autenticar con TropiPay.";

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/access/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
        }),
        cache: "no-store",
      });

      const body = (await response.json().catch(() => null)) as
        | { access_token?: string; scope?: string; error?: string; message?: string }
        | null;

      if (response.ok && body?.access_token) {
        return { accessToken: body.access_token, baseUrl, scope: body.scope };
      }

      lastError =
        body?.message ??
        body?.error ??
        `Error HTTP ${response.status} al autenticar con TropiPay (${creds.env}).`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }

  throw new Error(lastError);
}

export interface CreateTropiPayLinkInput {
  storeId: Uuid;
  trackingToken?: string;
  reference: string;
  orderCode: string;
  storeName: string;
  description: string;
  amountCents: Cents;
  currency: CurrencyCode;
  serviceDate: string;
  originUrl: string;
  buyer?: {
    name?: string;
    phone?: string;
    email?: string | null;
  };
}

export interface TropiPayPaymentCardResult {
  id: string;
  shortUrl: string;
  reference: string;
}

interface TropiPayAccountItem {
  id: number;
  currency?: string;
  state?: number;
  isDefault?: boolean;
  group?: {
    name?: string;
    permissions?: Array<{ name?: string }>;
  };
}

/**
 * Finds the best active TropiPay wallet `accountId` that has Pay-In permissions
 * (`ALLOW_PAYMENT_IN` or `ALLOW_EXTERNAL_CHARGE`, i.e. not in `BLOCK_PAYIN`).
 * Essential when a merchant has an older default EUR account in `BLOCK_PAYIN`
 * alongside an active `USDC` / `USD` account.
 */
export async function resolvePayInAccount(
  accessToken: string,
  baseUrl: string,
): Promise<{ accountId: number; currency: string } | null> {
  try {
    const res = await fetch(`${baseUrl}/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const accounts = (await res.json().catch(() => null)) as TropiPayAccountItem[] | null;
    if (!Array.isArray(accounts) || accounts.length === 0) return null;

    const activeAccounts = accounts.filter((a) => typeof a.id === "number" && (a.state === 1 || a.state === undefined));
    const payInAccounts = activeAccounts.filter((a) => {
      if (a.group?.name === "BLOCK_PAYIN") return false;
      const perms = a.group?.permissions;
      if (Array.isArray(perms) && perms.length > 0) {
        return perms.some(
          (p) =>
            p.name === "ALLOW_PAYMENT_IN" ||
            p.name === "ALLOW_EXTERNAL_CHARGE" ||
            p.name === "ALLOW_CREATE_PAYMENTCARD",
        );
      }
      return true;
    });

    const preferred =
      payInAccounts.find((a) => a.currency === "USDC" || a.currency === "USD") ??
      payInAccounts.find((a) => a.isDefault) ??
      payInAccounts[0] ??
      activeAccounts[0];

    return preferred ? { accountId: preferred.id, currency: preferred.currency ?? "USDC" } : null;
  } catch {
    return null;
  }
}

/**
 * Creates a single-use payment link (`paymentcard`) in TropiPay.
 */
export async function createTropiPayPaymentCard(
  creds: TropiPayCredentials,
  input: CreateTropiPayLinkInput,
): Promise<TropiPayPaymentCardResult> {
  const { accessToken, baseUrl } = await getTropiPayAccessToken(creds);
  const targetAccount = await resolvePayInAccount(accessToken, baseUrl);

  const cleanCode = input.orderCode.replace(/^#/, "");
  const trackingToken =
    input.trackingToken ?? encryptOrderTrackingToken(cleanCode, input.storeId);
  const encodedToken = encodeURIComponent(trackingToken);

  // Prioritize NEXT_PUBLIC_SITE_URL to prevent Host Header Injection on webhook/return URLs.
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+)(:\d+)?(\/|$)/i.test(
    input.originUrl,
  );
  const publicBaseUrl = (
    configuredSiteUrl ||
    (!isLocalOrigin && /^https:\/\/[a-z0-9.-]+$/i.test(input.originUrl)
      ? input.originUrl
      : "https://medovik-merida.vercel.app")
  ).replace(/\/$/, "");

  const urlSuccess = `${publicBaseUrl}/pedido/${encodedToken}?pago=exito`;
  const urlFailed = `${publicBaseUrl}/pedido/${encodedToken}?pago=fallido`;
  const urlNotification = `${publicBaseUrl}/api/webhooks/tropipay`;

  const payload: Record<string, unknown> = {
    reference: input.reference,
    concept: `Pedido #${cleanCode} · ${input.storeName}`.slice(0, 100),
    description: (input.description || `Pedido #${cleanCode}`).slice(0, 220),
    amount: input.amountCents,
    currency: input.currency || "USD",
    singleUse: true,
    favorite: false,
    reasonId: 4,
    expirationDays: 2,
    serviceDate: input.serviceDate,
    lang: "es",
    urlSuccess,
    urlFailed,
    urlNotification,
  };

  if (targetAccount) {
    payload.accountId = targetAccount.accountId;
  }

  const response = await fetch(`${baseUrl}/paymentcards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | {
        id?: string;
        shortUrl?: string;
        paymentUrl?: string;
        reference?: string;
        message?: string;
        error?: { message?: string; i18n?: string } | string;
      }
    | null;

  const paymentUrl = data?.shortUrl ?? data?.paymentUrl;
  if (!response.ok || !paymentUrl) {
    const errObj = typeof data?.error === "object" && data?.error ? data.error : null;
    const errMsg =
      errObj?.i18n ??
      errObj?.message ??
      data?.message ??
      (typeof data?.error === "string" ? data.error : null) ??
      `TropiPay devolvió HTTP ${response.status} al crear el enlace de pago.`;
    throw new Error(errMsg);
  }

  return {
    id: data?.id ?? input.reference,
    shortUrl: paymentUrl,
    reference: data?.reference ?? input.reference,
  };
}

function sha1Hex(input: string): string {
  return crypto.createHash("sha1").update(input, "utf8").digest("hex");
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function timingSafeHexEquals(a: string, b: string): boolean {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (cleanA.length !== cleanB.length || cleanA.length === 0) return false;
  return crypto.timingSafeEqual(Buffer.from(cleanA, "utf8"), Buffer.from(cleanB, "utf8"));
}

/**
 * Verifies the cryptographic signature sent by TropiPay in webhook notifications.
 * Supports both `signaturev3` and `signaturev2` / `signature`.
 */
export function verifyTropiPayWebhookSignature(
  creds: TropiPayCredentials,
  payload: {
    bankOrderCode?: string | number;
    originalCurrencyAmount?: string | number;
    signaturev3?: string;
    signaturev2?: string;
    signature?: string;
  },
): boolean {
  const bankOrderCode = String(payload.bankOrderCode ?? "");
  const amount = String(payload.originalCurrencyAmount ?? "");
  if (!bankOrderCode || !amount) return false;

  const secretSha1Lower = sha1Hex(creds.clientSecret).toLowerCase();
  const secretSha1Upper = secretSha1Lower.toUpperCase();
  const secretSha256Lower = sha256Hex(creds.clientSecret).toLowerCase();
  const secretSha256Upper = secretSha256Lower.toUpperCase();

  const candidates = [
    // v3 standard: sha256(bankOrderCode + clientId + sha1(clientSecret) + originalCurrencyAmount)
    sha256Hex(`${bankOrderCode}${creds.clientId}${secretSha1Lower}${amount}`),
    sha256Hex(`${bankOrderCode}${creds.clientId}${secretSha1Upper}${amount}`),
    // v3 with sha256(clientSecret)
    sha256Hex(`${bankOrderCode}${creds.clientId}${secretSha256Lower}${amount}`),
    sha256Hex(`${bankOrderCode}${creds.clientId}${secretSha256Upper}${amount}`),
    // v2 legacy: sha256(bankOrderCode + clientId + clientSecret + originalCurrencyAmount)
    sha256Hex(`${bankOrderCode}${creds.clientId}${creds.clientSecret}${amount}`),
    // v1/v2 alternative: sha256(originalCurrencyAmount + bankOrderCode + sha256(clientSecret))
    sha256Hex(`${amount}${bankOrderCode}${secretSha256Lower}`),
  ];

  const receivedList = [payload.signaturev3, payload.signaturev2, payload.signature].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );

  if (receivedList.length === 0) return false;

  return receivedList.some((received) =>
    candidates.some((expected) => timingSafeHexEquals(received, expected)),
  );
}
