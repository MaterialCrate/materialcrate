"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import useScrollVisibility from "./useScrollVisibility";

const HIDDEN_PATHS = new Set(["/"]);

const NAV_PATHS = new Set(["/feed", "/hub", "/saved"]);

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isVisible = useScrollVisibility();

  const shouldShowNavbar =
    !HIDDEN_PATHS.has(pathname) &&
    (NAV_PATHS.has(pathname) ||
      pathname.startsWith("/saved/folder/") ||
      pathname.startsWith("/user/"));

  if (!shouldShowNavbar) {
    return null;
  }

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className={`fixed left-0 right-0 bottom-0 z-30 flex items-center border-t border-t-[#837F7F]/20 bg-white py-4 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out lg:hidden ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <Navbar />
      </nav>
      {/* Desktop left sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-18 xl:w-55 border-r border-[#837F7F]/20 bg-white flex-col transition-[width] duration-300 ease-out">
        <Navbar />
      </nav>
    </>
  );
}
