"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/admin/media";
import { requireAdmin } from "@/lib/admin/session";
import type { ActionResult } from "@/types/admin";
import type { Uuid } from "@/types/catalog";

/*
 * Store classifications (`public.categories`): flavors (`FLAVOR`), occasions
 * (`OCCASION`), flower types (`FLOWER_TYPE`), special campaigns (`CAMPAIGN`),
 * etc. Every action re-checks membership (`requireAdmin`), scopes queries to
 * `store.id` and executes with the authenticated member's session (RLS active).
 */

const MAX_NAME_LENGTH = 80;
const MAX_GROUP_LENGTH = 40;
const NOT_ALLOWED =
  "No se guardó: la clasificación no existe o tu cuenta no tiene permiso para cambiarla.";

export interface CategoryInput {
  name: string;
  groupType: string;
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

function refresh(): void {
  revalidatePath("/", "layout");
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeGroupType(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_GROUP_LENGTH);
}

function validate(input: CategoryInput): { name: string; group_type: string } | string {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, MAX_NAME_LENGTH) : "";
  if (!name) return "Escribe el nombre de la clasificación.";

  const group_type =
    typeof input.groupType === "string" ? normalizeGroupType(input.groupType) : "";
  if (!group_type) return "Selecciona el grupo de clasificación.";

  return { name, group_type };
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  const values = validate(input);
  if (typeof values === "string") return failure(values);

  const { supabase, store } = await requireAdmin();

  const base = slugify(values.name) || "categoria";
  const { data: taken } = await supabase
    .from("categories")
    .select("slug")
    .eq("store_id", store.id)
    .like("slug", `${base}%`)
    .overrideTypes<{ slug: string }[], { merge: false }>();

  const used = new Set((taken ?? []).map((row) => row.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) {
    slug = `${base}-${n}`;
  }

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("store_id", store.id)
    .eq("group_type", values.group_type)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { error } = await supabase.from("categories").insert({
    store_id: store.id,
    name: values.name,
    slug,
    group_type: values.group_type,
    is_active: true,
    is_featured_filter: values.group_type !== "OCCASION",
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) return failure(`No se creó la clasificación: ${error.message}`);

  refresh();
  return { ok: true };
}

export async function updateCategory(categoryId: Uuid, input: CategoryInput): Promise<ActionResult> {
  if (!isUuid(categoryId)) return failure("Datos no válidos.");
  const values = validate(input);
  if (typeof values === "string") return failure(values);

  const { supabase, store } = await requireAdmin();

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: values.name,
      group_type: values.group_type,
    })
    .eq("store_id", store.id)
    .eq("id", categoryId)
    .select("id");

  if (error) return failure(`No se guardó: ${error.message}`);
  if (!data?.length) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

export async function setCategoryActive(
  categoryId: Uuid,
  isActive: boolean,
): Promise<ActionResult> {
  if (!isUuid(categoryId) || typeof isActive !== "boolean") {
    return failure("Datos no válidos.");
  }

  const { supabase, store } = await requireAdmin();

  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("store_id", store.id)
    .eq("id", categoryId)
    .select("id");

  if (error) return failure(`No se guardó: ${error.message}`);
  if (!data?.length) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

/**
 * Moves a classification one position up (-1) or down (+1) within its group
 * and rewrites `sort_order` as 1..n for that group.
 */
export async function moveCategory(
  categoryId: Uuid,
  direction: -1 | 1,
): Promise<ActionResult> {
  if (!isUuid(categoryId) || (direction !== -1 && direction !== 1)) {
    return failure("Datos no válidos.");
  }

  const { supabase, store } = await requireAdmin();

  const { data: current } = await supabase
    .from("categories")
    .select("id, group_type")
    .eq("store_id", store.id)
    .eq("id", categoryId)
    .maybeSingle<{ id: Uuid; group_type: string }>();

  if (!current) return failure(NOT_ALLOWED);

  const { data: siblings, error } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", store.id)
    .eq("group_type", current.group_type)
    .order("sort_order")
    .order("name")
    .overrideTypes<{ id: Uuid }[], { merge: false }>();

  if (error) return failure(`No se pudo ordenar: ${error.message}`);

  const ids = siblings.map((item) => item.id);
  const from = ids.indexOf(categoryId);
  const to = from + direction;
  if (from === -1) return failure(NOT_ALLOWED);
  if (to < 0 || to >= ids.length) return { ok: true };

  [ids[from], ids[to]] = [ids[to]!, ids[from]!];

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("categories")
        .update({ sort_order: index + 1 })
        .eq("store_id", store.id)
        .eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return failure(`No se pudo ordenar: ${failed.error.message}`);

  refresh();
  return { ok: true };
}

/**
 * Rewrites `sort_order` (1..n) for all classifications in `groupType` matching
 * `orderedIds` (used by the drag-and-drop handle and instant arrow moves).
 */
export async function reorderCategories(
  groupType: string,
  orderedIds: Uuid[],
): Promise<ActionResult> {
  const cleanGroup = typeof groupType === "string" ? normalizeGroupType(groupType) : "";
  if (!cleanGroup || !Array.isArray(orderedIds) || !orderedIds.every(isUuid)) {
    return failure("Datos no válidos.");
  }

  const { supabase, store } = await requireAdmin();

  const { data: siblings, error } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", store.id)
    .eq("group_type", cleanGroup)
    .order("sort_order")
    .order("name")
    .overrideTypes<{ id: Uuid }[], { merge: false }>();

  if (error) return failure(`No se pudo ordenar: ${error.message}`);

  const validSet = new Set(siblings.map((item) => item.id));
  const finalIds: Uuid[] = [];
  for (const id of orderedIds) {
    if (validSet.has(id) && !finalIds.includes(id)) {
      finalIds.push(id);
    }
  }
  for (const item of siblings) {
    if (!finalIds.includes(item.id)) {
      finalIds.push(item.id);
    }
  }

  const results = await Promise.all(
    finalIds.map((id, index) =>
      supabase
        .from("categories")
        .update({ sort_order: index + 1 })
        .eq("store_id", store.id)
        .eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return failure(`No se pudo ordenar: ${failed.error.message}`);

  refresh();
  return { ok: true };
}
