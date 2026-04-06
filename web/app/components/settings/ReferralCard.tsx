import React from "react";
import { Information, Copy } from "iconsax-reactjs";

export default function ReferralCard() {
  return (
    <div className="relative py-3 px-3 w-full rounded-xl overflow-hidden bg-linear-to-br from-[#C85A00] via-[#D96A05] to-[#F39A47]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[20px_20px]"
      />
      <div className="flex gap-2 items-center">
        <p className="text-white font-medium">Refer a friend</p>
        <Information size={16} color="#FFFFFF" />
      </div>
      <p className="text-sm text-white mt-2">
        If someone register with your referral link, you both get free credits
        to use in MaterialCrate.
      </p>
      <button
        type="button"
        className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/80 bg-white/40 px-2 py-2 transition-colors hover:bg-white/55 active:bg-white/30"
        aria-label="Copy referral link"
      >
        <p className="text-sm text-white font-medium">
          materialcrate.com/ref/@juma_or_not?...
        </p>
        <Copy size={24} color="#FFFFFF" variant="Bold" />
      </button>
    </div>
  );
}
