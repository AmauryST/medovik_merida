import { BRAND } from "@/config/brand";
import type {
  CatalogProduct,
  Category,
  Cents,
  FilterableGroupType,
} from "@/types/catalog";

/** Default human-readable labels for classification groups across ZunConnect stores. */
export const DEFAULT_CATEGORY_GROUP_LABELS: Record<string, string> = {
  FLAVOR: "Sabor",
  FLOWER_TYPE: "Tipo de flor",
  OCCASION: "Ocasión",
  CAMPAIGN: "Fechas especiales",
  FORMAT: "Formato",
  COLLECTION: "Colección",
  PRODUCT_TYPE: "Tipo de producto",
};

export function getCategoryGroupLabel(group: string): string {
  const brandLabel = (BRAND.categoryGroupLabels as Record<string, string> | undefined)?.[group];
  if (brandLabel) return brandLabel;
  return DEFAULT_CATEGORY_GROUP_LABELS[group] ?? group;
}

export const FILTER_GROUPS: ReadonlyArray<{ type: FilterableGroupType; label: string }> = [
  { type: "FLAVOR", label: getCategoryGroupLabel("FLAVOR") },
  { type: "FLOWER_TYPE", label: getCategoryGroupLabel("FLOWER_TYPE") },
  { type: "OCCASION", label: getCategoryGroupLabel("OCCASION") },
  { type: "CAMPAIGN", label: getCategoryGroupLabel("CAMPAIGN") },
];

/**
 * Resolves the classification groups for the active store dynamically:
 * 1. Groups present in the store's `categories` table (ordered by standard priority).
 * 2. Groups configured in `BRAND.categoryGroupLabels` (so empty groups can still receive items).
 */
export function resolveStoreCategoryGroups(
  categories: readonly { group_type: string }[],
): Array<{ type: string; label: string }> {
  const priorityOrder = [
    ...Object.keys(BRAND.categoryGroupLabels ?? {}),
    ...FILTER_GROUPS.map((g) => g.type),
    ...Object.keys(DEFAULT_CATEGORY_GROUP_LABELS),
  ];

  const seen = new Set<string>();
  const orderedTypes: string[] = [];

  const addType = (type: string) => {
    const clean = type.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    orderedTypes.push(clean);
  };

  // First include configured brand groups and existing DB groups in priority order
  const dbGroups = new Set(categories.map((c) => c.group_type));
  const brandGroups = new Set(Object.keys(BRAND.categoryGroupLabels ?? {}));

  for (const candidate of priorityOrder) {
    if (dbGroups.has(candidate) || brandGroups.has(candidate)) {
      addType(candidate);
    }
  }

  // Then include any custom group_type that exists in DB
  for (const cat of categories) {
    addType(cat.group_type);
  }

  return orderedTypes.map((type) => ({
    type,
    label: getCategoryGroupLabel(type),
  }));
}

export type PriceRangeId = "all" | "under-25" | "25-50" | "premium";

export const PRICE_RANGES: ReadonlyArray<{
  id: PriceRangeId;
  label: string;
  min: Cents | null;
  max: Cents | null;
}> = [
  { id: "all", label: "Todos", min: null, max: null },
  { id: "under-25", label: "Menos de $25", min: null, max: 2499 },
  { id: "25-50", label: "$25 a $50", min: 2500, max: 5000 },
  { id: "premium", label: "Premium", min: 5001, max: null },
];

export interface CatalogFilterState {
  categories: Partial<Record<FilterableGroupType, string>>;
  price: PriceRangeId;
  onlyFeatured?: boolean;
}

export const EMPTY_FILTERS: CatalogFilterState = {
  categories: {},
  price: "all",
  onlyFeatured: false,
};

export function hasActiveFilters(state: CatalogFilterState): boolean {
  return (
    state.price !== "all" ||
    Boolean(state.onlyFeatured) ||
    Object.values(state.categories).some(Boolean)
  );
}

function inPriceRange(cents: Cents, id: PriceRangeId): boolean {
  const range = PRICE_RANGES.find((r) => r.id === id);
  if (!range) return true;
  return (range.min === null || cents >= range.min) && (range.max === null || cents <= range.max);
}

export function filterProducts(
  products: readonly CatalogProduct[],
  state: CatalogFilterState,
): CatalogProduct[] {
  const wanted = Object.entries(state.categories).filter(
    (entry): entry is [FilterableGroupType, string] => Boolean(entry[1]),
  );
  return products.filter(
    (product) =>
      (!state.onlyFeatured || product.is_featured) &&
      inPriceRange(product.price_cents, state.price) &&
      wanted.every(([group, slug]) =>
        (product.categories ?? []).some(
          (c) => c.group === group && c.slug === slug,
        ),
      ),
  );
}

export function buildCategoryChips(
  categories: readonly Category[],
  products: readonly CatalogProduct[],
): Array<{ type: FilterableGroupType; label: string; chips: Category[] }> {
  const used = new Set(
    products.flatMap((p) => (p.categories ?? []).map((c) => `${c.group}:${c.slug}`)),
  );
  const dynamicGroups = resolveStoreCategoryGroups(categories);
  return dynamicGroups
    .map((group) => ({
      type: group.type as FilterableGroupType,
      label: group.label,
      chips: categories
        .filter((c) => c.group_type === group.type && used.has(`${c.group_type}:${c.slug}`))
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((group) => group.chips.length > 0);
}
