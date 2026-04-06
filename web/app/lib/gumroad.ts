import {
  PREMIUM_SUBSCRIPTION_PLAN,
  PRO_SUBSCRIPTION_PLAN,
} from "./subscription";

type PaidPlan = typeof PRO_SUBSCRIPTION_PLAN | typeof PREMIUM_SUBSCRIPTION_PLAN;

const GUMROAD_PRO_PERMALINK =
  process.env.NEXT_PUBLIC_GUMROAD_PRO_PERMALINK?.trim() || "";
const GUMROAD_PREMIUM_PERMALINK =
  process.env.NEXT_PUBLIC_GUMROAD_PREMIUM_PERMALINK?.trim() || "";

const getRequiredPublicValue = (value: string, label: string) => {
  if (!value) {
    throw new Error(`${label} is missing. Add it to web/.env.local or Render.`);
  }
  return value;
};

const getPermalinkForPlan = (plan: PaidPlan) => {
  if (plan === PRO_SUBSCRIPTION_PLAN) {
    return getRequiredPublicValue(
      GUMROAD_PRO_PERMALINK,
      "NEXT_PUBLIC_GUMROAD_PRO_PERMALINK",
    );
  }
  return getRequiredPublicValue(
    GUMROAD_PREMIUM_PERMALINK,
    "NEXT_PUBLIC_GUMROAD_PREMIUM_PERMALINK",
  );
};

export const GUMROAD_SUBSCRIPTIONS_URL = "https://app.gumroad.com/subscriptions";

export const openGumroadCheckout = ({
  plan,
  email,
}: {
  plan: PaidPlan;
  email?: string | null;
}) => {
  const permalink = getPermalinkForPlan(plan);
  const url = new URL(`https://gumroad.com/l/${encodeURIComponent(permalink)}`);
  url.searchParams.set("wanted", "true");
  if (email) {
    url.searchParams.set("email", email);
  }
  window.open(url.toString(), "_blank", "noopener,noreferrer");
};
