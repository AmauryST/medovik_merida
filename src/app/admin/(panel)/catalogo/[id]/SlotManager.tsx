"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { AdminThumb } from "@/components/admin/AdminThumb";
import {
  attachUploadedImage,
  movePlacement,
  removePlacement,
  updatePresentation,
} from "@/lib/admin/catalog-actions";
import { compressToWebp } from "@/lib/admin/image";
import { PRODUCT_IMAGES_BUCKET, productImagePath } from "@/lib/admin/media";
import { centsToInput, dollarsToCents } from "@/lib/admin/money";
import { createClient } from "@/lib/supabase/client";
import { SLOT_LABELS, type AdminPlacement } from "@/types/admin";
import type { Cents, ProductSlotCode, Uuid } from "@/types/catalog";
import { formatCents } from "@/types/catalog";

interface UploadOptions {
  label?: string;
  priceDeltaCents?: Cents;
}

/**
 * Compress in the browser (WebP ≤1000 px), upload to
 * `product-images/{store_id}/{uuid}.webp` with the member's session, then let
 * the server register `media_assets` + `media_placements`. If the server
 * rejects it, the orphan file is removed.
 */
async function uploadToSlot(
  file: File,
  { storeId, productId, productName, slot }: { storeId: Uuid; productId: Uuid; productName: string; slot: ProductSlotCode },
  options: UploadOptions,
  onStatus: (text: string) => void,
): Promise<string | null> {
  onStatus("Comprimiendo…");
  const blob = await compressToWebp(file);

  onStatus(`Subiendo ${Math.round(blob.size / 1024)} KB…`);
  const supabase = createClient();
  const mediaId = crypto.randomUUID();
  const path = productImagePath(storeId, mediaId);
  const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return `No se pudo subir la foto: ${uploadError.message}`;

  onStatus("Guardando…");
  const result = await attachUploadedImage({
    productId,
    slotCode: slot,
    mediaId,
    fileSizeBytes: blob.size,
    altText: options.label ? `${productName} — ${options.label}` : productName,
    label: options.label ?? null,
    priceDeltaCents: options.priceDeltaCents ?? 0,
  });
  if (!result.ok) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    return result.error;
  }
  return null;
}

/** Pending edits staged on a live placement (see `stagePlacementChange`). */
function placementDraft(placement: AdminPlacement): { label?: string; price_delta_cents?: Cents; is_active?: boolean } {
  return placement.draft_data && typeof placement.draft_data === "object"
    ? (placement.draft_data as { label?: string; price_delta_cents?: Cents; is_active?: boolean })
    : {};
}

/** Short state of a placement in the approval flow, or null when it is live as is. */
function stagingTag(placement: AdminPlacement): string | null {
  if (!placement.is_live) return "Nueva · pendiente";
  if (placementDraft(placement).is_active === false) return "Se quitará al aprobar";
  if (placement.publication_status === "PENDING_APPROVAL") return "Cambio pendiente";
  return null;
}

function deltaText(cents: Cents): string {
  if (cents === 0) return "mismo precio";
  return `${cents > 0 ? "+" : "−"}$${formatCents(Math.abs(cents))}`;
}

export function SlotManager({
  storeId,
  productId,
  productName,
  slot,
  placements,
}: {
  storeId: Uuid;
  productId: Uuid;
  productName: string;
  slot: ProductSlotCode;
  placements: AdminPlacement[];
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  /** PRODUCT_PRESENTATION asks for name and price before uploading. */
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const isPrimary = slot === "PRODUCT_PRIMARY";
  const isPresentation = slot === "PRODUCT_PRESENTATION";
  const meta = SLOT_LABELS[slot];
  const target = { storeId, productId, productName, slot };

  function runUploads(files: File[], options: UploadOptions = {}) {
    setError(null);
    startTransition(async () => {
      for (const [index, file] of files.entries()) {
        const prefix = files.length > 1 ? `Foto ${index + 1} de ${files.length}: ` : "";
        try {
          const failure = await uploadToSlot(file, target, options, (text) => setStatus(prefix + text));
          if (failure) {
            setError(prefix + failure);
            break;
          }
        } catch (caught) {
          setError(prefix + (caught instanceof Error ? caught.message : "No se pudo subir la foto."));
          break;
        }
      }
      setStatus(null);
      setPendingFile(null);
    });
  }

  function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (isPresentation) {
      setPendingFile(files[0]!);
      return;
    }
    runUploads(isPrimary ? files.slice(0, 1) : files);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{meta.title}</h3>
          <p className="text-sm text-stone-500">{meta.hint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 tabular-nums">
          {placements.length}
        </span>
      </div>

      {placements.length > 0 ? (
        <ul className={`mt-3 grid gap-3 ${isPresentation ? "grid-cols-1" : "grid-cols-3"}`}>
          {placements.map((placement, index) =>
            isPresentation ? (
              <PresentationItem key={placement.id} placement={placement} disabled={busy} />
            ) : (
              <PhotoItem
                key={placement.id}
                placement={placement}
                isFirst={index === 0}
                isLast={index === placements.length - 1}
                sortable={!isPrimary && placements.length > 1}
                disabled={busy}
              />
            ),
          )}
        </ul>
      ) : null}

      {pendingFile ? (
        <NewPresentationForm
          file={pendingFile}
          busy={busy}
          onCancel={() => setPendingFile(null)}
          onSubmit={(options) => runUploads([pendingFile], options)}
        />
      ) : (
        <>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            multiple={!isPrimary && !isPresentation}
            onChange={onFiles}
            disabled={busy}
            className="sr-only"
          />
          <label
            htmlFor={inputId}
            aria-disabled={busy}
            className={`mt-3 flex h-12 items-center justify-center rounded-xl border border-dashed text-sm font-semibold transition-colors ${
              busy
                ? "pointer-events-none border-stone-200 text-stone-400"
                : "border-stone-400 text-stone-800 active:bg-stone-50"
            }`}
          >
            {busy && status
              ? status
              : isPrimary && placements.length > 0
                ? "Cambiar portada"
                : isPresentation
                  ? "Añadir presentación"
                  : "Añadir fotos"}
          </label>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-(--brand)">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function usePlacementAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }
  return { pending, error, run };
}

function PhotoItem({
  placement,
  isFirst,
  isLast,
  sortable,
  disabled,
}: {
  placement: AdminPlacement;
  isFirst: boolean;
  isLast: boolean;
  sortable: boolean;
  disabled: boolean;
}) {
  const { pending, error, run } = usePlacementAction();
  const off = disabled || pending;
  const tag = stagingTag(placement);
  const removing = placementDraft(placement).is_active === false;

  return (
    <li className={`flex flex-col gap-1.5 ${pending || removing ? "opacity-50" : ""}`}>
      <AdminThumb
        url={placement.media?.public_url ?? null}
        alt={placement.media?.alt_text ?? ""}
        className="aspect-square w-full rounded-xl"
      />
      {tag ? <span className="text-xs text-amber-800">{tag}</span> : null}
      <div className={`flex gap-1 ${removing ? "hidden" : ""}`}>
        {sortable ? (
          <>
            <button
              type="button"
              aria-label="Mover antes"
              disabled={off || isFirst}
              onClick={() => run(() => movePlacement(placement.id, -1))}
              className="h-9 flex-1 rounded-lg border border-stone-300 text-sm disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Mover después"
              disabled={off || isLast}
              onClick={() => run(() => movePlacement(placement.id, 1))}
              className="h-9 flex-1 rounded-lg border border-stone-300 text-sm disabled:opacity-30"
            >
              ›
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={off}
          onClick={() => {
            const note = placement.is_live ? " Se quitará de la tienda cuando se apruebe." : "";
            if (window.confirm(`¿Quitar esta foto del slot? Seguirá en la biblioteca de medios.${note}`)) {
              run(() => removePlacement(placement.id));
            }
          }}
          className="h-9 flex-1 rounded-lg border border-stone-300 text-xs font-medium text-stone-700"
        >
          Quitar
        </button>
      </div>
      {error ? <p className="text-xs text-(--brand)">{error}</p> : null}
    </li>
  );
}

function PresentationItem({ placement, disabled }: { placement: AdminPlacement; disabled: boolean }) {
  // Edit on top of the pending values, like the product form.
  const draft = placementDraft(placement);
  const currentLabel = draft.label ?? placement.label ?? "";
  const currentDelta = draft.price_delta_cents ?? placement.price_delta_cents;
  const tag = stagingTag(placement);
  const removing = draft.is_active === false;
  const [label, setLabel] = useState(currentLabel);
  const [delta, setDelta] = useState(centsToInput(currentDelta));
  const { pending, error, run } = usePlacementAction();
  const [saved, setSaved] = useState(false);
  const off = disabled || pending;

  const deltaCents = dollarsToCents(delta, { allowNegative: true });
  const dirty = label.trim() !== currentLabel || deltaCents !== currentDelta;

  useEffect(() => {
    if (dirty) setSaved(false);
  }, [dirty]);

  return (
    <li className={`flex gap-3 rounded-xl border border-stone-200 p-2 ${pending || removing ? "opacity-50" : ""}`}>
      <AdminThumb
        url={placement.media?.public_url ?? null}
        alt={placement.media?.alt_text ?? ""}
        className="size-20 rounded-lg"
      />
      <form
        className="flex min-w-0 flex-1 flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (deltaCents === null) return;
          run(async () => {
            const result = await updatePresentation(placement.id, label, deltaCents);
            if (result.ok) setSaved(true);
            return result;
          });
        }}
      >
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={60}
          aria-label="Nombre de la presentación"
          placeholder="Ej. Envoltura kraft"
          className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-500">
              ±$
            </span>
            <input
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
              inputMode="decimal"
              aria-label="Diferencia de precio en dólares"
              className={`h-10 w-full rounded-lg border bg-white pr-2 pl-9 text-sm tabular-nums ${
                deltaCents === null ? "border-(--brand)" : "border-stone-300"
              }`}
            />
          </div>
          {removing ? null : dirty ? (
            <button
              type="submit"
              disabled={off || deltaCents === null || !label.trim()}
              className="h-10 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
            >
              Guardar
            </button>
          ) : (
            <button
              type="button"
              disabled={off}
              onClick={() => {
                if (window.confirm(`¿Quitar la presentación «${placement.label ?? ""}»?`)) {
                  run(() => removePlacement(placement.id));
                }
              }}
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm text-stone-700"
            >
              Quitar
            </button>
          )}
        </div>
        <p className={`text-xs ${error ? "text-(--brand)" : "text-stone-500"}`}>
          {error ?? (saved ? "Guardado." : deltaText(currentDelta))}
          {tag ? ` · ${tag}` : ""}
        </p>
      </form>
    </li>
  );
}

function NewPresentationForm({
  file,
  busy,
  onCancel,
  onSubmit,
}: {
  file: File;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (options: UploadOptions) => void;
}) {
  const [label, setLabel] = useState("");
  const [delta, setDelta] = useState("0");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const deltaCents = dollarsToCents(delta, { allowNegative: true });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-xl bg-stone-50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!label.trim() || deltaCents === null) return;
        onSubmit({ label: label.trim(), priceDeltaCents: deltaCents });
      }}
    >
      <div className="flex gap-3">
        <AdminThumb url={previewUrl} alt="Foto elegida" className="size-20 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={60}
            required
            autoFocus
            aria-label="Nombre de la presentación"
            placeholder="Ej. Envoltura kraft"
            className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
          />
          <div className="relative">
            <span aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-500">
              ±$
            </span>
            <input
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
              inputMode="decimal"
              aria-label="Diferencia de precio en dólares (negativo si es más barata)"
              className={`h-10 w-full rounded-lg border bg-white pr-2 pl-9 text-sm tabular-nums ${
                deltaCents === null ? "border-(--brand)" : "border-stone-300"
              }`}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        Suma al precio del pastel. Escribe 0 si cuesta lo mismo, o un número negativo si es más barata.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-11 flex-1 rounded-xl border border-stone-300 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !label.trim() || deltaCents === null}
          className="h-11 flex-1 rounded-xl bg-(--brand) text-sm font-semibold text-white disabled:bg-stone-300"
        >
          {busy ? "Subiendo…" : "Subir"}
        </button>
      </div>
    </form>
  );
}

