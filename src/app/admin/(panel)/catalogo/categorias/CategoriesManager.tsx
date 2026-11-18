"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Switch } from "@/components/admin/Switch";
import { BRAND } from "@/config/brand";
import {
  createCategory,
  reorderCategories,
  setCategoryActive,
  updateCategory,
} from "@/lib/admin/category-actions";
import { getCategoryGroupLabel, resolveStoreCategoryGroups } from "@/lib/catalog/filters";
import type { AdminCategoryItem } from "@/types/admin";
import type { Uuid } from "@/types/catalog";

interface CategoriesManagerProps {
  categories: AdminCategoryItem[];
}

interface DraftState {
  name: string;
  groupType: string;
}

interface DragState {
  id: Uuid;
  groupType: string;
  initialIds: Uuid[];
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localCategories, setLocalCategories] = useState<AdminCategoryItem[]>(categories);
  const [error, setError] = useState<string | null>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>("all");
  const [creatingInGroup, setCreatingInGroup] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<Uuid | null>(null);
  const groups = useMemo(() => resolveStoreCategoryGroups(localCategories), [localCategories]);

  const defaultGroupType =
    groups[0]?.type ?? Object.keys(BRAND.categoryGroupLabels)[0] ?? "FLAVOR";

  const [draft, setDraft] = useState<DraftState>({ name: "", groupType: defaultGroupType });
  const [draggingId, setDraggingId] = useState<Uuid | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const latestCategoriesRef = useRef<AdminCategoryItem[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
    latestCategoriesRef.current = categories;
  }, [categories]);

  function updateLocalCategories(next: AdminCategoryItem[]) {
    latestCategoriesRef.current = next;
    setLocalCategories(next);
  }

  const visibleGroups = useMemo(() => {
    if (activeGroupFilter === "all") return groups;
    return groups.filter((g) => g.type === activeGroupFilter);
  }, [groups, activeGroupFilter]);

  function openNew(groupType: string) {
    setError(null);
    setEditingId(null);
    setDraft({ name: "", groupType });
    setCreatingInGroup(groupType);
  }

  function openEdit(item: AdminCategoryItem) {
    setError(null);
    setCreatingInGroup(null);
    setDraft({
      name: item.name,
      groupType: item.group_type,
    });
    setEditingId(item.id);
  }

  function closeForm() {
    setCreatingInGroup(null);
    setEditingId(null);
    setError(null);
  }

  function saveNew(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCategory(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreatingInGroup(null);
      router.refresh();
    });
  }

  function saveEdit(event: React.FormEvent, categoryId: Uuid) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCategory(categoryId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function toggleActive(item: AdminCategoryItem, next: boolean) {
    setError(null);
    const optimistic = latestCategoriesRef.current.map((c) =>
      c.id === item.id ? { ...c, is_active: next } : c,
    );
    updateLocalCategories(optimistic);
    startTransition(async () => {
      const result = await setCategoryActive(item.id, next);
      if (!result.ok) {
        setError(result.error);
        updateLocalCategories(categories);
      } else {
        router.refresh();
      }
    });
  }

  function persistGroupOrder(groupType: string, orderedIds: Uuid[]) {
    setError(null);
    startTransition(async () => {
      const result = await reorderCategories(groupType, orderedIds);
      if (!result.ok) {
        setError(result.error);
        updateLocalCategories(categories);
      } else {
        router.refresh();
      }
    });
  }

  function moveGroupItemByIndex(groupType: string, fromIndex: number, toIndex: number): Uuid[] | null {
    const current = latestCategoriesRef.current;
    const groupItems = current.filter((c) => c.group_type === groupType);
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= groupItems.length ||
      toIndex >= groupItems.length ||
      fromIndex === toIndex
    ) {
      return null;
    }

    const reorderedGroup = [...groupItems];
    const [moved] = reorderedGroup.splice(fromIndex, 1);
    if (!moved) return null;
    reorderedGroup.splice(toIndex, 0, moved);

    let cursor = 0;
    const nextAll = current.map((item) => {
      if (item.group_type !== groupType) return item;
      const replacement = reorderedGroup[cursor]!;
      cursor += 1;
      return { ...replacement, sort_order: cursor };
    });

    updateLocalCategories(nextAll);
    return reorderedGroup.map((c) => c.id);
  }

  function move(item: AdminCategoryItem, direction: -1 | 1) {
    const groupItems = latestCategoriesRef.current.filter((c) => c.group_type === item.group_type);
    const fromIndex = groupItems.findIndex((c) => c.id === item.id);
    const nextIds = moveGroupItemByIndex(item.group_type, fromIndex, fromIndex + direction);
    if (nextIds) {
      persistGroupOrder(item.group_type, nextIds);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>, item: AdminCategoryItem) {
    if (pending || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const initialIds = latestCategoriesRef.current
      .filter((c) => c.group_type === item.group_type)
      .map((c) => c.id);

    dragRef.current = {
      id: item.id,
      groupType: item.group_type,
      initialIds,
    };
    setDraggingId(item.id);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const listEl = event.currentTarget.closest("ul");
    if (!listEl) return;

    const rows = Array.from(listEl.querySelectorAll<HTMLLIElement>("li[data-category-id]"));
    const fromIndex = rows.findIndex((row) => row.dataset.categoryId === drag.id);
    if (fromIndex === -1) return;

    const pointerY = event.clientY;
    let targetIndex = fromIndex;

    for (let i = 0; i < rows.length; i += 1) {
      if (i === fromIndex) continue;
      const rect = rows[i]!.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (i < fromIndex && pointerY < midY) {
        targetIndex = i;
        break;
      }
      if (i > fromIndex && pointerY > midY) {
        targetIndex = i;
      }
    }

    if (targetIndex !== fromIndex) {
      moveGroupItemByIndex(drag.groupType, fromIndex, targetIndex);
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    setDraggingId(null);

    const finalIds = latestCategoriesRef.current
      .filter((c) => c.group_type === drag.groupType)
      .map((c) => c.id);

    const changed =
      finalIds.length === drag.initialIds.length &&
      finalIds.some((id, idx) => id !== drag.initialIds[idx]);

    if (changed) {
      persistGroupOrder(drag.groupType, finalIds);
    }
  }

  const activeTotal = localCategories.filter((c) => c.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin/catalogo/"
          className="text-sm font-semibold text-(--brand) hover:underline"
        >
          ← Catálogo
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Clasificaciones</h1>
          <p className="text-xs text-stone-500">
            {activeTotal} {activeTotal === 1 ? "activa" : "activas"} de {localCategories.length} ·
            Toca un nombre para editar o arrastra desde ⠿ para ordenar
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            openNew(activeGroupFilter === "all" ? defaultGroupType : activeGroupFilter)
          }
          className="min-h-11 shrink-0 rounded-xl bg-(--brand) px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          + Nueva
        </button>
      </div>

      {/* Selector rápido de grupo (Sabor, Ocasión, Tipo de flor, etc.) */}
      {groups.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveGroupFilter("all")}
            className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
              activeGroupFilter === "all"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            Todos ({localCategories.length})
          </button>
          {groups.map((group) => {
            const count = localCategories.filter((c) => c.group_type === group.type).length;
            const active = activeGroupFilter === group.type;
            return (
              <button
                key={group.type}
                type="button"
                onClick={() => setActiveGroupFilter(active ? "all" : group.type)}
                className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                {group.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-(--brand)">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {visibleGroups.map((group) => {
          const items = localCategories.filter((c) => c.group_type === group.type);
          const activeInGroup = items.filter((c) => c.is_active).length;
          const isCreatingHere = creatingInGroup === group.type;

          return (
            <section
              key={group.type}
              className="space-y-2.5 rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{group.label}</h2>
                  <p className="text-xs text-stone-500">
                    {activeInGroup} {activeInGroup === 1 ? "activa" : "activas"} de {items.length}
                  </p>
                </div>
                {!isCreatingHere && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openNew(group.type)}
                    className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-(--brand) hover:border-(--brand) disabled:opacity-50"
                  >
                    + Añadir {group.label.toLowerCase()}
                  </button>
                )}
              </div>

              {isCreatingHere && (
                <CategoryForm
                  title={`Añadir a ${group.label}`}
                  draft={draft}
                  groups={groups}
                  pending={pending}
                  onChange={setDraft}
                  onSubmit={saveNew}
                  onCancel={closeForm}
                />
              )}

              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 px-3 py-5 text-center text-xs text-stone-500">
                  No hay clasificaciones en {group.label.toLowerCase()}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item, index) => {
                    const isEditing = editingId === item.id;
                    const isDragging = draggingId === item.id;
                    const productNoun =
                      item.product_count === 1 ? BRAND.itemNounSingular : BRAND.itemNounPlural;

                    return (
                      <li
                        key={item.id}
                        data-category-id={item.id}
                        className={`rounded-xl border p-2.5 transition-shadow ${
                          isDragging
                            ? "z-10 border-(--brand) bg-white shadow-md ring-2 ring-(--brand)/30"
                            : "border-stone-200 bg-stone-50/70"
                        }`}
                      >
                        {isEditing ? (
                          <CategoryForm
                            title={`Editar "${item.name}"`}
                            draft={draft}
                            groups={groups}
                            pending={pending}
                            onChange={setDraft}
                            onSubmit={(event) => saveEdit(event, item.id)}
                            onCancel={closeForm}
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <button
                                type="button"
                                disabled={pending || items.length < 2}
                                aria-label={`Arrastrar ${item.name} para cambiar el orden`}
                                title="Arrastrar para reordenar"
                                onPointerDown={(event) => handlePointerDown(event, item)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerEnd}
                                onPointerCancel={handlePointerEnd}
                                className="flex h-9 w-7 shrink-0 touch-none select-none items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 cursor-grab active:cursor-grabbing disabled:opacity-30"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <circle cx="5.5" cy="3.5" r="1.3" />
                                  <circle cx="10.5" cy="3.5" r="1.3" />
                                  <circle cx="5.5" cy="8" r="1.3" />
                                  <circle cx="10.5" cy="8" r="1.3" />
                                  <circle cx="5.5" cy="12.5" r="1.3" />
                                  <circle cx="10.5" cy="12.5" r="1.3" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => openEdit(item)}
                                title={`Editar ${item.name}`}
                                className="min-w-0 flex-1 rounded-lg py-0.5 text-left transition-colors hover:text-(--brand) disabled:opacity-50"
                              >
                                <p
                                  className={`truncate text-sm font-semibold ${
                                    item.is_active ? "text-stone-900" : "text-stone-400 line-through"
                                  }`}
                                >
                                  {item.name}
                                </p>
                                <p className="mt-0.5 text-xs text-stone-500">
                                  {item.product_count} {productNoun}
                                  {item.is_active ? "" : " · Oculta en tienda"}
                                </p>
                              </button>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                disabled={pending || index === 0}
                                onClick={() => move(item, -1)}
                                aria-label={`Subir ${item.name}`}
                                className="min-h-8 min-w-8 rounded-lg border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={pending || index === items.length - 1}
                                onClick={() => move(item, 1)}
                                aria-label={`Bajar ${item.name}`}
                                className="min-h-8 min-w-8 rounded-lg border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 disabled:opacity-30"
                              >
                                ↓
                              </button>
                              <Switch
                                checked={item.is_active}
                                disabled={pending}
                                label={`Activar ${item.name}`}
                                onToggle={() => toggleActive(item, !item.is_active)}
                              />
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface CategoryFormProps {
  title: string;
  draft: DraftState;
  groups: ReadonlyArray<{ type: string; label: string }>;
  pending: boolean;
  onChange: (next: DraftState) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

function CategoryForm({
  title,
  draft,
  groups,
  pending,
  onChange,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-(--brand) bg-white p-3.5"
    >
      <p className="text-sm font-semibold">{title}</p>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Nombre</span>
          <input
            type="text"
            required
            maxLength={80}
            autoFocus
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder={`Ej. ${draft.groupType === "FLAVOR" ? "Red Velvet" : draft.groupType === "FLOWER_TYPE" ? "Tulipanes" : "Aniversario"}`}
            className="mt-1 min-h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-stone-500">Grupo</span>
          <select
            value={draft.groupType}
            onChange={(event) => onChange({ ...draft, groupType: event.target.value })}
            className="mt-1 min-h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
          >
            {groups.map((g) => (
              <option key={g.type} value={g.type}>
                {g.label}
              </option>
            ))}
            {!groups.some((g) => g.type === draft.groupType) && (
              <option value={draft.groupType}>{getCategoryGroupLabel(draft.groupType)}</option>
            )}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 flex-1 rounded-xl bg-(--brand) px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="min-h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
