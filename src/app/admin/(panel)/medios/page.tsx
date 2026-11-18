import type { Metadata } from "next";
import { listAdminBillboard } from "@/lib/admin/billboard-actions";
import { listAdminProducts } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/admin/session";
import { BillboardManager } from "./BillboardManager";

export const metadata: Metadata = { title: "Medios y Billboard" };

export default async function MediosPage() {
  const ctx = await requireAdmin();
  const [billboard, { products, categories }] = await Promise.all([
    listAdminBillboard(ctx),
    listAdminProducts(ctx),
  ]);

  return (
    <BillboardManager
      storeId={ctx.store.id}
      initialBillboard={billboard}
      products={products}
      categories={categories}
    />
  );
}
