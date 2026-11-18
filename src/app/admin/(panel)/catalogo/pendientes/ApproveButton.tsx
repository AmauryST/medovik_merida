"use client";

import { useState, useTransition } from "react";

import { approveProduct } from "@/lib/admin/catalog-actions";
import type { Uuid } from "@/types/catalog";

/** OWNER only (the page hides it for other roles; the action and the RPC re-check). */
export function ApproveButton({ productId, productName }: { productId: Uuid; productName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`¿Publicar los cambios de «${productName}» en la tienda?`)) return;
          setError(null);
          startTransition(async () => {
            const result = await approveProduct(productId);
            if (!result.ok) setError(result.error);
          });
        }}
        className="h-12 w-full rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Publicando…" : "Aprobar y publicar"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-(--brand)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
