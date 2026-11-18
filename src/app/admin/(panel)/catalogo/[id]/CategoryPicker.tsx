"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

import { setProductCategory } from "@/lib/admin/catalog-actions";
import { resolveStoreCategoryGroups } from "@/lib/catalog/filters";
import type { AdminCategory } from "@/types/admin";
import type { Uuid } from "@/types/catalog";

/** N:M `product_categories` as toggle chips, grouped like the storefront filters. */
export function CategoryPicker({
  productId,
  categories,
  selectedIds,
}: {
  productId: Uuid;
  categories: AdminCategory[];
  selectedIds: Uuid[];
}) {
  const [optimistic, toggleOptimistic] = useOptimistic(
    new Set(selectedIds),
    (current: Set<Uuid>, { id, on }: { id: Uuid; on: boolean }) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    },
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(categoryId: Uuid) {
    const on = !optimistic.has(categoryId);
    setError(null);
    startTransition(async () => {
      toggleOptimistic({ id: categoryId, on });
      const result = await setProductCategory(productId, categoryId, on);
      if (!result.ok) setError(result.error);
    });
  }

  if (categories.length === 0) {
    return (
      <p className="mt-2 text-sm text-stone-500">
        La tienda no tiene clasificaciones activas.{" "}
        <Link href="/admin/catalogo/categorias/" className="font-semibold text-(--brand) underline">
          Crear clasificaciones
        </Link>
      </p>
    );
  }

  const orderedGroups = resolveStoreCategoryGroups(categories)
    .map((group) => ({
      ...group,
      list: categories.filter((c) => c.group_type === group.type),
    }))
    .filter((group) => group.list.length > 0);

  return (
    <div className="mt-3 flex flex-col gap-4">
      {orderedGroups.map(({ type: group, label, list }) => (
        <div key={group}>
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {list.map((category) => {
              const on = optimistic.has(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(category.id)}
                  className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
                    on ? "border-(--brand) bg-(--brand) text-white" : "border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-(--brand)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
