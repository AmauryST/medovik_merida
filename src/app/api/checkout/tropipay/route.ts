import { NextResponse } from "next/server";

import { computeCheckoutFees, parseStoreCheckoutConfig } from "@/lib/catalog/cart";
import { havanaToday, parseCheckoutResponse } from "@/lib/catalog/checkout";
import { getActiveStore } from "@/lib/catalog/queries";
import { parseOrderTrackingMeta } from "@/lib/notifications/email-templates-shared";
import { recordOrderLifecycleEvent } from "@/lib/notifications/order-notifications";
import { encryptOrderTrackingToken } from "@/lib/orders/tracking-token";
import {
  createTropiPayPaymentCard,
  getStoreTropiPayCredentials,
} from "@/lib/payments/tropipay";
import { createPublicClient } from "@/lib/supabase/public";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  CreateCheckoutOrderPayload,
  OrderFeeBreakdown,
  OrderStatus,
  Uuid,
} from "@/types/catalog";

interface OrderLookupRow {
  id: Uuid;
  store_id: Uuid;
  order_code: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  payment_fee_cents: number;
  total_cents: number;
  delivery_zone_name: string | null;
  currency: "USD";
  delivery_date: string;
  webhook_payload: unknown;
  items: Array<{
    name: string;
    quantity: number;
    presentation_label: string | null;
  }>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const store = await getActiveStore();
    if (!store.save_orders) {
      return NextResponse.json(
        { error: "Esta tienda no recibe pedidos en línea; escríbenos por WhatsApp." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      payload?: CreateCheckoutOrderPayload;
      intent?: "pay" | "quote";
    };

    const payload = body?.payload;
    if (!payload || payload.p_store_id !== store.id) {
      return NextResponse.json(
        { error: "Solicitud de pedido inválida para esta tienda." },
        { status: 400 },
      );
    }

    const checkoutConfig = parseStoreCheckoutConfig(store);
    const requestedIntent: "pay" | "quote" =
      body?.intent === "quote"
        ? "quote"
        : body?.intent === "pay"
          ? "pay"
          : payload.p_preferred_payment === "CARD_LINK"
            ? "pay"
            : "quote";

    const wantsOnlinePayment =
      requestedIntent === "pay" &&
      store.payment_provider === "TROPIPAY" &&
      payload.p_preferred_payment === "CARD_LINK" &&
      (checkoutConfig.shipping_fee_mode !== "ADMIN_QUOTE_LATER" ||
        checkoutConfig.allow_immediate_payment_without_shipping);

    const isBlankOrPlaceholder = (val: string | undefined | null) =>
      !val || !val.trim() || val.trim().toLowerCase().startsWith("por confirmar");

    if (wantsOnlinePayment) {
      if (
        isBlankOrPlaceholder(payload.p_buyer_name) ||
        isBlankOrPlaceholder(payload.p_buyer_phone) ||
        isBlankOrPlaceholder(payload.p_recipient_name) ||
        isBlankOrPlaceholder(payload.p_recipient_phone) ||
        isBlankOrPlaceholder(payload.p_delivery_address) ||
        !payload.p_delivery_date
      ) {
        return NextResponse.json(
          {
            error:
              "Completa todos los datos de contacto y de entrega (nombre, teléfono, dirección y fecha) antes de ir al pago.",
          },
          { status: 400 },
        );
      }

      if (!payload.p_buyer_email || !EMAIL_REGEX.test(payload.p_buyer_email.trim())) {
        return NextResponse.json(
          {
            error:
              "Ingresa un correo electrónico válido para recibir la confirmación de pago y el enlace de seguimiento de tu pedido.",
          },
          { status: 400 },
        );
      }
    } else if (payload.p_buyer_email && !EMAIL_REGEX.test(payload.p_buyer_email.trim())) {
      payload.p_buyer_email = null;
    }

    // 1. Create the order via the zero-trust database RPC (validates items, prices, zone, and store settings)
    const publicSupabase = createPublicClient();
    const { data: rpcData, error: rpcError } = await publicSupabase.rpc(
      "create_checkout_order",
      payload,
    );

    if (rpcError) {
      return NextResponse.json(
        {
          error:
            rpcError.code === "P0001"
              ? rpcError.message
              : "No pudimos registrar el pedido.",
        },
        { status: 400 },
      );
    }

    const created = parseCheckoutResponse(rpcData);
    const trackingToken = encryptOrderTrackingToken(created.order_code, store.id);
    const serviceSupabase = createServiceRoleClient();
    const originUrl = new URL(request.url).origin;

    const { data: orderRow, error: orderErr } = await serviceSupabase
      .from("orders")
      .select(
        "id, store_id, order_code, subtotal_cents, delivery_fee_cents, payment_fee_cents, total_cents, delivery_zone_name, currency, delivery_date, webhook_payload, items",
      )
      .eq("store_id", store.id)
      .eq("order_code", created.order_code)
      .single<OrderLookupRow>();

    if (orderErr || !orderRow) {
      return NextResponse.json(
        {
          order: { ...created, tracking_token: trackingToken },
          payment_link_url: null,
          warning: wantsOnlinePayment
            ? "Pedido creado, pero no se pudo recuperar para generar el link de pago."
            : null,
        },
        { status: 200 },
      );
    }

    // 2. Server-side trusted fee calculation strictly from store.theme_config.checkout
    const rpcShippingZone = {
      id: payload.p_delivery_zone_id,
      store_id: store.id,
      name: orderRow.delivery_zone_name ?? "",
      fee_cents: orderRow.delivery_fee_cents ?? 0,
      estimated_time_text: null,
      is_active: true,
      sort_order: 0,
    };

    const computedFees = computeCheckoutFees({
      subtotalCents: orderRow.subtotal_cents,
      config: checkoutConfig,
      selectedZone: rpcShippingZone,
    });

    const nextZoneName =
      checkoutConfig.shipping_fee_mode === "FIXED_AT_CHECKOUT"
        ? "Envío fijo"
        : checkoutConfig.shipping_fee_mode === "NONE"
          ? "Sin cargo de envío"
          : checkoutConfig.shipping_fee_mode === "ADMIN_QUOTE_LATER"
            ? "Por cotizar"
            : orderRow.delivery_zone_name;

    const existingMeta = parseOrderTrackingMeta(orderRow.webhook_payload);
    const feeBreakdown: OrderFeeBreakdown = {
      shipping_mode: checkoutConfig.shipping_fee_mode,
      shipping_quoted: computedFees.shippingQuoted,
      extra_fees: computedFees.extraFees,
      discount_cents: 0,
      discount_label: null,
      admin_quote_note: null,
      quoted_at: computedFees.shippingQuoted ? new Date().toISOString() : null,
    };

    const nextWebhookPayload = {
      ...existingMeta,
      tracking_token: trackingToken,
      fee_breakdown: feeBreakdown,
    };

    await serviceSupabase
      .from("orders")
      .update({
        delivery_fee_cents: computedFees.shippingCents,
        payment_fee_cents: computedFees.extraFeesTotalCents,
        total_cents: computedFees.totalCents,
        delivery_zone_name: nextZoneName,
        webhook_payload: nextWebhookPayload,
      })
      .eq("id", orderRow.id)
      .eq("store_id", store.id);

    const updatedCreated = {
      ...created,
      order_id: orderRow.id,
      tracking_token: trackingToken,
      subtotal_cents: orderRow.subtotal_cents,
      delivery_fee_cents: computedFees.shippingCents,
      delivery_zone_name: nextZoneName ?? created.delivery_zone_name,
      total_cents: computedFees.totalCents,
    };

    // 3. Generate TropiPay card link ONLY when immediate online payment is chosen & allowed
    if (wantsOnlinePayment) {
      const creds = await getStoreTropiPayCredentials(store.id);
      if (!creds) {
        await recordOrderLifecycleEvent({
          orderId: orderRow.id,
          storeId: store.id,
          status: "PENDING_CONFIRMATION",
          title: "Pedido registrado (pendiente de enlace de pago)",
          detail: "Credenciales de TropiPay no configuradas aún",
          sendEmail: false,
          syncCrm: true,
          originUrl,
        }).catch((err) => console.error("recordOrderLifecycleEvent error:", err));

        return NextResponse.json(
          {
            order: { ...updatedCreated, status: "PENDING_CONFIRMATION" as OrderStatus },
            payment_link_url: null,
            warning:
              "Pedido registrado. En breve te enviaremos el enlace de pago por WhatsApp.",
          },
          { status: 200 },
        );
      }

      const itemsSummary = (orderRow.items ?? [])
        .map(
          (item) =>
            `${item.name}${item.presentation_label ? ` (${item.presentation_label})` : ""} x${item.quantity}`,
        )
        .join(", ");

      try {
        const card = await createTropiPayPaymentCard(creds, {
          storeId: store.id,
          trackingToken,
          reference: orderRow.id,
          orderCode: orderRow.order_code,
          storeName: store.name,
          description: itemsSummary || `Pedido #${orderRow.order_code}`,
          amountCents: computedFees.totalCents,
          currency: orderRow.currency ?? "USD",
          serviceDate: orderRow.delivery_date || havanaToday(),
          originUrl,
          buyer: {
            name: payload.p_buyer_name,
            phone: payload.p_buyer_phone,
            email: payload.p_buyer_email ?? "",
          },
        });

        const nextStatus: OrderStatus = "AWAITING_PAYMENT";
        await serviceSupabase
          .from("orders")
          .update({
            status: nextStatus,
            payment_provider: "TROPIPAY",
            payment_link_url: card.shortUrl,
            external_reference: card.id,
          })
          .eq("id", orderRow.id)
          .eq("store_id", store.id);

        await recordOrderLifecycleEvent({
          orderId: orderRow.id,
          storeId: store.id,
          status: nextStatus,
          title: "Pedido registrado y enlace de pago generado",
          detail: card.shortUrl,
          sendEmail: true,
          syncCrm: true,
          originUrl,
        }).catch((err) => console.error("recordOrderLifecycleEvent error:", err));

        return NextResponse.json({
          order: {
            ...updatedCreated,
            status: nextStatus,
            payment_provider: "TROPIPAY",
            payment_link_url: card.shortUrl,
          },
          payment_link_url: card.shortUrl,
        });
      } catch (tropiErr) {
        console.error("TropiPay link creation error:", tropiErr);
        return NextResponse.json({
          order: { ...updatedCreated, status: "PENDING_CONFIRMATION" as OrderStatus },
          payment_link_url: null,
          warning:
            tropiErr instanceof Error
              ? `Pedido registrado (#${orderRow.order_code}), pero no se pudo generar el enlace de pago automáticamente: ${tropiErr.message}`
              : "Pedido registrado, pero no se pudo generar el enlace de pago automáticamente.",
        });
      }
    }

    // 4. Quote / WhatsApp confirmation path (PENDING_CONFIRMATION)
    const quoteTitle =
      checkoutConfig.shipping_fee_mode === "ADMIN_QUOTE_LATER"
        ? "Pedido recibido · pendiente de cotizar envío"
        : "Pedido registrado para confirmar por WhatsApp";

    await recordOrderLifecycleEvent({
      orderId: orderRow.id,
      storeId: store.id,
      status: "PENDING_CONFIRMATION",
      title: quoteTitle,
      detail:
        computedFees.extraFees.length > 0
          ? `Cargos incluidos: ${computedFees.extraFees.map((f) => f.label).join(", ")}`
          : undefined,
      sendEmail: false,
      syncCrm: true,
      originUrl,
    }).catch((err) => console.error("recordOrderLifecycleEvent error:", err));

    return NextResponse.json({
      order: {
        ...updatedCreated,
        status: "PENDING_CONFIRMATION" as OrderStatus,
      },
      payment_link_url: null,
    });
  } catch (err) {
    console.error("/api/checkout/tropipay error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "Error inesperado al procesar el pedido.",
      },
      { status: 500 },
    );
  }
}
