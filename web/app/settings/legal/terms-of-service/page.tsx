import { DocumentText1 } from "iconsax-reactjs";
import Header from "@/app/components/Header";

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F4F0EA_100%)] px-6 pt-30">
      <Header title="Terms of Service" isLoading={false} />
      <div className="mb-5 rounded-[28px] bg-[#1F1F1F] px-5 py-5 text-white">
        <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3">
          <DocumentText1 size={22} color="#FFFFFF" variant="Bulk" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Legal
        </p>
        <h2 className="mt-2 text-xl font-semibold">How people use the app.</h2>
        <p className="mt-2 text-sm text-white/72">
          Terms of Service should define account responsibilities, acceptable
          behavior, subscriptions, and what happens when rules are broken.
        </p>
      </div>
      <div className="space-y-3">
        {[
          {
            heading: "Acceptable Use",
            body: "Set boundaries around spam, impersonation, abuse, piracy, and harmful conduct.",
          },
          {
            heading: "Subscriptions & Payments",
            body: "Document billing cycles, renewals, refunds, and what paid features unlock.",
          },
          {
            heading: "Moderation & Enforcement",
            body: "Explain suspensions, removals, appeals, and what may trigger account restrictions.",
          },
        ].map((section) => (
          <div
            key={section.heading}
            className="rounded-[24px] border border-black/6 bg-white p-4"
          >
            <p className="text-sm font-medium text-[#2E2E2E]">
              {section.heading}
            </p>
            <p className="mt-1 text-sm text-[#666666]">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
