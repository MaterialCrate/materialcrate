import { ArrowRight2, MessageQuestion, ShieldSearch, Warning2 } from "iconsax-reactjs";
import Header from "@/app/components/Header";

const supportItems = [
  {
    title: "Report a problem",
    detail: "Use this section for bugs, broken uploads, and account issues.",
    icon: Warning2,
  },
  {
    title: "Ask for help",
    detail: "Add your support email, form link, or FAQ entry point here.",
    icon: MessageQuestion,
  },
  {
    title: "Community guidelines",
    detail: "Link people to posting rules and moderation expectations.",
    icon: ShieldSearch,
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F2EEE7_100%)] px-6 pt-30">
      <Header title="Help & Support" isLoading={false} />
      <div className="mb-5 rounded-[28px] bg-[#FFF4EA] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B46B28]">
          Support
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#1F1F1F]">
          Get unstuck quickly.
        </h2>
        <p className="mt-2 text-sm text-[#6A625A]">
          Keep support, reporting, and community guidance in one place so people
          know where to go when something breaks or feels unclear.
        </p>
      </div>
      <div className="space-y-3">
        {supportItems.map((item) => (
          <button
            key={item.title}
            type="button"
            className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-black/6 bg-white p-4 text-left shadow-[0_10px_28px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#FBF7F2]"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#F6EFE5] p-3">
                <item.icon size={20} color="#A95A13" variant="Bulk" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2F2F2F]">{item.title}</p>
                <p className="mt-1 text-xs text-[#666666]">{item.detail}</p>
              </div>
            </div>
            <ArrowRight2 size={18} color="#444444" />
          </button>
        ))}
      </div>
    </div>
  );
}
