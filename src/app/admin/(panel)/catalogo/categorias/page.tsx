import type { Metadata } from "next";

import { listAdminCategories } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/admin/session";
import { CategoriesManager } from "./CategoriesManager";

export const metadata: Metadata = { title: "Clasificaciones" };

export default async function CategoriasAdminPage() {
  const ctx = await requireAdmin();
  const categories = await listAdminCategories(ctx);

  return <CategoriesManager categories={categories} />;
}
