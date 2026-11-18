"use client";

import { useState } from "react";
import { useOptionalCart } from "./CartContext";
import { ProductCard } from "./ProductCard";
import { ProductDrawer } from "./ProductDrawer";
import { BRAND } from "@/config/brand";
import type {
  BillboardItem,
  CatalogProduct,
  Category,
  DeliveryZone,
  MedovikFormatCode,
  StorePublic,
} from "@/types/catalog";

interface CatalogSectionProps {
  store: StorePublic;
  categories?: Category[];
  products: CatalogProduct[];
  zones: DeliveryZone[];
  billboardItems?: BillboardItem[];
  showBillboard?: boolean;
}

const FORMAT_TABS: {
  code: MedovikFormatCode;
  label: string;
  weight: string;
}[] = [
  {
    code: "rebanada",
    label: "Rebanada",
    weight: "~180 g",
  },
  {
    code: "mediano",
    label: "Mediano",
    weight: "~1,225 kg",
  },
  {
    code: "grande",
    label: "Grande",
    weight: "~2,45 kg",
  },
];

export function CatalogSection({
  store,
  products,
  zones,
}: CatalogSectionProps) {
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [defaultFormat, setDefaultFormat] =
    useState<MedovikFormatCode>("mediano");
  const cart = useOptionalCart();

  const currency = store.currency || BRAND.currency;
  const showPrices = cart ? cart.showPrices : true;

  return (
    <section
      id="catalogo"
      aria-labelledby="catalog-heading"
      className="bg-crema py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Centered Editorial Heading with Thin-Stroke Divider — Reference Image 3 */}
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="catalog-heading"
            className="font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl lg:text-5xl"
          >
            Nuestros Pasteles Artesanales
          </h2>

          <div
            aria-hidden="true"
            className="my-4 flex items-center justify-center gap-3 text-rosa-profundo"
          >
            <span className="h-px w-12 bg-dorado/60" />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2.5 19.5 7v10L12 21.5 4.5 17V7L12 2.5Z" />
            </svg>
            <span className="h-px w-12 bg-dorado/60" />
          </div>

          <p className="text-sm leading-relaxed text-cacao-suave sm:text-base">
            Tres recetas de autor elaboradas bajo pedido. Elige tu formato ideal
            y agrégalo a tu pedido para coordinarlo por WhatsApp.
          </p>
        </div>

        {/* Minimalist Format Pill Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <div
            role="tablist"
            aria-label="Formato predeterminado del catálogo"
            className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-dorado-suave/70 bg-blanco-calido p-1 shadow-xs"
          >
            {FORMAT_TABS.map((fmt) => {
              const isActive = defaultFormat === fmt.code;
              return (
                <button
                  key={fmt.code}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setDefaultFormat(fmt.code)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-[background-color,color] duration-200 ease-[var(--ease-out)] ${
                    isActive
                      ? "bg-rosa-profundo text-blanco-calido shadow-xs"
                      : "text-cacao-suave hover:text-cacao"
                  }`}
                >
                  <span>{fmt.label}</span>
                  <span
                    className={`ml-1.5 text-[11px] font-normal ${
                      isActive ? "text-crema/90" : "text-cacao-tenue"
                    }`}
                  >
                    · {fmt.weight}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Minimalist Product Cards Grid */}
        {products.length === 0 ? (
          <p className="py-12 text-center text-base text-cacao-suave">
            Estamos horneando nuevas delicias. Escríbenos por WhatsApp para
            hacer tu pedido.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={`${product.id}-${defaultFormat}`}
                product={product}
                currency={currency}
                defaultFormat={defaultFormat}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}

        {/* Concise Footnote on Ordering Policy */}
        <p className="mt-8 text-center text-xs text-cacao-tenue">
          Pasteles completos bajo pedido con mínimo 2 días de anticipación (50%
          de anticipo) · Rebanadas sujetas a disponibilidad del día.
        </p>
      </div>

      {selected && (
        <ProductDrawer
          product={selected}
          store={store}
          zones={zones}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

export default CatalogSection;
