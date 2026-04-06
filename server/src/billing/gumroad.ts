import { prisma } from "../config/prisma.js";

type PaidPlan = "pro" | "premium";
type SubscriptionPlan = "free" | PaidPlan;

const FREE_PLAN: SubscriptionPlan = "free";
const PAID_PLANS = new Set<PaidPlan>(["pro", "premium"]);

function getOptionalEnv(key: string) {
  return process.env[key]?.trim() || "";
}

const normalizePaidPlan = (value: unknown): PaidPlan | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return PAID_PLANS.has(normalized as PaidPlan) ? (normalized as PaidPlan) : null;
};

const normalizeSubscriptionPlan = (value: unknown): SubscriptionPlan =>
  normalizePaidPlan(value) || FREE_PLAN;

const getPermalinkPlanMap = (): Record<string, PaidPlan> => {
  const map: Record<string, PaidPlan> = {};
  const proPermalink = getOptionalEnv("GUMROAD_PRO_PERMALINK");
  const premiumPermalink = getOptionalEnv("GUMROAD_PREMIUM_PERMALINK");
  if (proPermalink) map[proPermalink.toLowerCase()] = "pro";
  if (premiumPermalink) map[premiumPermalink.toLowerCase()] = "premium";
  return map;
};

const resolvePlanFromPermalink = (permalink: string): SubscriptionPlan => {
  const map = getPermalinkPlanMap();
  return map[permalink.toLowerCase()] || FREE_PLAN;
};

const toDateOrNull = (value: unknown) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const verifyGumroadSellerId = (sellerId: string | undefined) => {
  const expectedSellerId = getOptionalEnv("GUMROAD_SELLER_ID");
  if (!expectedSellerId) return;
  if (!sellerId || sellerId !== expectedSellerId) {
    throw new Error("Invalid Gumroad seller_id");
  }
};

const syncUserSubscription = async ({
  email,
  plan,
  subscriptionId,
  saleId,
  active,
  startedAt,
  endsAt,
}: {
  email: string;
  plan: SubscriptionPlan;
  subscriptionId?: string | null;
  saleId?: string | null;
  active: boolean;
  startedAt?: Date | null;
  endsAt?: Date | null;
}) => {
  const user = await (prisma as any).user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user) {
    return { ok: true, ignored: true, reason: "No matching user found for Gumroad event" };
  }

  const nextPlan = active ? plan : FREE_PLAN;
  const nextStartedAt =
    startedAt ||
    (nextPlan !== FREE_PLAN
      ? toDateOrNull(user.subscriptionStartedAt) || new Date()
      : toDateOrNull(user.subscriptionStartedAt));

  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      subscriptionPlan: nextPlan,
      subscriptionStartedAt: nextStartedAt,
      subscriptionEndsAt: endsAt ?? null,
      pendingSubscriptionPlan: null,
      pendingSubscriptionAction: null,
      pendingSubscriptionEffectiveAt: null,
      gumroadSubscriptionId: subscriptionId || user.gumroadSubscriptionId || null,
      gumroadSaleId: saleId || user.gumroadSaleId || null,
    },
  });

  return { ok: true, ignored: false, userId: user.id, plan: nextPlan };
};

export const handleGumroadWebhook = async (body: URLSearchParams) => {
  const sellerId = body.get("seller_id") ?? undefined;
  verifyGumroadSellerId(sellerId);

  const permalink = (body.get("product_permalink") || "").toLowerCase();
  const email = body.get("email") || body.get("user_email") || "";
  const subscriptionId = body.get("subscription_id") || null;
  const saleId = body.get("sale_id") || null;

  if (!email) {
    return { ok: true, ignored: true, reason: "No email in Gumroad webhook" };
  }

  // Subscription ended / cancelled
  if (body.has("ended_at")) {
    return syncUserSubscription({
      email,
      plan: FREE_PLAN,
      subscriptionId,
      active: false,
      endsAt: toDateOrNull(body.get("ended_at")),
    });
  }

  // Subscription restarted
  if (body.has("restarted_at")) {
    const plan = resolvePlanFromPermalink(permalink);
    return syncUserSubscription({
      email,
      plan,
      subscriptionId,
      active: true,
      startedAt: toDateOrNull(body.get("restarted_at")),
    });
  }

  // Refund — revoke access
  if (body.has("refunded_at")) {
    return syncUserSubscription({
      email,
      plan: FREE_PLAN,
      subscriptionId,
      saleId,
      active: false,
    });
  }

  // New sale or recurring charge
  const plan = resolvePlanFromPermalink(permalink);
  if (plan === FREE_PLAN) {
    return { ok: true, ignored: true, reason: `Unknown permalink: ${permalink}` };
  }

  return syncUserSubscription({
    email,
    plan,
    subscriptionId,
    saleId,
    active: true,
    startedAt: toDateOrNull(body.get("sale_timestamp")),
  });
};
