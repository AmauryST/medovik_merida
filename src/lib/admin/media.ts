import type { Uuid } from "@/types/catalog";

/** Public Storage bucket for every product photo (rule 6 of CLAUDE.md). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Object path inside the bucket: `{store_id}/{uuid}.webp`. */
export function productImagePath(storeId: Uuid, mediaId: Uuid): string {
  return `${storeId}/${mediaId}.webp`;
}

/** Longest side, WebP quality and upload target of the in-browser compression. */
export const WEBP_MAX_SIDE = 1000;
export const WEBP_QUALITY = 0.82;
export const UPLOAD_TARGET_BYTES = 100 * 1024;

/** Same limit as the bucket's `file_size_limit` (2 MB). */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is Uuid {
  return typeof value === "string" && UUID_RE.test(value);
}
