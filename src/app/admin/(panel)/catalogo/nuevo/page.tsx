import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/session";

import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = { title: "Nuevo pastel" };

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/admin/catalogo/" className="text-sm font-medium text-stone-500">
          ← Catálogo
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Nuevo pastel</h1>
        <p className="mt-1 text-sm text-stone-500">
          Se crea sin publicar. Después añade sus fotos; aparecerá en la tienda cuando se apruebe.
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <NewProductForm />
      </div>
    </section>
  );
}

