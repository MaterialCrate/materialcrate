import React from "react";
import {
  ArchiveMinus,
  DocumentText1,
  type Icon as IconsaxIcon,
  MedalStar,
  MessageText1,
  Profile2User,
  Setting4,
} from "iconsax-reactjs";
import Header from "../components/Header";

type NotificationItem = {
  id: number;
  title: string;
  description: string;
  time: string;
  category: string;
  accent: string;
  unread?: boolean;
  imageLabel: string;
  imageTone: string;
  Icon: IconsaxIcon;
  meta?: string;
};

const notificationGroups: Array<{
  label: string;
  items: NotificationItem[];
}> = [
  {
    label: "Today",
    items: [
      {
        id: 1,
        title: "New comment",
        description:
          "Ayo asked for the PDF source you used in your reaction-rates upload.",
        time: "2 min ago",
        category: "Comments",
        accent: "#E1761F",
        unread: true,
        imageLabel: "AY",
        imageTone: "bg-[#FFE6CF] text-[#B76217]",
        Icon: MessageText1,
      },
      {
        id: 2,
        title: "Your file is trending in Hub",
        description:
          "Lecture Notes: Wave Optics was saved 24 times in the last hour.",
        time: "18 min ago",
        category: "Performance",
        accent: "#1D1D1D",
        unread: true,
        imageLabel: "WO",
        imageTone: "bg-[#EFEFEF] text-[#202020]",
        Icon: MedalStar,
      },
      {
        id: 3,
        title: "Archive reminder",
        description:
          "You have 7 saved materials still uncategorized. Move them into folders for faster access.",
        time: "42 min ago",
        category: "Saved",
        accent: "#5F6FFF",
        imageLabel: "SV",
        imageTone: "bg-[#E8EBFF] text-[#4150D8]",
        Icon: ArchiveMinus,
      },
    ],
  },
  {
    label: "Earlier this week",
    items: [
      {
        id: 4,
        title: "Study group invite accepted",
        description:
          "3 classmates joined your Calculus crash-pack circle after your invite.",
        time: "Yesterday, 6:14 PM",
        category: "Community",
        accent: "#1F9D75",
        imageLabel: "CG",
        imageTone: "bg-[#DBF5EC] text-[#197356]",
        Icon: Profile2User,
      },
      {
        id: 5,
        title: "Document uploaded",
        description:
          "Your Biochemistry flashcards are now searchable and visible on your profile.",
        time: "Tuesday, 10:32 AM",
        category: "Uploads",
        accent: "#D14D72",
        imageLabel: "BC",
        imageTone: "bg-[#FFE0E8] text-[#B33F61]",
        Icon: DocumentText1,
      },
      {
        id: 6,
        title: "Weekly account check-in",
        description:
          "Review your profile, saved folders, and upload settings to keep your workspace clean.",
        time: "Monday, 8:05 AM",
        category: "System",
        accent: "#7C5CFA",
        imageLabel: "MC",
        imageTone: "bg-[#EEE8FF] text-[#684AD9]",
        Icon: Setting4,
      },
    ],
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-4 pb-28 pt-20">
      <Header title="Notifications" />

      <main className="space-y-5">
        {notificationGroups.map((group) => (
          <section key={group.label}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8A8A]">
                {group.label}
              </h2>
              <button
                type="button"
                className="text-xs font-medium text-[#8A8A8A]"
              >
                Mark all as read
              </button>
            </div>

            <div className="space-y-3">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[22px] border border-black/6 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(17,17,17,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div
                        className={`flex h-13 w-13 items-center justify-center rounded-[18px] text-sm font-semibold ${item.imageTone}`}
                      >
                        {item.imageLabel}
                      </div>
                      <div
                        className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white"
                        style={{ backgroundColor: item.accent }}
                      >
                        <item.Icon size={14} color="#FFFFFF" variant="Bulk" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#262626]">
                            {item.title}
                          </h3>
                        </div>
                        <p className="flex items-center gap-2 shrink-0 text-[11px] font-medium text-[#8A8A8A]">
                          {item.unread && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#E1761F]" />
                          )}
                          {item.time}
                        </p>
                      </div>

                      <p className="text-sm leading-6 text-[#666666]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
