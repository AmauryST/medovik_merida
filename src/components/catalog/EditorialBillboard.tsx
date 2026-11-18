"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { useMemo } from "react";
import { SlotImage } from "@/components/SlotImage";
import { catalogBridgeHref } from "@/components/catalog/ProductCard";
import type { PriceRangeId } from "@/lib/catalog/filters";
import {
  formatCents,
  type BillboardItem,
  type CatalogProduct,
  type Category,
  type FilterableGroupType,
} from "@/types/catalog";

export interface EditorialBillboardProps {
  billboard?: readonly BillboardItem[];
  variant?: "home" | "pedidos";
  products: readonly CatalogProduct[];
  categories: readonly Category[];
  isFiltered: boolean;
  onSelectProduct: (product: CatalogProduct) => void;
  onApplyCategory: (group: FilterableGroupType, slug: string) => void;
  onApplyPrice: (price: PriceRangeId) => void;
}

export function EditorialBillboard({
  billboard = [],
  variant = "home",
  products,
  categories,
  isFiltered,
  onSelectProduct,
  onApplyCategory,
  onApplyPrice,
}: EditorialBillboardProps) {
  const currentPlacement = variant === "pedidos" ? "PEDIDOS" : "HOME";

  const activeBillboardItems = useMemo(() => {
    return billboard.filter(
      (item) => item.is_active && (item.placement === "BOTH" || item.placement === currentPlacement),
    );
  }, [billboard, currentPlacement]);

  const featuredLimit = 6;
  const featuredProducts = useMemo(() => {
    if (variant === "home") return [];
    return products.filter((p) => p.is_featured && p.is_available).slice(0, featuredLimit);
  }, [products, featuredLimit, variant]);

  const hasSpotlight = variant === "pedidos" && featuredProducts.length > 0 && !isFiltered;

  function resolveItemImage(item: BillboardItem): { url: string; alt: string } {
    if (item.target_type === "PRODUCT") {
      const linked = products.find(
        (p) => p.id === item.target_value || p.slug === item.target_value,
      );
      if (linked) {
        const cover =
          linked.primary_image_url ?? linked.media_by_slot.PRODUCT_PRIMARY?.[0]?.url ?? null;
        if (cover && (!item.image_url || item.image_url === "/assets/hero.webp")) {
          return { url: cover, alt: item.image_alt ?? linked.name };
        }
      }
    }
    if (item.image_url) {
      return { url: item.image_url, alt: item.image_alt ?? item.title };
    }
    if (item.target_type === "CATEGORY") {
      const match = products.find((p) =>
        (p.categories ?? []).some(
          (c) => c.slug === item.target_value || c.id === item.target_value,
        ),
      );
      if (match) {
        const cover =
          match.primary_image_url ?? match.media_by_slot.PRODUCT_PRIMARY?.[0]?.url ?? null;
        if (cover) {
          return { url: cover, alt: item.image_alt ?? item.title };
        }
      }
    }
    return { url: "/placeholders/default-cake.svg", alt: item.image_alt ?? item.title };
  }

  function handleItemAction(item: BillboardItem) {
    if (item.target_type === "PRODUCT") {
      const p = products.find(
        (prod) => prod.id === item.target_value || prod.slug === item.target_value,
      );
      if (p) onSelectProduct(p);
      return;
    }

    if (item.target_type === "CATEGORY") {
      const cat = categories.find(
        (c) => c.id === item.target_value || c.slug === item.target_value,
      );
      if (
        cat &&
        ["FLAVOR", "OCCASION", "CAMPAIGN", "FLOWER_TYPE"].includes(cat.group_type)
      ) {
        onApplyCategory(cat.group_type as FilterableGroupType, cat.slug);
        const rail = document.getElementById("catalogo-rail") ?? document.getElementById("catalogo");
        rail?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (item.target_type === "PRICE_RANGE") {
      onApplyPrice(item.target_value as PriceRangeId);
      const rail = document.getElementById("catalogo-rail") ?? document.getElementById("catalogo");
      rail?.scrollIntoView({ behavior: "smooth" });
      return;
    }
  }

  if (activeBillboardItems.length === 0 && !hasSpotlight) {
    return null;
  }

  return (
    <div className="mb-10 flex flex-col gap-8">
      {/* 1. Anuncios del Billboard editorial */}
      {activeBillboardItems.length === 1 && (
        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8 md:p-10">
          {(() => {
            const item = activeBillboardItems[0]!;
            const img = resolveItemImage(item);
            const isLink = item.target_type === "LINK";
            return (
              <div className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr]">
                <div className="flex flex-col items-start">
                  {item.kicker && (
                    <span className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--rose)]">
                      {item.kicker}
                    </span>
                  )}
                  <h3 className="font-script text-3xl font-bold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[42px]">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="mt-3 text-base leading-relaxed text-[var(--ink-2)]">
                      {item.subtitle}
                    </p>
                  )}
                  <div className="mt-6">
                    {isLink ? (
                      <a
                        href={item.target_value || "#catalogo-rail"}
                        className="inline-flex items-center justify-center rounded-full bg-[var(--rose)] px-7 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-105"
                      >
                        {item.cta_label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleItemAction(item)}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--rose)] px-7 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-105"
                      >
                        {item.cta_label}
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-stone-100 sm:aspect-[16/10]">
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 92vw"
                    className="object-cover"
                    unoptimized={img.url.endsWith(".svg")}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeBillboardItems.length >= 2 && (
        <div
          className={`grid gap-6 ${
            activeBillboardItems.length === 2
              ? "md:grid-cols-2"
              : "md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {activeBillboardItems.map((item) => {
            const img = resolveItemImage(item);
            const isLink = item.target_type === "LINK";
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--line)] bg-white p-6 shadow-sm"
              >
                <div>
                  <div className="relative mb-5 aspect-[16/10] w-full overflow-hidden rounded-[16px] bg-stone-100">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
                      className="object-cover"
                      unoptimized={img.url.endsWith(".svg")}
                    />
                  </div>
                  {item.kicker && (
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--rose)]">
                      {item.kicker}
                    </span>
                  )}
                  <h3 className="mt-1 font-script text-2xl font-bold leading-snug text-[var(--ink)]">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div className="mt-6 pt-2">
                  {isLink ? (
                    <a
                      href={item.target_value || "#catalogo"}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[var(--rose)] bg-[var(--rose)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-105"
                    >
                      {item.cta_label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleItemAction(item)}
                      className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[var(--rose)] bg-[var(--rose)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-105"
                    >
                      {item.cta_label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Selección destacada (Spotlight de productos en /pedidos) */}
      {hasSpotlight && (
        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--crema-rosado,#FBF4F3)] p-6 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--rose)]">
                Favoritos para encargar hoy
              </span>
              <h3 className="font-script text-3xl font-bold text-[var(--ink)] sm:text-4xl">
                Elección rápida sin rodeos
              </h3>
              <p className="mt-1 max-w-[600px] text-sm text-[var(--ink-2)]">
                Los pasteles rusos de miel más solicitados para entrega o recolección en Mérida.
              </p>
            </div>
          </div>

          <div
            className={`grid gap-5 ${
              featuredProducts.length === 1
                ? "max-w-md"
                : featuredProducts.length === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {featuredProducts.map((product) => {
              const href = catalogBridgeHref(product.slug);
              const tagline = product.short_description ?? product.description;

              const openProduct = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                onSelectProduct(product);
              };

              return (
                <div
                  key={product.id}
                  className="flex flex-col justify-between overflow-hidden rounded-[20px] border border-[var(--line)] bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={openProduct}
                      className="relative block aspect-square w-full overflow-hidden rounded-[14px]"
                    >
                      <SlotImage
                        product={product}
                        slot="PRODUCT_PRIMARY"
                        className="h-full w-full"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
                      />
                      <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-full border border-[var(--line)] bg-white/92 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--ink)] backdrop-blur-sm">
                        Destacado
                      </span>
                    </a>

                    <div className="mt-3.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-script text-xl font-bold text-[var(--ink)]">
                          {product.name}
                        </h4>
                        <span className="shrink-0 text-sm font-bold text-[var(--rose)]">
                          ${formatCents(product.price_cents)} MXN
                        </span>
                      </div>
                      {tagline && (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-3)]">
                          {tagline}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] font-medium tracking-wide text-[var(--ink-4)]">
                        Mérida, Yucatán
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      onClick={openProduct}
                      className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[var(--rose)] py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-105"
                    >
                      Pedir ahora
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
