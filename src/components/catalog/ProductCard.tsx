"use client";

import { useState } from "react";
import Image from "next/image";
import { useOptionalCart } from "@/components/catalog/CartContext";
import {
  formatCents,
  getProductFormats,
  type CatalogProduct,
  type CurrencyCode,
  type MedovikFormatCode,
  type ProductFormatOption,
} from "@/types/catalog";

interface ProductCardProps {
  product: CatalogProduct;
  currency?: CurrencyCode;
  defaultFormat?: MedovikFormatCode;
  showPrice?: boolean;
  onToggleProductPrice?: (slugOrId: string) => void;
  onSelect: (product: CatalogProduct) => void;
}

export function catalogBridgeHref(slug: string): string {
  return `/pedir/catalogo/${encodeURIComponent(slug)}`;
}

export function ProductCard({
  product,
  currency = "MXN",
  defaultFormat = "mediano",
  showPrice: showPriceProp,
  onToggleProductPrice,
  onSelect,
}: ProductCardProps) {
  const cart = useOptionalCart();
  const formats = getProductFormats(product);

  const initialIdx = Math.max(
    0,
    formats.findIndex((f) => f.code === defaultFormat),
  );
  const [selectedFormatIdx, setSelectedFormatIdx] = useState<number>(initialIdx);
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const fallbackFormat: ProductFormatOption = {
    id: `${product.id}-mediano`,
    code: "mediano",
    label: "Pastel Mediano (~1,225 kg)",
    short_label: "Mediano (~1.225 kg)",
    weight: "~1,225 kg",
    servings: "8 a 10 porciones",
    lead_time: "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
    price_cents: product.price_cents,
    price_delta_cents: 0,
    show_price: false,
    image: product.primary_image_url ?? undefined,
  };

  const activeFormat: ProductFormatOption =
    formats[selectedFormatIdx] ?? formats[0] ?? fallbackFormat;
  const showPrice =
    typeof showPriceProp === "boolean"
      ? showPriceProp
      : cart
        ? cart.isPriceVisibleFor(product)
        : false;

  const toggleThisProductPrice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleProductPrice) {
      onToggleProductPrice(product.slug);
      return;
    }
    if (!cart) return;
    cart.setProductPriceVisible(product.slug, !showPrice);
  };

  const subtitle =
    typeof product.attributes?.subtitle === "string"
      ? product.attributes.subtitle
      : product.short_description;
  const storyBadge =
    typeof product.attributes?.story_badge === "string"
      ? product.attributes.story_badge
      : "Elaboración Artesanal";
  const intensity =
    typeof product.attributes?.intensity === "string"
      ? product.attributes.intensity
      : null;
  const layersInfo =
    typeof product.attributes?.layers_info === "string"
      ? product.attributes.layers_info
      : "8 a 10 finas capas de miel horneadas una por una";
  const ingredients = Array.isArray(product.attributes?.ingredients)
    ? (product.attributes.ingredients as string[])
    : [];
  const pairing =
    typeof product.attributes?.pairing === "string"
      ? product.attributes.pairing
      : null;
  const conservation =
    typeof product.attributes?.conservation === "string"
      ? product.attributes.conservation
      : null;

  const displayImage =
    activeFormat?.image ||
    product.primary_image_url ||
    "/images/producto-01.webp";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cart || !product.is_available || !activeFormat) return;

    cart.addItem({
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      imageUrl: displayImage,
      presentationId: activeFormat.id,
      presentationLabel: `${activeFormat.short_label} · ${activeFormat.servings}`,
      unitPriceCents: activeFormat.price_cents,
      quantity,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const depositCents = Math.round((activeFormat.price_cents * quantity) / 2);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-dorado-suave/80 bg-blanco-calido shadow-xs transition-all duration-300 hover:border-dorado hover:shadow-lg">
      {/* Imagen principal que cambia según el formato elegido */}
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-crema-oscura"
      >
        <Image
          src={displayImage}
          alt={`${product.name} — ${activeFormat.label}`}
          fill
          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 45vw, 400px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-cacao/65 via-cacao/10 to-transparent" />

        {/* Sello superior izquierdo: Especialidad */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-blanco-calido/95 px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-rosa-profundo shadow-xs backdrop-blur-xs">
            {storyBadge}
          </span>
        </div>

        {/* Botón individual para mostrar/ocultar precio de este pastel (Modo Demo) */}
        {cart && (
          <button
            type="button"
            onClick={toggleThisProductPrice}
            title="Mostrar u ocultar el precio de este pastel individualmente"
            className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-xs backdrop-blur-xs transition cursor-pointer ${
              showPrice
                ? "bg-cacao/90 text-blanco-calido hover:bg-cacao"
                : "bg-blanco-calido/90 text-cacao hover:bg-blanco-calido"
            }`}
          >
            <span>{showPrice ? "💲 Precio visible" : "👁️ Mostrar precio"}</span>
          </button>
        )}

        {/* Pie sobre la foto: Formato activo + Peso/Porciones */}
        <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-2 text-blanco-calido">
          <div>
            <span className="inline-block rounded-full bg-rosa-profundo/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blanco-calido">
              {activeFormat.short_label}
            </span>
            <p className="mt-1 text-xs font-medium text-crema/95 drop-shadow-xs">
              {activeFormat.servings} · Peso {activeFormat.weight}
            </p>
          </div>

          {showPrice ? (
            <div className="rounded-2xl bg-blanco-calido/95 px-3 py-1.5 text-right text-cacao shadow-sm backdrop-blur-xs">
              <span className="block font-serif text-xl font-bold leading-none text-rosa-profundo">
                ${formatCents(activeFormat.price_cents)}{" "}
                <span className="font-sans text-[10px] font-semibold text-cacao-suave">
                  {currency}
                </span>
              </span>
              <span className="mt-0.5 block text-[10px] font-medium text-cacao-suave">
                {activeFormat.code === "rebanada"
                  ? "Por rebanada"
                  : `Anticipo 50%: $${formatCents(Math.round(activeFormat.price_cents / 2))}`}
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-blanco-calido/95 px-3 py-1 text-[11px] font-bold text-cacao shadow-xs backdrop-blur-xs">
              Cotizar en pedido
            </span>
          )}
        </div>
      </div>

      {/* Cuerpo de la tarjeta con abundante información del producto */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3
              onClick={() => onSelect(product)}
              className="cursor-pointer font-serif text-2xl font-bold leading-snug text-cacao transition-colors hover:text-rosa-profundo"
            >
              {product.name}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs font-semibold text-rosa-profundo">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Descripción sensorial */}
        <p className="mt-2.5 text-xs leading-relaxed text-cacao-suave sm:text-[13px]">
          {product.description || product.short_description}
        </p>

        {/* Píldoras de perfil técnico y sensorial */}
        <div className="mt-3.5 space-y-2 rounded-2xl border border-dorado-suave/60 bg-crema/60 p-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-sm" aria-hidden="true">
              🍯
            </span>
            <p className="text-cacao-suave">
              <strong className="text-cacao">Capas y textura:</strong> {layersInfo}
            </p>
          </div>
          {intensity && (
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-sm" aria-hidden="true">
                ✨
              </span>
              <p className="text-cacao-suave">
                <strong className="text-cacao">Notas de cata:</strong> {intensity}
              </p>
            </div>
          )}

          {/* Desplegable de Ingredientes reales, Maridaje y Conservación */}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rosa-profundo hover:underline cursor-pointer"
          >
            <span>
              {showDetails
                ? "Ocultar ingredientes y conservación ↑"
                : "Ver ingredientes reales, maridaje y conservación ↓"}
            </span>
          </button>

          {showDetails && (
            <div className="mt-2 space-y-2 border-t border-dorado-suave/50 pt-2.5 text-[11px] leading-relaxed text-cacao-suave">
              {ingredients.length > 0 && (
                <div>
                  <strong className="block text-cacao">
                    Ingredientes 100% reales (sin conservadores):
                  </strong>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {ingredients.map((ing) => (
                      <li key={ing}>{ing}</li>
                    ))}
                  </ul>
                </div>
              )}
              {pairing && (
                <p>
                  <strong className="text-cacao">Maridaje sugerido:</strong>{" "}
                  {pairing}
                </p>
              )}
              {conservation && (
                <p>
                  <strong className="text-cacao">Conservación:</strong>{" "}
                  {conservation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Selector de los 3 Formatos (Rebanada, Mediano, Grande) */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cacao">
              1. Elige el formato:
            </span>
            <span className="text-[11px] font-medium text-cacao-suave">
              {activeFormat.servings}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {formats.map((fmt, idx) => {
              const isSelected = idx === selectedFormatIdx;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormatIdx(idx)}
                  className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-rosa-profundo bg-rosa-empolvado/45 text-cacao shadow-xs ring-1 ring-rosa-profundo/40"
                      : "border-dorado-suave/80 bg-blanco-calido text-cacao-suave hover:border-dorado hover:bg-crema/60"
                  }`}
                >
                  <span className="text-xs font-bold leading-tight text-cacao">
                    {fmt.code === "rebanada"
                      ? "Rebanada"
                      : fmt.code === "mediano"
                        ? "Mediano"
                        : "Grande"}
                  </span>
                  <span className="mt-0.5 text-[10px] text-cacao-suave">
                    {fmt.weight}
                  </span>
                  {showPrice && (
                    <span className="mt-1 rounded-full bg-blanco-calido px-2 py-0.5 text-[10px] font-bold text-rosa-profundo">
                      ${formatCents(fmt.price_cents)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Aviso dinámico según si eligió Rebanada o Pastel Completo */}
          <p className="mt-2 rounded-xl bg-rosa-empolvado/30 px-3 py-1.5 text-[11px] font-medium text-cacao-suave">
            {activeFormat.code === "rebanada" ? (
              <>
                🍰 <strong>Rebanada individual (~180 g):</strong> consulta
                disponibilidad del día al enviar tu pedido.
              </>
            ) : (
              <>
                🎂 <strong>{activeFormat.label}:</strong> pedir al menos{" "}
                <strong>2 días antes</strong> · Se confirma con{" "}
                <strong>
                  50% de anticipo
                  {showPrice ? ` ($${formatCents(depositCents)} ${currency})` : ""}
                </strong>
                .
              </>
            )}
          </p>
        </div>

        {/* Selector de cantidad + Botón de Conformar Pedido */}
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2">
            {/* Stepper de cantidad */}
            <div className="inline-flex h-11 items-center rounded-full border border-dorado-suave bg-crema px-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Disminuir cantidad"
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-cacao transition hover:bg-blanco-calido cursor-pointer"
              >
                −
              </button>
              <span className="min-w-7 text-center text-xs font-bold text-cacao">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                aria-label="Aumentar cantidad"
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-cacao transition hover:bg-blanco-calido cursor-pointer"
              >
                +
              </button>
            </div>

            {/* CTA Principal: Agregar a mi pedido */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold tracking-wider uppercase shadow-xs transition-all cursor-pointer ${
                justAdded
                  ? "bg-emerald-700 text-blanco-calido"
                  : "bg-rosa-profundo text-blanco-calido hover:bg-rosa-intenso"
              }`}
            >
              {justAdded ? (
                <>✓ Agregado a tu pedido</>
              ) : showPrice ? (
                <>
                  Agregar · ${formatCents(activeFormat.price_cents * quantity)}{" "}
                  {currency}
                </>
              ) : (
                <>Agregar a mi pedido</>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelect(product)}
            className="mt-2 w-full rounded-full border border-dorado-suave/70 py-2 text-center text-[11px] font-semibold text-cacao-suave transition hover:border-dorado hover:bg-crema/60 hover:text-cacao cursor-pointer"
          >
            Ver galería de fotos, ficha completa y dedicatoria →
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
