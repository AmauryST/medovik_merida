"use client";

import Image from "next/image";
import { useState } from "react";

import type { CatalogProduct, ProductSlotCode } from "@/types/catalog";

export const DEFAULT_CAKE_PLACEHOLDER = "/placeholders/default-cake.svg";

type SlotImageProduct = Pick<
  CatalogProduct,
  "name" | "media_by_slot" | "primary_image_url"
>;

export interface SlotImageProps {
  product: SlotImageProduct;
  slot: ProductSlotCode;
  /** Position inside the slot (gallery, presentations...). Defaults to the first. */
  index?: number;
  /** Overrides the asset's `alt_text`. */
  alt?: string;
  /** Classes for the wrapper; it defines the aspect ratio (3:4 or 1:1 by default). */
  className?: string;
  /** `sizes` for next/image. Defaults to a mobile-first catalog card. */
  sizes?: string;
  /** Above-the-fold images (hero, first card). */
  priority?: boolean;
}

function resolveSource(
  product: SlotImageProduct,
  slot: ProductSlotCode,
  index: number,
): { url: string | null; alt: string | null } {
  const item = product.media_by_slot?.[slot]?.[index];
  if (item?.url) {
    return { url: item.url, alt: item.alt };
  }
  // The view already resolves the cover; use it if the slot came empty.
  if (slot === "PRODUCT_PRIMARY" && index === 0 && product.primary_image_url) {
    return { url: product.primary_image_url, alt: null };
  }
  return { url: null, alt: null };
}

/**
 * Image from one slot of `product.media_by_slot`.
 * - Loading: local skeleton (`animate-pulse bg-arena-clara`), never a DB blur.
 * - Empty slot or failed load: the static `default-cake.svg` placeholder.
 */
export function SlotImage({
  product,
  slot,
  index = 0,
  alt,
  className = "aspect-square",
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: SlotImageProps) {
  const source = resolveSource(product, slot, index);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const label = alt ?? source.alt ?? product.name;
  const showPlaceholder = source.url === null || failedUrl === source.url;
  const isLoading = !showPlaceholder && loadedUrl !== source.url;

  return (
    <div
      className={`relative overflow-hidden bg-arena-clara ${className}`}
      aria-busy={isLoading || undefined}
    >
      {showPlaceholder ? (
        <Image
          src={DEFAULT_CAKE_PLACEHOLDER}
          alt={label}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          {isLoading && (
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-pulse bg-arena-clara"
            />
          )}
          <Image
            key={source.url}
            src={source.url as string}
            alt={label}
            fill
            sizes={sizes}
            priority={priority}
            onLoad={() => setLoadedUrl(source.url)}
            onError={() => setFailedUrl(source.url)}
            className={`object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
          />
        </>
      )}
    </div>
  );
}
