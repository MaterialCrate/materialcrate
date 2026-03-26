"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldSecurity, Trash } from "iconsax-reactjs";
import Alert from "@/app/components/Alert";
import Header from "@/app/components/Header";
import { useSystemPopup } from "@/app/components/SystemPopup";
import { refreshAuth, useAuth } from "@/app/lib/auth-client";
import LoadingBar from "@/app/components/LoadingBar";

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

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const popup = useSystemPopup();
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (searchParams.get("emailChanged") === "1") {
      setSuccess("Email updated successfully.");
    }
  }, [searchParams]);

  const accountSections = useMemo(
    () => [
      {
        key: "account-details",
        title: "Account Details",
        items: [
          {
            label: "Current Email",
            value: user?.email ?? "-",
            key: "email",
          },
          ...(user?.pendingEmail
            ? [
                {
                  label: "Pending Email",
                  value: user.pendingEmail,
                  key: "pendingEmail",
                },
              ]
            : []),
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
              ? user.linkedSEOs.map(formatSeoProvider).join(", ") ||
                "None linked"
              : "None linked",
            key: "linkedAccounts",
          },
        ],
      },
    ],
    [user],
  );

  const pendingEmailMatchesCurrent =
    normalizeEmail(user?.pendingEmail ?? "") ===
    normalizeEmail(user?.email ?? "");

  const handleEmailChangeRequest = async () => {
    const initialValue = user?.pendingEmail ?? user?.email ?? "";
    const promptedEmail = await popup.prompt({
      title: "Change Email",
      message: "Enter your new email address.",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
      placeholder: "name@example.com",
      defaultValue: initialValue,
      inputType: "email",
    });
    if (promptedEmail === null) {
      return;
    }

    const nextEmail = normalizeEmail(promptedEmail);
    if (!nextEmail) {
      setError("Email is required.");
      return;
    }

    if (nextEmail === normalizeEmail(user?.email ?? "")) {
      setError("Enter a different email address.");
      return;
    }

    setIsSubmittingEmail(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/email-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to start email change");
      }

      await refreshAuth();
      router.push("/settings/account/verify");
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to start email change",
      );
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <>
      <Alert type="success" message={success} />
      <Alert type="error" message={error} />
      <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
        <Header title="Account Information" isLoading={isSubmittingEmail} />
        <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
            Account
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            Your account at a glance.
          </h2>
          <p className="mt-1 text-xs text-white/72">
            Review sign-in details, plan status, and connected services.
          </p>
        </div>
        {isLoading ? (
          <div className="mb-4 w-full rounded-[18px] bg-white px-4 py-3 text-sm text-[#3D3D3D]">
            Loading account information...
          </div>
        ) : null}
        {!isLoading && user ? (
          <div className="mb-4">
            {user.pendingEmail && !pendingEmailMatchesCurrent ? (
              <div className="rounded-2xl bg-[#FFF7ED] px-4 py-3">
                <p className="text-sm font-medium text-[#A15D16]">
                  Verification pending for {user.pendingEmail}
                </p>
                <p className="mt-1 text-xs text-[#8A6A44]">
                  Your sign-in email will not change until the code is
                  confirmed.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/settings/account/verify")}
                  className="mt-3 text-sm font-medium text-[#A15D16]"
                >
                  Continue verification
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {accountSections.map((section) => (
          <Fragment key={section.key}>
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8A8A]">
              {section.title}
            </h2>
            <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-black/6 bg-white">
              {section.items.map((item, index) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={
                    item.key === "email" && !isSubmittingEmail
                      ? handleEmailChangeRequest
                      : undefined
                  }
                  disabled={item.key === "email" ? isSubmittingEmail : false}
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-[#3D3D3D] ${
                    index < section.items.length - 1 &&
                    "border-b border-black/6"
                  } ${item.key === "email" || "pendingEmail" ? "w-full text-left" : "w-full"}`}
                >
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-right text-xs text-[#666666] truncate">
                    {item.value || "-"}
                  </div>
                </button>
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
              <p className="text-sm font-medium text-[#2D2D2D]">
                Delete Account
              </p>
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
    </>
  );
}
