import React from "react";
import { More, Heart, Messages2, Archive } from "iconsax-reactjs";

export default function Post() {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-[#D3D3D3] rounded-full" />
          <div>
            <p className="font-medium text-[#202020]">Juma Akapondo</p>
            <div className="text-[#8C8C8C] text-xs font-medium flex items-center gap-1.5">
              <p>@juma</p>
              <p>&bull;</p>
              <p>2 mins ago</p>
            </div>
          </div>
        </div>
        <More size={28} color="#959595" />
      </div>
      <div className="px-6">
        <p className="text-[#373737] text-sm">
          This was from my math class over at Stanford, this document clarified
          algebra like I am 5.
        </p>
      </div>
      <div className="overflow-y-scroll flex gap-3 px-6">
        <div className="bg-[#F3F3F3] h-45 w-full rounded-2xl p-3 flex gap-4">
          <div className="bg-[#E8E8E8] h-full w-30 rounded-xl"></div>
          <div>
            <p className="text-[#202020] font-medium text-sm">
              Algebra Unmystified
            </p>
            <div className="text-[#8C8C8C] text-xs font-medium flex items-center gap-1.5">
              <p>Computer Science</p>
              <p>&bull;</p>
              <p>2020</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 flex items-center gap-20">
        <div className="flex items-center gap-1.5">
          <Heart size={24} color="#808080" />
          <p className="text-[#808080] text-xs">3.7K</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Messages2 size={24} color="#808080" />
          <p className="text-[#808080] text-xs">20</p>
        </div>
        <Archive size={24} color="#808080" />
      </div>
    </div>
  );
}
