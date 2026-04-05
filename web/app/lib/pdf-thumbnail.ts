"use client";

const THUMBNAIL_WIDTH = 280;
const THUMBNAIL_WEBP_QUALITY = 0.82;
const THUMBNAIL_GENERATION_TIMEOUT_MS = 8000;

const isUnsupportedBrowser = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";

  // Detect iOS <= 15 (any browser on iOS uses WebKit)
  if (/(iPhone|iPad|iPod)/i.test(ua)) {
    const match = ua.match(/OS (\d+)[._]/i);
    const ver = Number.parseInt(match?.[1] || "", 10);
    if (Number.isFinite(ver) && ver <= 15) return true;
  }

  // Detect old desktop Safari (< 16) — lacks module worker support
  // Safari UA contains "Version/X.Y Safari/" but NOT "Chrome" or "Chromium"
  if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) {
    const match = ua.match(/Version\/(\d+)/i);
    const ver = Number.parseInt(match?.[1] || "", 10);
    if (Number.isFinite(ver) && ver < 16) return true;
  }

  return false;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error("Thumbnail generation timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_WEBP_QUALITY);
      },
      "image/webp",
      THUMBNAIL_WEBP_QUALITY,
    );
  });

export async function createPdfThumbnailBase64(
  file: File,
): Promise<string | null> {
  if (typeof window === "undefined" || isUnsupportedBrowser()) {
    return null;
  }

  try {
    return await withTimeout(
      (async () => {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / Math.max(baseViewport.width, 1);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Failed to create thumbnail context");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        const blob = await canvasToBlob(canvas);

        page.cleanup();
        pdf.cleanup();
        void pdf.destroy();
        canvas.width = 0;
        canvas.height = 0;

        if (!blob) {
          return null;
        }

        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (const byte of bytes) {
          binary += String.fromCharCode(byte);
        }

        return btoa(binary);
      })(),
      THUMBNAIL_GENERATION_TIMEOUT_MS,
    );
  } catch {
    return null;
  }
}
