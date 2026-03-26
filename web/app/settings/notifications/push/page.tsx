"use client";

import React from "react";
import { Notification } from "iconsax-reactjs";
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
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
      <Header title="Push Notifications" isLoading={false} />
      <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Notifications
        </p>
        <h2 className="mt-1 text-lg font-semibold">Realtime alerts on your device.</h2>
        <p className="mt-1 text-xs text-white/72">
          Choose which activity should trigger push notifications.
        </p>
      </div>
      <div className="space-y-3">
        {notificationOptions.map((option) => (
          <div
            key={option.label}
            className="flex items-start justify-between gap-4 rounded-[20px] border border-black/6 bg-white px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-[14px] bg-[#F6EFE5] p-2.5">
                <Notification size={18} color="#A95A13" variant="Bulk" />
              </div>
              <div>
              <p className="text-sm font-medium text-[#3D3D3D]">{option.label}</p>
              <p className="text-xs text-[#6B6B6B]">{option.description}</p>
              </div>
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
