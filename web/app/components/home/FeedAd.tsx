"use client";

import { useEffect, useRef } from "react";

// ─── Adsterra Ad Zones ────────────────────────────────────────────────────────
type AdZone =
  | { type: "native"; src: string; containerId: string }
  | { type: "banner"; key: string; src: string; width: number; height: number }
  | { type: "socialbar"; src: string };

const AD_ZONES: AdZone[] = [
  {
    type: "native",
    src: "https://pl29107546.profitablecpmratenetwork.com/dca3faf47483a0c15be4506365e921d8/invoke.js",
    containerId: "container-dca3faf47483a0c15be4506365e921d8",
  },
  {
    type: "banner",
    key: "44be9916dcda20992159a6ccdf64c31e",
    src: "https://www.highperformanceformat.com/44be9916dcda20992159a6ccdf64c31e/invoke.js",
    width: 468,
    height: 60,
  },
  {
    type: "socialbar",
    src: "https://pl29109074.profitablecpmratenetwork.com/c5/54/ee/c554ee202f818aef11daa36cba5961d3.js",
  },
];

const AD_SANDBOX_SCRIPT = `<script>
(function(){
  var _open = window.open.bind(window);
  window.open = function(url, name, features) {
    var f = (features || '') + ',noopener,noreferrer';
    return _open(url, '_blank', f);
  };
  try { window.top.location; } catch(e) {}
  Object.defineProperty(window, 'top', { get: function(){ return window; } });
})();
<\/script>`;

function buildAdHtml(zone: AdZone, cacheBust: string): string {
  const base = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;}</style></head><body>${AD_SANDBOX_SCRIPT}`;
  const close = `</body></html>`;

  if (zone.type === "native") {
    return (
      base +
      `<script async="async" data-cfasync="false" src="${zone.src}?r=${cacheBust}"><\/script>` +
      `<div id="${zone.containerId}"></div>` +
      close
    );
  }
  if (zone.type === "banner") {
    return (
      base +
      `<script>atOptions={'key':'${zone.key}','format':'iframe','height':${zone.height},'width':${zone.width},'params':{}};<\/script>` +
      `<script src="${zone.src}?r=${cacheBust}"><\/script>` +
      close
    );
  }
  return base + `<script src="${zone.src}?r=${cacheBust}"><\/script>` + close;
}
// ─────────────────────────────────────────────────────────────────────────────

let zoneCounter = 0;

export default function FeedAd() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const zone = AD_ZONES[zoneCounter % AD_ZONES.length];
    zoneCounter += 1;

    const minHeight = zone.type === "banner" ? zone.height : 120;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = `width:100%;height:${minHeight}px;border:none;display:block;overflow:hidden;`;
    iframe.sandbox.add(
      "allow-scripts",
      "allow-same-origin",
      "allow-popups",
      "allow-popups-to-escape-sandbox",
      "allow-forms",
    );
    container.appendChild(iframe);

    const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(buildAdHtml(zone, cacheBust));
      iframeDoc.close();
    }

    const resizeToContent = () => {
      const body = iframe.contentDocument?.body;
      if (body && body.scrollHeight > minHeight) {
        iframe.style.height = `${body.scrollHeight}px`;
      }
    };

    iframe.addEventListener("load", () => {
      resizeToContent();
      let attempts = 0;
      const poll = setInterval(() => {
        resizeToContent();
        attempts += 1;
        if (attempts >= 10) clearInterval(poll);
      }, 300);
    });

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <article className="lg:rounded-xl lg:border lg:border-edge lg:mb-4 lg:bg-surface lg:shadow-sm">
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <div className="flex items-center gap-2 py-1 pl-1">
          <div className="flex h-11 w-11 aspect-square items-center justify-center overflow-hidden rounded-full bg-surface-high ring-1 ring-edge">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"
                fill="var(--ink-3)"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Sponsored</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-3">
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ background: "var(--edge)", color: "var(--ink-3)" }}
              >
                Ad
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 pt-2 pb-4">
        <div className="overflow-hidden rounded-[22px] bg-doc-card p-3">
          <div ref={containerRef} />
        </div>
      </div>
    </article>
  );
}
