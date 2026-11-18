"use client";

import { useEffect, useState } from "react";
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
  onSelect,
}: ProductCardProps) {
  const cart = useOptionalCart();
  const formats = getProductFormats(product);

  const initialIdx = Math.max(
    0,
    formats.findIndex((f) => f.code === defaultFormat),
  );
  const [selectedFormatIdx, setSelectedFormatIdx] = useState<number>(initialIdx);
  const [justAdded, setJustAdded] = useState(false);

  // Sync card format when parent format filter tab changes
  useEffect(() => {
    const idx = formats.findIndex((f) => f.code === defaultFormat);
    if (idx >= 0) {
      setSelectedFormatIdx(idx);
    }
  }, [defaultFormat, formats]);

  const fallbackFormat: ProductFormatOption = {
    id: `${product.id}-mediano`,
    code: "mediano",
    label: "Pastel Mediano (~1,225 kg)",
    short_label: "Mediano (~1.225 kg)",
    weight: "~1,225 kg",
    servings: "8 a 10 porciones",
    lead_time:
      "Haz tu pedido al menos 2 días antes · Se confirma con 50% de anticipo",
    price_cents: product.price_cents,
    price_delta_cents: 0,
    show_price: true,
    image: product.primary_image_url ?? undefined,
  };

  const activeFormat: ProductFormatOption =
    formats[selectedFormatIdx] ?? formats[0] ?? fallbackFormat;

  const showPrice = true;

  const displayImage =
    activeFormat?.image ||
    product.primary_image_url ||
    "/images/clasico-mediano.webp";

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
      quantity: 1,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  const formatShortTitle = (code: MedovikFormatCode) => {
    if (code === "rebanada") return "Rebanada";
    if (code === "mediano") return "Mediano";
    return "Grande";
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-dorado-suave/65 bg-blanco-calido shadow-xs transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out)] hover:border-dorado hover:shadow-md">
      {/* Clean Rounded Image Top — Reference Image 3 */}
      <button
        type="button"
        onClick={() => onSelect(product)}
        aria-label={`Ver ficha e ingredientes de ${product.name}`}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden border-0 bg-crema-oscura p-0 text-left"
      >
        <Image
          src={displayImage}
          alt={`${product.name} — ${activeFormat.label}`}
          fill
          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 45vw, 380px"
          className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-105"
        />
      </button>

      {/* Minimalist Card Body — Reference Image 3 */}
      <div className="flex flex-1 flex-col items-center px-5 pt-5 pb-5 text-center sm:px-6">
        {/* Subtle 3-Format Pill Selector */}
        {formats.length > 1 && (
          <div
            role="group"
            aria-label={`Formato de ${product.name}`}
            className="inline-flex items-center gap-1 rounded-full border border-dorado-suave/60 bg-crema/70 p-0.5"
          >
            {formats.map((fmt, idx) => {
              const isSelected = idx === selectedFormatIdx;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormatIdx(idx)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold tracking-wide transition-[background-color,color] duration-200 ease-[var(--ease-out)] ${
                    isSelected
                      ? "bg-rosa-profundo text-blanco-calido"
                      : "text-cacao-suave hover:text-cacao"
                  }`}
                >
                  {formatShortTitle(fmt.code)}
                </button>
              );
            })}
          </div>
        )}

        {/* Centered Editorial Product Title */}
        <h3 className="mt-3.5 font-serif text-2xl font-bold leading-snug text-cacao">
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="cursor-pointer border-0 bg-transparent p-0 font-serif text-2xl font-bold leading-snug text-cacao transition-colors duration-200 hover:text-rosa-profundo"
          >
            {product.name}
          </button>
        </h3>

        <p className="mt-1 text-xs font-medium text-cacao-tenue">
          {activeFormat.servings} · {activeFormat.weight}
        </p>

        {/* Concise 2-line Sensory Summary */}
        <p className="mt-2.5 line-clamp-2 max-w-xs text-xs leading-relaxed text-cacao-suave sm:text-[13px]">
          {product.short_description || product.description}
        </p>

        {/* Subtle Text Trigger for Full Sensory Sheet & Gallery Drawer */}
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-rosa-profundo transition-colors duration-200 hover:text-cacao"
        >
          <span>Ver ficha e ingredientes</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Full-Width Bottom Accent Bar — Inspired by Reference Image 3 ("$ | from X/piece") */}
      <div className="mt-auto flex items-center justify-between border-t border-dorado-suave/50 bg-rosa-profundo px-5 py-3 text-blanco-calido">
        <div className="flex items-baseline gap-1.5">
          {showPrice ? (
            <>
              <span className="font-serif text-xl font-bold leading-none text-blanco-calido tabular-nums">
                ${formatCents(activeFormat.price_cents)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-crema/85">
                {currency} / {formatShortTitle(activeFormat.code).toLowerCase()}
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold tracking-wide text-crema/95">
              {activeFormat.short_label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.97] ${
            justAdded
              ? "bg-blanco-calido text-rosa-profundo"
              : "bg-blanco-calido/15 text-blanco-calido hover:bg-blanco-calido hover:text-rosa-profundo"
          }`}
        >
          {justAdded ? (
            <>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Agregado</span>
            </>
          ) : (
            <>
              <span>+ Agregar</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
