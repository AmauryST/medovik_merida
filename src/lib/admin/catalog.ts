import "server-only";

import type { AdminContext } from "@/lib/admin/session";
import type {
  AdminCategory,
  AdminCategoryItem,
  AdminPlacement,
  AdminProduct,
  AdminProductListItem,
} from "@/types/admin";
import { ADMIN_PRODUCT_SLOTS } from "@/types/admin";
import type { Uuid } from "@/types/catalog";

const PRODUCT_COLUMNS =
  "id, name, slug, short_description, description, price_cents, is_available, is_featured, is_live, publication_status, sort_order, draft_data";
const PLACEMENT_COLUMNS =
  "id, product_id, slot_code, label, caption, price_delta_cents, sort_order, is_live, publication_status, draft_data, media:media_assets(id, public_url, alt_text)";

function fail(label: string, message: string): never {
  throw new Error(`No se pudo cargar ${label}: ${message}`);
}

async function listCategories({ supabase, store }: AdminContext): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, group_type, is_featured_filter, sort_order")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("group_type")
    .order("sort_order")
    .overrideTypes<AdminCategory[], { merge: false }>();
  if (error) fail("las categorías", error.message);
  return data;
}

/**
 * Every classification of the store (including inactive ones) with its linked
 * product count, for `/admin/catalogo/categorias`.
 */
export async function listAdminCategories({ supabase, store }: AdminContext): Promise<AdminCategoryItem[]> {
  const [categories, links] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, group_type, is_featured_filter, sort_order, is_active")
      .eq("store_id", store.id)
      .order("group_type")
      .order("sort_order")
      .order("name")
      .overrideTypes<Omit<AdminCategoryItem, "product_count">[], { merge: false }>(),
    supabase
      .from("product_categories")
      .select("category_id")
      .eq("store_id", store.id)
      .overrideTypes<{ category_id: Uuid }[], { merge: false }>(),
  ]);
  if (categories.error) fail("las clasificaciones", categories.error.message);
  if (links.error) fail("los vínculos de categorías", links.error.message);

  const countByCategory = new Map<Uuid, number>();
  for (const row of links.data) {
    countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
  }

  return categories.data.map((cat) => ({
    ...cat,
    product_count: countByCategory.get(cat.id) ?? 0,
  }));
}

/**
 * Every product of the store (drafts too, unlike `v_catalog_products`), with
 * its cover and category ids, for the catalog list.
 */
export async function listAdminProducts(
  ctx: AdminContext,
): Promise<{ products: AdminProductListItem[]; categories: AdminCategory[] }> {
  const { supabase, store } = ctx;

  const [products, covers, links, categories] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("store_id", store.id)
      .neq("publication_status", "ARCHIVED")
      .order("sort_order")
      .order("name")
      .overrideTypes<AdminProduct[], { merge: false }>(),
    supabase
      .from("media_placements")
      .select("product_id, media:media_assets(public_url)")
      .eq("store_id", store.id)
      .eq("slot_code", "PRODUCT_PRIMARY")
      .eq("is_active", true)
      .not("product_id", "is", null)
      .overrideTypes<{ product_id: Uuid; media: { public_url: string } | null }[], { merge: false }>(),
    supabase
      .from("product_categories")
      .select("product_id, category_id")
      .eq("store_id", store.id)
      .overrideTypes<{ product_id: Uuid; category_id: Uuid }[], { merge: false }>(),
    listCategories(ctx),
  ]);
  if (products.error) fail("los productos", products.error.message);
  if (covers.error) fail("las portadas", covers.error.message);
  if (links.error) fail("las categorías de los productos", links.error.message);

  const coverByProduct = new Map(covers.data.map((row) => [row.product_id, row.media?.public_url ?? null]));
  const categoriesByProduct = new Map<Uuid, Uuid[]>();
  for (const link of links.data) {
    const ids = categoriesByProduct.get(link.product_id) ?? [];
    ids.push(link.category_id);
    categoriesByProduct.set(link.product_id, ids);
  }

  return {
    products: products.data.map((product) => ({
      ...product,
      cover_url: coverByProduct.get(product.id) ?? null,
      category_ids: categoriesByProduct.get(product.id) ?? [],
    })),
    categories,
  };
}

export interface PendingProduct {
  product: AdminProduct;
  /** Cover in production (null for a new product). */
  liveCoverUrl: string | null;
  /** Placements created or changed since the last approval. */
  pendingPlacements: AdminPlacement[];
}

/**
 * Products waiting for approval: flagged `PENDING_APPROVAL`, with a draft,
 * or with unpublished photos.
 */
export async function listPendingProducts(ctx: AdminContext): Promise<PendingProduct[]> {
  const { supabase, store } = ctx;

  const placements = await supabase
    .from("media_placements")
    .select(PLACEMENT_COLUMNS)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .not("product_id", "is", null)
    .in("slot_code", [...ADMIN_PRODUCT_SLOTS])
    .order("sort_order")
    .overrideTypes<AdminPlacement[], { merge: false }>();
  if (placements.error) fail("las fotos", placements.error.message);

  const pendingPlacements = placements.data.filter((p) => p.publication_status === "PENDING_APPROVAL" || !p.is_live);
  const productIds = [...new Set(pendingPlacements.map((p) => p.product_id))];

  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", store.id)
    .neq("publication_status", "ARCHIVED");
  query = productIds.length
    ? query.or(`publication_status.eq.PENDING_APPROVAL,draft_data.not.is.null,id.in.(${productIds.join(",")})`)
    : query.or("publication_status.eq.PENDING_APPROVAL,draft_data.not.is.null");
  const products = await query.order("sort_order").overrideTypes<AdminProduct[], { merge: false }>();
  if (products.error) fail("los pasteles pendientes", products.error.message);

  return products.data.map((product) => ({
    product,
    liveCoverUrl:
      placements.data.find((p) => p.product_id === product.id && p.slot_code === "PRODUCT_PRIMARY" && p.is_live)?.media
        ?.public_url ?? null,
    pendingPlacements: pendingPlacements.filter((p) => p.product_id === product.id),
  }));
}

export interface AdminProductDetail {
  product: AdminProduct;
  placements: AdminPlacement[];
  categoryIds: Uuid[];
  categories: AdminCategory[];
}

/** One product with all its active placements, for the product page. `null` = not in this store. */
export async function getAdminProduct(ctx: AdminContext, productId: Uuid): Promise<AdminProductDetail | null> {
  const { supabase, store } = ctx;

  const [product, placements, links, categories] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("store_id", store.id)
      .eq("id", productId)
      .maybeSingle<AdminProduct>(),
    supabase
      .from("media_placements")
      .select(PLACEMENT_COLUMNS)
      .eq("store_id", store.id)
      .eq("product_id", productId)
      .eq("is_active", true)
      .in("slot_code", [...ADMIN_PRODUCT_SLOTS])
      .order("sort_order")
      .order("created_at")
      .overrideTypes<AdminPlacement[], { merge: false }>(),
    supabase
      .from("product_categories")
      .select("category_id")
      .eq("store_id", store.id)
      .eq("product_id", productId)
      .overrideTypes<{ category_id: Uuid }[], { merge: false }>(),
    listCategories(ctx),
  ]);
  if (product.error) fail("el producto", product.error.message);
  if (placements.error) fail("las fotos", placements.error.message);
  if (links.error) fail("las categorías del producto", links.error.message);
  if (!product.data) return null;

  return {
    product: product.data,
    placements: placements.data,
    categoryIds: links.data.map((link) => link.category_id),
    categories,
  };
}

