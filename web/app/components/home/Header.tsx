"use client";

import { SearchNormal1 } from "iconsax-reactjs";
import React from "react";
import useScrollVisibility from "../useScrollVisibility";
import Image from "next/image";

export default function Header() {
  const isVisible = useScrollVisibility();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-10 flex items-start justify-between bg-white px-6 py-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <Image
        src="/mc-wordmark.svg"
        alt="MaterialCrate Logo"
        width={180}
        height={120}
      />
      <button type="button" aria-label="search">
        <SearchNormal1 size={22} color="#959595" />
      </button>
    </header>
  );
}
