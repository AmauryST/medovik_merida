"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { AdminThumb } from "@/components/admin/AdminThumb";
import { AvailabilitySwitch } from "@/components/admin/AvailabilitySwitch";
import { readDraft } from "@/lib/admin/staging";
import type { AdminCategory, AdminProductListItem } from "@/types/admin";
import { formatCents } from "@/types/catalog";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "featured", label: "Destacados" },
  { id: "available", label: "Disponibles" },
  { id: "unavailable", label: "No disponibles" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function CatalogList({
  products,
  categories,
}: {
  products: AdminProductListItem[];
  categories: AdminCategory[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const deferredQuery = useDeferredValue(query);

  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const visible = useMemo(() => {
    const needle = normalize(deferredQuery.trim());
    return products.filter((product) => {
      if (filter === "featured" && !product.is_featured) return false;
      if (filter === "available" && !product.is_available) return false;
      if (filter === "unavailable" && product.is_available) return false;
      return !needle || normalize(product.name).includes(needle);
    });
  }, [products, filter, deferredQuery]);

  const availableCount = products.filter((p) => p.is_available).length;
  const featuredCount = products.filter((p) => p.is_featured).length;
  const pendingCount = products.filter((p) => p.publication_status === "PENDING_APPROVAL").length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Catálogo</h1>
        <p className="text-sm text-stone-500">
          {availableCount} de {products.length} disponibles · {featuredCount} destacados
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          href="/admin/catalogo/nuevo/"
          className="flex h-11 items-center justify-center rounded-xl bg-(--brand) px-2 text-center text-sm font-semibold text-white"
        >
          Nuevo pastel
        </Link>
        <Link
          href="/admin/catalogo/categorias/"
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-2 text-center text-sm font-semibold text-stone-700"
        >
          Clasificaciones
          <span className="tabular-nums text-xs text-stone-500">({categories.length})</span>
        </Link>
        <Link
          href="/admin/catalogo/pendientes/"
          className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-center text-sm font-semibold ${
            pendingCount ? "border-amber-300 bg-amber-50 text-amber-900" : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          Pendientes
          <span className="tabular-nums">{pendingCount}</span>
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar pastel"
        aria-label="Buscar pastel"
        className="mt-4 h-11 w-full rounded-xl border border-stone-300 bg-white px-4"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
              filter === option.id
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {visible.map((product) => {
          const tags = product.category_ids.map((id) => categoryNames.get(id)).filter(Boolean);
          const draftPrice = readDraft(product.draft_data).price_cents;
          return (
            <li key={product.id} className="flex items-center gap-3 px-3 py-3">
              <Link href={`/admin/catalogo/${product.id}/`} className="flex min-w-0 flex-1 items-center gap-3">
                <AdminThumb url={product.cover_url} alt="" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-stone-600">
                    ${formatCents(product.price_cents)}
                    {draftPrice !== undefined && draftPrice !== product.price_cents ? (
                      <span className="text-amber-800"> → ${formatCents(draftPrice)}</span>
                    ) : null}
                    {!product.is_live ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Nuevo</span>
                    ) : product.publication_status === "PENDING_APPROVAL" ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        Pendiente
                      </span>
                    ) : null}
                    {product.is_featured ? (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">
                        Destacado
                      </span>
                    ) : null}
                  </p>
                  {tags.length > 0 ? <p className="truncate text-xs text-stone-500">{tags.join(" · ")}</p> : null}
                </div>
              </Link>
              <AvailabilitySwitch
                productId={product.id}
                productName={product.name}
                isAvailable={product.is_available}
              />
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-stone-500">No hay pasteles con ese filtro.</li>
        ) : null}
      </ul>
    </section>
  );
}


