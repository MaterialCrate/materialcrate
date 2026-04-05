"use client";

const DEFAULT_MAX_DIMENSION = 2400;
const DEFAULT_QUALITY = 0.82;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const canvasToBlobWithFallback = (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        // Fallback to JPEG if webp isn't supported
        canvas.toBlob((jpegBlob) => resolve(jpegBlob), "image/jpeg", quality);
      },
      "image/webp",
      quality,
    );
  });

export async function compressImageToWebp(
  file: File,
  options?: { maxDimension?: number; quality?: number },
): Promise<File> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  // GIFs should not be converted (animated content)
  if (file.type === "image/gif") {
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    const { naturalWidth: w, naturalHeight: h } = img;
    const longest = Math.max(w, h);
    const scale = longest > maxDimension ? maxDimension / longest : 1;
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);

    const blob = await canvasToBlobWithFallback(canvas, quality);
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) {
      return file;
    }

    const isWebp = blob.type === "image/webp";
    const ext = isWebp ? ".webp" : ".jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new File([blob], `${baseName}${ext}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
