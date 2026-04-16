"use client";

import React from "react";
import useScrollVisibility from "../useScrollVisibility";
import { SearchNormal1, Coin1 } from "iconsax-reactjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-client";

interface HeaderProps {
  forceVisible?: boolean;
  showLoadingBar?: boolean;
}

export default function Header({
  forceVisible,
  showLoadingBar,
}: HeaderProps = {}) {
  const isScrollVisible = useScrollVisibility();
  const isVisible = forceVisible || isScrollVisible;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const showLoginButton = !authLoading && !user;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-10 flex flex-col bg-surface shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] lg:hidden"
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 300ms ease-out",
      }}
    >
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <button
          type="button"
          aria-label="MaterialCrate"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="cursor-pointer transition-opacity duration-200 hover:opacity-80 active:opacity-60"
        >
          <Image
            src="/mc-wordmark.svg"
            alt="MaterialCrate Logo"
            width={160}
            height={120}
          />
        </button>
        <div className="flex items-center gap-2">
          {showLoginButton && (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="cursor-pointer rounded-full bg-[#131212] px-4 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#2A2A2A] active:scale-95"
            >
              Log in
            </button>
          )}
          {!authLoading && user && (
            <Link
              href="/tokens"
              className="flex items-center gap-1.5 rounded-full bg-[#FFF3E7] px-3 py-1.5 transition-all duration-200 active:scale-95"
            >
              <Coin1 size={16} color="#E1761F" variant="Bold" />
              <span className="text-sm font-semibold text-[#E1761F]">
                {new Intl.NumberFormat("en-US").format(user.tokenBalance ?? 0)}
              </span>
            </Link>
          )}
          <button
            type="button"
            aria-label="search"
            onClick={() => router.push("/search")}
            className="cursor-pointer rounded-full p-2 transition-colors duration-200 hover:bg-black/5 active:bg-black/10"
          >
            <SearchNormal1 size={22} color="#959595" />
          </button>
        </div>
      </div>
      {showLoadingBar && (
        <div className="h-0.75 w-full overflow-hidden bg-[#FFF3E7]">
          <div className="h-full w-1/3 animate-[loading-bar_1.4s_ease-in-out_infinite] bg-[#E1761F] rounded-full" />
        </div>
      )}
    </header>
  );
}
