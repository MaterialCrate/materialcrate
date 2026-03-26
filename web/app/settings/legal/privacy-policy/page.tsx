import { ShieldSecurity } from "iconsax-reactjs";
import Header from "@/app/components/Header";

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F3EFE7_100%)] px-6 pt-30">
      <Header title="Privacy Policy" isLoading={false} />
      <div className="mb-5 rounded-[28px] bg-[#FFF7EE] px-5 py-5">
        <div className="mb-4 inline-flex rounded-2xl bg-[#F2E3CF] p-3">
          <ShieldSecurity size={22} color="#A95A13" variant="Bulk" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B46B28]">
          Privacy
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#1F1F1F]">
          Explain what data you collect and why.
        </h2>
        <p className="mt-2 text-sm text-[#6A625A]">
          Privacy policy content should be clear about collection, storage,
          sharing, retention, and the controls users have over their data.
        </p>
      </div>
      <div className="space-y-3">
        {[
          {
            heading: "What You Collect",
            body: "Profile details, uploaded content, analytics signals, subscription records, and support requests.",
          },
          {
            heading: "Why It Is Collected",
            body: "Explain what is necessary for authentication, personalization, moderation, billing, and product improvement.",
          },
          {
            heading: "User Controls",
            body: "Show how people can update profile data, manage visibility, and delete or export information if supported.",
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
