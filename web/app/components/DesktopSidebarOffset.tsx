"use client";

import { usePathname } from "next/navigation";

const HIDDEN_PATHS = new Set(["/"]);
const NAV_PATHS = new Set(["/feed", "/hub", "/saved"]);

export default function DesktopSidebarOffset({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hasSidebar =
    !HIDDEN_PATHS.has(pathname) &&
    (NAV_PATHS.has(pathname) ||
      pathname.startsWith("/saved/folder/") ||
      pathname.startsWith("/user/"));

  return (
    <div
      className={
        hasSidebar
          ? "lg:ml-18 xl:ml-55 transition-[margin] duration-300 ease-out"
          : ""
      }
    >
      {children}
    </div>
  );
}
