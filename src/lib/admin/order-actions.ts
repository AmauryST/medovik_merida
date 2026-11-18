"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/session";
import { parseStoreCheckoutConfig } from "@/lib/catalog/cart";
import { havanaToday } from "@/lib/catalog/checkout";
import { parseOrderTrackingMeta } from "@/lib/notifications/email-templates-shared";
import {
  isSafeExternalWebhookUrl,
  recordOrderLifecycleEvent,
  saveStoreEmailTemplates,
  saveStorePrivateConfig,
} from "@/lib/notifications/order-notifications";
import { encryptOrderTrackingToken } from "@/lib/orders/tracking-token";
import {
  createTropiPayPaymentCard,
  getStoreTropiPayCredentials,
  getTropiPayAccessToken,
  resolvePayInAccount,
  type TropiPayEnv,
} from "@/lib/payments/tropipay";
import { ORDER_STATUS_LABELS } from "@/types/admin";
import type {
  ActionResult,
  AdminOrderRow,
  CrmProviderType,
  NotifiableOrderStatus,
  StoreEmailTemplates,
} from "@/types/admin";
import {
  formatCents,
  type OrderExtraFeeLine,
  type OrderFeeBreakdown,
  type OrderStatus,
  type PaymentMethod,
  type PaymentProvider,
  type StoreCheckoutConfig,
  type Uuid,
} from "@/types/catalog";

const VALID_STATUSES: ReadonlyArray<OrderStatus> = [
  "PENDING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "PAID",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const VALID_PAYMENT_METHODS: ReadonlyArray<PaymentMethod> = [
  "CARD_LINK",
  "WHATSAPP_COORDINATION",
  "ZELLE",
  "TRANSFER",
  "CASH",
];

export async function updateOrderStatusAction(
  orderId: Uuid,
  nextStatus: OrderStatus,
): Promise<{
  ok: boolean;
  error?: string;
  emailSent?: boolean;
  emailError?: string | null;
  crmSynced?: boolean;
}> {
  const { supabase, store } = await requireAdmin();

  if (!VALID_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "Estado de pedido inválido." };
  }

  const updateData: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === "PAID") {
    updateData.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .eq("store_id", store.id);

  if (error) {
    return { ok: false, error: error.message || "No se pudo actualizar el estado del pedido." };
  }

  const lifecycle = await recordOrderLifecycleEvent({
    orderId,
    storeId: store.id,
    status: nextStatus,
    title: `Estado actualizado a "${ORDER_STATUS_LABELS[nextStatus]}"`,
    sendEmail: true,
    syncCrm: true,
  }).catch(() => ({
    emailSent: false,
    emailError: null,
    crmSynced: false,
  }));

  revalidatePath("/admin/pedidos");
  return {
    ok: true,
    emailSent: lifecycle.emailSent,
    emailError: lifecycle.emailError,
    crmSynced: lifecycle.crmSynced,
  };
}

export async function sendOrderEmailManualAction(input: {
  orderId: Uuid;
  statusTemplate: NotifiableOrderStatus;
  buyerEmail?: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { supabase, store } = await requireAdmin();

  if (input.buyerEmail !== undefined) {
    const cleanEmail = input.buyerEmail.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { ok: false, error: "Ingresa un correo electrónico válido para el cliente." };
    }
    const { error: emailErr } = await supabase
      .from("orders")
      .update({
        buyer_email: cleanEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.orderId)
      .eq("store_id", store.id);

    if (emailErr) {
      return { ok: false, error: emailErr.message };
    }
  }

  const result = await recordOrderLifecycleEvent({
    orderId: input.orderId,
    storeId: store.id,
    status: input.statusTemplate,
    title: `Correo de estado "${ORDER_STATUS_LABELS[input.statusTemplate]}" enviado desde Admin`,
    sendEmail: true,
    forceEmail: true,
    syncCrm: false,
  });

  revalidatePath("/admin/pedidos");

  if (!result.emailSent) {
    return {
      ok: false,
      error:
        result.emailError ||
        "No se pudo enviar el correo. Verifica que el pedido tenga email y que RESEND_API_KEY esté configurado.",
    };
  }

  return {
    ok: true,
    message: `Correo "${ORDER_STATUS_LABELS[input.statusTemplate]}" enviado correctamente al cliente.`,
  };
}

export async function saveOrderCrmDetailsAction(input: {
  orderId: Uuid;
  buyerEmail: string;
  crmNotes: string;
}): Promise<ActionResult> {
  const { supabase, store } = await requireAdmin();

  const { data: row, error: fetchErr } = await supabase
    .from("orders")
    .select("webhook_payload")
    .eq("id", input.orderId)
    .eq("store_id", store.id)
    .maybeSingle<{ webhook_payload: unknown }>();

  if (fetchErr || !row) {
    return { ok: false, error: "Pedido no encontrado." };
  }

  const meta = parseOrderTrackingMeta(row.webhook_payload);
  meta.crm_notes = input.crmNotes.trim();

  const cleanEmail = input.buyerEmail.trim() || null;

  const { error } = await supabase
    .from("orders")
    .update({
      buyer_email: cleanEmail,
      webhook_payload: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orderId)
    .eq("store_id", store.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/pedidos");
  return { ok: true };
}

export async function syncOrderCrmManualAction(
  orderId: Uuid,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { supabase, store } = await requireAdmin();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("store_id", store.id)
    .maybeSingle<{ id: Uuid; status: OrderStatus }>();

  if (!order) {
    return { ok: false, error: "Pedido no encontrado." };
  }

  const res = await recordOrderLifecycleEvent({
    orderId: order.id,
    storeId: store.id,
    status: order.status,
    title: "Sincronización manual con CRM externo",
    sendEmail: false,
    syncCrm: true,
  });

  revalidatePath("/admin/pedidos");

  if (!res.crmSynced) {
    return {
      ok: false,
      error:
        res.crmError ||
        "No se pudo sincronizar con el CRM externo. Revisa la configuración en la pestaña «Emails y CRM».",
    };
  }

  return { ok: true, message: "Contacto y pedido sincronizados con el CRM externo." };
}

export async function saveStoreEmailTemplatesAction(
  templates: StoreEmailTemplates,
): Promise<ActionResult> {
  const { store, role } = await requireAdmin();
  if (role !== "OWNER") {
    return {
      ok: false,
      error: "Solo el propietario (OWNER) puede modificar las plantillas de correo.",
    };
  }
  try {
    await saveStoreEmailTemplates(store.id, templates);
    revalidatePath("/admin/pedidos");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudieron guardar las plantillas.",
    };
  }
}

export async function saveStoreIntegrationsAction(input: {
  resendApiKey?: string;
  resendFromEmail?: string;
  crmProvider: CrmProviderType;
  crmApiKey?: string;
  crmWebhookUrl?: string;
}): Promise<ActionResult> {
  const { store, role } = await requireAdmin();
  if (role !== "OWNER") {
    return {
      ok: false,
      error: "Solo el propietario (OWNER) puede modificar las integraciones de correo y CRM.",
    };
  }

  try {
    const patch: Record<string, unknown> = {
      crmProvider: input.crmProvider,
    };
    if (input.resendFromEmail !== undefined) {
      patch.resendFromEmail = input.resendFromEmail.trim();
    }
    if (input.resendApiKey && input.resendApiKey.trim()) {
      patch.resendApiKey = input.resendApiKey.trim();
    }
    if (input.crmApiKey && input.crmApiKey.trim()) {
      patch.crmApiKey = input.crmApiKey.trim();
    }
    if (input.crmWebhookUrl !== undefined) {
      const cleanWebhook = input.crmWebhookUrl.trim();
      if (cleanWebhook && !isSafeExternalWebhookUrl(cleanWebhook)) {
        return {
          ok: false,
          error: "La URL del Webhook CRM debe usar HTTPS hacia un dominio público válido.",
        };
      }
      patch.crmWebhookUrl = cleanWebhook;
    }

    await saveStorePrivateConfig(store.id, patch);
    revalidatePath("/admin/pedidos");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo guardar la configuración.",
    };
  }
}

export async function generateOrderTropiPayLinkAction(
  orderId: Uuid,
): Promise<{ ok: true; paymentLinkUrl: string } | { ok: false; error: string }> {
  const { supabase, store } = await requireAdmin();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_code, status, total_cents, currency, delivery_date, buyer_name, buyer_phone, buyer_email, items",
    )
    .eq("id", orderId)
    .eq("store_id", store.id)
    .maybeSingle<AdminOrderRow>();

  if (orderError || !order) {
    return { ok: false, error: "No se encontró el pedido en esta tienda." };
  }

  const creds = await getStoreTropiPayCredentials(store.id);
  if (!creds) {
    return {
      ok: false,
      error:
        "No hay credenciales de TropiPay configuradas para esta tienda. Configúralas en la sección de TropiPay (OWNER) o en las variables de entorno.",
    };
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3102";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const originUrl = `${proto}://${host}`;

  const itemsSummary = (order.items ?? [])
    .map(
      (item) =>
        `${item.name}${item.presentation_label ? ` (${item.presentation_label})` : ""} x${item.quantity}`,
    )
    .join(", ");

  try {
    const card = await createTropiPayPaymentCard(creds, {
      storeId: store.id,
      reference: order.id,
      orderCode: order.order_code,
      storeName: store.name,
      description: itemsSummary || `Pedido #${order.order_code}`,
      amountCents: order.total_cents,
      currency: order.currency ?? "USD",
      serviceDate: order.delivery_date || havanaToday(),
      originUrl,
      buyer: {
        name: order.buyer_name,
        phone: order.buyer_phone,
        email: order.buyer_email,
      },
    });

    const nextStatus: OrderStatus =
      order.status === "PENDING_CONFIRMATION" ? "AWAITING_PAYMENT" : order.status;

    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: nextStatus,
        payment_provider: "TROPIPAY",
        payment_link_url: card.shortUrl,
        external_reference: card.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("store_id", store.id);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await recordOrderLifecycleEvent({
      orderId: order.id,
      storeId: store.id,
      status: nextStatus,
      title: "Enlace de pago actualizado",
      detail: card.shortUrl,
      sendEmail: false,
      syncCrm: false,
      originUrl,
    }).catch(() => null);

    revalidatePath("/admin/pedidos");
    return { ok: true, paymentLinkUrl: card.shortUrl };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No se pudo generar el enlace en TropiPay.",
    };
  }
}

export async function updateOrderFeesAndQuoteAction(input: {
  orderId: Uuid;
  deliveryFeeCents: number;
  deliveryZoneName?: string;
  extraFees: OrderExtraFeeLine[];
  discountCents: number;
  discountLabel?: string;
  adminQuoteNote?: string;
  regenerateTropiPayLink?: boolean;
  sendEmail?: boolean;
}): Promise<
  | {
      ok: true;
      totalCents: number;
      paymentLinkUrl: string | null;
      emailSent: boolean;
      emailError?: string | null;
      warning?: string | null;
    }
  | { ok: false; error: string }
> {
  const { supabase, store } = await requireAdmin();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_code, status, subtotal_cents, currency, delivery_date, delivery_zone_name, buyer_name, buyer_phone, buyer_email, items, payment_link_url, webhook_payload",
    )
    .eq("id", input.orderId)
    .eq("store_id", store.id)
    .maybeSingle<AdminOrderRow>();

  if (orderError || !order) {
    return { ok: false, error: "No se encontró el pedido en esta tienda." };
  }

  if (order.status === "PAID" || order.status === "DELIVERED" || order.status === "CANCELLED") {
    return {
      ok: false,
      error: `No se pueden modificar los importes de un pedido en estado "${ORDER_STATUS_LABELS[order.status]}".`,
    };
  }

  const deliveryFeeCents = Math.max(0, Math.round(Number(input.deliveryFeeCents) || 0));
  const discountCents = Math.max(0, Math.round(Number(input.discountCents) || 0));
  const cleanExtraFees: OrderExtraFeeLine[] = (input.extraFees ?? [])
    .map((fee, idx) => ({
      id: (fee.id || `extra_${idx + 1}`).trim(),
      label: (fee.label || "").trim().slice(0, 60),
      amount_cents: Math.max(0, Math.round(Number(fee.amount_cents) || 0)),
    }))
    .filter((f) => f.label.length > 0 && f.amount_cents > 0);

  const extraFeesTotalCents = cleanExtraFees.reduce((sum, f) => sum + f.amount_cents, 0);
  const subtotalCents = order.subtotal_cents ?? 0;
  const totalCents = Math.max(
    0,
    subtotalCents + deliveryFeeCents + extraFeesTotalCents - discountCents,
  );

  if (input.regenerateTropiPayLink && totalCents <= 0) {
    return {
      ok: false,
      error: "El total final debe ser mayor a $0.00 USD para generar un enlace de pago.",
    };
  }

  const meta = parseOrderTrackingMeta(order.webhook_payload);
  const nextBreakdown: OrderFeeBreakdown = {
    shipping_mode: meta.fee_breakdown?.shipping_mode ?? "ADMIN_QUOTE_LATER",
    shipping_quoted: true,
    extra_fees: cleanExtraFees,
    discount_cents: discountCents,
    discount_label: input.discountLabel?.trim() || null,
    admin_quote_note: input.adminQuoteNote?.trim() || null,
    quoted_at: new Date().toISOString(),
  };
  meta.fee_breakdown = nextBreakdown;

  const nextZoneName =
    input.deliveryZoneName?.trim() ||
    (deliveryFeeCents > 0 ? "Envío cotizado" : order.delivery_zone_name ?? "Sin cargo");

  const { error: updateFeeErr } = await supabase
    .from("orders")
    .update({
      delivery_fee_cents: deliveryFeeCents,
      payment_fee_cents: extraFeesTotalCents,
      total_cents: totalCents,
      delivery_zone_name: nextZoneName,
      webhook_payload: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("store_id", store.id);

  if (updateFeeErr) {
    return { ok: false, error: updateFeeErr.message || "No se pudo actualizar la cotización." };
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3102";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const originUrl = `${proto}://${host}`;

  let finalStatus: OrderStatus = order.status;
  let paymentLinkUrl = order.payment_link_url ?? null;
  let warning: string | null = null;

  if (input.regenerateTropiPayLink) {
    const creds = await getStoreTropiPayCredentials(store.id);
    if (!creds) {
      warning =
        "Total actualizado, pero no hay credenciales de TropiPay configuradas para generar el enlace.";
    } else {
      const itemsSummary = (order.items ?? [])
        .map(
          (item) =>
            `${item.name}${item.presentation_label ? ` (${item.presentation_label})` : ""} x${item.quantity}`,
        )
        .join(", ");

      try {
        const card = await createTropiPayPaymentCard(creds, {
          storeId: store.id,
          reference: order.id,
          orderCode: order.order_code,
          storeName: store.name,
          description: itemsSummary || `Pedido #${order.order_code}`,
          amountCents: totalCents,
          currency: order.currency ?? "USD",
          serviceDate: order.delivery_date || havanaToday(),
          originUrl,
          buyer: {
            name: order.buyer_name,
            phone: order.buyer_phone,
            email: order.buyer_email,
          },
        });

        finalStatus =
          order.status === "PENDING_CONFIRMATION" ? "AWAITING_PAYMENT" : order.status;
        paymentLinkUrl = card.shortUrl;

        const { error: linkErr } = await supabase
          .from("orders")
          .update({
            status: finalStatus,
            payment_provider: "TROPIPAY",
            payment_link_url: card.shortUrl,
            external_reference: card.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .eq("store_id", store.id);

        if (linkErr) {
          return { ok: false, error: linkErr.message };
        }
      } catch (err) {
        warning =
          err instanceof Error
            ? `Total actualizado a $${formatCents(totalCents)} USD, pero TropiPay devolvió: ${err.message}`
            : "Total actualizado, pero no se pudo regenerar el enlace de TropiPay.";
      }
    }
  }

  const detailParts = [
    `Envío: $${formatCents(deliveryFeeCents)} USD`,
    extraFeesTotalCents > 0 ? `Cargos: $${formatCents(extraFeesTotalCents)} USD` : null,
    discountCents > 0 ? `Descuento: -$${formatCents(discountCents)} USD` : null,
    `Total final: $${formatCents(totalCents)} USD`,
  ].filter(Boolean);

  const lifecycle = await recordOrderLifecycleEvent({
    orderId: order.id,
    storeId: store.id,
    status: finalStatus,
    title: input.regenerateTropiPayLink && paymentLinkUrl
      ? "Cotización confirmada y enlace de pago actualizado"
      : "Envío y cargos cotizados desde Admin",
    detail: detailParts.join(" · "),
    sendEmail: Boolean(input.sendEmail),
    forceEmail: Boolean(input.sendEmail),
    syncCrm: false,
    originUrl,
  }).catch(() => ({
    emailSent: false,
    emailError: null,
  }));

  const cleanCode = order.order_code.replace(/^#/, "");
  const trackingToken = encryptOrderTrackingToken(cleanCode, store.id);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/pedido/${trackingToken}`);

  return {
    ok: true,
    totalCents,
    paymentLinkUrl,
    emailSent: lifecycle.emailSent,
    emailError: lifecycle.emailError,
    warning,
  };
}

export async function updateStorePaymentSettingsAction(input: {
  saveOrders: boolean;
  paymentProvider: PaymentProvider;
  paymentMethods: PaymentMethod[];
  orderPrefix: string;
  currency?: string;
  checkoutConfig?: StoreCheckoutConfig;
}): Promise<ActionResult> {
  const { supabase, store, role } = await requireAdmin();
  if (role !== "OWNER") {
    return { ok: false, error: "Solo el propietario (OWNER) puede modificar los ajustes de pagos." };
  }

  const methods = input.paymentMethods.filter((m) => VALID_PAYMENT_METHODS.includes(m));
  if (methods.length === 0) {
    return { ok: false, error: "Selecciona al menos un método de pago activo." };
  }

  const prefix = input.orderPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "DEL";
  const currency =
    (input.currency ?? store.currency ?? "USD")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 5) || "USD";

  const updatePayload: Record<string, unknown> = {
    save_orders: Boolean(input.saveOrders),
    payment_provider: input.paymentProvider,
    auto_generate_payment_link: input.paymentProvider === "TROPIPAY",
    payment_methods: methods,
    order_prefix: prefix,
    currency,
    updated_at: new Date().toISOString(),
  };

  if (input.checkoutConfig) {
    const { data: currentStore } = await supabase
      .from("stores")
      .select("theme_config")
      .eq("id", store.id)
      .maybeSingle<{ theme_config: Record<string, unknown> | null }>();

    const sanitizedCheckout = parseStoreCheckoutConfig({
      theme_config: { checkout: input.checkoutConfig },
    });

    const currentTheme =
      currentStore?.theme_config &&
      typeof currentStore.theme_config === "object" &&
      !Array.isArray(currentStore.theme_config)
        ? currentStore.theme_config
        : {};

    updatePayload.theme_config = {
      ...currentTheme,
      checkout: sanitizedCheckout,
    };
    updatePayload.show_delivery_zone = sanitizedCheckout.shipping_fee_mode === "ZONE_SELECTOR";
  }

  const { error } = await supabase
    .from("stores")
    .update(updatePayload)
    .eq("id", store.id);

  if (error) {
    return { ok: false, error: error.message || "No se pudieron guardar los ajustes de la tienda." };
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveStoreTropiPayCredentialsAction(input: {
  clientId: string;
  clientSecret: string;
  env: TropiPayEnv;
}): Promise<ActionResult> {
  const { supabase, store, role } = await requireAdmin();
  if (role !== "OWNER") {
    return { ok: false, error: "Solo el propietario (OWNER) puede configurar credenciales de TropiPay." };
  }

  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  const env: TropiPayEnv = input.env === "production" ? "production" : "sandbox";

  if (!clientId || !clientSecret) {
    return { ok: false, error: "Ingresa tanto el Client ID como el Client Secret de TropiPay." };
  }

  try {
    await saveStorePrivateConfig(store.id, {
      tropipayClientId: clientId,
      tropipayClientSecret: clientSecret,
      tropipayEnv: env,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudieron guardar las credenciales.",
    };
  }

  // Also upsert into public.store_payment_credentials if the table exists
  await supabase
    .from("store_payment_credentials")
    .upsert(
      {
        store_id: store.id,
        tropipay_client_id: clientId,
        tropipay_client_secret: clientSecret,
        tropipay_env: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    )
    .then(
      () => null,
      () => null,
    );

  revalidatePath("/admin/pedidos");
  return { ok: true };
}

export async function testStoreTropiPayConnectionAction(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const { store, role } = await requireAdmin();
  if (role !== "OWNER") {
    return { ok: false, error: "Solo el propietario (OWNER) puede probar las credenciales." };
  }

  const creds = await getStoreTropiPayCredentials(store.id);
  if (!creds) {
    return {
      ok: false,
      error:
        "No se encontraron credenciales de TropiPay para esta tienda (ni en base de datos ni en variables de entorno).",
    };
  }

  try {
    const { accessToken, baseUrl, scope } = await getTropiPayAccessToken(creds);
    const scopesText = scope ? ` · Permisos Key: ${scope}` : "";

    // Check if the TropiPay account itself has pay-in blocked at the user/group level
    const profileRes = await fetch(`${baseUrl}/users/profile`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    }).catch(() => null);

    if (profileRes?.ok) {
      const profile = (await profileRes.json().catch(() => null)) as
        | {
            group?: { name?: string };
            userDetail?: { acceptance?: string };
          }
        | null;
      if (profile?.group?.name === "BLOCK_PAYIN") {
        return {
          ok: false,
          error: `Token OAuth2 válido (${creds.env}), pero tu cuenta de TropiPay está en el grupo "BLOCK_PAYIN" (cobros entrantes deshabilitados por inactividad o migración pendiente: "${profile.userDetail?.acceptance ?? ""}"). Debes reactivar los cobros (Pay-in / Cobrar con link) dentro de tu cuenta de TropiPay o usar credenciales Sandbox.`,
        };
      }
    }

    const targetAccount = await resolvePayInAccount(accessToken, baseUrl);
    const accountText = targetAccount
      ? ` · Cuenta receptora: #${targetAccount.accountId} (${targetAccount.currency})`
      : "";

    return {
      ok: true,
      message: `Conexión exitosa con TropiPay (${creds.env} · ${baseUrl}${accountText} · fuente: ${
        creds.source === "database" ? "Base de datos de la tienda" : "Variables de entorno"
      }${scopesText}).`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo autenticar con TropiPay.",
    };
  }
}
