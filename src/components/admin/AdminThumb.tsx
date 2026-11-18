"use client";

import { useState } from "react";

import { DEFAULT_CAKE_PLACEHOLDER } from "@/components/SlotImage";

export function AdminThumb({
  url,
  alt,
  className = "size-16 rounded-xl",
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = url && url !== failedUrl ? url : null;
  const loading = src !== null && loadedUrl !== src;

  return (
    <div className={`relative shrink-0 overflow-hidden bg-stone-100 ${loading ? "animate-pulse" : ""} ${className}`}>
      <img
        src={src ?? DEFAULT_CAKE_PLACEHOLDER}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => src && setLoadedUrl(src)}
        onError={() => src && setFailedUrl(src)}
        className={`size-full object-cover transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  );
}
