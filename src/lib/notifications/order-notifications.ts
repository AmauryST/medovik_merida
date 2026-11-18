import "server-only";

import { encryptOrderTrackingToken } from "@/lib/orders/tracking-token";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { ORDER_STATUS_LABELS } from "@/types/admin";
import type {
  CrmProviderType,
  NotifiableOrderStatus,
  OrderCrmSyncLog,
  OrderEmailLog,
  OrderTrackingEvent,
  OrderTrackingMeta,
  StoreEmailTemplates,
} from "@/types/admin";
import { formatCents, type Cents, type OrderStatus, type Uuid } from "@/types/catalog";

import {
  interpolateEmailTemplate,
  mergeEmailTemplates,
  NOTIFIABLE_STATUSES,
  parseOrderTrackingMeta,
} from "./email-templates-shared";

const PRIVATE_CONFIG_BUCKET = "store-private-config";

export interface StorePrivateIntegrationsConfig {
  resendApiKey?: string;
  resendFromEmail?: string;
  crmProvider?: CrmProviderType;
  crmApiKey?: string;
  crmWebhookUrl?: string;
  tropipayClientId?: string;
  tropipayClientSecret?: string;
  tropipayEnv?: "sandbox" | "production";
  updatedAt?: string;
}

export interface StoreIntegrationsSummary {
  resendConfigured: boolean;
  resendSource: "database" | "env" | "none";
  resendFromEmail: string;
  crmProvider: CrmProviderType;
  crmConfigured: boolean;
  crmWebhookUrlMasked: string | null;
}

async function ensurePrivateBucket() {
  const supabase = createServiceRoleClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.id === PRIVATE_CONFIG_BUCKET)) {
    await supabase.storage.createBucket(PRIVATE_CONFIG_BUCKET, {
      public: false,
      fileSizeLimit: 65536,
    });
  }
}

export async function getStorePrivateConfig(
  storeId: Uuid,
): Promise<StorePrivateIntegrationsConfig> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(PRIVATE_CONFIG_BUCKET)
      .download(`${storeId}.json`);
    if (error || !data) return {};
    const text = await data.text();
    const parsed = JSON.parse(text) as StorePrivateIntegrationsConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveStorePrivateConfig(
  storeId: Uuid,
  patch: Partial<StorePrivateIntegrationsConfig>,
): Promise<StorePrivateIntegrationsConfig> {
  await ensurePrivateBucket();
  const current = await getStorePrivateConfig(storeId);
  const next: StorePrivateIntegrationsConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const supabase = createServiceRoleClient();
  const blob = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage
    .from(PRIVATE_CONFIG_BUCKET)
    .upload(`${storeId}.json`, blob, {
      upsert: true,
      contentType: "application/json",
    });
  if (error) {
    throw new Error(`No se pudo guardar la configuración privada: ${error.message}`);
  }
  return next;
}

export async function getStoreIntegrationsSummary(
  storeId: Uuid,
): Promise<StoreIntegrationsSummary> {
  const stored = await getStorePrivateConfig(storeId);
  const envResendKey = process.env.RESEND_API_KEY?.trim();
  const storedResendKey = stored.resendApiKey?.trim();
  const resendFromEmail =
    stored.resendFromEmail?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Donde Delia <onboarding@resend.dev>";

  const crmProvider: CrmProviderType =
    stored.crmProvider ||
    (process.env.CRM_PROVIDER?.trim().toUpperCase() as CrmProviderType | undefined) ||
    "NONE";
  const crmApiKey = stored.crmApiKey?.trim() || process.env.CRM_API_KEY?.trim() || "";
  const crmWebhookUrl = stored.crmWebhookUrl?.trim() || process.env.CRM_WEBHOOK_URL?.trim() || "";

  const crmConfigured =
    (crmProvider === "BREVO" && Boolean(crmApiKey)) ||
    (crmProvider === "HUBSPOT" && Boolean(crmApiKey)) ||
    (crmProvider === "WEBHOOK" && Boolean(crmWebhookUrl));

  return {
    resendConfigured: Boolean(storedResendKey || envResendKey),
    resendSource: storedResendKey ? "database" : envResendKey ? "env" : "none",
    resendFromEmail,
    crmProvider,
    crmConfigured,
    crmWebhookUrlMasked: crmWebhookUrl ? crmWebhookUrl.slice(0, 38) + "..." : null,
  };
}

export async function getStoreEmailTemplates(storeId: Uuid): Promise<StoreEmailTemplates> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("stores")
      .select("theme_config")
      .eq("id", storeId)
      .single<{ theme_config: Record<string, unknown> | null }>();
    return mergeEmailTemplates(data?.theme_config?.email_templates);
  } catch {
    return mergeEmailTemplates(null);
  }
}

export async function saveStoreEmailTemplates(
  storeId: Uuid,
  templates: StoreEmailTemplates,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: current } = await supabase
    .from("stores")
    .select("theme_config")
    .eq("id", storeId)
    .single<{ theme_config: Record<string, unknown> | null }>();

  const nextThemeConfig = {
    ...(current?.theme_config ?? {}),
    email_templates: templates,
  };

  const { error } = await supabase
    .from("stores")
    .update({
      theme_config: nextThemeConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (error) {
    throw new Error(`No se pudieron guardar las plantillas: ${error.message}`);
  }
}

interface OrderFullRow {
  id: Uuid;
  store_id: Uuid;
  order_code: string;
  status: OrderStatus;
  total_cents: Cents;
  currency: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  recipient_name: string;
  recipient_phone: string;
  delivery_zone_name: string | null;
  delivery_address: string;
  delivery_date: string;
  delivery_time_slot: string;
  card_message: string | null;
  payment_link_url: string | null;
  paid_at: string | null;
  webhook_payload: unknown;
  items: Array<{
    name: string;
    quantity: number;
    unit_price_cents: Cents;
    line_total_cents: Cents;
    presentation_label: string | null;
  }>;
}

interface StoreBasicRow {
  id: Uuid;
  name: string;
  whatsapp_number: string;
}

function getPublicSiteUrl(originUrl?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (originUrl) {
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+)(:\d+)?(\/|$)/i.test(
      originUrl,
    );
    if (!isLocal && /^https:\/\/[a-z0-9.-]+$/i.test(originUrl)) {
      return originUrl.replace(/\/$/, "");
    }
  }
  return "https://dulce-delia.vercel.app";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHttpUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return escapeHtml(parsed.toString());
    }
  } catch {
    // Invalid URL
  }
  return escapeHtml(fallback);
}

export function isSafeExternalWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "[::1]" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^0\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isNotifiableStatus(status: OrderStatus): status is NotifiableOrderStatus {
  return NOTIFIABLE_STATUSES.some((s) => s.status === status);
}

function buildEmailHtml(params: {
  storeName: string;
  orderCode: string;
  statusLabel: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  trackingUrl: string;
  whatsappUrl: string;
  totalUsd: string;
  itemsSummary: string;
  recipientName: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliverySlot: string;
}): string {
  const paragraphs = params.bodyText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#4A3A33;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const safeStoreName = escapeHtml(params.storeName);
  const safeOrderCode = escapeHtml(params.orderCode);
  const safeStatusLabel = escapeHtml(params.statusLabel);
  const safeHeading = escapeHtml(params.heading);
  const safeCtaLabel = escapeHtml(params.ctaLabel);
  const safeTrackingUrl = sanitizeHttpUrl(params.trackingUrl, "https://dulce-delia.vercel.app/pedido");
  const safeCtaUrl = sanitizeHttpUrl(params.ctaUrl, params.trackingUrl);
  const safeWhatsappUrl = sanitizeHttpUrl(params.whatsappUrl, params.trackingUrl);
  const safeItemsSummary = escapeHtml(params.itemsSummary);
  const safeTotalUsd = escapeHtml(params.totalUsd);
  const safeRecipientName = escapeHtml(params.recipientName);
  const safeDeliveryAddress = escapeHtml(params.deliveryAddress);
  const safeDeliveryDate = escapeHtml(params.deliveryDate);
  const safeDeliverySlot = escapeHtml(params.deliverySlot);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeHeading}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2E221D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FAF6F1;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E6DCD2;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background-color:#FDF8F5;padding:24px 28px;border-bottom:1px solid #F0E6DD;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#B56576;">${safeStoreName}</p>
              <h1 style="margin:8px 0 10px 0;font-size:22px;line-height:1.3;color:#2E221D;font-weight:800;">${safeHeading}</h1>
              <span style="display:inline-block;background-color:#F8E8EC;color:#8E3B4E;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;">
                Pedido #${safeOrderCode} · ${safeStatusLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${paragraphs}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background-color:#FAF6F1;border:1px solid #EFE5DC;border-radius:14px;padding:16px;">
                <tr>
                  <td style="font-size:13px;color:#5C4940;line-height:1.6;">
                    <strong style="color:#2E221D;">Resumen del pedido:</strong><br/>
                    • <strong>Pastel:</strong> ${safeItemsSummary}<br/>
                    • <strong>Total:</strong> ${safeTotalUsd}<br/>
                    • <strong>Recibe en La Habana:</strong> ${safeRecipientName}<br/>
                    • <strong>Dirección:</strong> ${safeDeliveryAddress}<br/>
                    • <strong>Entrega programada:</strong> ${safeDeliveryDate} (${safeDeliverySlot})
                  </td>
                </tr>
              </table>

              <div style="text-align:center;margin:26px 0 18px 0;">
                <a href="${safeCtaUrl}" style="display:inline-block;background-color:#B56576;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px;">
                  ${safeCtaLabel}
                </a>
              </div>

              <p style="margin:0;text-align:center;font-size:13px;color:#7A685F;">
                Enlace directo de seguimiento en vivo:<br/>
                <a href="${safeTrackingUrl}" style="color:#B56576;font-weight:600;text-decoration:underline;">${safeTrackingUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FAF6F1;padding:18px 28px;border-top:1px solid #EFE5DC;text-align:center;font-size:12px;color:#7A685F;">
              ¿Necesitas ayuda o ajustar algún detalle de la entrega?
              <a href="${safeWhatsappUrl}" style="color:#128C7E;font-weight:700;text-decoration: underline;margin-left:4px;">Escríbenos por WhatsApp</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Records a timeline event on the order, optionally triggers the customizable
 * status email via Resend, and syncs the contact/order to the configured external CRM.
 */
export async function recordOrderLifecycleEvent(params: {
  orderId: Uuid;
  storeId: Uuid;
  status: OrderStatus;
  title: string;
  detail?: string;
  sendEmail?: boolean;
  forceEmail?: boolean;
  syncCrm?: boolean;
  originUrl?: string;
  rawTropiPayWebhook?: unknown;
}): Promise<{
  emailSent: boolean;
  emailError?: string | null;
  crmSynced: boolean;
  crmError?: string | null;
}> {
  const supabase = createServiceRoleClient();

  const [{ data: order }, { data: store }, privateConfig, templates] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, store_id, order_code, status, total_cents, currency, buyer_name, buyer_phone, buyer_email, recipient_name, recipient_phone, delivery_zone_name, delivery_address, delivery_date, delivery_time_slot, card_message, payment_link_url, paid_at, webhook_payload, items",
      )
      .eq("id", params.orderId)
      .eq("store_id", params.storeId)
      .single<OrderFullRow>(),
    supabase
      .from("stores")
      .select("id, name, whatsapp_number")
      .eq("id", params.storeId)
      .single<StoreBasicRow>(),
    getStorePrivateConfig(params.storeId),
    getStoreEmailTemplates(params.storeId),
  ]);

  if (!order || !store) {
    return { emailSent: false, emailError: "Pedido o tienda no encontrada.", crmSynced: false };
  }

  const meta: OrderTrackingMeta = parseOrderTrackingMeta(order.webhook_payload);
  const nowIso = new Date().toISOString();

  if (params.rawTropiPayWebhook) {
    meta.tropipay_webhook = params.rawTropiPayWebhook;
  }

  const nextEvent: OrderTrackingEvent = {
    timestamp: nowIso,
    status: params.status,
    title: params.title,
    detail: params.detail,
  };
  meta.timeline = [...(meta.timeline ?? []), nextEvent];

  let emailSent = false;
  let emailError: string | null = null;

  const cleanCode = order.order_code.replace(/^#/, "");
  const trackingToken = encryptOrderTrackingToken(cleanCode, order.store_id);
  meta.tracking_token = trackingToken;
  const siteUrl = getPublicSiteUrl(params.originUrl);
  const trackingUrl = `${siteUrl}/pedido/${encodeURIComponent(trackingToken)}`;
  const paymentUrl = order.payment_link_url || trackingUrl;
  const itemsSummary =
    (order.items ?? [])
      .map(
        (i) =>
          `${i.name}${i.presentation_label ? ` (${i.presentation_label})` : ""} × ${i.quantity}`,
      )
      .join(", ") || `Pedido #${cleanCode}`;
  const totalUsd = `$${formatCents(order.total_cents)} USD`;
  const waDigits = store.whatsapp_number.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    `Hola ${store.name}, consulto por mi pedido #${cleanCode}`,
  )}`;

  // 1. Send email notification if applicable
  if ((params.sendEmail ?? true) && isNotifiableStatus(params.status)) {
    const tpl = templates[params.status];
    const buyerEmail = order.buyer_email?.trim();

    if ((tpl.enabled || params.forceEmail) && buyerEmail && buyerEmail.includes("@")) {
      const resendKey =
        privateConfig.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim() || "";
      const fromEmail =
        privateConfig.resendFromEmail?.trim() ||
        process.env.RESEND_FROM_EMAIL?.trim() ||
        `${store.name} <onboarding@resend.dev>`;

      const vars: Record<string, string> = {
        buyer_name: order.buyer_name || "Cliente",
        order_code: `#${cleanCode}`,
        store_name: store.name,
        total_usd: totalUsd,
        items_summary: itemsSummary,
        recipient_name: order.recipient_name || "Destinatario",
        delivery_address: order.delivery_address || "La Habana",
        delivery_date: order.delivery_date || "",
        delivery_slot: order.delivery_time_slot || "Cualquier horario",
        tracking_url: trackingUrl,
        payment_url: paymentUrl,
      };

      const subject = interpolateEmailTemplate(tpl.subject, vars);
      const heading = interpolateEmailTemplate(tpl.heading, vars);
      const bodyText = interpolateEmailTemplate(tpl.body, vars);
      const ctaLabel = interpolateEmailTemplate(tpl.ctaLabel, vars);
      const ctaUrl =
        params.status === "AWAITING_PAYMENT" && order.payment_link_url
          ? order.payment_link_url
          : trackingUrl;

      if (!resendKey) {
        emailError = "Falta configurar RESEND_API_KEY en Integraciones o variables de entorno.";
        const logEntry: OrderEmailLog = {
          timestamp: nowIso,
          status: params.status,
          to: buyerEmail,
          subject,
          ok: false,
          error: emailError,
        };
        meta.email_logs = [...(meta.email_logs ?? []), logEntry];
      } else {
        try {
          const html = buildEmailHtml({
            storeName: store.name,
            orderCode: cleanCode,
            statusLabel: ORDER_STATUS_LABELS[params.status],
            heading,
            bodyText,
            ctaLabel,
            ctaUrl,
            trackingUrl,
            whatsappUrl,
            totalUsd,
            itemsSummary,
            recipientName: vars.recipient_name ?? "",
            deliveryAddress: vars.delivery_address ?? "",
            deliveryDate: vars.delivery_date ?? "",
            deliverySlot: vars.delivery_slot ?? "",
          });

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [buyerEmail],
              subject,
              html,
              text: `${heading}\n\n${bodyText}\n\nSeguimiento del pedido: ${trackingUrl}`,
            }),
          });

          const resData = (await res.json().catch(() => null)) as {
            id?: string;
            message?: string;
            error?: { message?: string };
          } | null;

          if (!res.ok) {
            throw new Error(
              resData?.message ||
                resData?.error?.message ||
                `Resend devolvió HTTP ${res.status}`,
            );
          }

          emailSent = true;
          const logEntry: OrderEmailLog = {
            timestamp: nowIso,
            status: params.status,
            to: buyerEmail,
            subject,
            ok: true,
            provider_id: resData?.id ?? null,
          };
          meta.email_logs = [...(meta.email_logs ?? []), logEntry];
        } catch (err) {
          emailError = err instanceof Error ? err.message : "Error al enviar correo.";
          const logEntry: OrderEmailLog = {
            timestamp: nowIso,
            status: params.status,
            to: buyerEmail,
            subject,
            ok: false,
            error: emailError,
          };
          meta.email_logs = [...(meta.email_logs ?? []), logEntry];
        }
      }
    }
  }

  // 2. Sync contact & order to external CRM if configured
  let crmSynced = false;
  let crmError: string | null = null;

  if (params.syncCrm ?? true) {
    const crmResult = await syncOrderWithExternalCrm({
      order,
      store,
      status: params.status,
      trackingUrl,
      privateConfig,
    });
    if (crmResult) {
      meta.crm_sync = crmResult;
      crmSynced = crmResult.ok;
      crmError = crmResult.error ?? null;
    }
  }

  await supabase
    .from("orders")
    .update({
      webhook_payload: meta,
      updated_at: nowIso,
    })
    .eq("id", order.id)
    .eq("store_id", store.id);

  return { emailSent, emailError, crmSynced, crmError };
}

async function syncOrderWithExternalCrm(params: {
  order: OrderFullRow;
  store: StoreBasicRow;
  status: OrderStatus;
  trackingUrl: string;
  privateConfig: StorePrivateIntegrationsConfig;
}): Promise<OrderCrmSyncLog | null> {
  const { order, store, status, trackingUrl, privateConfig } = params;
  const provider: CrmProviderType =
    privateConfig.crmProvider ||
    (process.env.CRM_PROVIDER?.trim().toUpperCase() as CrmProviderType | undefined) ||
    "NONE";
  const apiKey = privateConfig.crmApiKey?.trim() || process.env.CRM_API_KEY?.trim() || "";
  const webhookUrl =
    privateConfig.crmWebhookUrl?.trim() || process.env.CRM_WEBHOOK_URL?.trim() || "";

  if (provider === "NONE") return null;

  const nowIso = new Date().toISOString();
  const cleanCode = order.order_code.replace(/^#/, "");
  const totalUsdNumber = Number((order.total_cents / 100).toFixed(2));

  try {
    if (provider === "BREVO") {
      if (!apiKey) {
        return {
          synced_at: nowIso,
          provider,
          ok: false,
          error: "Falta la API Key de Brevo CRM.",
        };
      }
      if (!order.buyer_email?.includes("@")) {
        return {
          synced_at: nowIso,
          provider,
          ok: false,
          error: "El pedido no tiene email para sincronizar en Brevo CRM.",
        };
      }

      const [firstName, ...restName] = (order.buyer_name || "").trim().split(/\s+/);
      const lastName = restName.join(" ");

      const res = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: order.buyer_email.trim(),
          updateEnabled: true,
          attributes: {
            NOMBRE: firstName || order.buyer_name,
            APELLIDOS: lastName || "",
            FIRSTNAME: firstName || order.buyer_name,
            LASTNAME: lastName || "",
            WHATSAPP: order.buyer_phone,
            ULTIMO_PEDIDO: `#${cleanCode}`,
            ESTADO_PEDIDO: ORDER_STATUS_LABELS[status],
            TOTAL_USD: totalUsdNumber,
          },
        }),
      });

      if (!res.ok && res.status !== 204) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Brevo CRM HTTP ${res.status}: ${errBody.slice(0, 140)}`);
      }
      return {
        synced_at: nowIso,
        provider: "BREVO",
        ok: true,
        external_id: order.buyer_email.trim(),
      };
    }

    if (provider === "HUBSPOT") {
      if (!apiKey) {
        return {
          synced_at: nowIso,
          provider,
          ok: false,
          error: "Falta el Private App Token de HubSpot CRM.",
        };
      }
      if (!order.buyer_email?.includes("@")) {
        return {
          synced_at: nowIso,
          provider,
          ok: false,
          error: "El pedido no tiene email para sincronizar en HubSpot CRM.",
        };
      }

      const [firstName, ...restName] = (order.buyer_name || "").trim().split(/\s+/);
      const lastName = restName.join(" ");

      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: [
            {
              idProperty: "email",
              id: order.buyer_email.trim(),
              properties: {
                email: order.buyer_email.trim(),
                firstname: firstName || order.buyer_name,
                lastname: lastName || "",
                phone: order.buyer_phone,
                lifecyclestage: status === "PAID" || status === "DELIVERED" ? "customer" : "lead",
              },
            },
          ],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`HubSpot CRM HTTP ${res.status}: ${errBody.slice(0, 140)}`);
      }
      return {
        synced_at: nowIso,
        provider: "HUBSPOT",
        ok: true,
        external_id: order.buyer_email.trim(),
      };
    }

    if (provider === "WEBHOOK") {
      if (!webhookUrl) {
        return {
          synced_at: nowIso,
          provider,
          ok: false,
          error: "Falta la URL del Webhook CRM.",
        };
      }
      if (!isSafeExternalWebhookUrl(webhookUrl)) {
        return {
          synced_at: nowIso,
          provider,
          ok: false,
          error: "La URL del Webhook CRM debe usar HTTPS hacia un dominio público válido.",
        };
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          event: "order.updated",
          timestamp: nowIso,
          store: { id: store.id, name: store.name },
          order: {
            id: order.id,
            code: `#${cleanCode}`,
            status,
            status_label: ORDER_STATUS_LABELS[status],
            total_cents: order.total_cents,
            total_usd: totalUsdNumber,
            currency: order.currency,
            paid_at: order.paid_at,
            tracking_url: trackingUrl,
            payment_link_url: order.payment_link_url,
            delivery_date: order.delivery_date,
            delivery_time_slot: order.delivery_time_slot,
            delivery_address: order.delivery_address,
            items: order.items,
          },
          customer: {
            name: order.buyer_name,
            email: order.buyer_email,
            phone: order.buyer_phone,
          },
          recipient: {
            name: order.recipient_name,
            phone: order.recipient_phone,
            address: order.delivery_address,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Webhook CRM devolvió HTTP ${res.status}`);
      }

      return {
        synced_at: nowIso,
        provider: "WEBHOOK",
        ok: true,
        external_id: `#${cleanCode}`,
      };
    }

    return null;
  } catch (err) {
    return {
      synced_at: nowIso,
      provider,
      ok: false,
      error: err instanceof Error ? err.message : "Error al sincronizar CRM",
    };
  }
}
