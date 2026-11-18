import "server-only";

import { getAdminAccess } from "@/lib/admin/session";
import { getHomeCatalogData, type HomeCatalogData } from "@/lib/catalog/queries";
import type {
  CatalogProduct,
  CategoryBadge,
  MediaBySlotMap,
  MediaSlotItem,
  ProductSlotCode,
  Uuid,
} from "@/types/catalog";
import { PRODUCT_SLOT_CODES } from "@/types/catalog";

/** Row of `v_catalog_products_staging`: live columns with `draft_data` applied. */
interface StagingRow {
  id: Uuid;
  store_id: Uuid;
  sku: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  is_available: boolean;
  is_live: boolean;
}

interface PreviewPlacement {
  id: Uuid;
  product_id: Uuid;
  slot_code: ProductSlotCode;
  label: string | null;
  caption: string | null;
  price_delta_cents: number;
  sort_order: number;
  is_live: boolean;
  draft_data: { label?: string; caption?: string; price_delta_cents?: number; is_active?: boolean } | null;
  media: { id: Uuid; public_url: string; alt_text: string | null } | null;
}

/**
 * Home catalog as it will look once every pending change is approved, for
 * Draft Mode. Reads with the member's session: product fields from
 * `v_catalog_products_staging`, photos from `media_placements` including
 * unpublished ones (with their drafts applied, staged removals left out and a
 * new cover replacing the live one). `null` if the visitor is not a member.
 */
export async function getPreviewCatalogData(): Promise<HomeCatalogData | null> {
  const access = await getAdminAccess();
  if (access.status !== "ok") return null;
  const { supabase, store } = access;

  // Store, zones and categories are not staged: reuse the public query.
  const base = await getHomeCatalogData();

  const [staging, extra, placements, links] = await Promise.all([
    supabase
      .from("v_catalog_products_staging")
      .select("id, store_id, sku, name, slug, short_description, description, price_cents, compare_at_price_cents, is_available, is_live")
      .eq("store_id", store.id)
      .eq("is_available", true)
      .overrideTypes<StagingRow[], { merge: false }>(),
    supabase
      .from("products")
      .select("id, sort_order, is_featured, attributes")
      .eq("store_id", store.id)
      .overrideTypes<
        { id: Uuid; sort_order: number; is_featured: boolean; attributes: Record<string, unknown> | null }[],
        { merge: false }
      >(),
    supabase
      .from("media_placements")
      .select("id, product_id, slot_code, label, caption, price_delta_cents, sort_order, is_live, draft_data, media:media_assets(id, public_url, alt_text)")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .in("slot_code", [...PRODUCT_SLOT_CODES])
      .not("product_id", "is", null)
      .order("sort_order")
      .overrideTypes<PreviewPlacement[], { merge: false }>(),
    supabase
      .from("product_categories")
      .select("product_id, category_id")
      .eq("store_id", store.id)
      .overrideTypes<{ product_id: Uuid; category_id: Uuid }[], { merge: false }>(),
  ]);
  for (const [label, result] of [
    ["v_catalog_products_staging", staging],
    ["products", extra],
    ["media_placements", placements],
    ["product_categories", links],
  ] as const) {
    if (result.error) throw new Error(`Vista previa: no se pudo cargar ${label}: ${result.error.message}`);
  }

  const extraById = new Map((extra.data ?? []).map((row) => [row.id, row]));
  const categoryById = new Map(base.categories.map((c) => [c.id, c]));

  const mediaByProduct = new Map<Uuid, MediaBySlotMap>();
  for (const placement of placements.data ?? []) {
    const draft = placement.draft_data ?? {};
    if (draft.is_active === false || !placement.media) continue;
    const item: MediaSlotItem = {
      placement_id: placement.id,
      media_id: placement.media.id,
      url: placement.media.public_url,
      alt: placement.media.alt_text,
      label: draft.label ?? placement.label,
      caption: draft.caption ?? placement.caption,
      price_delta_cents: draft.price_delta_cents ?? placement.price_delta_cents,
    };
    const map = mediaByProduct.get(placement.product_id) ?? {};
    const list = map[placement.slot_code] ?? [];
    // One cover: an unpublished (new) one wins over the live one.
    if (placement.slot_code === "PRODUCT_PRIMARY") {
      if (list.length === 0 || !placement.is_live) map.PRODUCT_PRIMARY = [item];
    } else {
      list.push(item);
      map[placement.slot_code] = list;
    }
    mediaByProduct.set(placement.product_id, map);
  }

  const categoriesByProduct = new Map<Uuid, CategoryBadge[]>();
  for (const link of links.data ?? []) {
    const category = categoryById.get(link.category_id);
    if (!category) continue;
    const list = categoriesByProduct.get(link.product_id) ?? [];
    list.push({ id: category.id, name: category.name, slug: category.slug, group: category.group_type });
    categoriesByProduct.set(link.product_id, list);
  }

  const products: CatalogProduct[] = (staging.data ?? []).map((row) => {
    const more = extraById.get(row.id);
    const media = mediaByProduct.get(row.id) ?? {};
    return {
      id: row.id,
      store_id: row.store_id,
      slug: row.slug,
      name: row.name,
      sku: row.sku,
      description: row.description,
      short_description: row.short_description,
      price_cents: row.price_cents,
      compare_at_price_cents: row.compare_at_price_cents,
      is_featured: more?.is_featured ?? false,
      is_available: row.is_available,
      sort_order: more?.sort_order ?? 0,
      primary_image_url: media.PRODUCT_PRIMARY?.[0]?.url ?? null,
      media_by_slot: media,
      categories: categoriesByProduct.get(row.id) ?? [],
      attributes: more?.attributes ?? {},
    };
  });
  // Same order as the public catalog: cheapest first, ties by sort_order.
  products.sort((a, b) => a.price_cents - b.price_cents || a.sort_order - b.sort_order);

  return { ...base, products };
}
