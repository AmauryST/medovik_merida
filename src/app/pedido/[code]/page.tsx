import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderPaymentRedirectButton } from "@/components/catalog/OrderPaymentRedirectButton";
import { getActiveStore } from "@/lib/catalog/queries";
import { parseOrderTrackingMeta } from "@/lib/notifications/email-templates-shared";
import {
  decryptOrderTrackingToken,
  encryptOrderTrackingToken,
  isPlainOrderCode,
} from "@/lib/orders/tracking-token";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { ORDER_STATUS_LABELS } from "@/types/admin";
import {
  formatCents,
  type Cents,
  type CurrencyCode,
  type OrderStatus,
  type Uuid,
} from "@/types/catalog";

export const dynamic = "force-dynamic";

interface PublicOrderReturnRow {
  id: Uuid;
  store_id: Uuid;
  order_code: string;
  status: OrderStatus;
  subtotal_cents: Cents;
  delivery_fee_cents: Cents;
  payment_fee_cents: Cents;
  total_cents: Cents;
  currency: CurrencyCode;
  buyer_name: string;
  buyer_email: string | null;
  recipient_name: string;
  delivery_zone_name: string | null;
  delivery_address: string;
  delivery_date: string;
  delivery_time_slot: string;
  card_message: string | null;
  payment_provider: string | null;
  payment_link_url: string | null;
  external_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  webhook_payload: unknown;
  items: Array<{
    name: string;
    quantity: number;
    unit_price_cents: Cents;
    line_total_cents: Cents;
    presentation_label: string | null;
  }>;
}

const PROGRESS_STEPS: ReadonlyArray<{
  key: OrderStatus;
  title: string;
  subtitle: string;
}> = [
  {
    key: "AWAITING_PAYMENT",
    title: "Pedido registrado",
    subtitle: "Datos de entrega reservados",
  },
  {
    key: "PAID",
    title: "Pago confirmado",
    subtitle: "Pago verificado en línea",
  },
  {
    key: "PREPARING",
    title: "En preparación",
    subtitle: "Elaborando tu pastel en obrador",
  },
  {
    key: "OUT_FOR_DELIVERY",
    title: "En camino",
    subtitle: "En reparto en Mérida",
  },
  {
    key: "DELIVERED",
    title: "Entregado",
    subtitle: "Recibido por el destinatario",
  },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case "PENDING_CONFIRMATION":
    case "AWAITING_PAYMENT":
      return 0;
    case "PAID":
      return 1;
    case "PREPARING":
      return 2;
    case "OUT_FOR_DELIVERY":
      return 3;
    case "DELIVERED":
      return 4;
    case "CANCELLED":
      return -1;
  }
}

function maskPersonName(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "Cliente";
  if (parts.length === 1) return first;
  return `${first} ${parts
    .slice(1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(" ")}`;
}

function maskEmail(raw: string | null): string | null {
  if (!raw || !raw.includes("@")) return null;
  const [local, domain] = raw.trim().split("@");
  if (!local || !domain) return null;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function maskAddress(raw: string): string {
  const clean = raw.trim();
  if (clean.length <= 10) return "Dirección registrada en Mérida, Yucatán";
  return `${clean.slice(0, 12)}••• (Mérida, Yucatán)`;
}

export default async function PedidoEstadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pago?: string }>;
}) {
  const [{ code }, query, store] = await Promise.all([
    params,
    searchParams,
    getActiveStore(),
  ]);

  const rawToken = decodeURIComponent(code).trim();
  if (isPlainOrderCode(rawToken)) {
    redirect("/pedido?error=plain_code");
  }

  const cleanCode = decryptOrderTrackingToken(rawToken, store.id);
  if (!cleanCode) {
    redirect("/pedido?error=1");
  }

  let order: PublicOrderReturnRow | null = null;
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "id, store_id, order_code, status, subtotal_cents, delivery_fee_cents, payment_fee_cents, total_cents, currency, buyer_name, buyer_email, recipient_name, delivery_zone_name, delivery_address, delivery_date, delivery_time_slot, card_message, payment_provider, payment_link_url, external_payment_id, paid_at, created_at, webhook_payload, items",
      )
      .eq("store_id", store.id)
      .eq("order_code", cleanCode)
      .maybeSingle<PublicOrderReturnRow>();
    order = data ?? null;
  } catch {
    order = null;
  }

  if (!order) {
    redirect(`/pedido?error=1`);
  }

  const trackingToken = encryptOrderTrackingToken(order.order_code, store.id);

  const isPaid =
    Boolean(order.paid_at) ||
    order.status === "PAID" ||
    order.status === "PREPARING" ||
    order.status === "OUT_FOR_DELIVERY" ||
    order.status === "DELIVERED";

  const pagoParam = query.pago;
  const activeStep = getStepIndex(order.status);
  const trackingMeta = parseOrderTrackingMeta(order.webhook_payload);
  const feeBreakdown = trackingMeta.fee_breakdown;
  const timeline = trackingMeta.timeline ?? [];
  const safeBuyerName = maskPersonName(order.buyer_name);
  const safeBuyerEmail = maskEmail(order.buyer_email);
  const safeRecipientName = maskPersonName(order.recipient_name);
  const safeDeliveryAddress = maskAddress(order.delivery_address);

  const itemsText = (order.items ?? [])
    .map(
      (i) =>
        `• ${i.name}${i.presentation_label ? ` (${i.presentation_label})` : ""} × ${i.quantity}`,
    )
    .join("\n");

  const currencyLabel = order.currency || store.currency || "MXN";
  const waLines = [
    `Hola ${store.name}, te escribo por mi pedido *#${order.order_code}*:`,
    "",
    itemsText,
    `Subtotal: $${formatCents(order.subtotal_cents)} ${currencyLabel}`,
    (order.delivery_fee_cents ?? 0) > 0 || feeBreakdown?.shipping_quoted
      ? `Envío${order.delivery_zone_name ? ` (${order.delivery_zone_name})` : ""}: $${formatCents(order.delivery_fee_cents ?? 0)} ${currencyLabel}`
      : "Envío: Por cotizar",
    `Total: *$${formatCents(order.total_cents)} ${currencyLabel}*`,
    `Estado: *${isPaid ? "Pagado" : ORDER_STATUS_LABELS[order.status]}*`,
    `Fecha de entrega: ${order.delivery_date} (${order.delivery_time_slot})`,
  ];
  const digits = store.whatsapp_number.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(waLines.join("\n"))}`;

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-4 py-10 text-[#2E221D]">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#6E5A50]">
          <Link href="/" className="no-underline hover:text-[#2E221D]">
            ← Volver a {store.name}
          </Link>
          <Link href="/pedido" className="no-underline hover:text-[#2E221D]">
            Buscar otro pedido
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-[#E6DCD2] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#EFE7DF] pb-5">
            <div>
              <p className="m-0 text-xs font-bold tracking-[0.2em] uppercase text-[#B56576]">
                Seguimiento en vivo · {store.name}
              </p>
              <h1 className="mt-1 font-serif text-2xl font-bold text-[#2E221D] sm:text-3xl">
                Pedido #{order.order_code}
              </h1>
              <p className="mt-1 text-xs text-[#7A685F]">
                Registrado a nombre de <strong>{safeBuyerName}</strong>
                {safeBuyerEmail ? ` (${safeBuyerEmail})` : ""}
              </p>
              <p className="mt-1.5 text-[11px] text-[#7A685F]">
                Código encriptado de validación:{" "}
                <code className="select-all rounded bg-[#FAF6F1] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#2E221D]">
                  {trackingToken}
                </code>
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold ${
                  order.status === "CANCELLED"
                    ? "bg-red-100 text-red-900"
                    : isPaid
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                }`}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {isPaid ? "✓ Pago confirmado" : "⏳ Pago pendiente"}
              </span>
            </div>
          </div>

          {/* Banner on return from TropiPay or Pending Quote */}
          {isPaid ? (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950">
              <strong>¡Pago confirmado!</strong> Tu pedido está pagado y agendado para entregarse a{" "}
              <strong>{safeRecipientName}</strong> el{" "}
              <strong>{order.delivery_date}</strong> ({order.delivery_time_slot}).
              {order.paid_at && (
                <span className="mt-1 block text-xs text-emerald-800">
                  Fecha de pago: {new Date(order.paid_at).toLocaleString("es-ES")}
                  {order.external_payment_id ? ` · Ref. #${order.external_payment_id}` : ""}
                </span>
              )}
            </div>
          ) : order.status === "PENDING_CONFIRMATION" && !order.payment_link_url ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
              <strong>Cotización en revisión.</strong> Tu pedido está registrado. Nuestro equipo confirmará el costo de envío / entrega y te enviará el enlace seguro de pago o los detalles finales por WhatsApp.
              <div className="mt-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white no-underline hover:bg-emerald-700"
                >
                  Confirmar o consultar por WhatsApp
                </a>
              </div>
            </div>
          ) : pagoParam === "exito" ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
              <strong>Has regresado desde la pasarela de pago.</strong> Estamos verificando automáticamente la confirmación de tu pago; esta página se actualizará en unos segundos en cuanto se confirme la operación.
            </div>
          ) : pagoParam === "fallido" ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-950">
              El pago no se completó. Puedes volver a intentarlo de forma segura con el botón de abajo o escribirnos por WhatsApp.
            </div>
          ) : null}

          {/* Visual 5-step progress stepper */}
          {order.status !== "CANCELLED" && (
            <div className="mb-7">
              <h2 className="mb-3 text-xs font-bold tracking-wider uppercase text-[#7A685F]">
                Progreso del pedido y pago
              </h2>
              <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
                {PROGRESS_STEPS.map((step, index) => {
                  const completed = activeStep > index || (index === 1 && isPaid);
                  const current = activeStep === index;
                  return (
                    <li
                      key={step.key}
                      className={`rounded-2xl border p-3 transition ${
                        completed
                          ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                          : current
                            ? "border-[#B56576] bg-[#FDF6F8] text-[#2E221D] shadow-xs"
                            : "border-[#EFE7DF] bg-[#FAF6F1]/60 text-[#9A897F]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                            completed
                              ? "bg-emerald-600 text-white"
                              : current
                                ? "bg-[#B56576] text-white"
                                : "bg-[#E6DCD2] text-[#6E5A50]"
                          }`}
                        >
                          {completed ? "✓" : index + 1}
                        </span>
                        <span className="text-xs font-bold leading-tight">{step.title}</span>
                      </div>
                      <p className="mt-1.5 mb-0 text-[11px] leading-snug opacity-85">
                        {step.subtitle}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Payment Action & Live Refresh */}
          <div className="mb-6">
            <OrderPaymentRedirectButton
              orderCode={trackingToken}
              currentStatus={order.status}
              paymentLinkUrl={!isPaid ? order.payment_link_url : null}
              totalUsdFormatted={formatCents(order.total_cents)}
              currency={order.currency}
              returnedSuccess={pagoParam === "exito"}
            />
          </div>

          {/* Delivery & Order Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#EFE7DF] bg-[#FCF9F6] p-4 text-sm">
              <h3 className="m-0 mb-2.5 text-xs font-bold tracking-wider uppercase text-[#7A685F]">
                Datos de entrega
              </h3>
              <dl className="m-0 space-y-1.5 text-[13.5px]">
                <div>
                  <dt className="inline text-[#7A685F]">Recibe: </dt>
                  <dd className="inline font-semibold text-[#2E221D]">{safeRecipientName}</dd>
                </div>
                <div>
                  <dt className="inline text-[#7A685F]">Dirección: </dt>
                  <dd className="inline font-medium text-[#2E221D]">{safeDeliveryAddress}</dd>
                </div>
                <div>
                  <dt className="inline text-[#7A685F]">Fecha programada: </dt>
                  <dd className="inline font-semibold text-[#2E221D]">
                    {order.delivery_date} · {order.delivery_time_slot}
                  </dd>
                </div>
                {order.card_message && (
                  <div className="pt-1">
                    <dt className="block text-xs text-[#7A685F]">Dedicatoria / Nota:</dt>
                    <dd className="m-0 mt-0.5 italic text-[#4A3A33]">
                      “{order.card_message}”
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-2xl border border-[#EFE7DF] bg-[#FCF9F6] p-4 text-sm">
              <h3 className="m-0 mb-2.5 text-xs font-bold tracking-wider uppercase text-[#7A685F]">
                Detalle del pago y productos
              </h3>
              <div className="space-y-1.5">
                {(order.items ?? []).map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-[13.5px]">
                    <span>
                      {item.name}
                      {item.presentation_label ? ` (${item.presentation_label})` : ""} ×{" "}
                      {item.quantity}
                    </span>
                    <span className="font-semibold">${formatCents(item.line_total_cents)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1 border-t border-[#EFE7DF] pt-2.5 text-xs text-[#6E5A50]">
                <div className="flex justify-between">
                  <span>Subtotal productos</span>
                  <span className="font-semibold tabular-nums">
                    ${formatCents(order.subtotal_cents)} {order.currency}
                  </span>
                </div>
                {(order.delivery_fee_cents ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>
                      Envío{order.delivery_zone_name ? ` (${order.delivery_zone_name})` : ""}
                    </span>
                    <span className="font-semibold tabular-nums">
                      ${formatCents(order.delivery_fee_cents ?? 0)} {order.currency}
                    </span>
                  </div>
                )}
                {(feeBreakdown?.extra_fees ?? []).map((fee) => (
                  <div key={fee.id} className="flex justify-between">
                    <span>{fee.label}</span>
                    <span className="font-semibold tabular-nums">
                      +${formatCents(fee.amount_cents)} {order.currency}
                    </span>
                  </div>
                ))}
                {(feeBreakdown?.discount_cents ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      Descuento
                      {feeBreakdown?.discount_label ? ` (${feeBreakdown.discount_label})` : ""}
                    </span>
                    <span className="font-semibold tabular-nums">
                      -${formatCents(feeBreakdown?.discount_cents ?? 0)} {order.currency}
                    </span>
                  </div>
                )}
              </div>

              {feeBreakdown?.admin_quote_note && (
                <p className="mt-2 mb-0 rounded-xl bg-white px-2.5 py-1.5 text-xs text-[#4A3A33]">
                  <strong>Nota de la tienda:</strong> {feeBreakdown.admin_quote_note}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-[#EFE7DF] pt-2.5 text-base font-extrabold">
                <span>Total</span>
                <span>
                  ${formatCents(order.total_cents)} {order.currency}
                </span>
              </div>
              <p className="m-0 mt-1.5 text-xs text-[#7A685F]">
                Estado del pago:{" "}
                <strong className={isPaid ? "text-emerald-700" : "text-amber-800"}>
                  {isPaid ? "Pagado" : "Pendiente de pago"}
                </strong>
              </p>
            </div>
          </div>

          {/* Timeline history if available */}
          {timeline.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#EFE7DF] bg-[#FAF6F1]/60 p-4">
              <h3 className="m-0 mb-3 text-xs font-bold tracking-wider uppercase text-[#7A685F]">
                Historial de actualizaciones
              </h3>
              <ul className="m-0 list-none space-y-2.5 p-0 text-xs">
                {timeline.map((ev, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 border-b border-[#EFE7DF] pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <span className="font-bold text-[#2E221D]">{ev.title}</span>
                      {ev.detail && !ev.detail.startsWith("http") && (
                        <span className="ml-1.5 text-[#6E5A50]">({ev.detail})</span>
                      )}
                    </div>
                    <time className="shrink-0 text-[11px] text-[#8C7A70]">
                      {new Date(ev.timestamp).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#25D366] px-5 text-sm font-extrabold text-white no-underline transition hover:brightness-95"
            >
              Atención por WhatsApp (#{order.order_code})
            </a>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-full border border-[#DFD2C7] bg-white px-6 text-sm font-semibold text-[#5E4B41] no-underline transition hover:bg-[#FAF6F1]"
            >
              Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
