import Header from "@/app/components/Header";

const sections = [
  {
    heading: "Acceptable Use",
    body: "You may use MaterialCrate only for lawful, legitimate, and respectful purposes. Spam, impersonation, harassment, malware, abusive behavior, attempts to bypass platform controls, and any activity that harms other users or the service are prohibited.",
  },
  {
    heading: "Your Content And Rights",
    body: "You are solely responsible for the files, text, comments, images, and other material you upload or share. Anything you post must either be strictly yours, properly licensed to you, or shared with clear permission from the rights holder. Do not upload copyrighted, confidential, stolen, or unauthorized material.",
  },
  {
    heading: "Copyright And Platform Liability",
    body: "MaterialCrate is a hosting platform and does not pre-approve every user submission. We may remove or restrict content that appears to infringe intellectual property rights or violate policy, but responsibility for uploaded content remains with the user who posted it. To the extent permitted by law, MaterialCrate is not liable for user-submitted materials, ownership disputes, or losses caused by unauthorized uploads made by users.",
  },
  {
    heading: "Subscriptions And Paid Features",
    body: "If paid features are offered, subscription access, renewal timing, billing status, and included benefits are governed by the plan attached to your account. Access to premium features may be limited, changed, or suspended if payment fails, a charge is reversed, or the account is used in violation of these terms.",
  },
  {
    heading: "Moderation And Enforcement",
    body: "We may investigate reports, remove content, limit visibility, disable interactions, suspend accounts, or permanently restrict access when we believe it is necessary to protect the platform, respond to legal complaints, or enforce these terms. Serious or repeated violations may lead to immediate action without prior notice.",
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F4F0EA_100%)] px-6 pt-30">
      <Header title="Terms of Service" isLoading={false} />
      <div className="mb-5 rounded-[28px] bg-[#1F1F1F] px-5 py-5 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Legal
        </p>
        <h2 className="mt-2 text-xl font-semibold">How people use the app.</h2>
        <p className="mt-2 text-sm text-white/72">
          These terms set the rules for using MaterialCrate, make users
          responsible for what they upload, and protect the platform when
          content is posted without proper rights or permission.
        </p>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.heading}
            className="rounded-3xl border border-black/6 bg-white p-4"
          >
            <p className="text-sm font-medium text-[#2E2E2E]">
              {section.heading}
            </p>
            <p className="mt-1 text-sm text-[#666666]">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl bg-[#FFF1E2] px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B46B28]">
          Important
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#7A5B37]">
          If you upload something you do not own or do not have permission to
          share, you accept the risk and responsibility for that decision. The
          platform may remove the content and take action on the account.
        </p>
      </div>
    </div>
  );
}
