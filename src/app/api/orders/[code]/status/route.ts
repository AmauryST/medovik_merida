import { NextResponse } from "next/server";

import { getActiveStore } from "@/lib/catalog/queries";
import { decryptOrderTrackingToken } from "@/lib/orders/tracking-token";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { OrderStatus } from "@/types/catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const [{ code }, store] = await Promise.all([
      context.params,
      getActiveStore(),
    ]);

    const rawToken = decodeURIComponent(code).trim();
    const cleanCode = decryptOrderTrackingToken(rawToken, store.id);
    if (!cleanCode) {
      return NextResponse.json({ error: "Token de validación inválido" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("orders")
      .select("order_code, status, paid_at, updated_at")
      .eq("store_id", store.id)
      .eq("order_code", cleanCode)
      .maybeSingle<{
        order_code: string;
        status: OrderStatus;
        paid_at: string | null;
        updated_at: string;
      }>();

    if (error || !data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "Error consultando estado" }, { status: 500 });
  }
}
