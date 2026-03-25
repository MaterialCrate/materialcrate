"use client";

import React from "react";
import Header from "@/app/components/Header";
import ToggleSwitch from "@/app/components/ToggleSwitch";

export default function Page() {
  const notificationOptions = [
    {
      label: "Likes and reactions",
      description: "When someone reacts to your post.",
      state: true,
    },
    {
      label: "Comments",
      description: "When someone comments on your post.",
      state: true,
    },
    {
      label: "Follows",
      description: "When someone follows your account.",
      state: true,
    },
    {
      label: "Mentions",
      description: "When someone mentions you in content.",
      state: false,
    },
  ];

  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-30">
      <Header title="Push Notifications" />
      <p className="mb-4 text-sm text-[#5B5B5B]">
        Control the alerts you receive on your device.
      </p>
      <div className="space-y-3">
        {notificationOptions.map((option) => (
          <div
            key={option.label}
            className="flex items-start justify-between gap-4 rounded-lg bg-white p-3 shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-[#3D3D3D]">{option.label}</p>
              <p className="text-xs text-[#6B6B6B]">{option.description}</p>
            </div>
            <ToggleSwitch
              state={option.state}
              onChange={(newState) =>
                console.log("Push notification setting:", option.label, newState)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
