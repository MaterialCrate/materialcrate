import React from "react";
import { CloseCircle, Heart } from "iconsax-reactjs";

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentDrawer({ isOpen, onClose }: CommentDrawerProps) {
  return (
    <div
      className={`fixed inset-x-0 top-40 bottom-0 bg-white z-100 rounded-t-3xl px-6 py-6 space-y-3 transition-all duration-300 ease-out ${
        isOpen
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-[110%] opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex justify-center items-center relative">
        <h1 className="text-lg text-[#202020] font-medium">Comments</h1>
        <button
          type="button"
          aria-label="Close comments"
          onClick={onClose}
          className="absolute right-0"
        >
          <CloseCircle size={24} color="#959595" />
        </button>
      </div>
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="h-6 w-6 bg-black/20 rounded-full" />
          <div className="space-y-1">
            <p className="text-xs text-[#444444] font-semibold">John Doe</p>
            <p className="text-xs text-[#202020]">
              This study guide is incredibly helpful for my exam! Thanks!
            </p>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-[#5B5B5B] font-medium flex items-center gap-5">
                <p>2 hours ago</p>
                <button type="button">Like</button>
                <button type="button">Reply</button>
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#5B5B5B] font-medium">2</p>
                <Heart size={14} color="#E00505" variant="Bold" />
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute left-3 top-8 h-11 w-6 border-l border-b border-[#A8A8A8] rounded-bl-xl" />
        <button
          type="button"
          className="ml-11 mt-3 text-xs text-[#7C7C7C] font-medium"
        >
          View all 4 replies
        </button>
      </div>
    </div>
  );
}
