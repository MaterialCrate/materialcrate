"use client";

import { Fragment } from "react";
import { ShieldSecurity, Trash } from "iconsax-reactjs";
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
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
      <Header title="Account Information" />
      <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Account
        </p>
        <h2 className="mt-1 text-lg font-semibold">Your account at a glance.</h2>
        <p className="mt-1 text-xs text-white/72">
          Review sign-in details, plan status, and connected services.
        </p>
      </div>
      {isLoading ? (
        <div className="mb-4 w-full rounded-[18px] bg-white px-4 py-3 text-sm text-[#3D3D3D]">
          Loading account information...
        </div>
      ) : null}
      {accountSections.map((section) => (
        <Fragment key={section.key}>
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8A8A]">
            {section.title}
          </h2>
          <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-black/6 bg-white">
            {section.items.map((item, index) => (
              <div
                key={item.key}
                className={`flex items-center justify-between gap-3 px-4 py-3 text-[#3D3D3D] ${
                  index < section.items.length - 1
                    && "border-b border-black/6"
                }`}
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-right text-sm text-[#666666]">
                  {item.value || "-"}
                </div>
              </div>
            ))}
          </div>
        </Fragment>
      ))}
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#B45C5C]">
        Danger Zone
      </h2>
      <div className="mb-4 w-full rounded-[20px] border border-[#F3D2D2] bg-[#FFF5F5] px-4 py-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-[14px] bg-[#FDE4E4] p-2.5">
            <ShieldSecurity size={18} color="#C04A4A" variant="Bulk" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#2D2D2D]">Delete Account</p>
            <p className="mt-1 text-xs text-[#7A6A6A]">
              Permanently remove your account and associated data.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-red-600"
          aria-label="Delete Account"
        >
          <Trash size={16} color="#DC2626" />
          Delete Account
        </button>
      </div>
    </div>
  );
}
