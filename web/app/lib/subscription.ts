export const FREE_SUBSCRIPTION_PLAN = "free";
export const PRO_SUBSCRIPTION_PLAN = "pro";
export const PREMIUM_SUBSCRIPTION_PLAN = "premium";

const PAID_SUBSCRIPTION_PLANS = new Set([
  PRO_SUBSCRIPTION_PLAN,
  PREMIUM_SUBSCRIPTION_PLAN,
]);

export function normalizeSubscriptionPlan(plan?: string | null) {
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

export function hasPaidSubscription(plan?: string | null) {
  return PAID_SUBSCRIPTION_PLANS.has(normalizeSubscriptionPlan(plan));
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
