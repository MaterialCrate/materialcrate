import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../config/prisma.js";

type PaidPlan = "pro" | "premium";
type SubscriptionPlan = "free" | PaidPlan;

type PaddleWebhookPayload = {
  event_type?: string;
  eventType?: string;
  data?: any;
};

const FREE_PLAN: SubscriptionPlan = "free";
const PAID_PLANS = new Set<PaidPlan>(["pro", "premium"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "paused",
]);
const COMPLETED_TRANSACTION_STATUSES = new Set(["completed", "paid", "billed"]);
const getPaddleApiBase = () => {
  const environment = getOptionalEnv("PADDLE_ENVIRONMENT").toLowerCase();
  if (environment === "sandbox") {
    return "https://sandbox-api.paddle.com";
  }

  const apiKey = getOptionalEnv("PADDLE_API_KEY");
  return apiKey.startsWith("pdl_sdbx_")
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
};

const PADDLE_API_BASE = getPaddleApiBase();
const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

function getOptionalEnv(key: string) {
  return process.env[key]?.trim() || "";
}

function getRequiredEnv(key: string) {
  const value = getOptionalEnv(key);
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

const normalizePaidPlan = (value: unknown): PaidPlan | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return PAID_PLANS.has(normalized as PaidPlan)
    ? (normalized as PaidPlan)
    : null;
};

const normalizeSubscriptionPlan = (value: unknown): SubscriptionPlan =>
  normalizePaidPlan(value) || FREE_PLAN;

const getAppUrl = () => {
  const rawUrl =
    getOptionalEnv("APP_URL") ||
    getOptionalEnv("PUBLIC_APP_URL") ||
    getOptionalEnv("NEXT_PUBLIC_APP_BASE_URL");

  if (!rawUrl) {
    throw new Error("APP_URL is not configured");
  }

  try {
    return new URL(rawUrl).toString().replace(/\/$/, "");
  } catch {
    throw new Error("APP_URL must be a valid absolute URL");
  }
};

const toDateOrNull = (value: unknown) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPlanPriceMap = (): Record<PaidPlan, string> => ({
  pro: getOptionalEnv("PADDLE_PRO_PRICE_ID"),
  premium: getOptionalEnv("PADDLE_PREMIUM_PRICE_ID"),
});

const resolvePlanFromPriceId = (value: unknown): PaidPlan | null => {
  const priceId = String(value || "").trim();
  if (!priceId) return null;

  const planPriceMap = getPlanPriceMap();
  for (const [plan, configuredPriceId] of Object.entries(planPriceMap)) {
    if (configuredPriceId && configuredPriceId === priceId) {
      return plan as PaidPlan;
    }
  }

  return null;
};

const resolvePlanFromEntity = (entity: any): SubscriptionPlan => {
  const planFromCustomData =
    normalizePaidPlan(entity?.custom_data?.plan) ||
    normalizePaidPlan(entity?.customData?.plan);

  if (planFromCustomData) {
    return planFromCustomData;
  }

  const items = Array.isArray(entity?.items) ? entity.items : [];
  for (const item of items) {
    const planFromPrice =
      resolvePlanFromPriceId(item?.price?.id) ||
      resolvePlanFromPriceId(item?.price_id) ||
      resolvePlanFromPriceId(item?.priceId);

    if (planFromPrice) {
      return planFromPrice;
    }
  }

  return FREE_PLAN;
};

const findFirstUrl = (value: unknown): string | null => {
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedUrl = findFirstUrl(item);
      if (nestedUrl) return nestedUrl;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nestedUrl = findFirstUrl(nestedValue);
      if (nestedUrl) return nestedUrl;
    }
  }

  return null;
};

const shouldGrantPaidAccess = ({
  eventType,
  status,
  plan,
}: {
  eventType: string;
  status: string;
  plan: SubscriptionPlan;
}) => {
  if (plan === FREE_PLAN) {
    return false;
  }

  if (eventType.startsWith("transaction.")) {
    return !status || COMPLETED_TRANSACTION_STATUSES.has(status);
  }

  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
};

const getScheduledChangeDetails = (
  entity: any,
  currentPlan: SubscriptionPlan,
) => {
  const scheduledChange = entity?.scheduled_change || entity?.scheduledChange;
  const action = String(scheduledChange?.action || "")
    .trim()
    .toLowerCase();
  const effectiveAt = toDateOrNull(
    scheduledChange?.effective_at ||
      scheduledChange?.effectiveAt ||
      scheduledChange?.resume_at ||
      scheduledChange?.resumeAt,
  );

  let pendingPlan: SubscriptionPlan | null = null;

  if (action === "cancel") {
    pendingPlan = FREE_PLAN;
  } else {
    const scheduledItems = Array.isArray(scheduledChange?.items)
      ? scheduledChange.items
      : [];

    for (const item of scheduledItems) {
      const planFromPrice =
        resolvePlanFromPriceId(item?.price?.id) ||
        resolvePlanFromPriceId(item?.price_id) ||
        resolvePlanFromPriceId(item?.priceId);

      if (planFromPrice) {
        pendingPlan = planFromPrice;
        break;
      }
    }

    if (!pendingPlan) {
      pendingPlan =
        normalizePaidPlan(scheduledChange?.plan) ||
        normalizePaidPlan(scheduledChange?.subscription_plan) ||
        null;
    }
  }

  if (!pendingPlan || pendingPlan === currentPlan) {
    pendingPlan = null;
  }

  return {
    action: action || null,
    effectiveAt,
    pendingPlan,
  };
};

const paddleFetch = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(`${PADDLE_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getRequiredEnv("PADDLE_API_KEY")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      body?.error?.detail ||
      body?.error?.message ||
      body?.error?.code ||
      "Paddle request failed";
    throw new Error(message);
  }

  return (body?.data ?? null) as T;
};

export const createCustomerPortalUrlForUser = async (userId: string) => {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      subscriptionPlan: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.paddleSubscriptionId) {
    throw new Error("No Paddle subscription is linked to this account yet");
  }

  const subscription = await paddleFetch<{
    management_urls?: Record<string, unknown>;
    managementUrls?: Record<string, unknown>;
  }>(`/subscriptions/${encodeURIComponent(user.paddleSubscriptionId)}`);

  const portalUrl = findFirstUrl(
    subscription?.management_urls ||
      subscription?.managementUrls ||
      subscription,
  );

  if (!portalUrl) {
    throw new Error(
      "Paddle did not return a customer portal URL. Ensure your API key has Customer portal session write access.",
    );
  }

  return portalUrl;
};

export const verifyPaddleWebhookSignature = (
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
) => {
  const secret = getRequiredEnv("PADDLE_WEBHOOK_SECRET");
  const headerValue = Array.isArray(signatureHeader)
    ? signatureHeader[0]
    : signatureHeader;

  if (!headerValue) {
    throw new Error("Missing Paddle-Signature header");
  }

  const parts = Object.fromEntries(
    headerValue
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split("=");
        return [key, rest.join("=")];
      }),
  );

  const timestamp = Number(parts.ts || 0);
  const signature = String(parts.h1 || "").trim();

  if (!timestamp || !signature) {
    throw new Error("Invalid Paddle-Signature header");
  }

  const ageMs = Math.abs(Date.now() - timestamp * 1000);
  if (ageMs > WEBHOOK_TOLERANCE_MS) {
    throw new Error("Webhook signature is too old");
  }

  const signedPayload = `${timestamp}:${rawBody.toString("utf8")}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new Error("Webhook signature does not match");
  }
};

const syncSubscriptionForUser = async (entity: any, eventType: string) => {
  const customData = entity?.custom_data || entity?.customData || {};
  const customUserId = String(
    customData?.userId || customData?.user_id || "",
  ).trim();
  const customerId = String(
    entity?.customer_id || entity?.customerId || "",
  ).trim();
  const subscriptionId = String(
    entity?.id?.startsWith?.("sub_")
      ? entity.id
      : entity?.subscription_id || entity?.subscriptionId || "",
  ).trim();
  const status = String(entity?.status || "")
    .trim()
    .toLowerCase();
  const plan = resolvePlanFromEntity(entity);
  const priceId =
    String(
      entity?.items?.[0]?.price?.id || entity?.items?.[0]?.price_id || "",
    ).trim() ||
    getPlanPriceMap()[plan as PaidPlan] ||
    null;
  const nextBilledAt =
    entity?.next_billed_at ||
    entity?.current_billing_period?.ends_at ||
    entity?.billing_period?.ends_at ||
    entity?.scheduled_change?.effective_at ||
    entity?.canceled_at ||
    null;
  const startedAt =
    entity?.started_at ||
    entity?.first_billed_at ||
    entity?.current_billing_period?.starts_at ||
    entity?.billing_period?.starts_at ||
    null;
  const customerEmail = String(
    entity?.customer?.email || customData?.email || "",
  ).trim();

  let user: any = null;

  if (customUserId) {
    user = await (prisma as any).user.findUnique({
      where: { id: customUserId },
    });
  }

  if (!user && customerId) {
    user = await (prisma as any).user.findFirst({
      where: { paddleCustomerId: customerId },
    });
  }

  if (!user && customerEmail) {
    user = await (prisma as any).user.findFirst({
      where: {
        email: {
          equals: customerEmail,
          mode: "insensitive",
        },
      },
    });
  }

  if (!user) {
    return {
      ok: true,
      ignored: true,
      reason: "No matching user found for Paddle event",
      eventType,
    };
  }

  const currentPlan = normalizeSubscriptionPlan(user.subscriptionPlan);
  const scheduledChange = getScheduledChangeDetails(entity, currentPlan);
  const shouldKeepPaidAccess = shouldGrantPaidAccess({
    eventType,
    status,
    plan,
  });
  const hasFutureScheduledChange = Boolean(
    scheduledChange.effectiveAt &&
    scheduledChange.effectiveAt.getTime() > Date.now() &&
    (scheduledChange.action || scheduledChange.pendingPlan),
  );
  const nextPlan =
    hasFutureScheduledChange && shouldKeepPaidAccess
      ? currentPlan
      : shouldKeepPaidAccess
        ? plan
        : FREE_PLAN;
  const nextEndsAt = toDateOrNull(nextBilledAt);
  const nextStartedAt =
    toDateOrNull(startedAt) ||
    (nextPlan !== FREE_PLAN
      ? toDateOrNull(user.subscriptionStartedAt) || new Date()
      : toDateOrNull(user.subscriptionStartedAt));

  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      subscriptionPlan: nextPlan,
      subscriptionStartedAt: nextStartedAt,
      subscriptionEndsAt: nextEndsAt,
      pendingSubscriptionPlan: hasFutureScheduledChange
        ? scheduledChange.pendingPlan
        : null,
      pendingSubscriptionAction: hasFutureScheduledChange
        ? scheduledChange.action
        : null,
      pendingSubscriptionEffectiveAt: hasFutureScheduledChange
        ? scheduledChange.effectiveAt
        : null,
      paddleCustomerId: customerId || user.paddleCustomerId || null,
      paddleSubscriptionId: subscriptionId || user.paddleSubscriptionId || null,
      paddleSubscriptionStatus: status || user.paddleSubscriptionStatus || null,
      paddlePriceId: priceId || user.paddlePriceId || null,
    },
  });

  return {
    ok: true,
    ignored: false,
    eventType,
    userId: user.id,
    plan: nextPlan,
  };
};

export const handlePaddleWebhook = async (rawBody: Buffer) => {
  const payload = JSON.parse(rawBody.toString("utf8")) as PaddleWebhookPayload;
  const eventType = String(
    payload?.event_type || payload?.eventType || "",
  ).trim();
  const data = payload?.data;

  if (!eventType || !data || typeof data !== "object") {
    return {
      ok: true,
      ignored: true,
      reason: "Missing event data",
    };
  }

  switch (eventType) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.activated":
    case "subscription.trialing":
    case "subscription.resumed":
    case "subscription.paused":
    case "subscription.past_due":
    case "subscription.canceled":
    case "transaction.paid":
    case "transaction.completed":
      return syncSubscriptionForUser(data, eventType);
    default:
      return {
        ok: true,
        ignored: true,
        reason: `Unhandled event type: ${eventType}`,
      };
  }
};
