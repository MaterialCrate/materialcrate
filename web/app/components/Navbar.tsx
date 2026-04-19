"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Clipboard,
  Archive,
  Profile,
  SearchNormal1,
  Coin1,
  Messages2,
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
  { label: "Chat", href: "/chat", Icon: Messages2 },
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

  const [rawUnreadCount, setRawUnreadCount] = useState(0);
  // Derive 0 when logged out without needing a setState call in the effect
  const unreadMessageCount = user?.id ? rawUnreadCount : 0;

  // Fetch total unread message count whenever the route changes
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          conversations?: Array<{ unreadCount?: number }>;
        };
        if (Array.isArray(data?.conversations)) {
          const total = data.conversations.reduce(
            (sum, c) => sum + (c.unreadCount ?? 0),
            0,
          );
          setRawUnreadCount(total);
        }
      } catch {}
    };

    void fetchUnread();
  }, [user?.id, pathname]);

  // Increment badge when a new message arrives in a chat the user isn't viewing
  useEffect(() => {
    const onNewChatMessage = () => setRawUnreadCount((n) => n + 1);
    window.addEventListener("mc:chat:new-message", onNewChatMessage);
    return () =>
      window.removeEventListener("mc:chat:new-message", onNewChatMessage);
  }, []);

  return (
    <>
      <ul className="font-semibold text-xs flex w-full justify-between px-6 lg:hidden">
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
                <div className="relative">
                  <Icon
                    size={24}
                    color={color}
                    variant={isActive ? "Bold" : "Linear"}
                  />
                  {href === "/chat" && unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </div>
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
              router.push("/");
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
          {user && (
            <li>
              <Link
                href="/tokens"
                className={`flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 hover:bg-black/5 active:scale-[0.97] ${
                  pathname === "/tokens"
                    ? "text-[#E1761F] bg-[#FFF3E7]"
                    : "text-ink-2 hover:text-ink"
                }`}
                aria-current={pathname === "/tokens" ? "page" : undefined}
              >
                <Coin1
                  size={24}
                  color={pathname === "/tokens" ? "#E1761F" : "#959595"}
                  variant={pathname === "/tokens" ? "Bold" : "Linear"}
                />
                <span className="hidden xl:inline">
                  Tokens
                  {user.tokenBalance && (
                    <span className="ml-1.5 rounded-full bg-[#FFF3E7] px-2 py-0.5 text-[10px] font-semibold text-[#E1761F]">
                      {new Intl.NumberFormat("en-US").format(user.tokenBalance)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )}
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
                  <div className="relative shrink-0">
                    <Icon
                      size={24}
                      color={color}
                      variant={isActive ? "Bold" : "Linear"}
                    />
                    {href === "/chat" && unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {!isLoading && !user && (
          <div className="px-3 pb-6">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="cursor-pointer w-full rounded-xl bg-[#131212] px-3 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#2A2A2A] active:scale-[0.97]"
            >
              <span className="hidden xl:inline">Log in</span>
              <span className="xl:hidden">
                <Profile size={24} color="white" variant="Bold" />
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
