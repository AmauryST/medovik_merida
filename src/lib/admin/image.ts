import { UPLOAD_TARGET_BYTES, WEBP_MAX_SIDE, WEBP_QUALITY } from "./media";

/** Browser only. */
interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

async function decode(file: Blob): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    try {
      // `from-image` applies the EXIF rotation of phone photos.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to <img> (older Safari, some HEIC files).
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } catch {
    throw new Error("No se pudo leer la foto. Prueba con otra (JPG, PNG o WebP).");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la foto."))),
      "image/webp",
      quality,
    );
  });
}

/**
 * Rule 6 of CLAUDE.md: resize to at most 1000x1000 and encode as WebP at
 * quality 0.82 with an HTML5 <canvas>, before uploading. If the result is
 * still over 100 KB (very detailed photos), quality steps down to 0.5 at most.
 */
export async function compressToWebp(file: Blob): Promise<Blob> {
  const image = await decode(file);
  try {
    const scale = Math.min(1, WEBP_MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Este navegador no permite comprimir fotos.");
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);

    let quality = WEBP_QUALITY;
    let blob = await toBlob(canvas, quality);
    // Browsers without a WebP encoder silently return PNG.
    if (blob.type !== "image/webp") {
      throw new Error("Este navegador no puede convertir fotos a WebP. Usa Chrome o actualiza el teléfono.");
    }
    while (blob.size > UPLOAD_TARGET_BYTES && quality > 0.55) {
      quality = Math.round((quality - 0.1) * 100) / 100;
      blob = await toBlob(canvas, quality);
    }
    return blob;
  } finally {
    image.release();
  }
}
