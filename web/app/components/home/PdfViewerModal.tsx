"use client";

import { useEffect, useRef, useState } from "react";
import { CloseCircle } from "iconsax-reactjs";
import { trackFeedInteraction } from "@/app/lib/feed-tracking";
import type { HomePost } from "./Post";

// ─── Adsterra Native Banner ───────────────────────────────────────────────────
// Fill these in after creating a Native Banner zone in your Adsterra dashboard.
// Leave empty to disable ads.
const ADSTERRA_INVOKE_SRC = "https://pl29107546.profitablecpmratenetwork.com/dca3faf47483a0c15be4506365e921d8/invoke.js";
const ADSTERRA_CONTAINER_ID = "container-dca3faf47483a0c15be4506365e921d8";
// ─────────────────────────────────────────────────────────────────────────────

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

        // Randomise the ad interval (3–5 pages), stable for this render.
        const adInterval = 3 + Math.floor(Math.random() * 3);

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

          // Insert a native ad after every adInterval pages (not after the last page).
          // Each ad uses an isolated iframe so Adsterra runs fresh with no ID conflicts.
          if (
            pageNumber % adInterval === 0 &&
            pageNumber < pdf.numPages &&
            ADSTERRA_INVOKE_SRC &&
            ADSTERRA_CONTAINER_ID
          ) {
            const adWrapper = document.createElement("div");
            adWrapper.className =
              "relative overflow-hidden rounded-xl bg-surface shadow-sm";

            const sponsored = document.createElement("span");
            sponsored.textContent = "Sponsored";
            sponsored.style.cssText =
              "position:absolute;top:8px;right:10px;font-size:10px;color:var(--ink-3);z-index:1;pointer-events:none;";
            adWrapper.appendChild(sponsored);

            const iframe = document.createElement("iframe");
            iframe.style.cssText =
              "width:100%;min-height:120px;border:none;display:block;";
            iframe.scrolling = "no";
            adWrapper.appendChild(iframe);
            canvasContainer.appendChild(adWrapper);

            // Write Adsterra code into the isolated iframe so each slot
            // gets its own fresh script execution and DOM — no duplicate IDs.
            const iframeDoc =
              iframe.contentDocument ?? iframe.contentWindow?.document;
            if (iframeDoc) {
              iframeDoc.open();
              iframeDoc.write(
                `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;}</style></head>` +
                `<body><script async="async" data-cfasync="false" src="${ADSTERRA_INVOKE_SRC}"><\/script>` +
                `<div id="${ADSTERRA_CONTAINER_ID}"></div></body></html>`,
              );
              iframeDoc.close();

              // Resize the iframe to fit the ad content once it loads.
              iframe.addEventListener("load", () => {
                const body = iframe.contentDocument?.body;
                if (body) {
                  iframe.style.height = `${body.scrollHeight}px`;
                }
              });
            }
          }

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
