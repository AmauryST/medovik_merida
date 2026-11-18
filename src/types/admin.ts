/**
 * Types for the admin panel (`/admin`). Unlike `catalog.ts`, these read the
 * base tables (`products`, `media_placements`...) through the signed-in member's
 * session, so they include unpublished rows.
 */
import type {
  Category,
  Cents,
  CurrencyCode,
  IsoDateTime,
  OrderFeeBreakdown,
  OrderStatus,
  ProductSlotCode,
  Uuid,
} from "./catalog";

/** `public.publication_status_type` */
export type PublicationStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";

/** `store_members.role` (free text; `OWNER` is the default). */
export type StoreMemberRole = "OWNER" | (string & {});

/** Slots the admin can manage from a product's page, in display order. */
export const ADMIN_PRODUCT_SLOTS = [
  "PRODUCT_PRIMARY",
  "PRODUCT_GALLERY",
  "PRODUCT_PRESENTATION",
  "PRODUCT_INFO_GUIDE",
  "PRODUCT_REVIEW_PROOF",
] as const satisfies readonly ProductSlotCode[];

export const SLOT_LABELS: Record<ProductSlotCode, { title: string; hint: string }> = {
  PRODUCT_PRIMARY: { title: "Portada", hint: "Foto de la tarjeta del catálogo. Solo una." },
  PRODUCT_GALLERY: { title: "Galería", hint: "Otros ángulos del pastel, en este orden." },
  PRODUCT_PRESENTATION: {
    title: "Presentaciones",
    hint: "Porciones o tamaños, con su nombre y cuánto suman al precio.",
  },
  PRODUCT_INFO_GUIDE: { title: "Guía", hint: "Porciones, conservación o qué incluye." },
  PRODUCT_REVIEW_PROOF: { title: "Entregas reales", hint: "Fotos de este pastel ya entregado." },
};

/** `media_assets` columns the admin shows. */
export interface AdminMediaAsset {
  id: Uuid;
  public_url: string;
  alt_text: string | null;
}

/** `media_placements` row with its asset embedded. */
export interface AdminPlacement {
  id: Uuid;
  product_id: Uuid;
  slot_code: ProductSlotCode;
  label: string | null;
  caption: string | null;
  price_delta_cents: Cents;
  sort_order: number;
  is_live: boolean;
  publication_status: PublicationStatus;
  /** Pending edits of a live placement: `{ label, price_delta_cents }` or `{ is_active: false }`. */
  draft_data: unknown;
  media: AdminMediaAsset | null;
}

/** `products` columns the admin edits or shows. */
export interface AdminProduct {
  id: Uuid;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price_cents: Cents;
  is_available: boolean;
  is_featured: boolean;
  is_live: boolean;
  publication_status: PublicationStatus;
  sort_order: number;
  /** Pending edits of a live product (see `lib/admin/staging.ts`). */
  draft_data: unknown;
}

/** Row of the catalog list: product + cover + its category ids. */
export interface AdminProductListItem extends AdminProduct {
  cover_url: string | null;
  category_ids: Uuid[];
}

export type AdminCategory = Category;

/** Row of `public.categories` in the admin classifications manager (includes inactive rows). */
export interface AdminCategoryItem extends Category {
  is_active: boolean;
  product_count: number;
}

/** `orders` columns of the live orders list and order management drawer. */
export interface AdminOrderRow {
  id: Uuid;
  /** Folio, e.g. "DEL-1002". */
  order_code: string;
  /** Encrypted tracking token for public order status URL. */
  tracking_token?: string;
  status: OrderStatus;
  created_at: IsoDateTime;
  subtotal_cents?: Cents;
  delivery_fee_cents?: Cents;
  payment_fee_cents?: Cents;
  total_cents: Cents;
  currency: CurrencyCode;
  buyer_name?: string;
  buyer_phone?: string;
  buyer_email?: string | null;
  recipient_name?: string;
  recipient_phone?: string;
  delivery_zone_name?: string | null;
  delivery_address?: string;
  delivery_date?: string;
  delivery_time_slot?: string;
  card_message?: string | null;
  items?: Array<{
    product_id: Uuid;
    name: string;
    quantity: number;
    unit_price_cents: Cents;
    line_total_cents: Cents;
    presentation_label: string | null;
  }>;
  preferred_payment_method?: string;
  payment_provider?: string;
  payment_link_url?: string | null;
  external_payment_id?: string | null;
  external_reference?: string | null;
  paid_at?: IsoDateTime | null;
  special_instructions?: string | null;
  webhook_payload?: OrderTrackingMeta | Record<string, unknown> | null;
}

export type CrmProviderType = "NONE" | "BREVO" | "HUBSPOT" | "WEBHOOK";

export interface OrderTrackingEvent {
  timestamp: string;
  status: OrderStatus;
  title: string;
  detail?: string;
}

export interface OrderEmailLog {
  timestamp: string;
  status: OrderStatus;
  to: string;
  subject: string;
  ok: boolean;
  provider_id?: string | null;
  error?: string | null;
}

export interface OrderCrmSyncLog {
  synced_at: string;
  provider: CrmProviderType;
  ok: boolean;
  external_id?: string | null;
  error?: string | null;
}

export interface OrderTrackingMeta {
  tracking_token?: string;
  timeline?: OrderTrackingEvent[];
  email_logs?: OrderEmailLog[];
  crm_sync?: OrderCrmSyncLog | null;
  crm_notes?: string;
  customer_tags?: string[];
  tropipay_webhook?: unknown;
  fee_breakdown?: OrderFeeBreakdown | null;
}

export type NotifiableOrderStatus =
  | "AWAITING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface EmailTemplateItem {
  enabled: boolean;
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
}

export type StoreEmailTemplates = Record<NotifiableOrderStatus, EmailTemplateItem>;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "Por confirmar",
  AWAITING_PAYMENT: "Esperando pago",
  PAID: "Pagado",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

/** Result of a Server Action, shown inline by the form that called it. */
export type ActionResult = { ok: true } | { ok: false; error: string };
