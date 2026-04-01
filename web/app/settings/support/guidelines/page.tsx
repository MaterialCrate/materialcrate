import { Warning2 } from "iconsax-reactjs";
import Header from "@/app/components/Header";

const guidelineSections = [
  {
    title: "Share useful, honest materials",
    body: "Post files and notes that are accurate, clearly labeled, and genuinely helpful for other learners.",
  },
  {
    title: "Respect ownership and credit",
    body: "Only upload content you are allowed to share. Cite sources, avoid plagiarism, and do not repost paid or private material without permission.",
  },
  {
    title: "Keep discussions constructive",
    body: "In comments and replies, challenge ideas respectfully. Personal attacks, harassment, hate speech, and bullying are not allowed.",
  },
  {
    title: "Protect privacy",
    body: "Do not publish personal data, private conversations, login details, or identifying information about others without clear consent.",
  },
  {
    title: "No spam or manipulation",
    body: "Avoid repetitive promotion, misleading titles, fake engagement, or attempts to game follows, comments, and visibility.",
  },
  {
    title: "Use reports when something is wrong",
    body: "If you see harmful, abusive, or infringing content, report it from Support. Reports help us review faster and keep the community safe.",
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F2EEE7_100%)] px-6 pt-20 pb-8">
      <Header title="Community Guidelines" isLoading={false} />

      <div className="mb-5 rounded-[28px] bg-[#1F1F1F] px-5 py-5 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Community
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          Learn together, respectfully.
        </h2>
        <p className="mt-2 text-sm text-white/72">
          MaterialCrate works best when people share responsibly, give proper
          credit, and communicate with empathy.
        </p>
      </div>

      <div className="space-y-3">
        {guidelineSections.map((section, index) => (
          <div
            key={section.title}
            className="rounded-3xl border border-black/6 bg-white p-4 shadow-[0_10px_28px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#A06A35]">
              Guideline {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#2E2E2E]">
              {section.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
              {section.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-3xl bg-[#FFF4EA] px-4 py-3.5">
        <Warning2
          size={18}
          color="#A95A13"
          variant="Bulk"
          className="mt-0.5 shrink-0"
        />
        <p className="text-xs leading-relaxed text-[#8B6234]">
          Repeated or severe violations can lead to content removal, account
          restrictions, or suspension to protect the community.
        </p>
      </div>
    </div>
  );
}
