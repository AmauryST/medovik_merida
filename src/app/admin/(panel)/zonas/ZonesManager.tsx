"use client";

import { useState, useTransition } from "react";

import { Switch } from "@/components/admin/Switch";
import { centsToInput, dollarsToCents } from "@/lib/admin/money";
import {
  createZone,
  moveZone,
  setShowDeliveryZone,
  setZoneActive,
  updateZone,
  type ZoneInput,
} from "@/lib/admin/zone-actions";
import type { ActionResult } from "@/types/admin";
import type { DeliveryZone } from "@/types/catalog";
import { formatCents } from "@/types/catalog";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onOk?.();
      else setError(result.error);
    });
  }
  return { pending, error, run };
}

export function ZonesManager({ zones, showDeliveryZone }: { zones: DeliveryZone[]; showDeliveryZone: boolean }) {
  const settings = useAction();
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Zonas de envío</h1>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Mostrar selector de zona</p>
            <p className="text-sm text-stone-500">
              {showDeliveryZone
                ? "Los clientes eligen su zona y ven el costo de envío."
                : "Oculto: el envío se coordina por WhatsApp."}
            </p>
          </div>
          <Switch
            checked={showDeliveryZone}
            label="Mostrar selector de zona en la tienda"
            disabled={settings.pending}
            onToggle={() => settings.run(() => setShowDeliveryZone(!showDeliveryZone))}
          />
        </div>
        {settings.error ? <p className="mt-2 text-sm text-(--brand)">{settings.error}</p> : null}
      </div>

      <ul className="flex flex-col gap-3">
        {zones.map((zone, index) => (
          <ZoneItem key={zone.id} zone={zone} isFirst={index === 0} isLast={index === zones.length - 1} />
        ))}
        {zones.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            No hay zonas todavía.
          </li>
        ) : null}
      </ul>

      {adding ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="font-semibold">Nueva zona</p>
          <ZoneForm submitLabel="Crear zona" onCancel={() => setAdding(false)} onSaved={() => setAdding(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-12 rounded-xl border border-dashed border-stone-400 text-sm font-semibold"
        >
          Añadir zona
        </button>
      )}
    </section>
  );
}

function ZoneItem({ zone, isFirst, isLast }: { zone: DeliveryZone; isFirst: boolean; isLast: boolean }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);

  return (
    <li className={`rounded-2xl border border-stone-200 bg-white p-4 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-semibold ${zone.is_active ? "" : "text-stone-400"}`}>{zone.name}</p>
          <p className="text-sm text-stone-600">
            {zone.fee_cents === 0 ? "Envío gratis" : `$${formatCents(zone.fee_cents)}`}
            {zone.estimated_time_text ? ` · ${zone.estimated_time_text}` : ""}
          </p>
        </div>
        <Switch
          checked={zone.is_active}
          label={`${zone.name} activa`}
          disabled={pending}
          onToggle={() => run(() => setZoneActive(zone.id, !zone.is_active))}
        />
      </div>

      {editing ? (
        <ZoneForm zone={zone} submitLabel="Guardar" onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-10 flex-1 rounded-lg border border-stone-300 text-sm font-medium"
          >
            Editar
          </button>
          <button
            type="button"
            aria-label={`Subir ${zone.name}`}
            disabled={pending || isFirst}
            onClick={() => run(() => moveZone(zone.id, -1))}
            className="h-10 w-12 rounded-lg border border-stone-300 text-sm disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Bajar ${zone.name}`}
            disabled={pending || isLast}
            onClick={() => run(() => moveZone(zone.id, 1))}
            className="h-10 w-12 rounded-lg border border-stone-300 text-sm disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-(--brand)">{error}</p> : null}
    </li>
  );
}

/** Create or edit form. The fee is typed in dollars and sent as `fee_cents`. */
function ZoneForm({
  zone,
  submitLabel,
  onCancel,
  onSaved,
}: {
  zone?: DeliveryZone;
  submitLabel: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [fee, setFee] = useState(zone ? centsToInput(zone.fee_cents) : "0");
  const [time, setTime] = useState(zone?.estimated_time_text ?? "");
  const { pending, error, run } = useAction();
  const feeCents = dollarsToCents(fee);

  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (feeCents === null || !name.trim()) return;
        const input: ZoneInput = { name, feeCents, estimatedTimeText: time };
        run(() => (zone ? updateZone(zone.id, input) : createZone(input)), onSaved);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Nombre</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
          placeholder="Ej. Vedado"
          className="h-11 rounded-xl border border-stone-300 bg-white px-3"
        />
      </label>
      <div className="flex gap-3">
        <label className="flex w-32 flex-col gap-1">
          <span className="text-sm font-medium">Costo (USD)</span>
          <input
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            inputMode="decimal"
            className={`h-11 rounded-xl border bg-white px-3 tabular-nums ${
              feeCents === null ? "border-(--brand)" : "border-stone-300"
            }`}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Tiempo estimado</span>
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            maxLength={60}
            placeholder="Ej. 2 a 4 horas"
            className="h-11 rounded-xl border border-stone-300 bg-white px-3"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="h-11 flex-1 rounded-xl border border-stone-300 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || feeCents === null || !name.trim()}
          className="h-11 flex-1 rounded-xl bg-(--brand) text-sm font-semibold text-white disabled:bg-stone-300"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
      {error ? <p className="text-sm text-(--brand)">{error}</p> : null}
    </form>
  );
}
