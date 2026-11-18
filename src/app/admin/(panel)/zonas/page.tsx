import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/session";
import type { DeliveryZone } from "@/types/catalog";

import { ZonesManager } from "./ZonesManager";

export const metadata: Metadata = { title: "Zonas de envío" };

export default async function ZonasPage() {
  const { supabase, store } = await requireAdmin();

  const [zones, settings] = await Promise.all([
    supabase
      .from("delivery_zones")
      .select("id, store_id, name, fee_cents, estimated_time_text, is_active, sort_order")
      .eq("store_id", store.id)
      .order("sort_order")
      .order("name")
      .overrideTypes<DeliveryZone[], { merge: false }>(),
    // "*": `show_delivery_zone` may be missing on older databases (see catalog/queries.ts).
    supabase.from("stores").select("*").eq("id", store.id).maybeSingle<{ show_delivery_zone?: boolean }>(),
  ]);
  if (zones.error) {
    throw new Error(`No se pudieron cargar las zonas: ${zones.error.message}`);
  }

  return <ZonesManager zones={zones.data} showDeliveryZone={settings.data?.show_delivery_zone === true} />;
}
