"use client";

import React from "react";
import { ArrowRight2, Logout } from "iconsax-reactjs";
import { useRouter } from "next/navigation";
import ReferralCard from "../components/settings/ReferralCard";
import ActionButton from "../components/ActionButton";
import Header from "../components/Header";

const settingPages = [
  {
    title: "Profile & Account",
    buttons: [
      {
        key: "edit-profile",
        text: "Edit Profile",
        href: "/settings/profile",
      },
      {
        key: "account-info",
        text: "Account Information",
        href: "/settings/account",
      },
    ],
  },
  {
    title: "Privacy & Safety",
    buttons: [
      {
        key: "visibility",
        text: "Account Visibility",
        href: "/settings/privacy/visibility",
      },
      {
        key: "blocked-users",
        text: "Blocked Users",
        href: "/settings/privacy/blocked-users",
      },
      {
        key: "terms-of-service",
        text: "Terms of Service",
        href: "/settings/privacy/terms-of-service",
      },
    ],
  },
  {
    title: "Communication Preferences",
    buttons: [
      {
        key: "email-notifications",
        text: "Email Notifications",
        href: "/settings/notifications/email",
      },
      {
        key: "push-notifications",
        text: "Push Notifications",
        href: "/settings/notifications/push",
      },
    ],
  },
];

export default function Settings() {
  const router = useRouter();

  return (
    <div className="space-y-4 pt-30 px-6 bg-[#F7F7F7] h-screen">
      <Header title="Settings" />
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
                  onClick={() => router.push(button.href)}
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
        className="w-full flex items-center justify-center gap-2"
        type="button"
      >
        <Logout size={20} color="#FFFFFF" />
        <p className="text-white font-medium">Logout</p>
      </ActionButton>
    </div>
  );
}
