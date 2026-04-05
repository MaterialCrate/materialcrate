export const FREE_SUBSCRIPTION_PLAN = "free";
export const PRO_SUBSCRIPTION_PLAN = "pro";
export const PREMIUM_SUBSCRIPTION_PLAN = "premium";

export type SubscriptionPlan =
  | typeof FREE_SUBSCRIPTION_PLAN
  | typeof PRO_SUBSCRIPTION_PLAN
  | typeof PREMIUM_SUBSCRIPTION_PLAN;

const PAID_SUBSCRIPTION_PLANS = new Set([
  PRO_SUBSCRIPTION_PLAN,
  PREMIUM_SUBSCRIPTION_PLAN,
]);

const SUBSCRIPTION_PLAN_TIERS: Record<SubscriptionPlan, number> = {
  [FREE_SUBSCRIPTION_PLAN]: 0,
  [PRO_SUBSCRIPTION_PLAN]: 1,
  [PREMIUM_SUBSCRIPTION_PLAN]: 2,
};

export function normalizeSubscriptionPlan(
  plan?: string | null,
): SubscriptionPlan {
  const normalized = String(plan || "")
    .trim()
    .toLowerCase();

  if (normalized === PRO_SUBSCRIPTION_PLAN) {
    return PRO_SUBSCRIPTION_PLAN;
  }

  if (normalized === PREMIUM_SUBSCRIPTION_PLAN) {
    return PREMIUM_SUBSCRIPTION_PLAN;
  }

  return FREE_SUBSCRIPTION_PLAN;
}

export function hasSubscriptionAccess(
  currentPlan?: string | null,
  requiredPlan: SubscriptionPlan = FREE_SUBSCRIPTION_PLAN,
) {
  return (
    SUBSCRIPTION_PLAN_TIERS[normalizeSubscriptionPlan(currentPlan)] >=
    SUBSCRIPTION_PLAN_TIERS[requiredPlan]
  );
}

export function hasPaidSubscription(plan?: string | null) {
  return hasSubscriptionAccess(plan, PRO_SUBSCRIPTION_PLAN);
}

export function hasProAccess(plan?: string | null) {
  return hasSubscriptionAccess(plan, PRO_SUBSCRIPTION_PLAN);
}

export function hasPremiumAccess(plan?: string | null) {
  return hasSubscriptionAccess(plan, PREMIUM_SUBSCRIPTION_PLAN);
}

export function getSubscriptionBadgeLabel(plan?: string | null) {
  const normalized = normalizeSubscriptionPlan(plan);

  if (normalized === PREMIUM_SUBSCRIPTION_PLAN) {
    return "Premium";
  }

  if (normalized === PRO_SUBSCRIPTION_PLAN) {
    return "Pro";
  }

  return "Free";
}

export function formatSubscriptionPlan(plan?: string | null) {
  return getSubscriptionBadgeLabel(plan);
}
