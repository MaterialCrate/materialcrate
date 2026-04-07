"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "iconsax-reactjs";
import LoadingBar from "./LoadingBar";

interface HeaderProps {
  title: string;
  isLoading?: boolean;
  rightSlot?: React.ReactNode;
}

export default function Header({
  title,
  isLoading = false,
  rightSlot,
}: HeaderProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <header className="grid grid-cols-[24px_1fr_24px] items-center gap-3 border-b border-edge bg-surface px-6 pb-3 pt-6">
        <button aria-label="Back" type="button" onClick={() => router.back()} className="transition-opacity hover:opacity-60 active:opacity-40">
          <ArrowLeft size={24} color="var(--ink)" />
        </button>
        <div className="text-lg font-medium text-ink">
          <h1>{title}</h1>
        </div>
        <div className="flex min-w-6 justify-end">
          {rightSlot ?? <span aria-hidden="true" className="h-6 w-6" />}
        </div>
      </header>
      {isLoading && <LoadingBar />}
    </div>
  );
}
