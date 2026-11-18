import { NextResponse } from "next/server";

import { getActiveStore } from "@/lib/catalog/queries";
import { recordOrderLifecycleEvent } from "@/lib/notifications/order-notifications";
import {
  getStoreTropiPayCredentials,
  verifyTropiPayWebhookSignature,
} from "@/lib/payments/tropipay";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { OrderStatus, Uuid } from "@/types/catalog";

interface TropiPayWebhookPayload {
  status?: string;
  reference?: string;
  bankOrderCode?: string | number;
  originalCurrencyAmount?: string | number;
  signaturev3?: string;
  signaturev2?: string;
  signature?: string;
  data?: {
    reference?: string;
    bankOrderCode?: string | number;
    originalCurrencyAmount?: string | number;
    signaturev3?: string;
    signaturev2?: string;
    signature?: string;
    state?: number;
    paymentcard?: {
      reference?: string;
    };
  };
}

interface OrderRowForWebhook {
  id: Uuid;
  store_id: Uuid;
  order_code: string;
  status: OrderStatus;
  total_cents: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json().catch(() => null)) as TropiPayWebhookPayload | null;
    if (!rawBody) {
      return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
    }

    const nested = rawBody.data ?? {};
    const reference = (
      rawBody.reference ??
      nested.reference ??
      nested.paymentcard?.reference ??
      ""
    ).trim();

    const bankOrderCode = rawBody.bankOrderCode ?? nested.bankOrderCode;
    const originalCurrencyAmount =
      rawBody.originalCurrencyAmount ?? nested.originalCurrencyAmount;
    const signaturev3 = rawBody.signaturev3 ?? nested.signaturev3;
    const signaturev2 = rawBody.signaturev2 ?? nested.signaturev2;
    const signature = rawBody.signature ?? nested.signature;

    if (!reference) {
      return NextResponse.json({ error: "Falta reference en el webhook." }, { status: 400 });
    }

    const store = await getActiveStore();
    const supabase = createServiceRoleClient();

    // Find the order belonging to this store by id (UUID) or order_code
    let query = supabase
      .from("orders")
      .select("id, store_id, order_code, status, total_cents")
      .eq("store_id", store.id);

    if (UUID_REGEX.test(reference)) {
      query = query.eq("id", reference);
    } else {
      query = query.eq("order_code", reference);
    }

    const { data: order, error: orderErr } = await query.maybeSingle<OrderRowForWebhook>();
    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado para esta tienda." },
        { status: 404 },
      );
    }

    // Resolve this store's specific TropiPay credentials
    const creds = await getStoreTropiPayCredentials(order.store_id);
    if (!creds) {
      return NextResponse.json(
        { error: "Credenciales de TropiPay no configuradas para la tienda." },
        { status: 500 },
      );
    }

    const isSignatureValid = verifyTropiPayWebhookSignature(creds, {
      bankOrderCode,
      originalCurrencyAmount,
      signaturev3,
      signaturev2,
      signature,
    });

    if (!isSignatureValid) {
      console.error("Invalid TropiPay webhook signature for order:", order.order_code);
      return NextResponse.json({ error: "Firma de webhook inválida." }, { status: 401 });
    }

    const paidCents = Number(originalCurrencyAmount ?? 0);
    if (Number.isFinite(paidCents) && paidCents > 0 && paidCents < order.total_cents) {
      console.error(
        `TropiPay amount mismatch for ${order.order_code}: expected ${order.total_cents}, got ${paidCents}`,
      );
      return NextResponse.json({ error: "Monto pagado inferior al total del pedido." }, { status: 400 });
    }

    const isSuccess =
      rawBody.status === "OK" ||
      (typeof nested.state === "number" && nested.state >= 4);

    if (!isSuccess) {
      await recordOrderLifecycleEvent({
        orderId: order.id,
        storeId: order.store_id,
        status: order.status,
        title: "Intento de pago reportado (no completado)",
        detail: bankOrderCode ? `Ref: ${bankOrderCode}` : undefined,
        sendEmail: false,
        syncCrm: false,
        rawTropiPayWebhook: rawBody,
      });

      return NextResponse.json({ ok: true, status: order.status });
    }

    // Idempotent: only transition to PAID if not already further along
    const alreadyPaidOrLater: ReadonlyArray<OrderStatus> = [
      "PAID",
      "PREPARING",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];
    const wasAlreadyPaid = alreadyPaidOrLater.includes(order.status);
    const nextStatus: OrderStatus = wasAlreadyPaid ? order.status : "PAID";

    await supabase
      .from("orders")
      .update({
        status: nextStatus,
        payment_provider: "TROPIPAY",
        external_payment_id: bankOrderCode ? String(bankOrderCode) : null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("store_id", order.store_id);

    if (!wasAlreadyPaid) {
      await recordOrderLifecycleEvent({
        orderId: order.id,
        storeId: order.store_id,
        status: "PAID",
        title: "Pago confirmado automáticamente",
        detail: bankOrderCode ? `Transacción #${bankOrderCode}` : undefined,
        sendEmail: true,
        syncCrm: true,
        rawTropiPayWebhook: rawBody,
      }).catch((err) => console.error("recordOrderLifecycleEvent webhook error:", err));
    }

    return NextResponse.json({
      ok: true,
      order_code: order.order_code,
      status: nextStatus,
    });
  } catch (err) {
    console.error("/api/webhooks/tropipay error:", err);
    return NextResponse.json(
      { error: "Error procesando webhook de TropiPay." },
      { status: 500 },
    );
  }
}
