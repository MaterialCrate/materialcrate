"use client";

import { useEffect, useRef, useState } from "react";
import { CloseCircle } from "iconsax-reactjs";
import type { HomePost } from "./Post";

type PdfViewerModalProps = {
  post: HomePost | null;
  isOpen: boolean;
  onClose: () => void;
};

type PdfState = {
  isLoading: boolean;
  error: string;
  pageCount: number;
};

const INITIAL_STATE: PdfState = {
  isLoading: false,
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
    const canvasContainer = canvasContainerRef.current;

    if (!isOpen || !proxiedFileUrl || !canvasContainer) {
      setPdfState(INITIAL_STATE);
      return;
    }

    let isCancelled = false;

    const renderPdf = async () => {
      setPdfState({ isLoading: true, error: "", pageCount: 0 });

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const response = await fetch(proxiedFileUrl, {
          cache: "no-store",
          headers: {
            "x-materialcrate-pdf-request": "viewer",
          },
        });
        if (!response.ok) {
          throw new Error("Failed to load PDF");
        }

        const buffer = await response.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;

        if (isCancelled) {
          loadingTask.destroy();
          return;
        }

        canvasContainer.innerHTML = "";

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.25 });
          const wrapper = document.createElement("div");
          wrapper.className =
            "relative overflow-hidden rounded bg-white shadow-sm select-none";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Failed to prepare PDF canvas.");
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "h-auto w-full pointer-events-none";
          wrapper.appendChild(canvas);

          canvasContainer.appendChild(wrapper);

          await page.render({ canvas, canvasContext: context, viewport })
            .promise;
        }

        if (!isCancelled) {
          setPdfState({
            isLoading: false,
            error: "",
            pageCount: pdf.numPages,
          });
        }
      } catch {
        if (!isCancelled) {
          setPdfState({
            isLoading: false,
            error: "Unable to render this protected PDF right now.",
            pageCount: 0,
          });
        }
      }
    };

    void renderPdf();

    return () => {
      isCancelled = true;
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
        <div className="flex items-start justify-between gap-4 border-b border-black/8 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#202020]">
              {post.title}
            </p>
            <p className="mt-1 text-sm text-[#707070]">
              {post.categories.join(", ")}
              {pdfState.pageCount > 0 && ` • ${pdfState.pageCount} pages`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Close button" onClick={onClose}>
              <CloseCircle size={28} color="#333333" variant="Bold" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#E7E1D8] p-4">
          {pdfState.isLoading && (
            <div className="flex h-full items-center justify-center text-sm text-[#5D5D5D]">
              Rendering PDF...
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
        </div>
      </div>
    </div>
  );
}
