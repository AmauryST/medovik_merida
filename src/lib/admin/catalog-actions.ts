"use server";

import { revalidatePath } from "next/cache";

import {
  MAX_UPLOAD_BYTES,
  PRODUCT_IMAGES_BUCKET,
  isUuid,
  productImagePath,
} from "@/lib/admin/media";
import { requireAdmin, type AdminContext } from "@/lib/admin/session";
import {
  DRAFT_FIELDS,
  readDraft,
  type EditableProductFields,
  type ProductDraft,
} from "@/lib/admin/staging";
import { ADMIN_PRODUCT_SLOTS, type ActionResult } from "@/types/admin";
import type { Cents, ProductSlotCode, Uuid } from "@/types/catalog";

/*
 * Catalog writes. Every action re-checks membership (`requireAdmin`), scopes
 * each query to the member's store and runs with the member's session, so RLS
 * has the final word. Amounts arrive already in integer cents.
 */

const MAX_PRICE_CENTS = 10_000_000;
const MAX_NAME_LENGTH = 120;
const MAX_SHORT_DESCRIPTION_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LABEL_LENGTH = 60;
const MAX_ALT_LENGTH = 200;

function failure(error: string): ActionResult {
  return { ok: false, error };
}

/** Admin pages and the public catalog (ISR) show the change at once. */
function refresh(): void {
  revalidatePath("/", "layout");
}

/**
 * Every new photo starts unpublished: the OWNER publishes it together with
 * the product through `approve_and_publish_product`.
 */
const PENDING = { publication_status: "PENDING_APPROVAL", is_live: false } as const;

/** Flags a product for the "Pendientes de aprobación" list without touching its live columns. */
async function markProductPending(ctx: AdminContext, productId: Uuid): Promise<string | null> {
  const { error } = await ctx.supabase
    .from("products")
    .update({ publication_status: "PENDING_APPROVAL", submitted_by: ctx.user.id })
    .eq("store_id", ctx.store.id)
    .eq("id", productId);
  return error ? error.message : null;
}

/** An update that matched no row (wrong store, or RLS filtered it) comes back empty. */
function noRows(rows: unknown[] | null): boolean {
  return !rows || rows.length === 0;
}

const NOT_ALLOWED = "No se guardó: el registro no existe o tu cuenta no tiene permiso para cambiarlo.";

async function productInStore(ctx: AdminContext, productId: Uuid): Promise<boolean> {
  const { data } = await ctx.supabase
    .from("products")
    .select("id")
    .eq("store_id", ctx.store.id)
    .eq("id", productId)
    .maybeSingle();
  return Boolean(data);
}

/* ------------------------------------------------------------------ */
/* Product fields                                                      */
/* ------------------------------------------------------------------ */

export async function setProductAvailability(productId: Uuid, isAvailable: boolean): Promise<ActionResult> {
  if (!isUuid(productId) || typeof isAvailable !== "boolean") return failure("Datos no válidos.");
  const ctx = await requireAdmin();

  const { data, error } = await ctx.supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("store_id", ctx.store.id)
    .eq("id", productId)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (noRows(data)) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

export async function setProductFeatured(productId: Uuid, isFeatured: boolean): Promise<ActionResult> {
  if (!isUuid(productId) || typeof isFeatured !== "boolean") return failure("Datos no válidos.");
  const ctx = await requireAdmin();

  const { data, error } = await ctx.supabase
    .from("products")
    .update({ is_featured: isFeatured })
    .eq("store_id", ctx.store.id)
    .eq("id", productId)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (noRows(data)) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

export interface ProductDetailsInput {
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: Cents;
}

function cleanDetails(input: ProductDetailsInput): Required<ProductDraft> | string {
  const name = cleanText(input.name, MAX_NAME_LENGTH);
  if (!name) return "Escribe el nombre del pastel.";
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0 || input.priceCents > MAX_PRICE_CENTS) {
    return "El precio debe ser mayor que 0.";
  }
  return {
    name,
    short_description: cleanText(input.shortDescription, MAX_SHORT_DESCRIPTION_LENGTH),
    description: cleanText(input.description, MAX_DESCRIPTION_LENGTH),
    price_cents: input.priceCents,
  };
}

/**
 * Name, descriptions and price. A live product keeps its live columns: the
 * changes go to `draft_data` and the product waits for approval. Typing the
 * live values back clears the draft. A product that is not live yet is
 * edited in place (nobody sees it until it is approved).
 */
export async function saveProductDetails(productId: Uuid, input: ProductDetailsInput): Promise<ActionResult> {
  if (!isUuid(productId)) return failure("Datos no válidos.");
  const values = cleanDetails(input);
  if (typeof values === "string") return failure(values);
  const ctx = await requireAdmin();
  const { supabase, store } = ctx;

  const { data: product, error: readError } = await supabase
    .from("products")
    .select("id, is_live, publication_status, draft_data, name, short_description, description, price_cents")
    .eq("store_id", store.id)
    .eq("id", productId)
    .maybeSingle<EditableProductFields & { id: Uuid; is_live: boolean; publication_status: string; draft_data: unknown }>();
  if (readError) return failure(`No se pudo leer el pastel: ${readError.message}`);
  if (!product) return failure(NOT_ALLOWED);

  let update: Record<string, unknown>;
  if (product.is_live) {
    const draft: ProductDraft = { ...readDraft(product.draft_data) };
    for (const field of DRAFT_FIELDS) {
      // The RPC applies drafts with coalesce(draft, live): a cleared text must be "" to win.
      const value = values[field] ?? "";
      if (value === (product[field] ?? "")) delete draft[field];
      else Object.assign(draft, { [field]: value });
    }
    const hasDraft = Object.keys(draft).length > 0;
    if (hasDraft) {
      update = { draft_data: draft, publication_status: "PENDING_APPROVAL", submitted_by: ctx.user.id };
    } else {
      // Nothing left to approve unless a photo of the product is still pending.
      const { data: pendingPhotos, error: photosError } = await supabase
        .from("media_placements")
        .select("id")
        .eq("store_id", store.id)
        .eq("product_id", productId)
        .or("publication_status.eq.PENDING_APPROVAL,is_live.eq.false")
        .limit(1);
      if (photosError) return failure(`No se pudo leer las fotos: ${photosError.message}`);
      update = noRows(pendingPhotos)
        ? { draft_data: null, publication_status: "PUBLISHED", submitted_by: null }
        : { draft_data: null };
    }
  } else {
    update = { ...values, submitted_by: ctx.user.id };
  }

  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("store_id", store.id)
    .eq("id", productId)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (noRows(data)) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

/** Same rule as `slug()` in build.py, so storefront URLs look alike. */
function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** New product: unpublished (`PENDING_APPROVAL`, `is_live = false`) until an OWNER approves it. */
export async function createProduct(
  input: ProductDetailsInput,
): Promise<{ ok: true; productId: Uuid } | { ok: false; error: string }> {
  const values = cleanDetails(input);
  if (typeof values === "string") return { ok: false, error: values };
  const ctx = await requireAdmin();
  const { supabase, store } = ctx;

  const base = slugify(values.name) || "pastel";
  const { data: taken } = await supabase
    .from("products")
    .select("slug")
    .eq("store_id", store.id)
    .like("slug", `${base}%`)
    .overrideTypes<{ slug: string }[], { merge: false }>();
  const used = new Set((taken ?? []).map((row) => row.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;

  const { data: last } = await supabase
    .from("products")
    .select("sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...values,
      store_id: store.id,
      slug,
      is_available: true,
      is_featured: false,
      sort_order: (last?.sort_order ?? 0) + 1,
      attributes: {},
      publication_status: "PENDING_APPROVAL",
      is_live: false,
      submitted_by: ctx.user.id,
    })
    .select("id")
    .single<{ id: Uuid }>();
  if (error) return { ok: false, error: `No se cre\u00f3 el pastel: ${error.message}` };

  refresh();
  return { ok: true, productId: data.id };
}

/**
 * OWNER only: publishes the product's pending changes (draft_data, new or
 * edited photos) with `approve_and_publish_product`, which re-checks the
 * role in the database, then refreshes the public catalog at once.
 */
export async function approveProduct(productId: Uuid): Promise<ActionResult> {
  if (!isUuid(productId)) return failure("Datos no válidos.");
  const ctx = await requireAdmin();
  if (ctx.role !== "OWNER") return failure("Solo la dueña o el dueño de la tienda puede aprobar.");
  if (!(await productInStore(ctx, productId))) return failure(NOT_ALLOWED);

  const { supabase, store } = ctx;

  // The RPC publishes every pending placement but neither applies a staged
  // removal (`draft_data.is_active = false`) nor keeps PRODUCT_PRIMARY at one
  // item, and it clears draft_data: read both before calling it.
  const { data: placements, error: readError } = await supabase
    .from("media_placements")
    .select("id, slot_code, is_live, draft_data, publication_status")
    .eq("store_id", store.id)
    .eq("product_id", productId)
    .eq("is_active", true)
    .overrideTypes<
      { id: Uuid; slot_code: string; is_live: boolean; draft_data: { is_active?: boolean } | null; publication_status: string }[],
      { merge: false }
    >();
  if (readError) return failure(`No se pudo leer las fotos: ${readError.message}`);

  const toRemove = placements.filter((p) => p.draft_data?.is_active === false).map((p) => p.id);
  const newCover = placements.find((p) => p.slot_code === "PRODUCT_PRIMARY" && !p.is_live);
  if (newCover) {
    for (const p of placements) {
      if (p.slot_code === "PRODUCT_PRIMARY" && p.id !== newCover.id) toRemove.push(p.id);
    }
  }

  const { error } = await supabase.rpc("approve_and_publish_product", { p_product_id: productId });
  if (error) return failure(`No se publicó: ${error.message}`);

  if (toRemove.length > 0) {
    // Out of the slot only; the files stay in media_assets.
    const { error: removeError } = await supabase
      .from("media_placements")
      .delete()
      .eq("store_id", store.id)
      .in("id", [...new Set(toRemove)]);
    if (removeError) {
      revalidatePath("/");
      refresh();
      return failure(`Se publicó, pero no se pudieron quitar ${toRemove.length} foto(s): ${removeError.message}`);
    }
  }

  revalidatePath("/");
  refresh();
  return { ok: true };
}

/** Adds or removes one N:M link in `product_categories`. */
export async function setProductCategory(
  productId: Uuid,
  categoryId: Uuid,
  enabled: boolean,
): Promise<ActionResult> {
  if (!isUuid(productId) || !isUuid(categoryId) || typeof enabled !== "boolean") {
    return failure("Datos no válidos.");
  }
  const ctx = await requireAdmin();
  const { supabase, store } = ctx;

  if (!(await productInStore(ctx, productId))) return failure(NOT_ALLOWED);
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", store.id)
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) return failure(NOT_ALLOWED);

  if (enabled) {
    const { error } = await supabase
      .from("product_categories")
      .upsert(
        { product_id: productId, category_id: categoryId, store_id: store.id },
        { onConflict: "product_id,category_id", ignoreDuplicates: true },
      );
    if (error) return failure(`No se guardó: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("store_id", store.id)
      .eq("product_id", productId)
      .eq("category_id", categoryId);
    if (error) return failure(`No se guardó: ${error.message}`);
  }

  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Media slots                                                         */
/* ------------------------------------------------------------------ */

function isProductSlot(value: unknown): value is ProductSlotCode {
  return typeof value === "string" && (ADMIN_PRODUCT_SLOTS as readonly string[]).includes(value);
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

function isDelta(value: unknown): value is Cents {
  return typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= MAX_PRICE_CENTS;
}

export interface AttachUploadedImageInput {
  productId: Uuid;
  slotCode: ProductSlotCode;
  /** UUID the browser used for the file name: `{store_id}/{mediaId}.webp`. */
  mediaId: Uuid;
  fileSizeBytes: number;
  altText: string | null;
  /** Only for `PRODUCT_PRESENTATION`. */
  label?: string | null;
  priceDeltaCents?: Cents;
}

/**
 * Second half of an upload: the browser already compressed the photo and
 * stored it in `product-images/{store_id}/{mediaId}.webp`. Registers it in
 * `media_assets` and places it in the product's slot (`media_placements`).
 * The storage path and public URL are built here, never taken from the client.
 */
export async function attachUploadedImage(input: AttachUploadedImageInput): Promise<ActionResult> {
  const { productId, slotCode, mediaId, fileSizeBytes } = input;
  if (!isUuid(productId) || !isUuid(mediaId) || !isProductSlot(slotCode)) {
    return failure("Datos no válidos.");
  }
  if (!Number.isInteger(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > MAX_UPLOAD_BYTES) {
    return failure("La foto pesa demasiado.");
  }
  const isPresentation = slotCode === "PRODUCT_PRESENTATION";
  const label = isPresentation ? cleanText(input.label, MAX_LABEL_LENGTH) : null;
  const priceDelta = isPresentation ? (input.priceDeltaCents ?? 0) : 0;
  if (isPresentation && !label) return failure("Escribe el nombre de la presentación.");
  if (!isDelta(priceDelta)) return failure("La diferencia de precio no es válida.");

  const ctx = await requireAdmin();
  const { supabase, store } = ctx;
  if (!(await productInStore(ctx, productId))) return failure(NOT_ALLOWED);

  // The file must already be in this store's folder.
  const storagePath = productImagePath(store.id, mediaId);
  const bucket = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const { data: listed, error: listError } = await bucket.list(store.id, { search: `${mediaId}.webp`, limit: 1 });
  if (listError) return failure(`No se pudo comprobar la foto: ${listError.message}`);
  const stored = listed?.find((file) => file.name === `${mediaId}.webp`);
  if (!stored) {
    return failure("La foto no llegó al almacenamiento. Vuelve a intentarlo.");
  }
  // Trust what Storage recorded, not what the browser says it sent.
  const storedSize = Number(stored.metadata?.size);
  if (stored.metadata?.mimetype !== "image/webp" || !Number.isInteger(storedSize) || storedSize <= 0) {
    await bucket.remove([storagePath]);
    return failure("La foto no es un WebP válido.");
  }
  if (storedSize > MAX_UPLOAD_BYTES) {
    await bucket.remove([storagePath]);
    return failure("La foto pesa demasiado.");
  }

  const { error: assetError } = await supabase.from("media_assets").insert({
    id: mediaId,
    store_id: store.id,
    storage_path: storagePath,
    public_url: bucket.getPublicUrl(storagePath).data.publicUrl,
    mime_type: "image/webp",
    alt_text: cleanText(input.altText, MAX_ALT_LENGTH),
    file_size_bytes: storedSize,
  });
  if (assetError) return failure(`No se registró la foto: ${assetError.message}`);

  const { data: existing, error: existingError } = await supabase
    .from("media_placements")
    .select("id, sort_order, is_live")
    .eq("store_id", store.id)
    .eq("product_id", productId)
    .eq("slot_code", slotCode)
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .overrideTypes<{ id: Uuid; sort_order: number; is_live: boolean }[], { merge: false }>();
  if (existingError) return failure(`No se pudo leer el slot: ${existingError.message}`);

  // A pending cover is replaced in place; a live one stays until the new one is approved.
  const current = existing[0];
  const pendingCover = slotCode === "PRODUCT_PRIMARY" ? existing.find((row) => !row.is_live) : undefined;
  let placementError: { message: string } | null;
  if (pendingCover) {
    ({ error: placementError } = await supabase
      .from("media_placements")
      .update({ media_id: mediaId, ...PENDING })
      .eq("store_id", store.id)
      .eq("id", pendingCover.id));
  } else {
    ({ error: placementError } = await supabase.from("media_placements").insert({
      store_id: store.id,
      media_id: mediaId,
      slot_code: slotCode,
      product_id: productId,
      label,
      price_delta_cents: priceDelta,
      sort_order: current ? current.sort_order + 1 : 0,
      is_active: true,
      ...PENDING,
    }));
  }
  if (placementError) {
    // Keep `media_assets` consistent with what is placed; the browser removes the file.
    await supabase.from("media_assets").delete().eq("store_id", store.id).eq("id", mediaId);
    return failure(`No se asignó la foto: ${placementError.message}`);
  }

  const pendingError = await markProductPending(ctx, productId);
  if (pendingError) return failure(`La foto se guardó, pero el pastel no quedó pendiente: ${pendingError}`);

  refresh();
  return { ok: true };
}

interface PlacementRef {
  id: Uuid;
  product_id: Uuid | null;
  slot_code: string;
  is_live: boolean;
  draft_data: unknown;
}

async function readPlacement(ctx: AdminContext, placementId: Uuid): Promise<PlacementRef | null> {
  const { data } = await ctx.supabase
    .from("media_placements")
    .select("id, product_id, slot_code, is_live, draft_data")
    .eq("store_id", ctx.store.id)
    .eq("id", placementId)
    .maybeSingle<PlacementRef>();
  return data;
}

/**
 * Saves a change to a placement. A live one keeps its live values: the
 * change goes to its `draft_data` and waits for approval with the product.
 */
async function stagePlacementChange(
  ctx: AdminContext,
  placement: PlacementRef,
  change: Record<string, unknown>,
): Promise<ActionResult> {
  const { supabase, store } = ctx;
  const update = placement.is_live
    ? {
        draft_data: { ...(placement.draft_data && typeof placement.draft_data === "object" ? placement.draft_data : {}), ...change },
        publication_status: "PENDING_APPROVAL",
      }
    : change;

  const { data, error } = await supabase
    .from("media_placements")
    .update(update)
    .eq("store_id", store.id)
    .eq("id", placement.id)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (noRows(data)) return failure(NOT_ALLOWED);

  if (placement.is_live && placement.product_id) {
    const pendingError = await markProductPending(ctx, placement.product_id);
    if (pendingError) return failure(`Se guardó, pero el pastel no quedó pendiente: ${pendingError}`);
  }

  refresh();
  return { ok: true };
}

/** Name and price difference of a `PRODUCT_PRESENTATION` placement. */
export async function updatePresentation(
  placementId: Uuid,
  label: string,
  priceDeltaCents: Cents,
): Promise<ActionResult> {
  const cleanLabel = cleanText(label, MAX_LABEL_LENGTH);
  if (!isUuid(placementId)) return failure("Datos no válidos.");
  if (!cleanLabel) return failure("Escribe el nombre de la presentación.");
  if (!isDelta(priceDeltaCents)) return failure("La diferencia de precio no es válida.");
  const ctx = await requireAdmin();

  const placement = await readPlacement(ctx, placementId);
  if (!placement || placement.slot_code !== "PRODUCT_PRESENTATION") return failure(NOT_ALLOWED);
  return stagePlacementChange(ctx, placement, { label: cleanLabel, price_delta_cents: priceDeltaCents });
}

/**
 * Takes the photo out of the slot. An unpublished placement is deleted; a
 * live one is marked for removal (`draft_data.is_active = false`) until the
 * OWNER approves. The file stays in the media library (`media_assets`).
 */
export async function removePlacement(placementId: Uuid): Promise<ActionResult> {
  if (!isUuid(placementId)) return failure("Datos no válidos.");
  const ctx = await requireAdmin();

  const placement = await readPlacement(ctx, placementId);
  if (!placement) return failure(NOT_ALLOWED);
  if (placement.is_live) {
    return stagePlacementChange(ctx, placement, { is_active: false });
  }

  const { data, error } = await ctx.supabase
    .from("media_placements")
    .delete()
    .eq("store_id", ctx.store.id)
    .eq("id", placementId)
    .select("id");
  if (error) return failure(`No se quitó: ${error.message}`);
  if (noRows(data)) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

/** Moves a photo one position earlier (-1) or later (+1) inside its slot. */
export async function movePlacement(placementId: Uuid, direction: -1 | 1): Promise<ActionResult> {
  if (!isUuid(placementId) || (direction !== -1 && direction !== 1)) return failure("Datos no válidos.");
  const ctx = await requireAdmin();
  const { supabase, store } = ctx;

  const { data: placement } = await supabase
    .from("media_placements")
    .select("product_id, slot_code")
    .eq("store_id", store.id)
    .eq("id", placementId)
    .maybeSingle<{ product_id: Uuid | null; slot_code: string }>();
  if (!placement?.product_id) return failure(NOT_ALLOWED);

  const { data: siblings, error } = await supabase
    .from("media_placements")
    .select("id")
    .eq("store_id", store.id)
    .eq("product_id", placement.product_id)
    .eq("slot_code", placement.slot_code)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at")
    .overrideTypes<{ id: Uuid }[], { merge: false }>();
  if (error) return failure(`No se pudo ordenar: ${error.message}`);

  const ids = siblings.map((row) => row.id);
  const from = ids.indexOf(placementId);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ids.length) return { ok: true };
  [ids[from], ids[to]] = [ids[to]!, ids[from]!];

  // Rewrite sort_order as 0..n-1 so earlier ties or gaps disappear.
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("media_placements").update({ sort_order: index }).eq("store_id", store.id).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return failure(`No se pudo ordenar: ${failed.error.message}`);

  refresh();
  return { ok: true };
}

