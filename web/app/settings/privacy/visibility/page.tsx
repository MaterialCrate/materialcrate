"use client";

import React from "react";
import Header from "@/app/components/settings/Header";
import ToggleSwitch from "@/app/components/ToggleSwitch";

export default function Page() {
  const visibilityOptions = [
    { label: "Make my profile public", state: true },
    { label: "Make my posts public", state: false },
    { label: "Make my comments public", state: true },
    { label: "Show my online status", state: true },
  ];

  return (
    <div className="pt-30 px-6 bg-[#F7F7F7] h-dvh">
      <Header title="Account Visibility" />
      <div className="space-y-3">
        {visibilityOptions.map((option, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
          >
            <p className="text-sm text-[#3D3D3D]">{option.label}</p>
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
