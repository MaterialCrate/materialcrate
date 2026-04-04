import type { Metadata } from "next";
import Header from "../components/Header";
import PlanActionButton from "../components/billing/PlanActionButton";

export const metadata: Metadata = {
  title: "Plans | Material Crate",
  description:
    "Choose the Material Crate plan that fits how you share, personalize, and study.",
};

type Plan = {
  planId: "free" | "pro" | "premium";
  name: string;
  subtitle: string;
  priceLabel: string;
  cadence: string;
  badge?: string;
  highlight?: boolean;
  buttonLabel: string;
  features: string[];
};

const plans: Plan[] = [
  {
    planId: "free",
    name: "Free",
    subtitle: "Continue with the essentials",
    priceLabel: "$0",
    cadence: "forever",
    buttonLabel: "Continue with free",
    features: [
      "Create your account",
      "Set up your profile",
      "Publish posts",
      "Interact with other users",
      "Access core platform features",
    ],
  },
  {
    planId: "pro",
    name: "Pro",
    subtitle: "Unlock full customization",
    priceLabel: "$3.99",
    cadence: "/month",
    badge: "Most popular",
    highlight: true,
    buttonLabel: "Go Pro",
    features: [
      "Everything in Free",
      "Maximum profile customization",
      "Maximum post customization",
      "Pro badge",
      "Enhanced personalization options",
      "Early access to selected customization features",
    ],
  },
  {
    planId: "premium",
    name: "Premium",
    subtitle: "Study smarter with AI",
    priceLabel: "$9.99",
    cadence: "/month",
    badge: "AI powered",
    buttonLabel: "Unlock Premium",
    features: [
      "Everything in Pro",
      "AI study tools",
      "Get help from posts that include PDFs",
      "Ask questions about PDF-based study content",
      "AI-assisted understanding of shared study material",
      "Faster revision and learning support",
      "Priority access to future study AI features",
    ],
  },
];

const planUseCases = [
  {
    title: "Free",
    description:
      "Perfect for getting your profile live, sharing study material, and joining the community.",
  },
  {
    title: "Pro",
    description:
      "Best for users who want their profile, posts, and presence on Material Crate to feel uniquely theirs.",
  },
  {
    title: "Premium",
    description:
      "Ideal if you want help understanding PDF-based resources faster with AI built around studying.",
  },
];

export default function PlansPage() {
  return (
    <main className="min-h-dvh bg-[#F8F4EE] text-[#171717]">
      <Header title="Plans" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-18 h-56 w-56 rounded-full bg-[#E1761F]/12 blur-3xl" />
        <div className="absolute -right-20 top-28 h-72 w-72 rounded-full bg-[#FFD9B8]/60 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#F4C58E]/25 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-20 sm:px-6 lg:px-8">
        <section id="compare" className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative overflow-hidden rounded-4xl border p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition-transform duration-200 hover:-translate-y-1 sm:p-6 ${
                plan.highlight
                  ? "border-[#E1761F]/35 bg-linear-to-br from-[#FFF7EF] via-white to-[#FFF2E5]"
                  : "border-black/6 bg-white"
              }`}
            >
              {plan.badge && (
                <div className="mb-4 inline-flex rounded-full bg-[#FFF1E2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B86420]">
                  {plan.badge}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1E1E1E]">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#6A6A6A]">{plan.subtitle}</p>
                </div>
                <div className="rounded-2xl bg-[#FBF7F2] px-3 py-2 text-right">
                  <div className="text-xl font-semibold text-[#111111]">
                    {plan.priceLabel}
                  </div>
                  <div className="text-xs text-[#727272]">{plan.cadence}</div>
                </div>
              </div>

              <PlanActionButton
                plan={plan.planId}
                defaultLabel={plan.buttonLabel}
                className={`inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-[#E1761F] text-white hover:bg-[#C96619]"
                    : "border border-black/10 bg-white text-[#1E1E1E] hover:bg-[#FBF7F2]"
                }`}
              />

              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm leading-6 text-[#3E3E3E]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF1E2] text-[12px] font-bold text-[#E1761F]">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-4xl border border-black/6 bg-white p-5 shadow-[0_14px_36px_rgba(0,0,0,0.04)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E1761F]">
              Which plan is for you?
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {planUseCases.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl bg-[#FBF7F2] px-4 py-4"
                >
                  <h3 className="text-base font-semibold text-[#1F1F1F]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#666666]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-4xl border border-[#E1761F]/15 bg-[#1A1A1A] p-5 text-white shadow-[0_18px_44px_rgba(0,0,0,0.14)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FFB27A]">
              Why upgrade?
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-balance">
              More personalization now, more study intelligence next.
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Pro gives you more room to shape your identity on the platform,
              while Premium is built for learners who want AI support around
              shared PDF study material.
            </p>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/80 backdrop-blur-sm">
              Start on <span className="font-semibold text-white">Free</span>,
              move to <span className="font-semibold text-white">Pro </span>
              for customization, or go{" "}
              <span className="font-semibold text-white">Premium</span> for the
              smartest study workflow.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
