"use client";

import React from "react";
import { SmsNotification } from "iconsax-reactjs";
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
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
      <Header title="Email Notifications" />
      <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Notifications
        </p>
        <h2 className="mt-1 text-lg font-semibold">Inbox updates, only when useful.</h2>
        <p className="mt-1 text-xs text-white/72">
          Pick the emails that should reach you outside the app.
        </p>
      </div>
      <div className="space-y-3">
        {emailOptions.map((option) => (
          <div
            key={option.label}
            className="flex items-start justify-between gap-4 rounded-[20px] border border-black/6 bg-white px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-[14px] bg-[#F6EFE5] p-2.5">
                <SmsNotification size={18} color="#A95A13" variant="Bulk" />
              </div>
              <div>
              <p className="text-sm font-medium text-[#3D3D3D]">{option.label}</p>
              <p className="text-xs text-[#6B6B6B]">{option.description}</p>
              </div>
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
