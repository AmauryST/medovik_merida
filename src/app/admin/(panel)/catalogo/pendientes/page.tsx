import type { Metadata } from "next";
import Link from "next/link";

import { AdminThumb } from "@/components/admin/AdminThumb";
import { listPendingProducts } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/admin/session";
import { DRAFT_FIELD_LABELS, draftChanges, readDraft, type DraftChange } from "@/lib/admin/staging";
import { SLOT_LABELS } from "@/types/admin";
import { formatCents } from "@/types/catalog";

import { ApproveButton } from "./ApproveButton";

export const metadata: Metadata = { title: "Pendientes de aprobación" };

function show(change: DraftChange, side: "live" | "draft"): string {
  const value = change[side];
  if (change.field === "price_cents") return typeof value === "number" ? `$${formatCents(value)}` : "—";
  return typeof value === "string" && value ? value : "—";
}

export default async function PendingPage() {
  const ctx = await requireAdmin();
  const pending = await listPendingProducts(ctx);
  const isOwner = ctx.role === "OWNER";

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/admin/catalogo/" className="text-sm font-medium text-stone-500">
          ← Catálogo
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Pendientes de aprobación</h1>
        <p className="mt-1 text-sm text-stone-500">
          La tienda muestra la versión en producción hasta que se aprueben.
        </p>
      </div>

      {pending.length > 0 ? (
        <a
          href="/api/admin/preview/"
          className="flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold"
        >
          Ver la tienda con los cambios pendientes
        </a>
      ) : (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500">
          No hay cambios pendientes.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {pending.map(({ product, liveCoverUrl, pendingPlacements }) => {
          const isNew = !product.is_live;
          const changes = isNew ? [] : draftChanges(product, readDraft(product.draft_data));
          return (
            <li key={product.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <AdminThumb url={liveCoverUrl} alt="" className="size-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/catalogo/${product.id}/`} className="block truncate font-semibold">
                    {product.name}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {isNew ? `Pastel nuevo · $${formatCents(product.price_cents)}` : "Cambios en un pastel publicado"}
                  </p>
                </div>
              </div>

              {changes.length > 0 ? (
                <table className="mt-3 w-full table-fixed text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-500">
                      <th className="w-24 pb-1 font-medium">Campo</th>
                      <th className="pb-1 font-medium">En producción</th>
                      <th className="pb-1 font-medium">Borrador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr key={change.field} className="border-t border-stone-100 align-top">
                        <td className="py-2 pr-2 text-stone-500">{DRAFT_FIELD_LABELS[change.field]}</td>
                        <td className="py-2 pr-2 break-words text-stone-500 line-through decoration-stone-300">
                          {show(change, "live")}
                        </td>
                        <td className="py-2 break-words font-medium">{show(change, "draft")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {pendingPlacements.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-stone-500">Fotos</p>
                  <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {pendingPlacements.map((placement) => {
                      const draft = (placement.draft_data ?? {}) as { is_active?: boolean; label?: string };
                      const action = !placement.is_live
                        ? "Nueva"
                        : draft.is_active === false
                          ? "Se quita"
                          : "Cambia";
                      return (
                        <li key={placement.id} className="w-20 shrink-0">
                          <AdminThumb
                            url={placement.media?.public_url ?? null}
                            alt=""
                            className="size-20 rounded-lg"
                          />
                          <p className="mt-1 truncate text-[11px] leading-tight text-stone-600">
                            {action} · {SLOT_LABELS[placement.slot_code].title}
                          </p>
                          {draft.label ?? placement.label ? (
                            <p className="truncate text-[11px] text-stone-500">{draft.label ?? placement.label}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {isOwner ? (
                <ApproveButton productId={product.id} productName={product.name} />
              ) : (
                <p className="mt-3 text-sm text-stone-500">Esperando la aprobación de la dueña o el dueño.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}


