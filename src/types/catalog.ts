/**
 * Types for the public catalog (`public.v_catalog_products`) and for the
 * `create_checkout_order` RPC.
 *
 * Source of truth (live Supabase schema, 2026-10-28):
 * - EXACT: view columns and the inner JSON of `media_by_slot` / `categories`
 *   (read from published rows), `media_slots` codes, `categories`,
 *   `delivery_zones`, the `create_checkout_order` parameters and the order enums.
 * - Confirmed by a real order (ANG-1002): `p_items` keys and `orders.items`.
 * - INFERRED (marked below): the RPC response beyond `order_code`/`total_cents`.
 * The view only returns published products (`publication_status`/`is_live`).
 *
 * All amounts are integer cents (`*_cents`). Format them with `formatCents`.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** UUID string (Postgres `uuid`). */
export type Uuid = string;

/** ISO 8601 timestamp (Postgres `timestamptz`). */
export type IsoDateTime = string;

/** Calendar date `YYYY-MM-DD` (Postgres `date`). */
export type IsoDate = string;

/** Integer number of cents. Never a float, never dollars. */
export type Cents = number;

/** ISO 4217 code; the store uses `USD`. */
export type CurrencyCode = string;

/* ------------------------------------------------------------------ */
/* Media slots (`public.media_slots`)                                  */
/* ------------------------------------------------------------------ */

/** Product slots. They are the only keys of `media_by_slot`. */
export const PRODUCT_SLOT_CODES = [
  "PRODUCT_PRIMARY",
  "PRODUCT_GALLERY",
  "PRODUCT_PRESENTATION",
  "PRODUCT_INFO_GUIDE",
  "PRODUCT_REVIEW_PROOF",
] as const;

export type ProductSlotCode = (typeof PRODUCT_SLOT_CODES)[number];

/** Slots for categories (`CATEGORY`) and for the whole store (`STORE_GLOBAL`). */
export type CategorySlotCode = "CAMPAIGN_BANNER";
export type StoreSlotCode =
  | "STORE_HERO"
  | "STORE_SOCIAL_GALLERY"
  | "STORE_INFO_RESOURCE";

export type MediaSlotCode = ProductSlotCode | CategorySlotCode | StoreSlotCode;

export type MediaSlotScope = "PRODUCT" | "CATEGORY" | "STORE_GLOBAL";

/** Row of `public.media_slots` (slot catalog). */
export interface MediaSlot {
  code: MediaSlotCode;
  scope: MediaSlotScope;
  name: string;
  description: string | null;
  /** `null` = unlimited. `PRODUCT_PRIMARY` and `CAMPAIGN_BANNER` take 1. */
  max_items: number | null;
}

/**
 * One image inside a slot, as the view builds it from `media_placements`
 * joined with `media_assets`.
 */
export interface MediaSlotItem {
  /** `media_placements.id` (pass it as `presentation_placement_id`). */
  placement_id: Uuid;
  /** `media_assets.id` */
  media_id: Uuid;
  /** Public Storage URL (`product-images/{store_id}/{uuid}.webp`). */
  url: string;
  /** `media_assets.alt_text` */
  alt: string | null;
  /** Visible label, e.g. "Envoltura kraft" in `PRODUCT_PRESENTATION`. */
  label: string | null;
  caption: string | null;
  /** Price difference against `price_cents` (only meaningful in `PRODUCT_PRESENTATION`). */
  price_delta_cents: Cents;
}

/**
 * `product.media_by_slot`. Missing slots mean "no images"; each array comes
 * in the placements' `sort_order`. `PRODUCT_PRIMARY` holds at most 1 item.
 */
export type MediaBySlotMap = Partial<Record<ProductSlotCode, MediaSlotItem[]>>;

/* ------------------------------------------------------------------ */
/* Categories (`public.categories`)                                    */
/* ------------------------------------------------------------------ */

/** Groups the storefront filters by. `CAMPAIGN` = special dates. */
export const FILTERABLE_GROUP_TYPES = ["FLOWER_TYPE", "OCCASION", "CAMPAIGN", "FLAVOR"] as const;

export type FilterableGroupType = (typeof FILTERABLE_GROUP_TYPES)[number];

/** `FLOWER_TYPE` and `OCCASION` exist today; open string for new groups. */
export type CategoryGroupType = FilterableGroupType | (string & {});

/**
 * Category as embedded in `v_catalog_products.categories`. Note: the view
 * calls the group `group`, the table calls it `group_type`.
 */
export interface CategoryBadge {
  id: Uuid;
  name: string;
  slug: string;
  group: CategoryGroupType;
}

/** Row of `public.categories` (active categories, to build the filters). */
export interface Category {
  id: Uuid;
  name: string;
  slug: string;
  group_type: CategoryGroupType;
  /** Shown as a quick filter on the storefront. */
  is_featured_filter: boolean;
  sort_order: number;
}

/* ------------------------------------------------------------------ */
/* Catalog (`public.v_catalog_products`)                               */
/* ------------------------------------------------------------------ */

/** Row of the `public.v_catalog_products` view. */
export interface CatalogProduct {
  id: Uuid;
  store_id: Uuid;
  slug: string;
  name: string;
  sku: string | null;
  description: string | null;
  short_description: string | null;
  /** Base price in cents. */
  price_cents: Cents;
  /** Crossed-out "was" price, in cents. */
  compare_at_price_cents: Cents | null;
  is_featured: boolean;
  is_available: boolean;
  sort_order: number;
  /**
   * Cover image already resolved by the view (the `PRODUCT_PRIMARY` asset).
   * `null` → show `/placeholders/default-flower.svg`.
   */
  primary_image_url: string | null;
  media_by_slot: MediaBySlotMap;
  categories: CategoryBadge[];
  /** Free-form attributes (flowers, size, colors…). */
  attributes: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Store (`public.stores`)                                             */
/* ------------------------------------------------------------------ */

/** Public columns of `public.stores` that the storefront reads. */
export interface StorePublic {
  id: Uuid;
  slug: string;
  name: string;
  country_code: string;
  currency: CurrencyCode;
  /** Digits only, no "+", e.g. "5356294401". */
  whatsapp_number: string;
  enable_whatsapp_checkout: boolean;
  is_active: boolean;
  /**
   * Whether the storefront saves orders (`create_checkout_order`) or only
   * builds the WhatsApp message. Optional: older databases lack the column.
   */
  save_orders?: boolean;
  /** Show the delivery zone selector. Optional: older databases lack the column. */
  show_delivery_zone?: boolean;
  /** Payment methods offered on the order form. Optional, like the two above. */
  payment_methods?: PaymentMethod[] | null;
  /** Active payment gateway for online card payments. */
  payment_provider?: PaymentProvider;
  /** Whether to generate a payment link automatically upon order creation. */
  auto_generate_payment_link?: boolean;
  /** Optional surcharge percentage for card payments. */
  card_surcharge_percent?: number;
  /** Theme configuration (JSON), e.g. billboard announcements and checkout config. */
  theme_config?: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ */
/* Store Checkout Config & Fee Breakdown (`stores.theme_config`)        */
/* ------------------------------------------------------------------ */

export type OrderMode = "SINGLE_PRODUCT" | "CART" | "HYBRID";
export type BusinessPreset = "BAKERY_GIFT" | "RESTAURANT" | "RETAIL";
export type ShippingFeeMode =
  | "ZONE_SELECTOR"
  | "FIXED_AT_CHECKOUT"
  | "ADMIN_QUOTE_LATER"
  | "NONE";

export interface StoreExtraFeeRule {
  id: string;
  label: string;
  amount_cents: Cents;
  enabled: boolean;
}

export interface StoreCheckoutConfig {
  order_mode: OrderMode;
  business_preset: BusinessPreset;
  shipping_fee_mode: ShippingFeeMode;
  fixed_shipping_fee_cents: Cents;
  default_extra_fees: StoreExtraFeeRule[];
  allow_immediate_payment_without_shipping: boolean;
}

export interface OrderExtraFeeLine {
  id: string;
  label: string;
  amount_cents: Cents;
}

export interface OrderFeeBreakdown {
  shipping_mode: ShippingFeeMode;
  shipping_quoted: boolean;
  extra_fees: OrderExtraFeeLine[];
  discount_cents: Cents;
  discount_label?: string | null;
  admin_quote_note?: string | null;
  quoted_at?: string | null;
}

/* ------------------------------------------------------------------ */
/* Billboard (`public.store_billboard_items` / `stores.theme_config`) */
/* ------------------------------------------------------------------ */

export type BillboardTargetType = "PRODUCT" | "CATEGORY" | "PRICE_RANGE" | "LINK";
export type BillboardPlacement = "BOTH" | "HOME" | "PEDIDOS";

export interface BillboardItem {
  id: Uuid;
  store_id: Uuid;
  media_id: Uuid | null;
  image_url: string | null;
  image_alt: string | null;
  kicker: string;
  title: string;
  subtitle: string | null;
  cta_label: string;
  target_type: BillboardTargetType;
  target_value: string;
  placement: BillboardPlacement;
  is_active: boolean;
  sort_order: number;
}

/* ------------------------------------------------------------------ */
/* Delivery zones (`public.delivery_zones`)                            */
/* ------------------------------------------------------------------ */

export interface DeliveryZone {
  id: Uuid;
  store_id: Uuid;
  /** e.g. "Centro Habana (Envío Gratis)" */
  name: string;
  /** Delivery cost in cents (0 = free). */
  fee_cents: Cents;
  /** e.g. "2 a 4 horas" */
  estimated_time_text: string | null;
  is_active: boolean;
  sort_order: number;
}

/* ------------------------------------------------------------------ */
/* RPC `create_checkout_order`                                         */
/* ------------------------------------------------------------------ */

/** `public.payment_method_type` */
export type PaymentMethod =
  | "WHATSAPP_COORDINATION"
  | "CARD_LINK"
  | "ZELLE"
  | "TRANSFER"
  | "CASH";

/** `public.order_status_type` */
export type OrderStatus =
  | "PENDING_CONFIRMATION"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

/** `public.payment_provider_type` */
export type PaymentProvider = "NONE" | "TROPIPAY" | "STRIPE" | "MERCADOPAGO";

/**
 * Element of `p_items` (jsonb), keys as specified for the RPC. Only
 * identifiers and quantities: the server reads prices from the database
 * (zero-trust), so the client never sends amounts.
 */
export interface CheckoutOrderItemInput {
  product_id: Uuid;
  quantity: number;
  /** Chosen `PRODUCT_PRESENTATION` placement; `null` = base presentation. */
  presentation_placement_id?: Uuid | null;
}

/**
 * Arguments for `supabase.rpc('create_checkout_order', payload)`. Exact
 * signature of the function: all 13 parameters are required. The RPC rejects
 * an unknown zone ("Zona de entrega inválida.") and unavailable products, and
 * `orders` has NOT NULL on buyer/recipient name and phone, address, date and
 * time slot, so those can never be `null` (send a placeholder instead).
 */
export interface CreateCheckoutOrderPayload {
  p_store_id: Uuid;
  p_buyer_name: string;
  p_buyer_phone: string;
  p_buyer_email: string | null;
  p_recipient_name: string;
  p_recipient_phone: string;
  /** Required: it sets the delivery fee. */
  p_delivery_zone_id: Uuid;
  p_delivery_address: string;
  p_delivery_date: IsoDate;
  /** e.g. "Mañana (9:00 AM - 1:00 PM)" (the column default). */
  p_delivery_time_slot: string;
  p_card_message: string | null;
  p_preferred_payment: PaymentMethod;
  p_items: CheckoutOrderItemInput[];
}

/** Server-validated line, exactly as the RPC stores it in `orders.items` (seen on ANG-1002). */
export interface CheckoutOrderItem {
  product_id: Uuid;
  name: string;
  quantity: number;
  presentation_label: string | null;
  unit_price_cents: Cents;
  line_total_cents: Cents;
}

/**
 * RPC response: the only source of the amounts and of the order code used to
 * build the WhatsApp (`wa.me`) link. `order_code` (e.g. "ANG-1001") and
 * `total_cents` are guaranteed; the rest mirrors the `orders` columns and is
 * INFERRED (the API does not expose the return type), so treat it as optional.
 */
export interface CreateCheckoutOrderResponse {
  order_code: string;
  total_cents: Cents;
  order_id?: Uuid;
  tracking_token?: string;
  status?: OrderStatus;
  currency?: CurrencyCode;
  items?: CheckoutOrderItem[];
  subtotal_cents?: Cents;
  delivery_fee_cents?: Cents;
  delivery_zone_name?: string;
  payment_provider?: PaymentProvider;
  payment_link_url?: string | null;
  /** Store WhatsApp number (`stores.whatsapp_number`), digits only. */
  whatsapp_number?: string;
  created_at?: IsoDateTime;
}

/* ------------------------------------------------------------------ */
/* Helpers & 3-Format Product Model (Medovik Mérida)                   */
/* ------------------------------------------------------------------ */

export type MedovikFormatCode = "rebanada" | "mediano" | "grande";

export interface ProductFormatOption {
  id: string;
  code: MedovikFormatCode;
  label: string;
  short_label: string;
  weight: string;
  servings: string;
  lead_time: string;
  price_cents: Cents;
  price_delta_cents: Cents;
  show_price?: boolean;
  image?: string;
}

/** Extract the 3 formats (Rebanada, Mediano, Grande) for a Medovik product. */
export function getProductFormats(product: CatalogProduct): ProductFormatOption[] {
  const rawFormats = product.attributes?.formats;
  if (Array.isArray(rawFormats) && rawFormats.length > 0) {
    return rawFormats as ProductFormatOption[];
  }
  const basePrice = product.price_cents || 50000;
  const isPremium =
    product.slug.includes("spartak") ||
    product.slug.includes("caramelo") ||
    basePrice >= 60000;
  const medianoPrice = isPremium ? 60000 : 50000;
  const grandePrice = isPremium ? 120000 : 100000;

  return [
    {
      id: `${product.slug}-rebanada`,
      code: "rebanada",
      label: "Rebanada Individual (~180 g)",
      short_label: "Rebanada (~180 g)",
      weight: "~180 g",
      servings: "1 porción generosa",
      lead_time: "Sujeta a disponibilidad del día (consultar antes de pedir)",
      price_cents: 10000,
      price_delta_cents: 10000 - medianoPrice,
      show_price: Boolean(product.attributes?.show_price),
      image: product.primary_image_url ?? undefined,
    },
    {
      id: `${product.slug}-mediano`,
      code: "mediano",
      label: "Pastel Mediano (~1,225 kg)",
      short_label: "Mediano (~1.225 kg)",
      weight: "~1,225 kg",
      servings: "8 a 10 porciones",
      lead_time: "Pedir al menos 2 días antes · 50% de anticipo",
      price_cents: medianoPrice,
      price_delta_cents: 0,
      show_price: Boolean(product.attributes?.show_price),
      image: product.primary_image_url ?? undefined,
    },
    {
      id: `${product.slug}-grande`,
      code: "grande",
      label: "Pastel Grande (~2,45 kg)",
      short_label: "Grande (~2.45 kg)",
      weight: "~2,45 kg",
      servings: "16 a 20 porciones",
      lead_time: "Pedir al menos 2 días antes · 50% de anticipo",
      price_cents: grandePrice,
      price_delta_cents: grandePrice - medianoPrice,
      show_price: Boolean(product.attributes?.show_price),
      image: product.primary_image_url ?? undefined,
    },
  ];
}

/**
 * Determines whether a product's price should be displayed.
 * Supports:
 * 1. Per-product override (e.g. from the interactive Demo Controls or product attributes)
 * 2. Global store toggle (`showPrices`, which defaults to `false` in Demo Catalog mode)
 */
export function isProductPriceVisible(
  product: CatalogProduct | { slug?: string; id?: string; attributes?: Record<string, unknown> },
  globalShowPrices = false,
  productPriceOverrides?: Record<string, boolean>,
): boolean {
  const key = product.slug || product.id || "";
  if (productPriceOverrides && key in productPriceOverrides) {
    return Boolean(productPriceOverrides[key]);
  }
  if (typeof product.attributes?.show_price === "boolean" && product.attributes.show_price) {
    return true;
  }
  return Boolean(globalShowPrices);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Cents → "1,200" (or "1,200.50" if non-integer pesos). */
export function formatCents(cents: Cents): string {
  const amount = cents / 100;
  return Number.isInteger(amount)
    ? amount.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


