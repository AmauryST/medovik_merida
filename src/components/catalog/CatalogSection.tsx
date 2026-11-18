"use client";

import { useState } from "react";
import { ProductCard } from "./ProductCard";
import { EditorialBillboard } from "./EditorialBillboard";
import { useOptionalCart } from "@/components/catalog/CartContext";
import type {
  BillboardItem,
  CatalogProduct,
  Category,
  DeliveryZone,
  MedovikFormatCode,
  StorePublic,
} from "@/types/catalog";

export type CatalogCollection = string | null;

export interface CatalogSectionProps {
  id?: string;
  railId?: string;
  variant?: "home" | "pedidos";
  showBillboard?: boolean;
  billboard?: readonly BillboardItem[];
  billboardItems?: readonly BillboardItem[];
  kicker?: string;
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  store: StorePublic;
  products: CatalogProduct[];
  allProducts?: CatalogProduct[];
  featuredProducts?: CatalogProduct[];
  categories?: Category[];
  deliveryZones?: DeliveryZone[];
  zones?: DeliveryZone[];
  externalCollection?: {
    value: CatalogCollection;
    nonce: number;
  } | null;
  selectedProduct?: CatalogProduct | null;
  onSelectProduct: (product: CatalogProduct) => void;
}

const FORMAT_TABS: {
  id: MedovikFormatCode;
  label: string;
  weight: string;
  servings: string;
  rule: string;
}[] = [
  {
    id: "mediano",
    label: "Pastel Mediano",
    weight: "~1,225 kg",
    servings: "8 a 10 porciones",
    rule: "Pedir mín. 2 días antes · 50% anticipo",
  },
  {
    id: "grande",
    label: "Pastel Grande",
    weight: "~2,45 kg",
    servings: "16 a 20 porciones",
    rule: "Pedir mín. 2 días antes · 50% anticipo",
  },
  {
    id: "rebanada",
    label: "Rebanada Individual",
    weight: "~180 g",
    servings: "1 porción generosa",
    rule: "Consultar disponibilidad del día",
  },
];

export function CatalogSection({
  id = "catalogo",
  variant = "home",
  showBillboard = true,
  billboard,
  billboardItems,
  store,
  products,
  categories = [],
  onSelectProduct,
}: CatalogSectionProps) {
  const cart = useOptionalCart();
  const [defaultFormat, setDefaultFormat] = useState<MedovikFormatCode>("mediano");
  const [formatKeyNonce, setFormatKeyNonce] = useState(0);

  const effectiveBillboard = billboard ?? billboardItems ?? [];

  const handleSelectFormatTab = (fmt: MedovikFormatCode) => {
    setDefaultFormat(fmt);
    setFormatKeyNonce((n) => n + 1);
  };

  const handleBillboardProduct = (slugOrId: string) => {
    const found = products.find(
      (p) => p.slug === slugOrId || p.id === slugOrId,
    );
    if (found) {
      onSelectProduct(found);
    }
  };

  return (
    <section
      id={id}
      className="relative scroll-mt-20 bg-crema py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Encabezado de las 3 Especialidades Artesanales */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-rosa-empolvado/60 px-4 py-1 text-xs font-semibold tracking-widest uppercase text-rosa-profundo">
            Catálogo Digital · 3 Recetas Maestras × 3 Formatos
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-cacao sm:text-4xl lg:text-5xl">
            Nuestros 3 Pasteles{" "}
            <span className="italic text-rosa-profundo">Medovik</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cacao-suave sm:text-lg">
            Nos especializamos exclusivamente en{" "}
            <strong className="text-cacao">tres recetas artesanales de pastel ruso de miel</strong>.
            Cada una se elabora en tres formatos:{" "}
            <strong className="text-cacao">Rebanada (~180 g)</strong>,{" "}
            <strong className="text-cacao">Pastel Mediano (~1,225 kg)</strong> y{" "}
            <strong className="text-cacao">Pastel Grande (~2,45 kg)</strong>.
            Elige tus favoritos para conformar tu pedido en línea.
          </p>
        </div>

        {/* Barra interactiva de Controles de Presentación / Demo (Precios Globales y por Producto) */}
        {cart && (
          <div className="mt-8 rounded-2xl border border-dorado/60 bg-blanco-calido p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rosa-empolvado/60 text-xs font-bold text-rosa-profundo">
                  ⚙️
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cacao">
                    Control de Catálogo (Vista Demo · Mostrar u ocultar precios)
                  </p>
                  <p className="text-xs text-cacao-suave">
                    Puedes conformar tu pedido con o sin precios visibles, o
                    activar el precio solo en los pasteles que elijas:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Switch global de precios */}
                <button
                  type="button"
                  onClick={() => cart.setShowPrices(!cart.showPrices)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    cart.showPrices
                      ? "bg-cacao text-blanco-calido shadow-xs"
                      : "border border-dorado bg-crema text-cacao hover:bg-rosa-empolvado/35"
                  }`}
                >
                  <span>
                    {cart.showPrices
                      ? "💲 Todos los precios visibles (MXN)"
                      : "👁️ Modo Catálogo sin precios (Activar todos)"}
                  </span>
                </button>

                {/* Toggles individuales por cada uno de los 3 productos */}
                {products.map((prod) => {
                  const visible = cart.isPriceVisibleFor(prod);
                  const shortName = prod.name.replace(/^Medovik\s+/i, "");
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() =>
                        cart.setProductPriceVisible(prod.slug, !visible)
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                        visible
                          ? "border-rosa-profundo bg-rosa-empolvado/45 text-rosa-profundo"
                          : "border-dorado-suave bg-blanco-calido text-cacao-suave hover:border-dorado"
                      }`}
                    >
                      <span>{visible ? "✓" : "+"}</span>
                      <span>Precio {shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Selector rápido de formato predeterminado para comparar los 3 pasteles */}
        <div className="mt-7 flex flex-col items-center justify-between gap-3 rounded-2xl border border-dorado-suave/70 bg-blanco-calido/80 p-3 sm:flex-row sm:px-5">
          <span className="text-xs font-bold uppercase tracking-wider text-cacao">
            Preseleccionar formato en los 3 pasteles:
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {FORMAT_TABS.map((tab) => {
              const active = defaultFormat === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectFormatTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-rosa-profundo text-blanco-calido shadow-xs"
                      : "border border-dorado-suave bg-crema text-cacao hover:border-dorado"
                  }`}
                >
                  {tab.label} ({tab.weight})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de los 3 Productos Maestros (lado a lado en escritorio) */}
        <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={`${product.id}-${defaultFormat}-${formatKeyNonce}`}
              product={product}
              currency={store.currency}
              defaultFormat={defaultFormat}
              onSelect={onSelectProduct}
            />
          ))}
        </div>

        {/* Cartelera Editorial Secundaria */}
        {showBillboard && effectiveBillboard.length > 0 && (
          <div className="mt-12">
            <EditorialBillboard
              billboard={effectiveBillboard}
              variant={variant}
              products={products}
              categories={categories}
              isFiltered={false}
              onSelectProduct={onSelectProduct}
              onApplyCategory={() => {}}
              onApplyPrice={() => {}}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default CatalogSection;
