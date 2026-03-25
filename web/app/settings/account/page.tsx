"use client";

import { Fragment } from "react";
import { useAuth } from "@/app/lib/auth-client";
import Header from "@/app/components/Header";

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

  const accountSections = [
    {
      key: "account-details",
      title: "Account Details",
      items: [
        {
          label: "Email",
          value: user?.email ?? "-",
          key: "email",
        },
        {
          label: "Password",
          value: "********",
          key: "password",
        },
        {
          label: "Date Joined",
          value: formatDate(user?.createdAt),
          key: "dateJoined",
        },
      ],
    },
    {
      key: "plan",
      title: "Plan",
      items: [
        {
          label: "Subscription Plan",
          value: formatPlan(user?.subscriptionPlan),
          key: "accountPlan",
        },
        ...(user?.subscriptionPlan?.toLowerCase() === "pro"
          ? [
              {
                label: "Started",
                value: formatDate(user?.subscriptionStartedAt),
                key: "subscriptionStartedAt",
              },
              {
                label: "Renews",
                value: formatDate(user?.subscriptionEndsAt),
                key: "subscriptionEndsAt",
              },
            ]
          : []),
      ],
    },
    {
      key: "connected-accounts",
      title: "Connected Accounts",
      items: [
        {
          label: "Linked Accounts",
          value: Array.isArray(user?.linkedSEOs)
            ? user.linkedSEOs.map(formatSeoProvider).join(", ") || "None linked"
            : "None linked",
          key: "linkedAccounts",
        },
      ],
    },
  ] as const;

  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-30">
      <Header title="Account Information" />
      {isLoading ? (
        <div className="w-full bg-white rounded-lg py-3 px-3 text-sm text-[#3D3D3D]">
          Loading account information...
        </div>
      ) : null}
      {accountSections.map((section) => (
        <Fragment key={section.key}>
          <h2 className="mb-2 text-sm font-medium text-[#5B5B5B]">
            {section.title}
          </h2>
          <div className="mb-4 w-full overflow-hidden rounded-lg bg-white">
            {section.items.map((item, index) => (
              <div
                key={item.key}
                className={`flex items-center justify-between px-3 py-3 text-[#3D3D3D] ${
                  index < section.items.length - 1 ? "border-b border-black/6" : ""
                }`}
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-sm">{item.value || "-"}</div>
              </div>
            ))}
          </div>
        </Fragment>
      ))}
      <h2 className="mb-2 text-sm font-medium text-[#5B5B5B]">Danger Zone</h2>
      <div className="mb-4 w-full rounded-lg bg-white px-3 py-3">
        <button
          type="button"
          className="text-sm font-medium text-red-600"
          aria-label="Delete Account"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
