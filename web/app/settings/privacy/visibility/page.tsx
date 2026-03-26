"use client";

import React from "react";
import { Eye, EyeSlash } from "iconsax-reactjs";
import Header from "@/app/components/Header";
import ToggleSwitch from "@/app/components/ToggleSwitch";

export default function Page() {
  const visibilityOptions = [
    {
      label: "Public profile",
      description: "Allow other people to discover and view your profile.",
      state: true,
    },
    {
      label: "Public posts",
      description: "Show your posts outside your direct audience.",
      state: false,
    },
    {
      label: "Public comments",
      description: "Let your comment activity be visible to others.",
      state: true,
    },
    {
      label: "Online status",
      description: "Show when you are active in the app.",
      state: true,
    },
  ];

  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
      <Header title="Account Visibility" isLoading={false} />
      <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Privacy
        </p>
        <h2 className="mt-1 text-lg font-semibold">Control what people can see.</h2>
        <p className="mt-1 text-xs text-white/72">
          Visibility settings shape how discoverable your profile and activity are.
        </p>
      </div>
      <div className="space-y-3">
        {visibilityOptions.map((option) => (
          <div
            key={option.label}
            className="flex items-start justify-between gap-4 rounded-[20px] border border-black/6 bg-white px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-[14px] bg-[#F6EFE5] p-2.5">
                {option.state ? (
                  <Eye size={18} color="#A95A13" variant="Bulk" />
                ) : (
                  <EyeSlash size={18} color="#A95A13" variant="Bulk" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D3D3D]">{option.label}</p>
                <p className="mt-0.5 text-xs text-[#6B6B6B]">
                  {option.description}
                </p>
              </div>
            </div>
            <ToggleSwitch
              state={option.state}
              onChange={(newState) =>
                console.log("Profile visibility:", newState)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
