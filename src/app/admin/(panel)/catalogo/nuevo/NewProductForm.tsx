"use client";

import { useRouter } from "next/navigation";

import { ProductDetailsForm } from "@/components/admin/ProductDetailsForm";
import { createProduct, type ProductDetailsInput } from "@/lib/admin/catalog-actions";
import type { ActionResult } from "@/types/admin";

export function NewProductForm() {
  const router = useRouter();

  async function submit(input: ProductDetailsInput): Promise<ActionResult> {
    const result = await createProduct(input);
    if (!result.ok) return result;
    router.push(`/admin/catalogo/${result.productId}/`);
    return { ok: true };
  }

  return <ProductDetailsForm initial={null} submitLabel="Crear pastel" savedText="Creado. Abriendo el pastel…" onSubmit={submit} />;
}


