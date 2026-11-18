"use client";

import { useState, useTransition } from "react";

import type { ProductDetailsInput } from "@/lib/admin/catalog-actions";
import { centsToInput, dollarsToCents } from "@/lib/admin/money";
import type { EditableProductFields } from "@/lib/admin/staging";
import type { ActionResult } from "@/types/admin";

/**
 * Name, short phrase, description and price (dollars on screen, integer
 * `price_cents` on save). Used to edit a product and to create a new one.
 */
export function ProductDetailsForm({
  initial,
  submitLabel,
  savedText,
  onSubmit,
}: {
  initial: EditableProductFields | null;
  submitLabel: string;
  /** Confirmation shown after a successful save. */
  savedText: string;
  onSubmit: (input: ProductDetailsInput) => Promise<ActionResult>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.short_description ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? centsToInput(initial.price_cents) : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const priceCents = dollarsToCents(price);
  const dirty =
    !initial ||
    name.trim() !== initial.name ||
    shortDescription.trim() !== (initial.short_description ?? "") ||
    description.trim() !== (initial.description ?? "") ||
    priceCents !== initial.price_cents;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (priceCents === null || priceCents <= 0) {
      setMessage({ ok: false, text: "Escribe un precio válido, por ejemplo 25 o 25.50." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await onSubmit({ name, shortDescription, description, priceCents });
      setMessage(result.ok ? { ok: true, text: savedText } : { ok: false, text: result.error });
    });
  }

  const field = "w-full rounded-xl border border-stone-300 bg-white px-4";

  return (
    <form onSubmit={save} className="flex flex-col gap-3" onChange={() => setMessage(null)}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required className={`h-12 ${field}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Frase corta</span>
        <input
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          maxLength={160}
          className={`h-12 ${field}`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className={`py-3 ${field}`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Precio (USD)</span>
        <div className="relative">
          <span aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2 text-stone-500">
            $
          </span>
          <input
            inputMode="decimal"
            autoComplete="off"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className={`h-12 pl-8 text-lg tabular-nums ${field} ${priceCents === null && price ? "border-(--brand)" : ""}`}
          />
        </div>
      </label>
      <button
        type="submit"
        disabled={pending || !dirty || !name.trim()}
        className="mt-1 h-12 rounded-xl bg-(--brand) font-semibold text-white transition-colors hover:bg-(--brand-hover) disabled:bg-stone-300"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
      {message ? (
        <p role="status" className={`text-sm ${message.ok ? "text-emerald-700" : "text-(--brand)"}`}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
