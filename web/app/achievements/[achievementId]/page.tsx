"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ConditionalNavbar from "@/app/components/ConditionalNavbar";
import DesktopSidebarOffset from "@/app/components/DesktopSidebarOffset";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  unlockedAt: string | null;
  holderPercentage: number;
};

const RARITY_CONFIG = {
  common: {
    label: "Common",
    bg: "bg-surface-high",
    badge: "bg-edge text-ink-2",
    glow: "",
    ring: "ring-edge",
  },
  uncommon: {
    label: "Uncommon",
    bg: "bg-surface-high",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    glow: "",
    ring: "ring-emerald-200/60 dark:ring-emerald-800/40",
  },
  rare: {
    label: "Rare",
    bg: "bg-surface-high",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    glow: "",
    ring: "ring-blue-200/60 dark:ring-blue-800/40",
  },
  legendary: {
    label: "Legendary",
    bg: "bg-surface-high",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
    ring: "ring-amber-300/60 dark:ring-amber-600/40",
  },
} as const;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function AchievementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const achievementId = typeof params.achievementId === "string"
    ? params.achievementId
    : Array.isArray(params.achievementId)
      ? params.achievementId[0]
      : "";

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!achievementId) return;

    setIsLoading(true);
    setError(null);

    fetch(`/api/achievements/${encodeURIComponent(achievementId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setAchievement(data.achievement);
        }
      })
      .catch(() => setError("Failed to load achievement"))
      .finally(() => setIsLoading(false));
  }, [achievementId]);

  const cfg = achievement
    ? RARITY_CONFIG[achievement.rarity] ?? RARITY_CONFIG.common
    : null;

  return (
    <>
      <ConditionalNavbar />
      <DesktopSidebarOffset>
        <div className="min-h-screen bg-page px-4 py-8 sm:px-6 lg:px-0">
          <div className="mx-auto max-w-lg">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back
            </button>

            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge-strong border-t-transparent" />
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-2xl border border-edge bg-surface p-8 text-center">
                <p className="text-sm text-ink-2">{error}</p>
              </div>
            )}

            {!isLoading && !error && !achievement && (
              <div className="rounded-2xl border border-edge bg-surface p-8 text-center">
                <p className="text-sm text-ink-2">Achievement not found.</p>
              </div>
            )}

            {!isLoading && !error && achievement && cfg && (
              <div
                className={`rounded-3xl border bg-surface ring-1 ${cfg.ring} ${cfg.glow} overflow-hidden`}
                style={{ borderColor: "var(--edge)" }}
              >
                {/* Icon section */}
                <div className="flex flex-col items-center px-8 pb-6 pt-10">
                  {/* Lock/unlock indicator */}
                  <div className="mb-4 flex items-center justify-end w-full">
                    {achievement.unlockedAt ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-edge px-3 py-1 text-xs font-medium text-ink-3">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Locked
                      </span>
                    )}
                  </div>

                  {/* Emoji icon */}
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-2xl text-5xl ${achievement.unlockedAt ? "" : "grayscale opacity-40"} ${cfg.bg} ring-1 ${cfg.ring} mb-5 transition-all`}
                  >
                    {achievement.icon}
                  </div>

                  {/* Rarity badge */}
                  <span
                    className={`mb-3 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>

                  {/* Title */}
                  <h1
                    className={`text-center text-2xl font-bold tracking-tight ${achievement.unlockedAt ? "text-ink" : "text-ink-2"}`}
                  >
                    {achievement.title}
                  </h1>

                  {/* Description */}
                  <p className="mt-2 text-center text-sm leading-relaxed text-ink-2">
                    {achievement.description}
                  </p>

                  {/* Unlock date */}
                  {achievement.unlockedAt && (
                    <p className="mt-3 text-xs text-ink-3">
                      Unlocked {formatDate(achievement.unlockedAt)}
                    </p>
                  )}
                </div>

                {/* Stats divider */}
                <div className="border-t border-edge mx-6" />

                {/* Holder percentage */}
                <div className="px-8 py-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink">Holders</span>
                    <span className="text-sm font-semibold text-ink">
                      {achievement.holderPercentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-edge">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        achievement.rarity === "legendary"
                          ? "bg-amber-400"
                          : achievement.rarity === "rare"
                            ? "bg-blue-400"
                            : achievement.rarity === "uncommon"
                              ? "bg-emerald-400"
                              : "bg-ink-3"
                      }`}
                      style={{
                        width: `${Math.min(achievement.holderPercentage, 100)}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-ink-3">
                    {achievement.holderPercentage === 0
                      ? "No one has unlocked this yet."
                      : achievement.holderPercentage < 1
                        ? "Fewer than 1% of users have this."
                        : `${achievement.holderPercentage}% of users have unlocked this achievement.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DesktopSidebarOffset>
    </>
  );
}
