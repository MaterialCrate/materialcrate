"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Clipboard, Archive, Profile } from "iconsax-reactjs";
import type { Icon as IconsaxIcon } from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";

type NavItem = {
  label: string;
  href: string;
  Icon: IconsaxIcon;
};

const items: NavItem[] = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Hub", href: "/hub", Icon: Clipboard },
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
    <ul className="font-semibold text-xs flex w-full justify-between px-12">
      {items.map(({ label, href, Icon }) => {
        const isProfileItem = href === "/user";
        const isArchiveItem = href === "/saved";
        const resolvedHref = isProfileItem ? userProfileHref : href;
        const isActive = isProfileItem
          ? Boolean(user?.username) &&
            pathname === `/user/${encodeURIComponent(user.username)}`
          : isArchiveItem
            ? pathname === href || pathname.startsWith("/saved/folder/")
            : pathname === href;
        const color = isActive ? "#E1761F" : "#959595";
        return (
          <li key={href} className="flex flex-col items-center text-[10px]">
            <Link
              href={resolvedHref}
              className="flex flex-col items-center gap-1"
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
  );
}
