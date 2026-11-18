import type {
  BillboardItem,
  BillboardPlacement,
  BillboardTargetType,
  Uuid,
} from "@/types/catalog";

const VALID_PLACEMENTS: readonly BillboardPlacement[] = ["HOME", "PEDIDOS", "BOTH"];
const VALID_TARGET_TYPES: readonly BillboardTargetType[] = [
  "PRODUCT",
  "CATEGORY",
  "PRICE_RANGE",
  "LINK",
];

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

/**
 * Safely parses themeConfig.billboard array into BillboardItem[].
 * Validates placement, target_type, strings, flags and sort order.
 */
export function parseThemeBillboard(storeId: Uuid, themeConfig: unknown): BillboardItem[] {
  if (!isObject(themeConfig) || !Array.isArray(themeConfig.billboard)) {
    return [];
  }

  const items: BillboardItem[] = [];

  for (const raw of themeConfig.billboard) {
    if (!isObject(raw)) continue;

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) continue;

    const id =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `item-${items.length}`;

    const mediaId = typeof raw.media_id === "string" && raw.media_id.trim() ? raw.media_id.trim() : null;
    const imageUrl = typeof raw.image_url === "string" && raw.image_url.trim() ? raw.image_url.trim() : null;
    const imageAlt = typeof raw.image_alt === "string" && raw.image_alt.trim() ? raw.image_alt.trim() : null;
    const kicker = typeof raw.kicker === "string" ? raw.kicker.trim() : "";
    const subtitle = typeof raw.subtitle === "string" && raw.subtitle.trim() ? raw.subtitle.trim() : null;
    const ctaLabel = typeof raw.cta_label === "string" && raw.cta_label.trim() ? raw.cta_label.trim() : "Ver más";

    const targetType: BillboardTargetType =
      typeof raw.target_type === "string" &&
      (VALID_TARGET_TYPES as readonly string[]).includes(raw.target_type)
        ? (raw.target_type as BillboardTargetType)
        : "LINK";

    const targetValue = typeof raw.target_value === "string" ? raw.target_value.trim() : "";

    const placement: BillboardPlacement =
      typeof raw.placement === "string" &&
      (VALID_PLACEMENTS as readonly string[]).includes(raw.placement)
        ? (raw.placement as BillboardPlacement)
        : "BOTH";

    const isActive = typeof raw.is_active === "boolean" ? raw.is_active : true;
    const sortOrder =
      typeof raw.sort_order === "number" && !Number.isNaN(raw.sort_order)
        ? raw.sort_order
        : items.length;

    items.push({
      id,
      store_id: storeId,
      media_id: mediaId,
      image_url: imageUrl,
      image_alt: imageAlt,
      kicker,
      title,
      subtitle,
      cta_label: ctaLabel,
      target_type: targetType,
      target_value: targetValue,
      placement,
      is_active: isActive,
      sort_order: sortOrder,
    });
  }

  return items.sort((a, b) => a.sort_order - b.sort_order);
}
