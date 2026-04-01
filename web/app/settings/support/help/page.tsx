import Link from "next/link";
import {
  ArrowRight2,
  MessageQuestion,
  ShieldSearch,
  Warning2,
} from "iconsax-reactjs";
import Header from "@/app/components/Header";

const supportItems = [
  {
    title: "Report a problem",
    detail: "Let us know if something isn’t working correctly.",
    icon: Warning2,
    href: "/settings/support/report",
  },
  {
    title: "Ask for help",
    detail: "Get support and answers to your questions..",
    icon: MessageQuestion,
    href: "",
  },
  {
    title: "Community guidelines",
    detail: "Read the rules and best practices for our community.",
    icon: ShieldSearch,
    href: "",
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#F7F7F7_0%,#F2EEE7_100%)] px-6 pt-20">
      <Header title="Help & Support" isLoading={false} />
      <div className="mb-5 rounded-[28px] bg-[#FFF4EA] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B46B28]">
          Support
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#1F1F1F]">
          Get unstuck quickly.
        </h2>
        <p className="mt-2 text-sm text-[#6A625A]">
          Find answers, troubleshoot issues, and get the assistance you need.
          Browse FAQs, step-by-step guides, and contact support for personalized
          help with your account, products, or services.  
        </p>
      </div>
      <div className="space-y-3">
        {supportItems.map((item) => {
          if (item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex w-full items-center justify-between gap-4 rounded-3xl border border-black/6 bg-white p-4 text-left shadow-[0_10px_28px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#FBF7F2]"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#F6EFE5] p-3">
                    <item.icon size={20} color="#A95A13" variant="Bulk" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2F2F2F]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-[#666666]">{item.detail}</p>
                  </div>
                </div>
                <ArrowRight2 size={18} color="#444444" />
              </Link>
            );
          }

          return (
            <button
              key={item.title}
              type="button"
              className="flex w-full items-center justify-between gap-4 rounded-3xl border border-black/6 bg-white p-4 text-left shadow-[0_10px_28px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#FBF7F2]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[#F6EFE5] p-3">
                  <item.icon size={20} color="#A95A13" variant="Bulk" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2F2F2F]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-[#666666]">{item.detail}</p>
                </div>
              </div>
              <ArrowRight2 size={18} color="#444444" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
