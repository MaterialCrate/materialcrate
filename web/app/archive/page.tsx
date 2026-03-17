import React from "react";
import Image from "next/image";
import emptyWorkspace from "@/assets/svg/empty-workspace.svg";

export default function ArchivePage() {
  return (
    <div className="h-screen relative">
      <header className="flex justify-center fixed top-0 left-0 right-0 mx-0 bg-[#F7F7F7] pt-6 pb-2">
        <h1 className="text-xl font-medium">My Archive</h1>
      </header>
      <div className="h-full flex flex-col items-center justify-center px-12 gap-4">
        <Image
          src={emptyWorkspace}
          alt="Empty workspace"
          width={80}
          height={80}
        />
        <p className="text-sm text-[#696969] text-center">
          You haven&apos;t archived any materials yet! Browse our feeds to find
          useful documents and hit the &apos;Archive&apos; button to save them
          here.
        </p>
      </div>
    </div>
  );
}
