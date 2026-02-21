"use client";

import React from "react";
import { ArrowLeft, ArrowRight2, Logout } from "iconsax-reactjs";
import { useRouter } from "next/navigation";
import ReferralCard from "../components/settings/ReferralCard";
import ActionButton from "../components/ActionButton";

export default function Settings() {
  const router = useRouter();

  const settingPages = [
    {
      title: "Account Management",
      buttons: [{ key: "account-info", text: "Account Information" }],
    },
    {
      title: "Notifications",
      buttons: [
        { key: "email-notifications", text: "Email Notifications" },
        { key: "push-notifications", text: "Push Notifications" },
      ],
    },
    {
      title: "Privacy and Security",
      buttons: [
        { key: "profile-visibility", text: "Profile Visibility" },
        { key: "content-visibility", text: "Content Visibility" },
        { key: "blocked-users", text: "Blocked Users" },
        { key: "Terms of Service", text: "Terms of Service" },
      ],
    },
  ];

  return (
    <div className="space-y-4 pt-30 px-6 bg-[#F7F7F7] h-screen">
      <header className="fixed top-0 left-0 right-0 bg-white pb-4 pt-12 px-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] flex items-center">
        <button aria-label="Back" type="button" onClick={() => router.back()}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 text-xl font-medium">
          <h1>Settings</h1>
        </div>
      </header>
      <ReferralCard />
      <div className="w-full">
        {settingPages.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="font-medium mb-3 text-[#3D3D3D]">{section.title}</h2>
            <div className="w-full px-4 py-3 bg-white rounded-lg flex flex-col items-start gap-5">
              {section.buttons.map((button) => (
                <button
                  type="button"
                  key={button.key}
                  className="flex items-center justify-between w-full"
                >
                  <p className="text-sm text-[#3D3D3D]">{button.text}</p>
                  <ArrowRight2 size={20} color="#444444" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <ActionButton
        className="fixed bottom-12 left-8 right-8 flex items-center justify-center gap-2"
        type="button"
      >
        <Logout size={20} color="#FFFFFF" />
        <p className="text-white font-medium">Logout</p>
      </ActionButton>
    </div>
  );
}
