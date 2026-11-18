"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/admin/media";
import { requireAdmin, type AdminContext } from "@/lib/admin/session";
import type { ActionResult } from "@/types/admin";
import type { Cents, Uuid } from "@/types/catalog";

/*
 * `delivery_zones` and `stores.show_delivery_zone`. Same rules as the catalog
 * actions: membership re-checked, queries scoped to the store, RLS decides.
 * Fees arrive in integer cents (`fee_cents`). They change the live storefront
 * at once (no approval step), so only the OWNER may make them.
 */

const MAX_FEE_CENTS = 1_000_000;
const MAX_NAME_LENGTH = 80;
const MAX_TIME_LENGTH = 60;
const NOT_ALLOWED = "No se guardó: la zona no existe o tu cuenta no tiene permiso para cambiarla.";

export interface ZoneInput {
  name: string;
  feeCents: Cents;
  estimatedTimeText: string | null;
}

const OWNER_ONLY = "Solo la cuenta dueña de la tienda puede cambiar las zonas de envío.";

function failure(error: string): ActionResult {
  return { ok: false, error };
}

async function requireOwner(): Promise<AdminContext | null> {
  const ctx = await requireAdmin();
  return ctx.role === "OWNER" ? ctx : null;
}

/** The order form reads zones and the store settings, so refresh everything. */
function refresh(): void {
  revalidatePath("/", "layout");
}

function validate(input: ZoneInput): { name: string; fee_cents: Cents; estimated_time_text: string | null } | string {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, MAX_NAME_LENGTH) : "";
  if (!name) return "Escribe el nombre de la zona.";
  if (!Number.isInteger(input.feeCents) || input.feeCents < 0 || input.feeCents > MAX_FEE_CENTS) {
    return "El costo de envío no es válido.";
  }
  const time =
    typeof input.estimatedTimeText === "string" ? input.estimatedTimeText.trim().slice(0, MAX_TIME_LENGTH) : "";
  return { name, fee_cents: input.feeCents, estimated_time_text: time || null };
}

export async function createZone(input: ZoneInput): Promise<ActionResult> {
  const values = validate(input);
  if (typeof values === "string") return failure(values);
  const ctx = await requireOwner();
  if (!ctx) return failure(OWNER_ONLY);
  const { supabase, store } = ctx;

  const { data: last } = await supabase
    .from("delivery_zones")
    .select("sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { error } = await supabase.from("delivery_zones").insert({
    ...values,
    store_id: store.id,
    is_active: true,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return failure(`No se creó la zona: ${error.message}`);

  refresh();
  return { ok: true };
}

export async function updateZone(zoneId: Uuid, input: ZoneInput): Promise<ActionResult> {
  if (!isUuid(zoneId)) return failure("Datos no válidos.");
  const values = validate(input);
  if (typeof values === "string") return failure(values);
  const ctx = await requireOwner();
  if (!ctx) return failure(OWNER_ONLY);
  const { supabase, store } = ctx;

  const { data, error } = await supabase
    .from("delivery_zones")
    .update(values)
    .eq("store_id", store.id)
    .eq("id", zoneId)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (!data?.length) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

export async function setZoneActive(zoneId: Uuid, isActive: boolean): Promise<ActionResult> {
  if (!isUuid(zoneId) || typeof isActive !== "boolean") return failure("Datos no válidos.");
  const ctx = await requireOwner();
  if (!ctx) return failure(OWNER_ONLY);
  const { supabase, store } = ctx;

  const { data, error } = await supabase
    .from("delivery_zones")
    .update({ is_active: isActive })
    .eq("store_id", store.id)
    .eq("id", zoneId)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (!data?.length) return failure(NOT_ALLOWED);

  refresh();
  return { ok: true };
}

/** Moves a zone one position up (-1) or down (+1) and rewrites `sort_order` as 1..n. */
export async function moveZone(zoneId: Uuid, direction: -1 | 1): Promise<ActionResult> {
  if (!isUuid(zoneId) || (direction !== -1 && direction !== 1)) return failure("Datos no válidos.");
  const ctx = await requireOwner();
  if (!ctx) return failure(OWNER_ONLY);
  const { supabase, store } = ctx;

  const { data: zones, error } = await supabase
    .from("delivery_zones")
    .select("id")
    .eq("store_id", store.id)
    .order("sort_order")
    .order("name")
    .overrideTypes<{ id: Uuid }[], { merge: false }>();
  if (error) return failure(`No se pudo ordenar: ${error.message}`);

  const ids = zones.map((zone) => zone.id);
  const from = ids.indexOf(zoneId);
  const to = from + direction;
  if (from === -1) return failure(NOT_ALLOWED);
  if (to < 0 || to >= ids.length) return { ok: true };
  [ids[from], ids[to]] = [ids[to]!, ids[from]!];

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("delivery_zones").update({ sort_order: index + 1 }).eq("store_id", store.id).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return failure(`No se pudo ordenar: ${failed.error.message}`);

  refresh();
  return { ok: true };
}

/** `stores.show_delivery_zone`: whether the storefront's order form shows the zone selector. */
export async function setShowDeliveryZone(show: boolean): Promise<ActionResult> {
  if (typeof show !== "boolean") return failure("Datos no válidos.");
  const ctx = await requireOwner();
  if (!ctx) return failure(OWNER_ONLY);
  const { supabase, store } = ctx;

  const { data, error } = await supabase
    .from("stores")
    .update({ show_delivery_zone: show })
    .eq("id", store.id)
    .select("id");
  if (error) return failure(`No se guardó: ${error.message}`);
  if (!data?.length) return failure("No se guardó: tu cuenta no tiene permiso para cambiar la tienda.");

  refresh();
  return { ok: true };
}
