import type {
  BusinessPreset,
  Cents,
  DeliveryZone,
  OrderExtraFeeLine,
  OrderMode,
  ShippingFeeMode,
  StoreCheckoutConfig,
  StoreExtraFeeRule,
  Uuid,
} from "@/types/catalog";

export interface CartItem {
  key: string;
  productId: Uuid;
  productSlug: string;
  name: string;
  imageUrl: string | null;
  presentationId: Uuid | null;
  presentationLabel: string | null;
  unitPriceCents: Cents;
  quantity: number;
  note?: string;
}

export const MAX_CART_LINE_QTY = 50;

export const DEFAULT_STORE_CHECKOUT_CONFIG: StoreCheckoutConfig = {
  order_mode: "HYBRID",
  business_preset: "BAKERY_GIFT",
  shipping_fee_mode: "NONE",
  fixed_shipping_fee_cents: 0,
  default_extra_fees: [],
  allow_immediate_payment_without_shipping: true,
};

const VALID_ORDER_MODES = new Set<OrderMode>(["SINGLE_PRODUCT", "CART", "HYBRID"]);
const VALID_BUSINESS_PRESETS = new Set<BusinessPreset>([
  "BAKERY_GIFT",
  "RESTAURANT",
  "RETAIL",
]);
const VALID_SHIPPING_MODES = new Set<ShippingFeeMode>([
  "ZONE_SELECTOR",
  "FIXED_AT_CHECKOUT",
  "ADMIN_QUOTE_LATER",
  "NONE",
]);

export function parseStoreCheckoutConfig(source?: {
  theme_config?: Record<string, unknown> | null;
  show_delivery_zone?: boolean;
}): StoreCheckoutConfig {
  const fallbackShippingMode: ShippingFeeMode = source?.show_delivery_zone
    ? "ZONE_SELECTOR"
    : "NONE";

  const rawCheckout =
    source?.theme_config &&
    typeof source.theme_config === "object" &&
    !Array.isArray(source.theme_config)
      ? (source.theme_config as Record<string, unknown>).checkout
      : null;

  if (!rawCheckout || typeof rawCheckout !== "object" || Array.isArray(rawCheckout)) {
    return {
      ...DEFAULT_STORE_CHECKOUT_CONFIG,
      shipping_fee_mode: fallbackShippingMode,
    };
  }

  const obj = rawCheckout as Record<string, unknown>;

  const order_mode: OrderMode = VALID_ORDER_MODES.has(obj.order_mode as OrderMode)
    ? (obj.order_mode as OrderMode)
    : DEFAULT_STORE_CHECKOUT_CONFIG.order_mode;

  const business_preset: BusinessPreset = VALID_BUSINESS_PRESETS.has(
    obj.business_preset as BusinessPreset,
  )
    ? (obj.business_preset as BusinessPreset)
    : DEFAULT_STORE_CHECKOUT_CONFIG.business_preset;

  const rawShippingMode: ShippingFeeMode = VALID_SHIPPING_MODES.has(
    obj.shipping_fee_mode as ShippingFeeMode,
  )
    ? (obj.shipping_fee_mode as ShippingFeeMode)
    : fallbackShippingMode;

  const shipping_fee_mode: ShippingFeeMode =
    !source?.show_delivery_zone && rawShippingMode === "ADMIN_QUOTE_LATER"
      ? "NONE"
      : rawShippingMode;

  const fixed_shipping_fee_cents =
    typeof obj.fixed_shipping_fee_cents === "number" &&
    Number.isFinite(obj.fixed_shipping_fee_cents) &&
    obj.fixed_shipping_fee_cents >= 0
      ? Math.round(obj.fixed_shipping_fee_cents)
      : 0;

  const default_extra_fees: StoreExtraFeeRule[] = Array.isArray(obj.default_extra_fees)
    ? obj.default_extra_fees
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item, idx) => {
          const label = typeof item.label === "string" ? item.label.trim().slice(0, 60) : "";
          const amount =
            typeof item.amount_cents === "number" && Number.isFinite(item.amount_cents)
              ? Math.round(item.amount_cents)
              : 0;
          return {
            id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `fee_${idx + 1}`,
            label,
            amount_cents: Math.max(0, amount),
            enabled: item.enabled !== false,
          };
        })
        .filter((f) => f.label.length > 0)
    : [];

  const allow_immediate_payment_without_shipping =
    typeof obj.allow_immediate_payment_without_shipping === "boolean"
      ? obj.allow_immediate_payment_without_shipping
      : DEFAULT_STORE_CHECKOUT_CONFIG.allow_immediate_payment_without_shipping;

  return {
    order_mode,
    business_preset,
    shipping_fee_mode,
    fixed_shipping_fee_cents,
    default_extra_fees,
    allow_immediate_payment_without_shipping,
  };
}

export interface BusinessPresetCopy {
  cartTitle: string;
  cartSubtitle: string;
  buyerSectionTitle: string;
  recipientSectionTitle: string;
  recipientRequired: boolean;
  recipientOptionalHint: string;
  addressLabel: string;
  addressPlaceholder: string;
  dateLabel: string;
  timeSlotLabel: string;
  noteSectionTitle: string;
  noteLabel: string;
  notePlaceholder: string;
  itemNoun: string;
  itemsNoun: string;
}

export function getBusinessPresetCopy(preset: BusinessPreset): BusinessPresetCopy {
  switch (preset) {
    case "RESTAURANT":
      return {
        cartTitle: "Tu pedido",
        cartSubtitle: "Arma tu orden con varios platos y bebidas. Paga o confirma al final.",
        buyerSectionTitle: "Tus datos de contacto",
        recipientSectionTitle: "Entrega o recogida",
        recipientRequired: false,
        recipientOptionalHint: "Si recibe otra persona, indícalo abajo (opcional).",
        addressLabel: "Dirección de entrega o referencia (o Recogida en local)",
        addressPlaceholder: "Calle, número, entrecalles, o indica 'Recoger en local'...",
        dateLabel: "Fecha del pedido",
        timeSlotLabel: "Hora / Franja deseada",
        noteSectionTitle: "Indicaciones de cocina",
        noteLabel: "Notas para la cocina / alergias / sin ingredientes",
        notePlaceholder: "Ej. Sin cebolla, salsa aparte, cubiertos desechables...",
        itemNoun: "artículo",
        itemsNoun: "artículos",
      };
    case "RETAIL":
      return {
        cartTitle: "Tu pedido",
        cartSubtitle: "Agrega todos los productos que necesites y finaliza en un solo paso.",
        buyerSectionTitle: "Datos del comprador",
        recipientSectionTitle: "Datos de recepción y envío",
        recipientRequired: false,
        recipientOptionalHint: "Si el destinatario es distinto al comprador, complétalo abajo.",
        addressLabel: "Dirección de envío",
        addressPlaceholder: "Calle, número, entrecalles, municipio, referencia...",
        dateLabel: "Fecha estimada de entrega",
        timeSlotLabel: "Horario preferido",
        noteSectionTitle: "Notas de entrega",
        noteLabel: "Indicaciones especiales de entrega o empaque",
        notePlaceholder: "Ej. Llamar al llegar, envolver para regalo...",
        itemNoun: "producto",
        itemsNoun: "productos",
      };
    case "BAKERY_GIFT":
    default:
      return {
        cartTitle: "Tu pedido en Medovik Mérida",
        cartSubtitle: "Combina pasteles grandes, medianos o porciones individuales en un solo pedido.",
        buyerSectionTitle: "Tus datos de contacto",
        recipientSectionTitle: "Entrega o recolección en Mérida",
        recipientRequired: false,
        recipientOptionalHint: "Si es para regalo y recibe otra persona en Mérida, márcalo abajo.",
        addressLabel: "Colonia / dirección en Mérida (o punto acordado)",
        addressPlaceholder: "Calle, número, cruzamientos, colonia o fraccionamiento en Mérida...",
        dateLabel: "Fecha deseada de entrega",
        timeSlotLabel: "Horario preferido",
        noteSectionTitle: "Dedicatoria o nota especial",
        noteLabel: "Nota para tu pedido o tarjeta de regalo (opcional)",
        notePlaceholder: "Ej. ¡Feliz cumpleaños! / Indicar horario aproximado o alergias...",
        itemNoun: "pastel",
        itemsNoun: "pasteles",
      };
  }
}

export interface ComputedCheckoutFees {
  shippingCents: Cents;
  shippingQuoted: boolean;
  extraFees: OrderExtraFeeLine[];
  extraFeesTotalCents: Cents;
  totalCents: Cents;
}

export function computeCheckoutFees(params: {
  subtotalCents: Cents;
  config: StoreCheckoutConfig;
  selectedZone?: DeliveryZone;
}): ComputedCheckoutFees {
  const { subtotalCents, config, selectedZone } = params;

  const extraFees: OrderExtraFeeLine[] = config.default_extra_fees
    .filter((f) => f.enabled && f.label.trim().length > 0 && f.amount_cents > 0)
    .map((f) => ({
      id: f.id,
      label: f.label.trim(),
      amount_cents: f.amount_cents,
    }));

  const extraFeesTotalCents = extraFees.reduce((sum, f) => sum + f.amount_cents, 0);

  let shippingCents = 0;
  let shippingQuoted = true;

  switch (config.shipping_fee_mode) {
    case "ZONE_SELECTOR":
      shippingCents = selectedZone ? Math.max(0, selectedZone.fee_cents) : 0;
      shippingQuoted = Boolean(selectedZone);
      break;
    case "FIXED_AT_CHECKOUT":
      shippingCents = Math.max(0, config.fixed_shipping_fee_cents);
      shippingQuoted = true;
      break;
    case "ADMIN_QUOTE_LATER":
      shippingCents = 0;
      shippingQuoted = false;
      break;
    case "NONE":
    default:
      shippingCents = 0;
      shippingQuoted = true;
      break;
  }

  return {
    shippingCents,
    shippingQuoted,
    extraFees,
    extraFeesTotalCents,
    totalCents: Math.max(0, subtotalCents + shippingCents + extraFeesTotalCents),
  };
}

/* ------------------------------------------------------------------ */
/* Pure Cart Operations                                               */
/* ------------------------------------------------------------------ */

export function makeCartItemKey(productId: Uuid, presentationId: Uuid | null): string {
  return `${productId}::${presentationId ?? "base"}`;
}

export function upsertCartItem(
  items: CartItem[],
  incoming: Omit<CartItem, "key">,
): CartItem[] {
  const key = makeCartItemKey(incoming.productId, incoming.presentationId);
  const qtyToAdd = Math.max(1, Math.min(MAX_CART_LINE_QTY, Math.round(incoming.quantity)));
  const existingIdx = items.findIndex((i) => i.key === key);

  if (existingIdx === -1) {
    return [
      ...items,
      {
        ...incoming,
        key,
        quantity: qtyToAdd,
        note: incoming.note?.trim() || undefined,
      },
    ];
  }

  return items.map((item, idx) => {
    if (idx !== existingIdx) return item;
    const nextQty = Math.min(MAX_CART_LINE_QTY, item.quantity + qtyToAdd);
    const mergedNote = incoming.note?.trim() || item.note;
    return {
      ...item,
      quantity: nextQty,
      unitPriceCents: incoming.unitPriceCents,
      imageUrl: incoming.imageUrl ?? item.imageUrl,
      note: mergedNote,
    };
  });
}

export function setCartItemQuantity(
  items: CartItem[],
  key: string,
  quantity: number,
): CartItem[] {
  const normalized = Math.round(quantity);
  if (normalized <= 0) {
    return items.filter((i) => i.key !== key);
  }
  const capped = Math.min(MAX_CART_LINE_QTY, normalized);
  return items.map((i) => (i.key === key ? { ...i, quantity: capped } : i));
}

export function removeCartItemByKey(items: CartItem[], key: string): CartItem[] {
  return items.filter((i) => i.key !== key);
}

export function countCartItems(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function sumCartSubtotalCents(items: readonly CartItem[]): Cents {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

/* ------------------------------------------------------------------ */
/* On-demand sessionStorage persistence (Zero cookies)                */
/* ------------------------------------------------------------------ */

export function getCartStorageKey(storeSlug: string): string {
  return `zc_cart_${storeSlug}`;
}

export function loadCartFromSession(storeSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(getCartStorageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: unknown };
    if (!parsed || !Array.isArray(parsed.items)) return [];

    return parsed.items
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
      .map((entry) => {
        const productId = typeof entry.productId === "string" ? entry.productId : "";
        const presentationId =
          typeof entry.presentationId === "string" && entry.presentationId
            ? entry.presentationId
            : null;
        const unitPriceCents =
          typeof entry.unitPriceCents === "number" && Number.isFinite(entry.unitPriceCents)
            ? Math.max(0, Math.round(entry.unitPriceCents))
            : 0;
        const quantity =
          typeof entry.quantity === "number" && Number.isFinite(entry.quantity)
            ? Math.max(1, Math.min(MAX_CART_LINE_QTY, Math.round(entry.quantity)))
            : 1;
        return {
          key: makeCartItemKey(productId, presentationId),
          productId,
          productSlug: typeof entry.productSlug === "string" ? entry.productSlug : "",
          name: typeof entry.name === "string" ? entry.name : "Producto",
          imageUrl: typeof entry.imageUrl === "string" ? entry.imageUrl : null,
          presentationId,
          presentationLabel:
            typeof entry.presentationLabel === "string" ? entry.presentationLabel : null,
          unitPriceCents,
          quantity,
          note: typeof entry.note === "string" && entry.note.trim() ? entry.note.trim() : undefined,
        } satisfies CartItem;
      })
      .filter((i) => i.productId.length > 0);
  } catch {
    return [];
  }
}

export function saveCartToSession(storeSlug: string, items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = getCartStorageKey(storeSlug);
    if (items.length === 0) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        items,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore storage quota or private mode failures
  }
}

export function clearCartSession(storeSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(getCartStorageKey(storeSlug));
  } catch {
    // Ignore
  }
}
