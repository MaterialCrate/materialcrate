"use client";

import React from "react";
import Header from "@/app/components/Header";
import ToggleSwitch from "@/app/components/ToggleSwitch";

export default function Page() {
  const emailOptions = [
    {
      label: "Account activity",
      description: "Important updates about your account and sign-ins.",
      state: true,
    },
    {
      label: "Weekly summary",
      description: "A recap of views, engagement, and activity.",
      state: false,
    },
    {
      label: "Product updates",
      description: "New features, improvements, and app announcements.",
      state: true,
    },
    {
      label: "Marketing emails",
      description: "Occasional tips, promos, and campaigns.",
      state: false,
    },
  ];

  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-30">
      <Header title="Email Notifications" />
      <p className="mb-4 text-sm text-[#5B5B5B]">
        Choose which updates should be sent to your inbox.
      </p>
      <div className="space-y-3">
        {emailOptions.map((option) => (
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
                console.log("Email notification setting:", option.label, newState)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
