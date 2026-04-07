import Header from "@/app/components/Header";

const sections = [
  {
    heading: "Information We Collect",
    body: "We collect the information you provide when you create an account, complete your profile, upload materials, save posts, contact support, or connect social sign-in providers. This can include your email address, username, display name, institution, program, profile images, uploaded files, comments, follows, saved items, and support attachments.",
  },
  {
    heading: "How We Use Your Data",
    body: "We use your information to run MaterialCrate, authenticate your account, personalize your experience, organize your workspace and archive, surface notifications, process subscriptions, respond to support requests, and improve product performance and safety.",
  },
  {
    heading: "Visibility And Community Features",
    body: "Your profile, posts, comments, and activity may be visible to other users depending on your visibility settings and how you choose to participate. Features such as follows, comments, likes, notifications, and saved materials rely on storing and displaying certain account and content data inside the platform.",
  },
  {
    heading: "Moderation And Safety",
    body: "We may review reports, support requests, and related account activity to investigate abuse, fraud, policy violations, copyright concerns, or security issues. This can include report text, screenshots, user-agent details, and records connected to the content or account being reviewed.",
  },
  {
    heading: "Payments And Subscription Records",
    body: "If you use paid features, we keep subscription plan details and related billing status necessary to manage access, renewals, and account support. We do not state card-storage practices here unless separately documented by the payment provider handling checkout.",
  },
  {
    heading: "Your Controls",
    body: "You can update parts of your profile, manage visibility preferences, control notification settings, mute or block other users, and request account deletion where supported. Some information may remain in backups, legal records, fraud-prevention logs, or moderation records for a limited period where necessary.",
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F3EFE7_100%)]">
      <Header title="Privacy Policy" isLoading={false} />
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-20 sm:px-6">
      <div className="mb-5 rounded-[28px] bg-[#FFF7EE] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B46B28]">
          Privacy
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          How MaterialCrate handles your information.
        </h2>
        <p className="mt-2 text-sm text-[#6A625A]">
          We collect only the information needed to operate accounts, support
          learning materials, enable community features, maintain safety, and
          improve the product.
        </p>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.heading}
            className="rounded-3xl border border-edge bg-surface p-4"
          >
            <p className="text-sm font-medium text-ink">
              {section.heading}
            </p>
            <p className="mt-1 text-sm text-ink-2">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl bg-[#FFF1E2] px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B46B28]">
          Data Care
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#7A5B37]">
          We aim to keep privacy notices clear and specific. If product features
          change, this policy should be updated to reflect new data uses,
          integrations, or retention practices.
        </p>
      </div>
      </div>
    </div>
  );
}
