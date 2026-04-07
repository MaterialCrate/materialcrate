import React from "react";
import Link from "next/link";

export type AchievementData = {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  unlockedAt: string | null;
  holderPercentage: number;
};

const RARITY_RING: Record<AchievementData["rarity"], string> = {
  common: "ring-edge",
  uncommon: "ring-emerald-200/60 dark:ring-emerald-800/40",
  rare: "ring-blue-200/60 dark:ring-blue-800/40",
  legendary: "ring-amber-300/60 dark:ring-amber-600/40 shadow-[0_0_20px_rgba(251,191,36,0.10)]",
};

const RARITY_BADGE: Record<AchievementData["rarity"], string> = {
  common: "bg-edge text-ink-3",
  uncommon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

type Props = {
  achievement?: AchievementData;
};

export default function Acheivement({ achievement }: Props) {
  if (!achievement) {
    return (
      <div className="h-31 w-full rounded-2xl border border-edge bg-surface-high transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]" />
    );
  }

  const ring = RARITY_RING[achievement.rarity];
  const badge = RARITY_BADGE[achievement.rarity];
  const isUnlocked = Boolean(achievement.unlockedAt);

  return (
    <Link
      href={`/achievements/${encodeURIComponent(achievement.id)}`}
      className={`group flex items-start gap-3 rounded-2xl border border-edge bg-surface p-4 ring-1 ${ring} transition-all duration-200 hover:bg-surface-high hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-[0.98]`}
    >
      {/* Icon */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-high text-2xl ring-1 ${ring} transition-all ${isUnlocked ? "" : "grayscale opacity-40"}`}
      >
        {achievement.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`truncate text-sm font-semibold leading-tight ${isUnlocked ? "text-ink" : "text-ink-2"}`}
          >
            {achievement.title}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge}`}
          >
            {achievement.rarity}
          </span>
        </div>

        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-3">
          {achievement.description}
        </p>

        {isUnlocked && achievement.holderPercentage > 0 && (
          <p className="mt-1.5 text-[10px] text-ink-3">
            {achievement.holderPercentage}% of users
          </p>
        )}
      </div>
    </Link>
  );
}
