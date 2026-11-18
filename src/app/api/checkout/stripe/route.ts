import { NextResponse } from "next/server";
import { BRAND } from "@/config/brand";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface StripeCheckoutRequest {
  orderCode: string;
  trackingToken?: string;
  depositMode?: "FIFTY_PERCENT" | "FULL";
}

/**
 * Endpoint de pasarela de pago Stripe México (MXN) para Medovik Mérida.
 * Reemplaza a TropiPay (que aplica únicamente a remesas en EUR/USD hacia Cuba).
 *
 * Soporta:
 * - Cobro en Pesos Mexicanos (`mxn`)
 * - Modalidad de Anticipo del 50% (`FIFTY_PERCENT`, política oficial de Medovik Mérida)
 *   o Pago Total (`FULL`).
 * - Tarjetas de crédito/débito en México (Visa, Mastercard, Amex) y SPEI a través de Stripe Checkout.
 */
export async function POST(request: Request) {
  let body: StripeCheckoutRequest;
  try {
    body = (await request.json()) as StripeCheckoutRequest;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida para Stripe Checkout." },
      { status: 400 },
    );
  }

  const orderCode = body.orderCode?.trim();
  const depositMode = body.depositMode ?? "FIFTY_PERCENT";

  if (!orderCode) {
    return NextResponse.json(
      { error: "Falta el código del pedido (orderCode)." },
      { status: 400 },
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  const supabase = await createClient();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, order_code, tracking_token, total_cents, currency, buyer_name, buyer_email")
    .eq("order_code", orderCode)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "No se encontró el pedido para generar el pago en Stripe." },
      { status: 404 },
    );
  }

  if (body.trackingToken && order.tracking_token && body.trackingToken !== order.tracking_token) {
    return NextResponse.json(
      { error: "Token de seguimiento no válido." },
      { status: 403 },
    );
  }

  const totalCents = Math.max(0, Number(order.total_cents || 0));
  const amountToChargeCents =
    depositMode === "FIFTY_PERCENT" ? Math.round(totalCents / 2) : totalCents;

  // Si aún no se ha configurado STRIPE_SECRET_KEY (modo Demo Catálogo), devolvemos respuesta informativa limpia
  if (!stripeSecretKey) {
    return NextResponse.json(
      {
        provider: "STRIPE",
        demoMode: true,
        currency: "MXN",
        totalCents,
        depositCents: amountToChargeCents,
        paymentUrl: null,
        message:
          "Modo Demo activo: configura STRIPE_SECRET_KEY en variables de entorno para activar cobros reales en MXN (50% de anticipo o 100%).",
      },
      { status: 200 },
    );
  }

  try {
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append(
      "success_url",
      `${siteUrl}/pedido/${encodeURIComponent(order.order_code)}?t=${encodeURIComponent(order.tracking_token ?? "")}&stripe=success`,
    );
    params.append(
      "cancel_url",
      `${siteUrl}/pedido/${encodeURIComponent(order.order_code)}?t=${encodeURIComponent(order.tracking_token ?? "")}&stripe=cancelled`,
    );
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "mxn");
    params.append(
      "line_items[0][price_data][unit_amount]",
      String(amountToChargeCents),
    );
    params.append(
      "line_items[0][price_data][product_data][name]",
      depositMode === "FIFTY_PERCENT"
        ? `Anticipo 50% — Pedido ${order.order_code} (${BRAND.storeName})`
        : `Pedido ${order.order_code} (${BRAND.storeName})`,
    );
    params.append(
      "line_items[0][price_data][product_data][description]",
      depositMode === "FIFTY_PERCENT"
        ? `Confirmación con 50% de anticipo. El 50% restante se liquida al momento de la entrega en Mérida.`
        : `Pago completo de pedido artesanal en ${BRAND.storeName}, Mérida.`,
    );
    params.append("metadata[order_code]", order.order_code);
    params.append("metadata[deposit_mode]", depositMode);

    if (order.buyer_email) {
      params.append("customer_email", order.buyer_email);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const sessionData = (await stripeRes.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!stripeRes.ok || !sessionData.url) {
      return NextResponse.json(
        {
          error:
            sessionData.error?.message ||
            "No fue posible crear la sesión de Stripe Checkout en MXN.",
        },
        { status: 502 },
      );
    }

    await supabase
      .from("orders")
      .update({
        payment_provider: "STRIPE",
        payment_link_url: sessionData.url,
      })
      .eq("id", order.id);

    return NextResponse.json({
      provider: "STRIPE",
      paymentUrl: sessionData.url,
      sessionId: sessionData.id,
      currency: "MXN",
      chargedCents: amountToChargeCents,
    });
  } catch (err) {
    console.error("[stripe.checkout] Error:", err);
    return NextResponse.json(
      { error: "Error de conexión con Stripe México." },
      { status: 502 },
    );
  }
}
