import type { Metadata } from "next";

import { listAdminProducts } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/admin/session";

import { CatalogList } from "./CatalogList";

export const metadata: Metadata = { title: "Catálogo" };

export default async function AdminCatalogPage() {
  const ctx = await requireAdmin();
  const { products, categories } = await listAdminProducts(ctx);

  return <CatalogList products={products} categories={categories} />;
}
