"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

const NAV_PATHS = new Set(["/", "/workspace", "/archive", "/me"]);

export default function ConditionalNavbar() {
  const pathname = usePathname();

  if (!NAV_PATHS.has(pathname)) {
    return null;
  }

  return (
    <nav className="fixed left-0 right-0 bottom-0 pb-[env(safe-area-inset-bottom)] py-4 bg-white border-t border-t-[#837F7F] flex items-center">
      <Navbar />
    </nav>
  );
}
