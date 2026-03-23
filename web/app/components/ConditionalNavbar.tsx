"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import useScrollVisibility from "./useScrollVisibility";

const NAV_PATHS = new Set([
  "/",
  "/hub",
  "/saved",
]);

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isVisible = useScrollVisibility();

  const shouldShowNavbar =
    NAV_PATHS.has(pathname) ||
    pathname.startsWith("/saved/folder/") ||
    pathname.startsWith("/user/");

  if (!shouldShowNavbar) {
    return null;
  }

  return (
    <nav
      className={`fixed left-0 right-0 bottom-0 flex items-center border-t border-t-[#837F7F]/20 bg-white py-4 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Navbar />
    </nav>
  );
}
