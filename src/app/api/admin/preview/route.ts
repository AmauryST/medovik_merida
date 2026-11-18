import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getAdminAccess } from "@/lib/admin/session";

/**
 * Turns on Next.js Draft Mode so the home page shows the pending changes
 * (`v_catalog_products_staging`). Only for signed-in store members.
 *   /api/admin/preview/         → enable, open the home page
 *   /api/admin/preview/?salir=1 → disable, back to the pending list
 */
export async function GET(request: NextRequest) {
  const draft = await draftMode();

  if (request.nextUrl.searchParams.has("salir")) {
    draft.disable();
    redirect("/admin/catalogo/pendientes/");
  }

  const access = await getAdminAccess();
  if (access.status !== "ok") {
    draft.disable();
    redirect("/admin/login/");
  }

  draft.enable();
  redirect("/");
}
