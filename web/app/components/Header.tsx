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
    <header className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-b border-black/6 bg-[#FFFFFF] px-6 pb-3 pt-6">
      <button aria-label="Back" type="button" onClick={() => router.back()}>
        <ArrowLeft size={24} color="#202020" />
      </button>
      <div className="text-lg font-medium text-[#202020]">
        <h1>{title}</h1>
      </div>
    </header>
  );
}
