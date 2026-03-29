"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "mc.scroll.positions.v1";
const MAX_RESTORE_ATTEMPTS = 80;

type ScrollPosition = {
  x: number;
  y: number;
  itemIndex: number | null;
  itemOffset: number;
};

type ScrollPositionsMap = Record<string, ScrollPosition>;

function getTrackedItems() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-item]"));
}

function findVisibleItemAnchor(): { itemIndex: number | null; itemOffset: number } {
  const trackedItems = getTrackedItems();
  if (trackedItems.length === 0) {
    return { itemIndex: null, itemOffset: 0 };
  }

  let bestIndex: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  trackedItems.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!isVisible) return;

    const distance = Math.abs(rect.top);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  if (bestIndex === null) {
    return { itemIndex: null, itemOffset: 0 };
  }

  const anchorRect = trackedItems[bestIndex].getBoundingClientRect();
  return {
    itemIndex: bestIndex,
    itemOffset: window.scrollY - (window.scrollY + anchorRect.top),
  };
}

function readScrollPositions(): ScrollPositionsMap {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return parsed as ScrollPositionsMap;
  } catch {
    return {};
  }
}

function writeScrollPositions(positions: ScrollPositionsMap) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {}
}

function savePosition(routeKey: string) {
  const anchor = findVisibleItemAnchor();
  const positions = readScrollPositions();
  positions[routeKey] = {
    x: window.scrollX,
    y: window.scrollY,
    itemIndex: anchor.itemIndex,
    itemOffset: anchor.itemOffset,
  };
  writeScrollPositions(positions);
}

export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const saveFrameRef = useRef<number | null>(null);
  const routeKeyRef = useRef(routeKey);

  useEffect(() => {
    routeKeyRef.current = routeKey;
  }, [routeKey]);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      savePosition(routeKeyRef.current);
    };

    const onDocumentClickCapture = (event: MouseEvent) => {
      const target = event.target;
      const element =
        target instanceof Element
          ? target
          : target instanceof Node
            ? target.parentElement
            : null;
      if (!element) return;

      const link = element.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      if (link.target === "_blank") return;
      if (link.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      savePosition(routeKeyRef.current);
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      savePosition(routeKeyRef.current);
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      savePosition(routeKeyRef.current);
      return originalReplaceState.apply(this, args);
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClickCapture, true);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClickCapture, true);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    const positions = readScrollPositions();
    const saved = positions[routeKey];

    if (saved) {
      let attempts = 0;

      const restore = () => {
        const trackedItems = getTrackedItems();
        const anchorIndex = saved.itemIndex;
        const hasValidAnchor =
          typeof anchorIndex === "number" &&
          anchorIndex >= 0 &&
          anchorIndex < trackedItems.length;

        if (hasValidAnchor) {
          const anchorItem = trackedItems[anchorIndex];
          const anchorTop = window.scrollY + anchorItem.getBoundingClientRect().top;
          const anchoredY = Math.max(0, anchorTop + saved.itemOffset);
          window.scrollTo(saved.x, anchoredY);
        }

        const maxY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const nextY = Math.min(saved.y, maxY);
        window.scrollTo(saved.x, nextY);

        attempts += 1;
        const stillWaitingForAnchor =
          saved.itemIndex !== null && trackedItems.length <= saved.itemIndex;
        const notAtTarget = Math.abs(window.scrollY - nextY) > 2;

        if ((stillWaitingForAnchor || notAtTarget) && attempts < MAX_RESTORE_ATTEMPTS) {
          window.requestAnimationFrame(restore);
        }
      };

      window.requestAnimationFrame(restore);
    }
  }, [routeKey]);

  useEffect(() => {
    const scheduleSave = () => {
      if (saveFrameRef.current !== null) {
        window.cancelAnimationFrame(saveFrameRef.current);
      }

      saveFrameRef.current = window.requestAnimationFrame(() => {
        savePosition(routeKey);
        saveFrameRef.current = null;
      });
    };

    const saveOnHidden = () => {
      if (document.visibilityState === "hidden") {
        savePosition(routeKey);
      }
    };

    window.addEventListener("scroll", scheduleSave, { passive: true });
    window.addEventListener("beforeunload", scheduleSave);
    window.addEventListener("pagehide", scheduleSave);
    document.addEventListener("visibilitychange", saveOnHidden);

    return () => {
      window.removeEventListener("scroll", scheduleSave);
      window.removeEventListener("beforeunload", scheduleSave);
      window.removeEventListener("pagehide", scheduleSave);
      document.removeEventListener("visibilitychange", saveOnHidden);

      if (saveFrameRef.current !== null) {
        window.cancelAnimationFrame(saveFrameRef.current);
      }
    };
  }, [routeKey]);

  return null;
}