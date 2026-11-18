"use client";

import { useOptimistic, useState, useTransition } from "react";

import { setProductFeatured } from "@/lib/admin/catalog-actions";
import type { Uuid } from "@/types/catalog";

import { Switch } from "./Switch";

/** `is_featured` toggle, optimistic: it flips at once and reverts if the save fails. */
export function FeaturedSwitch({
  productId,
  productName,
  isFeatured,
  showLabel = false,
}: {
  productId: Uuid;
  productName: string;
  isFeatured: boolean;
  showLabel?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(isFeatured);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setProductFeatured(productId, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {showLabel ? (
          <span className={`text-sm ${optimistic ? "text-amber-700 font-medium" : "text-stone-500"}`}>
            {optimistic ? "Destacado" : "Normal"}
          </span>
        ) : null}
        <Switch checked={optimistic} onToggle={toggle} label={`${productName} destacado`} disabled={pending} />
      </div>
      {error ? (
        <p role="alert" className="max-w-56 text-right text-xs text-(--brand)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
