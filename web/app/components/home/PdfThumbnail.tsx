"use client";

import { useEffect, useRef, useState } from "react";

type PdfThumbnailProps = {
  postId: string;
  fileUrl: string;
  title: string;
};

type ThumbnailState = "idle" | "loading" | "ready" | "error";

export default function PdfThumbnail({
  postId,
  fileUrl,
  title,
}: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>("idle");
  const proxiedFileUrl = postId
    ? `/api/posts/file?postId=${encodeURIComponent(postId)}`
    : `/api/posts/file?url=${encodeURIComponent(fileUrl)}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fileUrl) {
      setThumbnailState("error");
      return;
    }

    let isCancelled = false;

    const renderThumbnail = async () => {
      setThumbnailState("loading");

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const response = await fetch(proxiedFileUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load PDF");
        }

        const buffer = await response.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) })
          .promise;
        const page = await pdf.getPage(1);

        if (isCancelled) {
          return;
        }

        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = 140 / unscaledViewport.width;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Failed to render thumbnail");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvas, canvasContext: context, viewport }).promise;

        if (!isCancelled) {
          setThumbnailState("ready");
        }
      } catch {
        if (!isCancelled) {
          setThumbnailState("error");
        }
      }
    };

    void renderThumbnail();

    return () => {
      isCancelled = true;
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [fileUrl, proxiedFileUrl]);

  return (
    <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-sm bg-[#E8E8E8]">
      <canvas
        ref={canvasRef}
        aria-label={`${title} preview`}
        className={`block h-full w-full object-top ${
          thumbnailState === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />
      {thumbnailState !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#E8E8E8] px-2 text-center text-[10px] font-medium text-[#767676]">
          {thumbnailState === "error" ? "PDF" : "Loading preview..."}
        </div>
      )}
    </div>
  );
}
