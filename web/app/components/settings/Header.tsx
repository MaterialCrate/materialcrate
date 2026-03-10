"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "iconsax-reactjs";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white pb-4 pt-12 px-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] flex items-center">
      <button aria-label="Back" type="button" onClick={() => router.back()}>
        <ArrowLeft size={24} />
      </button>
      <div className="text-center flex-1 text-xl font-medium">
        <h1>{title}</h1>
      </div>
    </header>
  );
}
