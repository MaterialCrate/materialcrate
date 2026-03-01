import React from "react";
import {
  CloseCircle,
  ProfileAdd,
  VolumeMute,
  Slash,
  Flag,
} from "iconsax-reactjs";

interface OptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authorUsername?: string | null;
}

export default function OptionsDrawer({
  isOpen,
  onClose,
  authorUsername,
}: OptionsDrawerProps) {
  const username = authorUsername?.trim() ? `@${authorUsername}` : "@unknown";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 bg-white z-100 rounded-t-3xl px-6 py-6 space-y-3 transition-all duration-300 ease-out ${
        isOpen
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-[110%] opacity-0 pointer-events-none"
      }`}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <button type="button" aria-label="Close" onClick={onClose}>
            <CloseCircle size={24} color="#959595" />
          </button>
        </div>
        <div className="text-[#3D3D3D] font-medium space-y-7">
          <button
            type="button"
            aria-label="follow"
            className="flex items-center gap-2"
          >
            <ProfileAdd size={24} variant="Bold" color="black" />
            <p>Follow {username}</p>
          </button>
          <button
            type="button"
            aria-label="mute"
            className="flex items-center gap-2"
          >
            <VolumeMute size={24} variant="Bold" color="black" />
            <p>Mute {username}</p>
          </button>
          <button
            type="button"
            aria-label="block"
            className="flex items-center gap-2"
          >
            <Slash size={24} color="black" />
            <p>Block {username}</p>
          </button>
          <div className="h-0.5 w-full bg-[#7D7D7D]"></div>
          <button
            type="button"
            aria-label="report"
            className="flex items-center gap-2"
          >
            <Flag size={24} color="black" variant="Bold" />
            <p>Report Material</p>
          </button>
        </div>
      </div>
    </div>
  );
}
