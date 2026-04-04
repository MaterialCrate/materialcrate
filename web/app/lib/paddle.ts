import {
  PREMIUM_SUBSCRIPTION_PLAN,
  PRO_SUBSCRIPTION_PLAN,
} from "./subscription";

type PaidPlan = typeof PRO_SUBSCRIPTION_PLAN | typeof PREMIUM_SUBSCRIPTION_PLAN;

declare global {
  interface Window {
    Paddle?: {
      Environment?: { set: (value: "sandbox") => void };
      Initialize: (options: Record<string, unknown>) => void;
      Checkout: {
        open: (options: Record<string, unknown>) => void;
      };
    };
    __materialCratePaddleInitialized?: boolean;
  }
}

const PADDLE_SCRIPT_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";
const PADDLE_CLIENT_TOKEN =
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() || "";
const PADDLE_ENVIRONMENT =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase() || "";
const PADDLE_PRO_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID?.trim() || "";
const PADDLE_PREMIUM_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID?.trim() || "";

let paddlePromise: Promise<NonNullable<Window["Paddle"]>> | null = null;

const getRequiredPublicValue = (value: string, label: string) => {
  if (!value) {
    throw new Error(`${label} is missing. Add it to web/.env.local or Render.`);
  }
  return value;
};

const getPriceIdForPlan = (plan: PaidPlan) => {
  if (plan === PRO_SUBSCRIPTION_PLAN) {
    return getRequiredPublicValue(
      PADDLE_PRO_PRICE_ID,
      "NEXT_PUBLIC_PADDLE_PRO_PRICE_ID",
    );
  }

  return getRequiredPublicValue(
    PADDLE_PREMIUM_PRICE_ID,
    "NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID",
  );
};

const loadPaddleScript = () => {
  if (typeof window === "undefined") {
    throw new Error("Paddle checkout can only run in the browser");
  }

  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }

  if (paddlePromise) {
    return paddlePromise;
  }

  paddlePromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_SRC}"]`,
    );

    if (existingScript && window.Paddle) {
      resolve(window.Paddle);
      return;
    }

    const script = existingScript || document.createElement("script");
    script.src = PADDLE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.Paddle) {
        reject(new Error("Paddle failed to load"));
        return;
      }
      resolve(window.Paddle);
    };
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));

    if (!existingScript) {
      document.head.appendChild(script);
    }
  });

  return paddlePromise;
};

export const openPaddleSubscriptionCheckout = async ({
  plan,
  email,
  userId,
  successUrl,
}: {
  plan: PaidPlan;
  email?: string | null;
  userId: string;
  successUrl: string;
}) => {
  const paddle = await loadPaddleScript();
  const token = getRequiredPublicValue(
    PADDLE_CLIENT_TOKEN,
    "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
  );

  if (!window.__materialCratePaddleInitialized) {
    if (PADDLE_ENVIRONMENT === "sandbox" && paddle.Environment?.set) {
      paddle.Environment.set("sandbox");
    }

    paddle.Initialize({ token });
    window.__materialCratePaddleInitialized = true;
  }

  paddle.Checkout.open({
    items: [{ priceId: getPriceIdForPlan(plan), quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: {
      userId,
      plan,
      source: "materialcrate",
      email: email || undefined,
    },
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: "en",
      successUrl,
      allowLogout: false,
    },
  });
};
