"use client";

import { useState, type ReactNode } from "react";
import {
  EMPTY_FILTERS,
  PRICE_RANGES,
  type CatalogFilterState,
  type PriceRangeId,
  type buildCategoryChips,
} from "@/lib/catalog/filters";
import type { FilterableGroupType } from "@/types/catalog";

interface CatalogFiltersProps {
  groups: ReturnType<typeof buildCategoryChips>;
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  resultCount?: number;
  featuredCount?: number;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-full border px-4 py-2.5 text-[11.5px] font-medium uppercase leading-none tracking-[0.18em] whitespace-nowrap transition-colors duration-200 [font-family:var(--font-sans)] ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
          : "border-[var(--line-2)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] max-sm:-mx-5 max-sm:px-5 sm:flex-wrap [&::-webkit-scrollbar]:hidden"
    >
      <span className="mr-1 shrink-0 text-[10.5px] font-medium uppercase tracking-[0.28em] text-[var(--ink-4)]">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Instant filters (client side) over the catalog that is already loaded. */
export function CatalogFilters({
  groups,
  value,
  onChange,
  resultCount,
  featuredCount,
}: CatalogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCategoryCount = Object.values(value.categories).filter(Boolean).length;
  const hasPrice = value.price !== "all";
  const hasFeatured = Boolean(value.onlyFeatured);
  const activeCount = activeCategoryCount + (hasPrice ? 1 : 0) + (hasFeatured ? 1 : 0);
  const isFiltered = activeCount > 0;

  const toggleFeatured = () => onChange({ ...value, onlyFeatured: !value.onlyFeatured });

  const setCategory = (type: FilterableGroupType, slug: string) => {
    const categories = { ...value.categories };
    if (categories[type] === slug) delete categories[type];
    else categories[type] = slug;
    onChange({ ...value, categories });
  };

  const setPrice = (price: PriceRangeId) => onChange({ ...value, price });

  return (
    <div className="mb-[clamp(18px,2.4vw,28px)] flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="catalog-filters-content"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`inline-flex cursor-pointer items-center gap-2.5 rounded-full border px-4 py-2.5 text-[11.5px] font-medium uppercase leading-none tracking-[0.18em] transition-colors duration-200 [font-family:var(--font-sans)] ${
              isOpen || isFiltered
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line-2)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>Filtros</span>
            {activeCount > 0 && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${
                  isOpen || isFiltered ? "bg-white text-[var(--ink)]" : "bg-[var(--ink)] text-white"
                }`}
              >
                {activeCount}
              </span>
            )}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {featuredCount && featuredCount > 0 ? (
            <button
              type="button"
              aria-pressed={Boolean(value.onlyFeatured)}
              onClick={toggleFeatured}
              className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2.5 text-[11.5px] font-medium uppercase leading-none tracking-[0.18em] transition-colors duration-200 [font-family:var(--font-sans)] ${
                value.onlyFeatured
                  ? "border-[var(--rose)] bg-[var(--rose)] text-white"
                  : "border-[var(--line-2)] bg-white text-[var(--ink)] hover:border-[var(--rose)] hover:text-[var(--rose)]"
              }`}
            >
              Destacados ({featuredCount})
            </button>
          ) : null}
        </div>

        {isFiltered && (
          <div className="flex items-center gap-3">
            {typeof resultCount === "number" && (
              <span className="text-[12px] text-[var(--ink-3)] [font-family:var(--font-sans)]">
                {resultCount} {resultCount === 1 ? "pastel" : "pasteles"}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="cursor-pointer text-[11.5px] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)] underline hover:text-[var(--ink)] [font-family:var(--font-sans)]"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div id="catalog-filters-content" className="flex flex-col gap-3 pt-1">
          {featuredCount && featuredCount > 0 && (
            <Row label="Selección">
              <Chip active={Boolean(value.onlyFeatured)} onClick={toggleFeatured}>
                Destacados ({featuredCount})
              </Chip>
            </Row>
          )}
          {groups.map((group) => (
            <Row key={group.type} label={group.label}>
              {group.chips.map((chip) => (
                <Chip
                  key={chip.id}
                  active={value.categories[group.type] === chip.slug}
                  onClick={() => setCategory(group.type, chip.slug)}
                >
                  {chip.name}
                </Chip>
              ))}
            </Row>
          ))}
          <Row label="Precio">
            {PRICE_RANGES.map((range) => (
              <Chip key={range.id} active={value.price === range.id} onClick={() => setPrice(range.id)}>
                {range.label}
              </Chip>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}
