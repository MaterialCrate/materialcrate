"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "iconsax-reactjs";

export default function Page() {
  const router = useRouter();
  const [accountInfo] = useState({
    email: "john.doe@example.com",
    password: "",
    accountPlan: "Pro",
    dateJoined: "January 1, 2023",
    linkedAccounts: ["Google", "Facebook"],
  });

  const accountInfoMap = [
    {
      container1: [
        {
          label: "Email",
          value: accountInfo.email,
          key: "email",
        },
        {
          label: "Password",
          value: accountInfo.password,
          key: "password",
        },
        {
          label: "Account Plan",
          value: accountInfo.accountPlan,
          key: "accountPlan",
        },
        {
          label: "Date Joined",
          value: accountInfo.dateJoined,
          key: "dateJoined",
        },
        {
          label: "Linked Accounts",
          value: accountInfo.linkedAccounts,
          key: "linkedAccounts",
        },
      ],
      container2: {
        label: "Language",
        value: "English",
        key: "language",
      },
      container3: {
        label: "Delete Account",
        value: "",
        key: "deleteAccount",
      },
    },
  ];

  return (
    <div className="pt-30 px-6 bg-[#F7F7F7] h-screen">
      <header className="fixed top-0 left-0 right-0 bg-white pb-4 pt-12 px-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] flex items-center">
        <button aria-label="Back" type="button" onClick={() => router.back()}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 text-xl font-medium">
          <h1>Account Information</h1>
        </div>
      </header>
      {accountInfoMap.map((container) => (
        <React.Fragment key={container.container2.key}>
          <div className="w-full bg-white rounded-lg py-3 flex flex-col gap-4 mb-4">
            {container.container1.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-3 text-[#3D3D3D]"
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-sm">
                  {Array.isArray(item.value)
                    ? item.value.join(", ")
                    : item.value ||
                      (item.key === "password" ? "********" : "-")}
                </div>
              </div>
            ))}
          </div>
          <div className="w-full bg-white rounded-lg py-3 mb-4">
            <div className="flex items-center justify-between px-3 text-[#3D3D3D]">
              <div className="text-sm font-medium">
                {container.container2.label}
              </div>
              <div className="text-sm">{container.container2.value}</div>
            </div>
          </div>
          <div className="w-full bg-white rounded-lg py-3 px-3 mb-4">
            <button
              type="button"
              className="text-sm font-medium text-red-600"
              aria-label={container.container3.label}
            >
              {container.container3.label}
            </button>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
