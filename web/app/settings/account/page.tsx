"use client";

import { Fragment } from "react";
import { useAuth } from "@/app/lib/auth-client";
import Header from "@/app/components/settings/Header";

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatSeoProvider = (provider: string) =>
  provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();

const formatPlan = (plan?: string | null) => {
  if (!plan) return "free";
  return plan.toLowerCase();
};

export default function Page() {
  const { user, isLoading } = useAuth();

  const accountInfo = {
    email: user?.email ?? "-",
    password: "********",
    accountPlan: formatPlan(user?.subscriptionPlan),
    subscriptionStartedAt: formatDate(user?.subscriptionStartedAt),
    subscriptionEndsAt: formatDate(user?.subscriptionEndsAt),
    dateJoined: formatDate(user?.createdAt),
    linkedAccounts: Array.isArray(user?.linkedSEOs)
      ? user.linkedSEOs.map(formatSeoProvider)
      : [],
  };

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
          label: "Subscription Plan",
          value: accountInfo.accountPlan,
          key: "accountPlan",
        },
        ...(accountInfo.accountPlan === "pro"
          ? [
              {
                label: "Subscription Due",
                value: accountInfo.subscriptionEndsAt,
                key: "subscriptionEndsAt",
              },
            ]
          : []),
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
      <Header title="Account Information" />
      {isLoading ? (
        <div className="w-full bg-white rounded-lg py-3 px-3 text-sm text-[#3D3D3D]">
          Loading account information...
        </div>
      ) : null}
      {accountInfoMap.map((container) => (
        <Fragment key={container.container2.key}>
          <div className="w-full bg-white rounded-lg py-3 flex flex-col gap-4 mb-4">
            {container.container1.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-3 text-[#3D3D3D]"
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-sm">
                  {Array.isArray(item.value)
                    ? item.value.length
                      ? item.value.join(", ")
                      : "-"
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
        </Fragment>
      ))}
    </div>
  );
}
