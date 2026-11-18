"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { AdminThumb } from "@/components/admin/AdminThumb";
import { FeaturedSwitch } from "@/components/admin/FeaturedSwitch";
import { Switch } from "@/components/admin/Switch";
import {
  deleteBillboardItem,
  registerBillboardMedia,
  reorderBillboardItems,
  saveBillboardItem,
  toggleBillboardItemActive,
  type SaveBillboardInput,
} from "@/lib/admin/billboard-actions";
import { compressToWebp } from "@/lib/admin/image";
import { PRODUCT_IMAGES_BUCKET, productImagePath } from "@/lib/admin/media";
import { getCategoryGroupLabel } from "@/lib/catalog/filters";
import { createClient } from "@/lib/supabase/client";
import type { AdminCategory, AdminProductListItem } from "@/types/admin";
import type {
  BillboardItem,
  BillboardPlacement,
  BillboardTargetType,
  Uuid,
} from "@/types/catalog";
import { formatCents } from "@/types/catalog";

interface BillboardManagerProps {
  storeId: Uuid;
  initialBillboard: BillboardItem[];
  products: AdminProductListItem[];
  categories: AdminCategory[];
}

const PLACEMENT_LABELS: Record<BillboardPlacement, string> = {
  BOTH: "Inicio y Pedidos",
  HOME: "Solo Inicio",
  PEDIDOS: "Solo Pedidos",
};

const TARGET_TYPE_LABELS: Record<BillboardTargetType, string> = {
  PRODUCT: "Producto del catálogo",
  CATEGORY: "Categoría",
  PRICE_RANGE: "Rango de precio",
  LINK: "Enlace interno / web",
};

export function BillboardManager({
  storeId,
  initialBillboard,
  products,
  categories,
}: BillboardManagerProps) {
  const [items, setItems] = useState<BillboardItem[]>(initialBillboard);
  const [editingItem, setEditingItem] = useState<Partial<BillboardItem> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kicker, setKicker] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Ver más");
  const [targetType, setTargetType] = useState<BillboardTargetType>("LINK");
  const [targetValue, setTargetValue] = useState("");
  const [placement, setPlacement] = useState<BillboardPlacement>("BOTH");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  function openCreate() {
    setEditingItem({ id: "" });
    setMediaId(null);
    setKicker("");
    setTitle("");
    setSubtitle("");
    setCtaLabel("Ver más");
    setTargetType("LINK");
    setTargetValue("/#catalogo");
    setPlacement("BOTH");
    setImageUrl("");
    setImageAlt("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openEdit(item: BillboardItem) {
    setEditingItem(item);
    setMediaId(item.media_id ?? null);
    setKicker(item.kicker || "");
    setTitle(item.title);
    setSubtitle(item.subtitle || "");
    setCtaLabel(item.cta_label || "Ver más");
    setTargetType(item.target_type);
    setTargetValue(item.target_value);
    setPlacement(item.placement);
    setImageUrl(item.image_url || "");
    setImageAlt(item.image_alt || "");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;

    try {
      setUploading(true);
      setError(null);

      const blob = await compressToWebp(raw);
      const newMediaId = crypto.randomUUID() as Uuid;
      const path = productImagePath(storeId, newMediaId);

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, blob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        setError(`No se pudo subir la imagen: ${uploadError.message}`);
        return;
      }

      const registered = await registerBillboardMedia({
        mediaId: newMediaId,
        altText: title || "Anuncio editorial",
        fileSizeBytes: blob.size,
      });

      if (!registered.ok) {
        setError(registered.error);
        return;
      }

      setMediaId(newMediaId);
      if (registered.url) {
        setImageUrl(registered.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la imagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleClearImage() {
    setImageUrl("");
    setMediaId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSave() {
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    const payload: SaveBillboardInput = {
      id: editingItem?.id || undefined,
      media_id: mediaId,
      kicker,
      title,
      subtitle: subtitle || null,
      cta_label: ctaLabel,
      target_type: targetType,
      target_value: targetValue,
      placement,
      image_url: imageUrl || null,
      image_alt: imageAlt || null,
      is_active: editingItem?.is_active ?? true,
    };

    startTransition(async () => {
      const res = await saveBillboardItem(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Optimistic update local
      const id = payload.id || crypto.randomUUID();
      const updated: BillboardItem = {
        id,
        store_id: storeId,
        media_id: payload.media_id ?? null,
        image_url: payload.image_url ?? null,
        image_alt: payload.image_alt ?? null,
        kicker: payload.kicker ?? "",
        title: payload.title,
        subtitle: payload.subtitle ?? null,
        cta_label: payload.cta_label ?? "Ver más",
        target_type: payload.target_type,
        target_value: payload.target_value,
        placement: payload.placement,
        is_active: payload.is_active ?? true,
        sort_order: editingItem?.sort_order ?? items.length,
      };

      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === editingItem?.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
      setEditingItem(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Deseas eliminar este anuncio del billboard?")) return;
    startTransition(async () => {
      const res = await deleteBillboardItem(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: next } : i)));
      const res = await toggleBillboardItemActive(id, next);
      if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);

    setItems(next.map((item, idx) => ({ ...item, sort_order: idx })));

    startTransition(async () => {
      const res = await reorderBillboardItems(next.map((i) => i.id));
      if (!res.ok) {
        setError(res.error);
        setItems(items);
      }
    });
  }

  function getBillboardThumb(item: BillboardItem): string {
    if (item.image_url) return item.image_url;
    if (item.target_type === "PRODUCT") {
      const product = products.find(
        (p) => p.slug === item.target_value || p.id === item.target_value,
      );
      if (product?.cover_url) return product.cover_url;
    }
    return "/placeholders/default-cake.svg";
  }

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Anuncios del Billboard */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Billboard Editorial</h2>
            <p className="text-sm text-stone-500">
              Banners destacados que se muestran sobre el catálogo en la página de inicio o pedidos.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex h-10 items-center justify-center rounded-xl bg-(--brand) px-4 text-sm font-semibold text-white shadow-sm hover:brightness-105"
          >
            Nuevo anuncio
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
            {error}
          </p>
        )}

        {/* Modal / Formulario de edición */}
        {editingItem && (
          <div className="mt-5 rounded-2xl border border-stone-300 bg-stone-50 p-5">
            <h3 className="text-base font-semibold text-stone-900">
              {editingItem.id ? "Editar anuncio" : "Crear anuncio"}
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Antetítulo (Kicker)
                </label>
                <input
                  type="text"
                  value={kicker}
                  onChange={(e) => setKicker(e.target.value)}
                  placeholder="Ej: Edición Limitada"
                  className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Título principal *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: El clásico Cake de Nata y Chocolate"
                  className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Subtítulo / Descripción
                </label>
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Texto explicativo del anuncio..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Texto del botón
                </label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Ej: Encargar ahora"
                  className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Ubicación (Placement)
                </label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as BillboardPlacement)}
                  className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                >
                  <option value="BOTH">Inicio y Pedidos</option>
                  <option value="HOME">Solo Inicio</option>
                  <option value="PEDIDOS">Solo Pedidos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Tipo de acción
                </label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    const next = e.target.value as BillboardTargetType;
                    setTargetType(next);
                    if (next === "LINK") setTargetValue("/#catalogo");
                    else if (next === "PRODUCT" && products[0]) setTargetValue(products[0].slug);
                    else if (next === "CATEGORY" && categories[0]) setTargetValue(categories[0].slug);
                    else if (next === "PRICE_RANGE") setTargetValue("25-50");
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                >
                  <option value="PRODUCT">Abrir producto específico</option>
                  <option value="CATEGORY">Filtrar por categoría</option>
                  <option value="PRICE_RANGE">Filtrar por rango de precio</option>
                  <option value="LINK">Enlace URL / Pedir</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Destino de la acción
                </label>
                {targetType === "PRODUCT" ? (
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.name} (${formatCents(p.price_cents)})
                      </option>
                    ))}
                  </select>
                ) : targetType === "CATEGORY" ? (
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name} ({getCategoryGroupLabel(c.group_type)})
                      </option>
                    ))}
                  </select>
                ) : targetType === "PRICE_RANGE" ? (
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  >
                    <option value="under-25">Menos de $25</option>
                    <option value="25-50">$25 a $50</option>
                    <option value="premium">Premium</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="Ej: /#catalogo o /#contacto"
                    className="mt-1 h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Imagen del Anuncio (Opcional, si se enlaza a un producto hereda su foto)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
                  >
                    {uploading ? "Subiendo..." : "Subir imagen desde tu equipo"}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="h-10 rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Quitar imagen
                    </button>
                  )}
                  {uploading && (
                    <span className="text-xs text-stone-500">Procesando y subiendo WebP...</span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {imageUrl && (
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      <Image
                        src={imageUrl}
                        alt="Vista previa"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setMediaId(null);
                    }}
                    placeholder="O pega una URL: /assets/hero.webp o URL pública de Supabase"
                    className="h-10 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || uploading}
                className="h-10 rounded-xl bg-(--brand) px-5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Guardar anuncio"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de anuncios */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              No hay anuncios en el billboard. Pulsa &quot;Nuevo anuncio&quot; para crear uno.
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {items.map((item, index) => (
                <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0 || isPending}
                        aria-label="Subir anuncio"
                        title="Subir anuncio"
                        className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 bg-white text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === items.length - 1 || isPending}
                        aria-label="Bajar anuncio"
                        title="Bajar anuncio"
                        className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 bg-white text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      <Image
                        src={getBillboardThumb(item)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      {item.kicker && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                          {item.kicker}
                        </span>
                      )}
                      <h4 className="font-semibold text-stone-900">{item.title}</h4>
                      <p className="text-xs text-stone-500">
                        {PLACEMENT_LABELS[item.placement]} · {TARGET_TYPE_LABELS[item.target_type]}: {item.target_value}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <Switch
                      checked={item.is_active}
                      onToggle={() => handleToggle(item.id, !item.is_active)}
                      label="Activo"
                    />
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 2. Destacados del Catálogo (Spotlight de pasteles) */}
      <section>
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Pasteles Destacados</h2>
          <p className="text-sm text-stone-500">
            Activa el switch &quot;Destacado&quot; para seleccionar los pasteles estrella que se presentan en el foco principal y en los filtros rápidos.
          </p>
        </div>

        <ul className="mt-4 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <AdminThumb url={product.cover_url} alt="" />
                <div>
                  <p className="font-medium text-stone-900">{product.name}</p>
                  <p className="text-xs text-stone-500">${formatCents(product.price_cents)} USD</p>
                </div>
              </div>
              <FeaturedSwitch
                productId={product.id}
                productName={product.name}
                isFeatured={product.is_featured}
                showLabel
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
