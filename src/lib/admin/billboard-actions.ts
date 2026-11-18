"use server";

import { revalidatePath } from "next/cache";
import {
  MAX_UPLOAD_BYTES,
  PRODUCT_IMAGES_BUCKET,
  isUuid,
  productImagePath,
} from "@/lib/admin/media";
import { requireAdmin, type AdminContext } from "@/lib/admin/session";
import { parseThemeBillboard } from "@/lib/catalog/billboard-parser";
import type { ActionResult } from "@/types/admin";
import type {
  BillboardItem,
  BillboardPlacement,
  BillboardTargetType,
  Uuid,
} from "@/types/catalog";

function failure(error: string): ActionResult & { url?: string } {
  return { ok: false, error };
}

function refresh(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/medios");
}

async function syncThemeConfigBillboard(ctx: AdminContext, items: BillboardItem[]): Promise<void> {
  const { data: storeRow } = await ctx.supabase
    .from("stores")
    .select("theme_config")
    .eq("id", ctx.store.id)
    .single();

  const currentTheme =
    storeRow?.theme_config && typeof storeRow.theme_config === "object"
      ? (storeRow.theme_config as Record<string, unknown>)
      : {};

  const nextTheme = {
    ...currentTheme,
    billboard: items,
  };

  await ctx.supabase
    .from("stores")
    .update({ theme_config: nextTheme })
    .eq("id", ctx.store.id);
}

export async function listAdminBillboard(passedCtx?: AdminContext): Promise<BillboardItem[]> {
  const ctx = passedCtx ?? (await requireAdmin());

  // 1. Try DB table first
  const { data: tableData, error } = await ctx.supabase
    .from("store_billboard_items")
    .select("*")
    .eq("store_id", ctx.store.id)
    .order("sort_order")
    .overrideTypes<BillboardItem[], { merge: false }>();

  if (!error && tableData && tableData.length > 0) {
    return tableData;
  }

  // 2. Fallback to theme_config
  const { data: storeRow } = await ctx.supabase
    .from("stores")
    .select("theme_config")
    .eq("id", ctx.store.id)
    .single();

  return parseThemeBillboard(ctx.store.id, storeRow?.theme_config);
}

export interface SaveBillboardInput {
  id?: string;
  media_id?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  kicker?: string;
  title: string;
  subtitle?: string | null;
  cta_label?: string;
  target_type: BillboardTargetType;
  target_value: string;
  placement: BillboardPlacement;
  is_active?: boolean;
  sort_order?: number;
}

export async function saveBillboardItem(input: SaveBillboardInput): Promise<ActionResult> {
  const title = input.title?.trim();
  if (!title) return failure("El anuncio debe tener un título.");

  const ctx = await requireAdmin();
  const currentItems = await listAdminBillboard(ctx);

  const id = input.id?.trim() || crypto.randomUUID();
  const isNew = !currentItems.some((item) => item.id === id);

  const sortOrder =
    typeof input.sort_order === "number"
      ? input.sort_order
      : isNew
        ? currentItems.length
        : (currentItems.find((i) => i.id === id)?.sort_order ?? 0);

  const updatedItem: BillboardItem = {
    id,
    store_id: ctx.store.id,
    media_id: input.media_id ?? null,
    image_url: input.image_url?.trim() || null,
    image_alt: input.image_alt?.trim() || null,
    kicker: input.kicker?.trim() || "",
    title,
    subtitle: input.subtitle?.trim() || null,
    cta_label: input.cta_label?.trim() || "Ver más",
    target_type: input.target_type ?? "LINK",
    target_value: input.target_value?.trim() || "",
    placement: input.placement ?? "BOTH",
    is_active: input.is_active ?? true,
    sort_order: sortOrder,
  };

  const nextItems = isNew
    ? [...currentItems, updatedItem]
    : currentItems.map((item) => (item.id === id ? updatedItem : item));

  // Dual-write: 1. Try DB table (ignore if table doesn't exist)
  try {
    await ctx.supabase
      .from("store_billboard_items")
      .upsert(updatedItem)
      .eq("store_id", ctx.store.id);
  } catch {
    // Ignore error if table is not migrated yet
  }

  // Dual-write: 2. Always persist into stores.theme_config.billboard
  await syncThemeConfigBillboard(ctx, nextItems);

  refresh();
  return { ok: true };
}

export async function toggleBillboardItemActive(
  itemId: Uuid,
  isActive: boolean,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const currentItems = await listAdminBillboard(ctx);

  const nextItems = currentItems.map((item) =>
    item.id === itemId ? { ...item, is_active: isActive } : item,
  );

  try {
    await ctx.supabase
      .from("store_billboard_items")
      .update({ is_active: isActive })
      .eq("id", itemId)
      .eq("store_id", ctx.store.id);
  } catch {
    // Ignore table missing
  }

  await syncThemeConfigBillboard(ctx, nextItems);
  refresh();
  return { ok: true };
}

export const toggleBillboardItem = toggleBillboardItemActive;

export async function registerBillboardMedia(input: {
  mediaId: Uuid;
  altText: string;
  fileSizeBytes: number;
}): Promise<ActionResult & { url?: string }> {
  if (
    !isUuid(input.mediaId) ||
    typeof input.fileSizeBytes !== "number" ||
    input.fileSizeBytes <= 0 ||
    input.fileSizeBytes > MAX_UPLOAD_BYTES
  ) {
    return failure("Imagen no válida o excede el tamaño máximo permitido.");
  }

  const ctx = await requireAdmin();
  const path = productImagePath(ctx.store.id, input.mediaId);
  const { data: urlData } = ctx.supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { error: insertError } = await ctx.supabase.from("media_assets").insert({
    id: input.mediaId,
    store_id: ctx.store.id,
    storage_bucket: PRODUCT_IMAGES_BUCKET,
    storage_path: path,
    public_url: publicUrl,
    mime_type: "image/webp",
    file_size_bytes: Math.round(input.fileSizeBytes),
    alt_text: input.altText.trim().slice(0, 160),
    is_active: true,
  });

  if (insertError) {
    await ctx.supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    return failure(`No se pudo registrar la imagen: ${insertError.message}`);
  }

  return { ok: true, url: publicUrl };
}

export async function deleteBillboardItem(itemId: Uuid): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const currentItems = await listAdminBillboard(ctx);
  const nextItems = currentItems.filter((item) => item.id !== itemId);

  try {
    await ctx.supabase
      .from("store_billboard_items")
      .delete()
      .eq("id", itemId)
      .eq("store_id", ctx.store.id);
  } catch {
    // Ignore table missing
  }

  await syncThemeConfigBillboard(ctx, nextItems);
  refresh();
  return { ok: true };
}

export async function reorderBillboardItems(orderedIds: Uuid[]): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const currentItems = await listAdminBillboard(ctx);

  const idToOrder = new Map(orderedIds.map((id, index) => [id, index]));
  const nextItems = currentItems
    .map((item) => {
      const newOrder = idToOrder.get(item.id);
      return newOrder !== undefined ? { ...item, sort_order: newOrder } : item;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  try {
    for (const item of nextItems) {
      await ctx.supabase
        .from("store_billboard_items")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("store_id", ctx.store.id);
    }
  } catch {
    // Ignore table missing
  }

  await syncThemeConfigBillboard(ctx, nextItems);
  refresh();
  return { ok: true };
}
