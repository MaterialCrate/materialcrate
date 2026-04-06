"use client";

import React from "react";
import { MonitorMobbile, Moon, Sun1 } from "iconsax-reactjs";
import Header from "@/app/components/Header";
import { useAuth, refreshAuth } from "@/app/lib/auth-client";

type ThemeOption = {
  key: "system" | "light" | "dark" | "sepia";
  label: string;
  description: string;
  preview: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    key: "system",
    label: "System",
    description: "Match your device preference automatically.",
    preview: "from-[#ececec] via-[#ffffff] to-[#e2e2e2]",
  },
  {
    key: "light",
    label: "Light",
    description: "Bright interface for daytime use.",
    preview: "from-[#fffdf8] via-[#ffffff] to-[#f3ece2]",
  },
  {
    key: "dark",
    label: "Dark",
    description: "Low-light interface for night use.",
    preview: "from-[#111111] via-[#212121] to-[#2d2d2d]",
  },
  {
    key: "sepia",
    label: "Sepia",
    description: "Warm reading theme with softer contrast.",
    preview: "from-[#f3e4ce] via-[#f6ebdb] to-[#e8d6bb]",
  },
];

const STORAGE_KEY = "mc-theme";

const resolveTheme = (value: ThemeOption["key"]) => {
  if (value !== "system") return value;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyThemeToDocument = (theme: ThemeOption["key"]) => {
  const resolvedTheme = resolveTheme(theme);

  if (resolvedTheme === "dark" || resolvedTheme === "sepia") {
    document.documentElement.dataset.theme = resolvedTheme;
    return;
  }

  document.documentElement.removeAttribute("data-theme");
};

export default function Page() {
  const { user, isLoading } = useAuth();
  const [selectedTheme, setSelectedTheme] =
    React.useState<ThemeOption["key"]>("light");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const serverTheme = (user?.theme as ThemeOption["key"] | undefined) ?? null;
    const localTheme = window.localStorage.getItem(STORAGE_KEY) as
      | ThemeOption["key"]
      | null;
    const initialTheme = serverTheme ?? localTheme ?? "light";

    setSelectedTheme(initialTheme);
    applyThemeToDocument(initialTheme);

    if (serverTheme && serverTheme !== localTheme) {
      window.localStorage.setItem(STORAGE_KEY, serverTheme);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handlePreferenceChange = () => {
      const currentTheme =
        (window.localStorage.getItem(STORAGE_KEY) as
          | ThemeOption["key"]
          | null) ?? "system";

      if (currentTheme === "system") {
        applyThemeToDocument(currentTheme);
      }
    };

    mediaQuery.addEventListener("change", handlePreferenceChange);
    return () =>
      mediaQuery.removeEventListener("change", handlePreferenceChange);
  }, [user]);

  const applyTheme = async (theme: ThemeOption["key"]) => {
    setSelectedTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyThemeToDocument(theme);

    setSaving(true);
    try {
      await fetch("/api/settings/appearance/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      refreshAuth();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F7F7F7]">
      <Header title="Theme" isLoading={isLoading || saving} />
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-20 sm:px-6">
      <p className="mb-4 text-sm text-[#5B5B5B]">
        Choose how Material Crate looks across the app.
      </p>
      <div className="space-y-3">
        {THEME_OPTIONS.map((option) => {
          const isActive = selectedTheme === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => applyTheme(option.key)}
              className={`w-full rounded-3xl border px-4 py-4 text-left transition-colors ${
                isActive
                  ? "border-[#E1761F] bg-[#FFF4EA]"
                  : "border-black/8 bg-white"
              }`}
            >
              <div className="mb-4 overflow-hidden rounded-[18px] border border-black/8">
                <div className={`h-22 bg-linear-to-br ${option.preview} p-3`}>
                  <div className="flex h-full flex-col justify-between rounded-[14px] border border-white/35 bg-white/25 p-3 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/75" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-20 rounded-full bg-white/65" />
                      <div className="h-2.5 w-32 rounded-full bg-white/45" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#2E2E2E]">
                    {option.label}
                  </p>
                  <p className="text-xs text-[#666666]">{option.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {option.key === "system" ? (
                    <MonitorMobbile size={18} color="#7A7A7A" />
                  ) : option.key === "light" || option.key === "sepia" ? (
                    <Sun1 size={18} color="#7A7A7A" />
                  ) : (
                    <Moon size={18} color="#7A7A7A" />
                  )}
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      isActive
                        ? "border-[#E1761F] bg-[#E1761F]"
                        : "border-[#B9B9B9] bg-transparent"
                    }`}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
