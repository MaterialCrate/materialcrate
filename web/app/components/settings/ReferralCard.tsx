import React from "react";
import { Information, Copy } from "iconsax-reactjs";

export default function ReferralCard() {
  return (
    <div className="py-3 px-3 w-full rounded-xl overflow-hidden bg-linear-to-br from-[#C85A00] via-[#D96A05] to-[#F39A47]">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[20px_20px]" />
      <div className="flex gap-2 items-center">
        <p className="text-white font-medium">Refer a friend</p>
        <Information size={16} color="#FFFFFF" />
      </div>
      <p className="text-sm text-white mt-2">
        If someone register with your referral link, you both get free credits
        to use in MaterialCrate.
      </p>
      <div className="px-2 py-2 bg-white/40 rounded-2xl mt-5 border border-white/80 flex justify-between">
        <p className="text-sm text-white font-medium">
          materialcrate.com/ref/@juma_or_not?...
        </p>
        <Copy size={24} color="#FFFFFF" variant="Bold" />
      </div>
    </div>
  );
}
