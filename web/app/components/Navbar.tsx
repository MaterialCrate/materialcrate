"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Clipboard,
  Archive,
  Profile,
  SearchNormal1,
} from "iconsax-reactjs";
import type { Icon as IconsaxIcon } from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";

type NavItem = {
  label: string;
  href: string;
  Icon: IconsaxIcon;
};

const items: NavItem[] = [
  { label: "Home", href: "/", Icon: Home },
  { label: "AI Hub", href: "/hub", Icon: Clipboard },
  { label: "Saved", href: "/saved", Icon: Archive },
  { label: "Profile", href: "/user", Icon: Profile },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const userProfileHref = user?.username
    ? `/user/${encodeURIComponent(user.username)}`
    : "/login";

  return (
    <>
      <ul className="font-semibold text-xs flex w-full justify-between px-12 lg:hidden">
        {items.map(({ label, href, Icon }) => {
          const isProfileItem = href === "/user";
          const isArchiveItem = href === "/saved";
          const resolvedHref = isProfileItem ? userProfileHref : href;
          const isActive = isProfileItem
            ? userProfileHref !== "/login" && pathname === userProfileHref
            : isArchiveItem
              ? pathname === href || pathname.startsWith("/saved/folder/")
              : pathname === href;
          const color = isActive ? "#E1761F" : "#959595";
          return (
            <li key={href} className="flex flex-col items-center text-[10px]">
              <Link
                href={resolvedHref}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-colors duration-200 active:bg-black/5"
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  if (href === "/") return;
                  if (isLoading || user) return;
                  event.preventDefault();
                  router.push("/login");
                }}
              >
                <Icon
                  size={24}
                  color={color}
                  variant={isActive ? "Bold" : "Linear"}
                />
                <p className={isActive ? "text-[#E1761F]" : "text-[#959595]"}>
                  {label}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop sidebar nav */}
      <div className="hidden lg:flex flex-col h-full w-full">
        <div className="px-4 pt-8 pb-8">
          <button
            type="button"
            aria-label="MaterialCrate"
            onClick={() => {
              router.push("/feed");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="cursor-pointer transition-opacity duration-200 hover:opacity-80 active:opacity-60"
          >
            <Image
              src="/logo.svg"
              alt="MaterialCrate Logo"
              width={42}
              height={42}
              className="block"
            />
          </button>
        </div>
        <div className="px-2 pb-3">
          <button
            type="button"
            onClick={() => router.push("/search")}
            className={`cursor-pointer flex w-full items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 hover:bg-black/5 active:scale-[0.97] ${
              pathname === "/search"
                ? "bg-[#FFF3E7] text-[#E1761F]"
                : "text-ink-2 hover:text-ink"
            }`}
            aria-label="Search"
          >
            <SearchNormal1
              size={24}
              color={pathname === "/search" ? "#E1761F" : "#959595"}
            />
            <span className="hidden xl:inline">Search</span>
          </button>
        </div>
        <ul className="flex flex-col gap-1 px-2 flex-1">
          {items.map(({ label, href, Icon }) => {
            const isProfileItem = href === "/user";
            const isArchiveItem = href === "/saved";
            const resolvedHref = isProfileItem ? userProfileHref : href;
            const isActive = isProfileItem
              ? userProfileHref !== "/login" && pathname === userProfileHref
              : isArchiveItem
                ? pathname === href || pathname.startsWith("/saved/folder/")
                : pathname === href;
            const color = isActive ? "#E1761F" : "#959595";
            return (
              <li key={href}>
                <Link
                  href={resolvedHref}
                  className={`flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 hover:bg-black/5 active:scale-[0.97] ${
                    isActive
                      ? "text-[#E1761F] bg-[#FFF3E7]"
                      : "text-ink-2 hover:text-ink"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    if (href === "/") return;
                    if (isLoading || user) return;
                    event.preventDefault();
                    router.push("/login");
                  }}
                >
                  <Icon
                    size={24}
                    color={color}
                    variant={isActive ? "Bold" : "Linear"}
                  />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
