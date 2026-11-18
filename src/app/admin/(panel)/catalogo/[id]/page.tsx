import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AvailabilitySwitch } from "@/components/admin/AvailabilitySwitch";
import { FeaturedSwitch } from "@/components/admin/FeaturedSwitch";
import { ProductDetailsForm } from "@/components/admin/ProductDetailsForm";
import { saveProductDetails } from "@/lib/admin/catalog-actions";
import { getAdminProduct } from "@/lib/admin/catalog";
import { isUuid } from "@/lib/admin/media";
import { requireAdmin } from "@/lib/admin/session";
import { draftChanges, readDraft, withDraft } from "@/lib/admin/staging";
import { ADMIN_PRODUCT_SLOTS } from "@/types/admin";

import { CategoryPicker } from "./CategoryPicker";
import { SlotManager } from "./SlotManager";

export const metadata: Metadata = { title: "Pastel" };

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const ctx = await requireAdmin();
  const detail = await getAdminProduct(ctx, id);
  if (!detail) notFound();
  const { product, placements, categoryIds, categories } = detail;
  const draft = readDraft(product.draft_data);
  const pendingChanges = draftChanges(product, draft).length;
  const pendingPhotos = placements.filter((p) => p.publication_status === "PENDING_APPROVAL").length;
  const isPending = product.publication_status === "PENDING_APPROVAL";

  return (
    <article className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogo/" className="text-sm font-medium text-stone-500">
          ← Catálogo
        </Link>
        <h1 className="mt-2 text-xl leading-snug font-semibold">{product.name}</h1>
        {!product.is_live ? (
          <p className="mt-1 text-sm text-amber-800">
            Pastel nuevo: no se ve en la tienda hasta que se apruebe.
          </p>
        ) : null}
        {product.is_live && isPending ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Cambios pendientes de aprobación
            {pendingChanges ? ` · ${pendingChanges} dato${pendingChanges > 1 ? "s" : ""}` : ""}
            {pendingPhotos ? ` · ${pendingPhotos} foto${pendingPhotos > 1 ? "s" : ""}` : ""}. La tienda sigue
            mostrando la versión publicada.{" "}
            <Link href="/admin/catalogo/pendientes/" className="font-semibold underline">
              Revisar
            </Link>
          </p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Disponibilidad</h2>
          <AvailabilitySwitch
            productId={product.id}
            productName={product.name}
            isAvailable={product.is_available}
            showLabel
          />
        </div>
        <div className="mt-4 border-t border-stone-100 pt-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-sm text-stone-900">Producto destacado</h3>
            <p className="text-xs text-stone-500">Muestra el badge &quot;Destacado&quot; y resalta en el carrusel y billboard.</p>
          </div>
          <FeaturedSwitch
            productId={product.id}
            productName={product.name}
            isFeatured={product.is_featured}
            showLabel
          />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Datos y precio</h2>
        <ProductDetailsForm
          initial={withDraft(product, draft)}
          submitLabel={product.is_live ? "Guardar para aprobación" : "Guardar"}
          savedText={
            product.is_live
              ? "Guardado como borrador. Se publica cuando se apruebe."
              : "Guardado."
          }
          onSubmit={saveProductDetails.bind(null, product.id)}
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Categorías</h2>
          <Link
            href="/admin/catalogo/categorias/"
            className="text-xs font-semibold text-(--brand) hover:underline"
          >
            Editar clasificaciones →
          </Link>
        </div>
        <CategoryPicker productId={product.id} categories={categories} selectedIds={categoryIds} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Fotos por slot</h2>
        {ADMIN_PRODUCT_SLOTS.map((slot) => (
          <SlotManager
            key={slot}
            storeId={ctx.store.id}
            productId={product.id}
            productName={product.name}
            slot={slot}
            placements={placements.filter((placement) => placement.slot_code === slot)}
          />
        ))}
      </section>
    </article>
  );
}


