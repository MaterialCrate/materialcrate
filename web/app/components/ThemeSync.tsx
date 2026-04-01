"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/lib/auth-client";

const STORAGE_KEY = "mc-theme";
type Theme = "system" | "light" | "dark" | "sepia";
const VALID_THEMES: Theme[] = ["system", "light", "dark", "sepia"];

const resolveTheme = (value: Theme): string => {
  if (value !== "system") return value;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyThemeToDocument = (theme: Theme) => {
  const resolved = resolveTheme(theme);
  if (resolved === "dark" || resolved === "sepia") {
    document.documentElement.dataset.theme = resolved;
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
};

export default function ThemeSync() {
  const { user } = useAuth();

  useEffect(() => {
    const serverTheme = user?.theme as string | undefined;
    if (!serverTheme || !VALID_THEMES.includes(serverTheme as Theme)) return;

    const localTheme = window.localStorage.getItem(STORAGE_KEY);
    if (serverTheme !== localTheme) {
      window.localStorage.setItem(STORAGE_KEY, serverTheme);
      applyThemeToDocument(serverTheme as Theme);
    }
  }, [user]);

  return null;
}
