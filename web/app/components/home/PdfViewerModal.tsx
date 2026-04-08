"use client";

import { useEffect, useRef, useState } from "react";
import { CloseCircle } from "iconsax-reactjs";
import { trackFeedInteraction } from "@/app/lib/feed-tracking";
import type { HomePost } from "./Post";

type PdfViewerModalProps = {
  post: HomePost | null;
  isOpen: boolean;
  onClose: () => void;
};

type PdfState = {
  isLoading: boolean;
  isRendering: boolean;
  error: string;
  pageCount: number;
};

const INITIAL_STATE: PdfState = {
  isLoading: false,
  isRendering: false,
  error: "",
  pageCount: 0,
};

export default function PdfViewerModal({
  post,
  isOpen,
  onClose,
}: PdfViewerModalProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [pdfState, setPdfState] = useState<PdfState>(INITIAL_STATE);
  const proxiedFileUrl = post?.id
    ? `/api/posts/file?postId=${encodeURIComponent(post.id)}`
    : "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const preventShortcutDownloadOrPrint = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "s" || key === "p")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const hideBeforePrint = () => {
      const container = canvasContainerRef.current;
      if (container) {
        container.style.visibility = "hidden";
      }
    };

    const restoreAfterPrint = () => {
      const container = canvasContainerRef.current;
      if (container) {
        container.style.visibility = "visible";
      }
    };

    document.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("keydown", preventShortcutDownloadOrPrint, true);
    window.addEventListener("beforeprint", hideBeforePrint);
    window.addEventListener("afterprint", restoreAfterPrint);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener(
        "keydown",
        preventShortcutDownloadOrPrint,
        true,
      );
      window.removeEventListener("beforeprint", hideBeforePrint);
      window.removeEventListener("afterprint", restoreAfterPrint);
      restoreAfterPrint();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !post?.id) {
      return;
    }

    const timer = window.setTimeout(() => {
      void trackFeedInteraction({
        postId: post.id,
        interactionType: "LONG_VIEW",
        signalKind: "positive",
        durationMs: 8000,
        metadata: {
          source: "pdf-viewer",
        },
      });
    }, 8000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, post?.id]);

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current;

    if (!isOpen || !proxiedFileUrl || !canvasContainer) {
      setPdfState(INITIAL_STATE);
      return;
    }

    let isCancelled = false;
    let loadingTask: { destroy: () => void } | null = null;

    const renderPdf = async () => {
      setPdfState({ isLoading: true, isRendering: false, error: "", pageCount: 0 });

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        // Pass URL directly so pdfjs streams and parses concurrently —
        // no arrayBuffer() wait. Range requests are disabled since the
        // proxy returns Accept-Ranges: none.
        const task = pdfjs.getDocument({
          url: proxiedFileUrl,
          httpHeaders: {
            "x-materialcrate-pdf-request": "viewer",
          },
          withCredentials: true,
          disableRange: true,
        });
        loadingTask = task;

        const pdf = await task.promise;

        if (isCancelled) {
          task.destroy();
          return;
        }

        canvasContainer.innerHTML = "";

        // Reveal the container and start showing pages as they render.
        // isRendering stays true until the last page is done.
        setPdfState({
          isLoading: false,
          isRendering: pdf.numPages > 1,
          error: "",
          pageCount: pdf.numPages,
        });

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (isCancelled) break;

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.25 });

          // Add placeholder with correct aspect ratio before rendering
          // so layout doesn't reflow when the canvas appears.
          const wrapper = document.createElement("div");
          wrapper.className =
            "relative overflow-hidden rounded bg-surface-high shadow-sm select-none";
          wrapper.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
          canvasContainer.appendChild(wrapper);

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            continue;
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "h-auto w-full pointer-events-none";

          await page.render({ canvas, canvasContext: context, viewport }).promise;

          if (isCancelled) break;

          wrapper.style.aspectRatio = "";
          wrapper.className =
            "relative overflow-hidden rounded bg-surface shadow-sm select-none";
          wrapper.appendChild(canvas);

          if (pageNumber === pdf.numPages) {
            setPdfState((prev) => ({ ...prev, isRendering: false }));
          }
        }
      } catch {
        if (!isCancelled) {
          setPdfState({
            isLoading: false,
            isRendering: false,
            error: "Unable to render this protected PDF right now.",
            pageCount: 0,
          });
        }
      }
    };

    void renderPdf();

    return () => {
      isCancelled = true;
      loadingTask?.destroy();
      canvasContainer.innerHTML = "";
    };
  }, [isOpen, proxiedFileUrl]);

  if (!isOpen || !post) return null;

  return (
    <div
      className="fixed inset-0 z-150 flex items-center justify-center px-4 py-6"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#F4F1EC] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-edge-mid px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">
              {post.title}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {post.categories.join(", ")}
              {pdfState.pageCount > 0 && ` • ${pdfState.pageCount} pages`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Close button" onClick={onClose}>
              <CloseCircle size={28} color="var(--ink)" variant="Bold" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#E7E1D8] p-4">
          {pdfState.isLoading && (
            <div className="flex h-full items-center justify-center text-sm text-ink-2">
              Loading PDF...
            </div>
          )}
          {pdfState.error && (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-sm text-center text-sm text-[#8A3A25]">
                {pdfState.error}
              </p>
            </div>
          )}
          <div
            ref={canvasContainerRef}
            className={`mx-auto flex max-w-3xl flex-col gap-4 ${
              pdfState.isLoading || (pdfState.error && "hidden")
            }`}
          />
          {pdfState.isRendering && (
            <div className="mt-4 flex justify-center text-xs text-ink-2">
              Loading more pages...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
