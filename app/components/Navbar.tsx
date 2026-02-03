"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TbHome, TbFolders, TbArchive, TbUser } from "react-icons/tb";
import { useUser } from "@auth0/nextjs-auth0/client";

type NavItem = {
  label: string;
  href: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
};

const items: NavItem[] = [
  { label: "Home", href: "/", Icon: TbHome },
  { label: "Workspace", href: "/workspace", Icon: TbFolders },
  { label: "Archive", href: "/archive", Icon: TbArchive },
  { label: "Me", href: "/me", Icon: TbUser },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();

  return (
    <ul className="font-semibold text-xs flex w-full justify-between px-12">
      {items.map(({ label, href, Icon }) => {
        const isActive = pathname === href;
        const color = isActive ? "#000000" : "#959595";
        return (
          <li key={href} className="flex flex-col items-center">
            <Link
              href={href}
              className="flex flex-col items-center gap-1"
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => {
                if (href === "/") return;
                if (isLoading || user) return;
                event.preventDefault();
                router.push("/login");
              }}
            >
              <Icon size={36} color={color} strokeWidth={1.1} />
              <p className={isActive ? "text-black" : "text-[#959595]"}>
                {label}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
