"use client";

import { ArrowDown2, Book } from "iconsax-reactjs";
import React from "react";
import useScrollVisibility from "../useScrollVisibility";

export default function Header() {
  const isVisible = useScrollVisibility();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-10 flex bg-white px-6 py-4 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="p-2 rounded-lg bg-[#EEEEEE] flex items-center gap-1">
        <Book size={22} variant="Bold" />
        <ArrowDown2 size={14} color="#959595" />
      </div>
      <input
        placeholder="What material do you want to find?"
        className="flex-1 pl-4 placeholder:text-[#B0B0B0] outline-none text-sm"
      />
    </header>
  );
}
