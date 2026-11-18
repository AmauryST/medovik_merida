"use client";

import { useOptimistic, useState, useTransition } from "react";

import { setProductAvailability } from "@/lib/admin/catalog-actions";
import type { Uuid } from "@/types/catalog";

import { Switch } from "./Switch";

/** `is_available` toggle, optimistic: it flips at once and reverts if the save fails. */
export function AvailabilitySwitch({
  productId,
  productName,
  isAvailable,
  showLabel = false,
}: {
  productId: Uuid;
  productName: string;
  isAvailable: boolean;
  showLabel?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(isAvailable);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setProductAvailability(productId, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {showLabel ? (
          <span className={`text-sm ${optimistic ? "text-emerald-700" : "text-stone-500"}`}>
            {optimistic ? "Disponible" : "No disponible"}
          </span>
        ) : null}
        <Switch checked={optimistic} onToggle={toggle} label={`${productName} disponible`} disabled={pending} />
      </div>
      {error ? (
        <p role="alert" className="max-w-56 text-right text-xs text-(--brand)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
