import { BRAND } from "@/config/brand";
import type { CartItem, ComputedCheckoutFees } from "@/lib/catalog/cart";
import {
  formatCents,
  type CatalogProduct,
  type Cents,
  type CreateCheckoutOrderPayload,
  type CreateCheckoutOrderResponse,
  type DeliveryZone,
  type IsoDate,
  type MediaSlotItem,
  type PaymentMethod,
  type StorePublic,
  type Uuid,
} from "@/types/catalog";

/* ------------------------------------------------------------------ */
/* Order Form State & Validation (Mérida, México · MXN)                */
/* ------------------------------------------------------------------ */

export interface QuickOrderForm {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  recipientName: string;
  recipientPhone: string;
  zoneId: string;
  address: string;
  date: string;
  timeSlot: string;
  cardMessage: string;
  payment: PaymentMethod;
}

export const EMPTY_QUICK_ORDER: QuickOrderForm = {
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
  recipientName: "",
  recipientPhone: "",
  zoneId: "",
  address: "",
  date: "",
  timeSlot: "",
  cardMessage: "",
  payment: "WHATSAPP_COORDINATION",
};

export const MAX_LENGTH = {
  name: 80,
  phone: 30,
  email: 120,
  address: 280,
  cardMessage: 300,
} as const;

export const TIME_SLOTS = [
  "Mañana (10:00 AM - 1:00 PM)",
  "Tarde (1:00 PM - 5:00 PM)",
  "Noche (5:00 PM - 8:00 PM)",
] as const;

export type RequiredOrderField =
  | "buyerName"
  | "buyerPhone"
  | "recipientName"
  | "recipientPhone"
  | "zoneId"
  | "address"
  | "date";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  WHATSAPP_COORDINATION: "Coordinar por WhatsApp (Anticipo 50% · SPEI / Efectivo)",
  TRANSFER: "Transferencia SPEI (Anticipo 50% para confirmar)",
  CASH: "50% Anticipo SPEI y 50% Efectivo al recibir",
  CARD_LINK: "Pago en línea con Tarjeta (Stripe México · MXN)",
  ZELLE: "Transferencia bancaria",
};

export function savesOrders(store: StorePublic): boolean {
  return store.save_orders === true;
}

export function showsDeliveryZone(
  store: StorePublic,
  zones: readonly DeliveryZone[],
): boolean {
  return Boolean(store.show_delivery_zone && zones.length > 0);
}

export function defaultZone(
  store: StorePublic,
  zones: readonly DeliveryZone[],
): DeliveryZone | undefined {
  if (!showsDeliveryZone(store, zones)) return undefined;
  return zones[0];
}

export function paymentOptions(
  store: StorePublic,
): { value: PaymentMethod; label: string }[] {
  const configured =
    store.payment_methods && store.payment_methods.length > 0
      ? store.payment_methods
      : (["WHATSAPP_COORDINATION", "TRANSFER", "CASH"] as PaymentMethod[]);

  return configured.map((value) => ({
    value,
    label: PAYMENT_LABELS[value] ?? value,
  }));
}

/**
 * Current local date (`YYYY-MM-DD`) in Mérida, Yucatán (`America/Merida`).
 */
export function meridaToday(): IsoDate {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Merida",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const havanaToday = meridaToday;

export function formatIsoDate(isoDate: string): string {
  const clean = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parts = clean.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export function estimateTotalCents(
  product: CatalogProduct,
  presentation?: MediaSlotItem,
  quantity = 1,
  zone?: DeliveryZone,
): Cents {
  const delta = presentation ? presentation.price_delta_cents : 0;
  const unit = Math.max(0, product.price_cents + delta);
  const subtotal = unit * Math.max(1, quantity);
  const shipping = zone ? Math.max(0, zone.fee_cents) : 0;
  return subtotal + shipping;
}

/* ------------------------------------------------------------------ */
/* Single-Product Drawer Validation & Payload                          */
/* ------------------------------------------------------------------ */

export function validateRequiredOrderForm(
  form: QuickOrderForm,
  needZone: boolean,
): string | null {
  if (!form.buyerName.trim()) {
    return "Por favor escribe tu nombre para el pedido.";
  }
  if (!form.buyerPhone.trim()) {
    return "Por favor escribe tu número de WhatsApp o teléfono.";
  }
  if (needZone && !form.zoneId.trim()) {
    return "Selecciona la zona de entrega en Mérida.";
  }
  if (!form.address.trim()) {
    return "Indica la colonia/dirección de entrega en Mérida o punto acordado.";
  }
  if (!form.date.trim()) {
    return "Selecciona la fecha deseada para tu Medovik.";
  }
  return null;
}

const DEFAULT_FALLBACK_ZONE_ID: Uuid = "00000000-0000-0000-0000-000000000000";

export function buildCheckoutPayload(params: {
  store: StorePublic;
  product: CatalogProduct;
  presentation?: MediaSlotItem;
  quantity: number;
  zone?: DeliveryZone;
  form: QuickOrderForm;
}): CreateCheckoutOrderPayload {
  const { store, product, presentation, quantity, zone, form } = params;
  const buyerName = form.buyerName.trim() || "Cliente Medovik Mérida";
  const buyerPhone = form.buyerPhone.trim() || "Sin teléfono";
  const recipientName = form.recipientName.trim() || buyerName;
  const recipientPhone = form.recipientPhone.trim() || buyerPhone;

  return {
    p_store_id: store.id,
    p_buyer_name: buyerName,
    p_buyer_phone: buyerPhone,
    p_buyer_email: form.buyerEmail.trim() || null,
    p_recipient_name: recipientName,
    p_recipient_phone: recipientPhone,
    p_delivery_zone_id: zone?.id ?? (form.zoneId || DEFAULT_FALLBACK_ZONE_ID),
    p_delivery_address: form.address.trim() || "Coordinar en Mérida, Yucatán",
    p_delivery_date: form.date.trim() || meridaToday(),
    p_delivery_time_slot: form.timeSlot.trim() || TIME_SLOTS[0],
    p_card_message: form.cardMessage.trim() || null,
    p_preferred_payment: form.payment || "WHATSAPP_COORDINATION",
    p_items: [
      {
        product_id: product.id,
        quantity: Math.max(1, Math.round(quantity)),
        presentation_placement_id: presentation?.placement_id ?? null,
      },
    ],
  };
}

export function parseCheckoutResponse(
  data: unknown,
): CreateCheckoutOrderResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta inválida al registrar el pedido.");
  }
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  if (!row || typeof row.order_code !== "string") {
    throw new Error("No se recibió el código de pedido.");
  }
  return {
    order_code: row.order_code,
    total_cents: typeof row.total_cents === "number" ? row.total_cents : 0,
    order_id: typeof row.order_id === "string" ? row.order_id : undefined,
    tracking_token:
      typeof row.tracking_token === "string" ? row.tracking_token : undefined,
    currency:
      typeof row.currency === "string" ? row.currency : BRAND.currency,
    payment_provider:
      typeof row.payment_provider === "string"
        ? (row.payment_provider as CreateCheckoutOrderResponse["payment_provider"])
        : undefined,
    payment_link_url:
      typeof row.payment_link_url === "string" ? row.payment_link_url : null,
    whatsapp_number:
      typeof row.whatsapp_number === "string"
        ? row.whatsapp_number
        : BRAND.whatsappNumber,
  };
}

export function buildOrderWhatsAppUrl(params: {
  store: StorePublic;
  product: CatalogProduct;
  presentation?: MediaSlotItem;
  quantity: number;
  zone?: DeliveryZone;
  form: QuickOrderForm;
  order?: CreateCheckoutOrderResponse;
  showPrice?: boolean;
}): string {
  const {
    store,
    product,
    presentation,
    quantity,
    zone,
    form,
    order,
    showPrice = false,
  } = params;
  const currency = order?.currency ?? store.currency ?? BRAND.currency;
  const totalCents =
    order?.total_cents ??
    estimateTotalCents(product, presentation, quantity, zone);
  const depositCents = Math.round(totalCents / 2);

  const lines: string[] = [
    `Hola *${store.name}* 🍯, quiero conformar el siguiente pedido en Mérida:`,
    "",
  ];

  if (order?.order_code) {
    lines.push(`*Folio:* ${order.order_code}`);
  }

  lines.push(
    `*Pastel:* ${quantity}× ${product.name}${presentation?.label ? ` (${presentation.label})` : ""}`,
  );

  if (showPrice) {
    lines.push(`*Total estimado:* $${formatCents(totalCents)} ${currency}`);
    lines.push(`*Anticipo 50% para confirmar:* $${formatCents(depositCents)} ${currency}`);
  } else {
    lines.push(`*Modalidad:* Solicitud de disponibilidad y cotización`);
  }

  if (zone) {
    lines.push(
      `*Zona en Mérida:* ${zone.name}${zone.fee_cents > 0 && showPrice ? ` (+$${formatCents(zone.fee_cents)} ${currency})` : ""}`,
    );
  }

  lines.push("");

  if (form.buyerName.trim()) {
    lines.push(
      `*Cliente:* ${form.buyerName.trim()}${form.buyerPhone.trim() ? ` (${form.buyerPhone.trim()})` : ""}`,
    );
  }
  if (
    form.recipientName.trim() &&
    form.recipientName.trim() !== form.buyerName.trim()
  ) {
    lines.push(
      `*Recibe:* ${form.recipientName.trim()}${form.recipientPhone.trim() ? ` (${form.recipientPhone.trim()})` : ""}`,
    );
  }
  if (form.address.trim()) {
    lines.push(`*Dirección / Colonia en Mérida:* ${form.address.trim()}`);
  }
  if (form.date.trim()) {
    lines.push(
      `*Fecha deseada:* ${formatIsoDate(form.date)}${form.timeSlot ? ` · ${form.timeSlot}` : ""}`,
    );
  }
  if (form.cardMessage.trim()) {
    lines.push(`*Dedicatoria / Nota:* "${form.cardMessage.trim()}"`);
  }

  const digits = (
    order?.whatsapp_number ||
    store.whatsapp_number ||
    BRAND.whatsappNumber
  ).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/* ------------------------------------------------------------------ */
/* Multi-Item Cart Drawer Validation, Payload & WhatsApp               */
/* ------------------------------------------------------------------ */

export function normalizeOrderFormForPreset(
  form: QuickOrderForm,
  otherRecipient: boolean,
): QuickOrderForm {
  const buyerName = form.buyerName.trim();
  const buyerPhone = form.buyerPhone.trim();
  return {
    ...form,
    buyerName,
    buyerPhone,
    recipientName:
      otherRecipient && form.recipientName.trim()
        ? form.recipientName.trim()
        : buyerName,
    recipientPhone:
      otherRecipient && form.recipientPhone.trim()
        ? form.recipientPhone.trim()
        : buyerPhone,
  };
}

export function collectCartOrderFormErrors(params: {
  form: QuickOrderForm;
  needZone: boolean;
  recipientRequired: boolean;
}): { missingFields: RequiredOrderField[]; message: string | null } {
  const { form, needZone, recipientRequired } = params;
  const missing: RequiredOrderField[] = [];

  if (!form.buyerName.trim()) missing.push("buyerName");
  if (!form.buyerPhone.trim()) missing.push("buyerPhone");
  if (recipientRequired) {
    if (!form.recipientName.trim()) missing.push("recipientName");
    if (!form.recipientPhone.trim()) missing.push("recipientPhone");
  }
  if (needZone && !form.zoneId.trim()) missing.push("zoneId");
  if (!form.address.trim()) missing.push("address");
  if (!form.date.trim()) missing.push("date");

  if (missing.length === 0) {
    return { missingFields: [], message: null };
  }

  return {
    missingFields: missing,
    message:
      "Completa los campos marcados en rojo para confirmar tu pedido en Mérida.",
  };
}

export function validateCartOrderForm(
  form: QuickOrderForm,
  needZone: boolean,
  recipientRequired = false,
): string | null {
  return collectCartOrderFormErrors({ form, needZone, recipientRequired })
    .message;
}

export function buildCartCheckoutPayload(params: {
  store: StorePublic;
  items: readonly CartItem[];
  zone?: DeliveryZone;
  form: QuickOrderForm;
}): CreateCheckoutOrderPayload {
  const { store, items, zone, form } = params;
  const buyerName = form.buyerName.trim() || "Cliente Medovik Mérida";
  const buyerPhone = form.buyerPhone.trim() || "Sin teléfono";
  const recipientName = form.recipientName.trim() || buyerName;
  const recipientPhone = form.recipientPhone.trim() || buyerPhone;

  return {
    p_store_id: store.id,
    p_buyer_name: buyerName,
    p_buyer_phone: buyerPhone,
    p_buyer_email: form.buyerEmail.trim() || null,
    p_recipient_name: recipientName,
    p_recipient_phone: recipientPhone,
    p_delivery_zone_id: zone?.id ?? (form.zoneId || DEFAULT_FALLBACK_ZONE_ID),
    p_delivery_address: form.address.trim() || "Coordinar en Mérida, Yucatán",
    p_delivery_date: form.date.trim() || meridaToday(),
    p_delivery_time_slot: form.timeSlot.trim() || TIME_SLOTS[0],
    p_card_message: form.cardMessage.trim() || null,
    p_preferred_payment: form.payment || "WHATSAPP_COORDINATION",
    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: Math.max(1, Math.round(item.quantity)),
      presentation_placement_id: item.presentationId ?? null,
    })),
  };
}

export function buildCartWhatsAppUrl(params: {
  store: StorePublic;
  items: readonly CartItem[];
  fees: ComputedCheckoutFees;
  zone?: DeliveryZone;
  form: QuickOrderForm;
  order?: CreateCheckoutOrderResponse;
  isPriceVisibleFor?: (slugOrId: string) => boolean;
}): string {
  const { store, items, fees, zone, form, order, isPriceVisibleFor } = params;
  const currency = order?.currency ?? store.currency ?? BRAND.currency;

  const lines: string[] = [
    `Hola *${store.name}* 🍯, quiero conformar el siguiente pedido en Mérida:`,
    "",
  ];

  if (order?.order_code) {
    lines.push(`*Folio:* ${order.order_code}`);
    lines.push("");
  }

  let allItemsShowPrice = items.length > 0;

  lines.push("*Detalle del pedido:*");
  for (const item of items) {
    const lineTotal = item.unitPriceCents * item.quantity;
    const itemShowsPrice = isPriceVisibleFor
      ? isPriceVisibleFor(item.productSlug || item.productId)
      : false;
    if (!itemShowsPrice) {
      allItemsShowPrice = false;
    }
    lines.push(
      `• ${item.quantity}× *${item.name}*${item.presentationLabel ? ` (${item.presentationLabel})` : ""}${itemShowsPrice ? ` — $${formatCents(lineTotal)} ${currency}` : ""}`,
    );
    if (item.note) {
      lines.push(`  _Nota: ${item.note}_`);
    }
  }

  lines.push("");
  const finalTotal = order?.total_cents ?? fees.totalCents;
  if (allItemsShowPrice) {
    const depositCents = Math.round(finalTotal / 2);
    lines.push(`*Subtotal pasteles:* $${formatCents(finalTotal)} ${currency}`);
    lines.push(
      `*Anticipo del 50% para confirmar:* $${formatCents(depositCents)} ${currency}`,
    );
    lines.push(
      `*50% restante al entregar:* $${formatCents(finalTotal - depositCents)} ${currency}`,
    );
  } else {
    lines.push(
      `*Confirmación:* Solicito confirmar disponibilidad, costo de envío a mi dirección en Mérida y datos para el anticipo del 50%.`,
    );
  }

  if (zone) {
    lines.push(`*Zona en Mérida:* ${zone.name}`);
  }

  lines.push("");
  if (form.buyerName.trim()) {
    lines.push(
      `*Cliente:* ${form.buyerName.trim()}${form.buyerPhone.trim() ? ` (${form.buyerPhone.trim()})` : ""}`,
    );
  }
  if (
    form.recipientName.trim() &&
    form.recipientName.trim() !== form.buyerName.trim()
  ) {
    lines.push(
      `*Recibe:* ${form.recipientName.trim()}${form.recipientPhone.trim() ? ` (${form.recipientPhone.trim()})` : ""}`,
    );
  }
  if (form.address.trim()) {
    lines.push(`*Dirección / Colonia en Mérida:* ${form.address.trim()}`);
  }
  if (form.date.trim()) {
    lines.push(
      `*Fecha deseada:* ${formatIsoDate(form.date)}${form.timeSlot ? ` · ${form.timeSlot}` : ""}`,
    );
  }
  if (form.cardMessage.trim()) {
    lines.push(`*Dedicatoria / Indicaciones:* "${form.cardMessage.trim()}"`);
  }

  const digits = (
    order?.whatsapp_number ||
    store.whatsapp_number ||
    BRAND.whatsappNumber
  ).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}
