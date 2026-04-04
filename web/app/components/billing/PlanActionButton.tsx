"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshAuth, useAuth } from "@/app/lib/auth-client";
import { openPaddleSubscriptionCheckout } from "@/app/lib/paddle";
import {
  PREMIUM_SUBSCRIPTION_PLAN,
  PRO_SUBSCRIPTION_PLAN,
  formatSubscriptionPlan,
  normalizeSubscriptionPlan,
} from "@/app/lib/subscription";

type PlanActionButtonProps = {
  plan: "free" | typeof PRO_SUBSCRIPTION_PLAN | typeof PREMIUM_SUBSCRIPTION_PLAN;
  defaultLabel: string;
  className?: string;
};

export default function PlanActionButton({
  plan,
  defaultLabel,
  className = "",
}: PlanActionButtonProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = normalizeSubscriptionPlan(user?.subscriptionPlan);
  const isCurrentPlan = Boolean(user) && currentPlan === plan;

  const label = useMemo(() => {
    const formattedPlan = formatSubscriptionPlan(plan);

    if (isBusy) {
      return plan === "free" ? "Opening..." : "Opening checkout...";
    }

    if (isCurrentPlan) {
      return `Continue with ${formattedPlan}`;
    }

    if (!user) {
      return defaultLabel;
    }

    if (plan === "free") {
      return "Downgrade to Free";
    }

    if (
      currentPlan === PREMIUM_SUBSCRIPTION_PLAN &&
      plan === PRO_SUBSCRIPTION_PLAN
    ) {
      return "Downgrade to Pro";
    }

    if (plan === PRO_SUBSCRIPTION_PLAN) {
      return "Upgrade to Pro";
    }

    if (plan === PREMIUM_SUBSCRIPTION_PLAN) {
      return "Upgrade to Premium";
    }

    return defaultLabel;
  }, [currentPlan, defaultLabel, isBusy, isCurrentPlan, plan, user]);

  const handleOpenPortal = async () => {
    const response = await fetch("/api/billing/portal", {
      method: "POST",
    });
    const body = await response.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!response.ok || !/^https?:\/\//i.test(url)) {
      throw new Error(body?.error || "Unable to open billing portal");
    }

    window.location.assign(url);
  };

  const handleClick = async () => {
    if (isBusy || isLoading) {
      return;
    }

    setError(null);

    if (plan === "free") {
      router.push(user ? "/feed" : "/register");
      return;
    }

    if (!user) {
      router.push(`/register?plan=${plan}`);
      return;
    }

    setIsBusy(true);
    try {
      if (isCurrentPlan) {
        await handleOpenPortal();
        return;
      }

      await refreshAuth();
      await openPaddleSubscriptionCheckout({
        plan,
        email: user.email,
        userId: user.id,
        successUrl: `${window.location.origin}/settings/account?billing=success&plan=${plan}`,
      });
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open checkout",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isBusy || (isCurrentPlan && plan === "free")}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {label}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-[#B84E4E]">{error}</p>
      ) : null}
    </div>
  );
}
