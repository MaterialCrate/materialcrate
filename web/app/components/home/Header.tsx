"use client";

import React from "react";
import useScrollVisibility from "../useScrollVisibility";
import { SearchNormal1 } from "iconsax-reactjs";
import Image from "next/image";
import { useRouter } from "next/navigation";

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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-10 flex flex-col bg-white shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-start justify-between px-6 pb-3 pt-6">
        <button
          type="button"
          aria-label="MaterialCrate"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Image
            src="/mc-wordmark.svg"
            alt="MaterialCrate Logo"
            width={160}
            height={120}
          />
        </button>
        <button
          type="button"
          aria-label="search"
          onClick={() => router.push("/search")}
        >
          <SearchNormal1 size={22} color="#959595" />
        </button>
      </div>
      {showLoadingBar && (
        <div className="h-[3px] w-full overflow-hidden bg-[#FFF3E7]">
          <div className="h-full w-1/3 animate-[loading-bar_1.4s_ease-in-out_infinite] bg-[#E1761F] rounded-full" />
        </div>
      )}
    </header>
  );
}
