"use client";

import { useState, useDeferredValue, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Edit2,
  SearchNormal1,
  Message,
  TickCircle,
  ArrowLeft,
} from "iconsax-reactjs";

type ChatFilter = "all" | "unread";

type ChatConversation = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isSentByMe: boolean;
  isRead: boolean;
};

const MOCK_CHATS: ChatConversation[] = [
  {
    id: "1",
    name: "Amara Osei",
    username: "amara.osei",
    avatar: null,
    lastMessage: "Hey, did you see the notes I uploaded for thermodynamics?",
    lastMessageTime: "2m ago",
    unreadCount: 3,
    isOnline: true,
    isSentByMe: false,
    isRead: false,
  },
  {
    id: "2",
    name: "Kofi Mensah",
    username: "kofi.mensah",
    avatar: null,
    lastMessage: "Thanks for sharing that PDF!",
    lastMessageTime: "18m ago",
    unreadCount: 0,
    isOnline: true,
    isSentByMe: true,
    isRead: true,
  },
  {
    id: "3",
    name: "Fatima Al-Hassan",
    username: "fatima_h",
    avatar: null,
    lastMessage: "Can you send me the slides from yesterday's lecture?",
    lastMessageTime: "1h ago",
    unreadCount: 1,
    isOnline: false,
    isSentByMe: false,
    isRead: false,
  },
  {
    id: "4",
    name: "Daniel Kwame",
    username: "dkwame",
    avatar: null,
    lastMessage: "I'll share the study guide tonight.",
    lastMessageTime: "3h ago",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: true,
    isRead: true,
  },
  {
    id: "5",
    name: "Naomi Abubakar",
    username: "naomi_ab",
    avatar: null,
    lastMessage: "The exam is on Friday, not Thursday!",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: false,
    isRead: true,
  },
  {
    id: "6",
    name: "Emmanuel Tetteh",
    username: "etetteh",
    avatar: null,
    lastMessage: "Got it, I'll review the material now.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: false,
    isRead: true,
  },
  {
    id: "7",
    name: "Abena Sarpong",
    username: "abena_s",
    avatar: null,
    lastMessage: "You're welcome! Good luck on the test.",
    lastMessageTime: "Mon",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: true,
    isRead: true,
  },
  {
    id: "8",
    name: "Naomi Abubakar",
    username: "naomi_ab",
    avatar: null,
    lastMessage: "The exam is on Friday, not Thursday!",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: false,
    isRead: true,
  },
  {
    id: "9",
    name: "Emmanuel Tetteh",
    username: "etetteh",
    avatar: null,
    lastMessage: "Got it, I'll review the material now.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: false,
    isRead: true,
  },
  {
    id: "10",
    name: "Abena Sarpong",
    username: "abena_s",
    avatar: null,
    lastMessage: "You're welcome! Good luck on the test.",
    lastMessageTime: "Mon",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: true,
    isRead: true,
  },
  {
    id: "11",
    name: "Naomi Abubakar",
    username: "naomi_ab",
    avatar: null,
    lastMessage: "The exam is on Friday, not Thursday!",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: false,
    isRead: true,
  },
  {
    id: "12",
    name: "Emmanuel Tetteh",
    username: "etetteh",
    avatar: null,
    lastMessage: "Got it, I'll review the material now.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: false,
    isRead: true,
  },
  {
    id: "13",
    name: "Abena Sarpong",
    username: "abena_s",
    avatar: null,
    lastMessage: "You're welcome! Good luck on the test.",
    lastMessageTime: "Mon",
    unreadCount: 0,
    isOnline: false,
    isSentByMe: true,
    isRead: true,
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-[#FFE6CF] text-[#B76217]",
  "bg-[#E8EBFF] text-[#4150D8]",
  "bg-[#DBF5EC] text-[#197356]",
  "bg-[#FFE0E8] text-[#B33F61]",
  "bg-[#EEE8FF] text-[#684AD9]",
  "bg-amber-100 text-amber-700",
];

function avatarColor(id: string): string {
  const index = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function ChatPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [searchVisible, setSearchVisible] = useState(true);
  const lastScrollY = useRef(0);
  const listRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);

  useEffect(() => {
    if (topBarRef.current) {
      setTopBarHeight(topBarRef.current.offsetHeight);
    }
  }, []);

  const lastBottomHitAt = useRef(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const raw = el.scrollTop;
      const delta = raw - lastScrollY.current;
      lastScrollY.current = raw;

      if (Math.abs(delta) < 4) return;

      if (raw >= maxScroll - 8) lastBottomHitAt.current = Date.now();

      if (raw <= 8) {
        setSearchVisible(true);
      } else if (delta > 0) {
        setSearchVisible(false);
      } else if (Date.now() - lastBottomHitAt.current > 250) {
        setSearchVisible(true);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = MOCK_CHATS.filter((chat) => {
    const matchesFilter =
      filter === "all" || (filter === "unread" && chat.unreadCount > 0);
    const matchesSearch =
      !deferredSearch ||
      chat.name.toLowerCase().includes(deferredSearch) ||
      chat.username.toLowerCase().includes(deferredSearch) ||
      chat.lastMessage.toLowerCase().includes(deferredSearch);
    return matchesFilter && matchesSearch;
  });

  const totalUnread = MOCK_CHATS.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex h-dvh flex-col bg-page">
      {/* Header + search — slide up together on scroll down */}
      <div
        ref={topBarRef}
        className="shrink-0 bg-surface"
        style={{
          transform: searchVisible
            ? "translateY(0)"
            : `translateY(-${topBarHeight}px)`,
          marginBottom: searchVisible ? 0 : -topBarHeight,
          transition:
            "transform 280ms cubic-bezier(0.4,0,0.2,1), margin-bottom 280ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <header className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              aria-label="Back"
              type="button"
              onClick={() => router.back()}
              className="transition-opacity hover:opacity-60 active:opacity-40"
            >
              <ArrowLeft size={24} color="var(--ink)" />
            </button>
            <h1 className="text-lg font-semibold text-ink">Messages</h1>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E1761F] px-1.5 text-[10px] font-semibold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="New message"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5 active:scale-95 active:opacity-60"
          >
            <Edit2 size={20} color="var(--ink)" />
          </button>
        </header>

        <div className="border-b border-edge">
          <div className="mx-auto max-w-2xl">
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface-high px-4 py-2.5">
                <SearchNormal1 size={18} color="#959595" />
                <input
                  type="search"
                  placeholder="Search messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs font-medium text-ink-3 transition-colors hover:text-ink-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-3">
              {(["all", "unread"] as ChatFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-200 active:scale-95 ${
                    filter === tab
                      ? "bg-[#131212] text-white"
                      : "bg-surface-high text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab === "unread" && totalUnread > 0
                    ? `Unread (${totalUnread})`
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable conversation list */}
      <main ref={listRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl">
          {filtered.length === 0 ? (
            <EmptyState search={search} filter={filter} />
          ) : (
            <ul className="divide-y divide-edge">
              {filtered.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/chat/${encodeURIComponent(chat.id)}`)
                    }
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-high active:bg-surface-high active:opacity-70"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`flex h-13 w-13 items-center justify-center overflow-hidden rounded-[18px] text-sm font-semibold ${avatarColor(chat.id)}`}
                      >
                        {chat.avatar ? (
                          <Image
                            src={chat.avatar}
                            alt={chat.name}
                            fill
                            sizes="52px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          getInitials(chat.name)
                        )}
                      </div>
                      {chat.isOnline && (
                        <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-[#1F9D75]" />
                      )}
                    </div>

                    {/* Text content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            chat.unreadCount > 0
                              ? "font-semibold text-ink"
                              : "font-medium text-ink"
                          }`}
                        >
                          {chat.name}
                        </span>
                        <span
                          className={`shrink-0 text-[11px] ${
                            chat.unreadCount > 0
                              ? "font-semibold text-[#E1761F]"
                              : "font-medium text-ink-3"
                          }`}
                        >
                          {chat.lastMessageTime}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                          {chat.isSentByMe && (
                            <TickCircle
                              size={14}
                              color={chat.isRead ? "#E1761F" : "#959595"}
                              variant={chat.isRead ? "Bold" : "Linear"}
                              className="shrink-0"
                            />
                          )}
                          <p
                            className={`truncate text-sm ${
                              chat.unreadCount > 0
                                ? "font-medium text-ink"
                                : "text-ink-2"
                            }`}
                          >
                            {chat.lastMessage}
                          </p>
                        </div>

                        {chat.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#E1761F] px-1.5 text-[10px] font-semibold text-white">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({
  search,
  filter,
}: {
  search: string;
  filter: ChatFilter;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-surface-high">
        <Message size={28} color="#959595" variant="Bulk" />
      </div>
      {search ? (
        <>
          <p className="text-sm font-semibold text-ink">No results</p>
          <p className="mt-1 text-sm text-ink-2">
            No conversations match &quot;{search}&quot;.
          </p>
        </>
      ) : filter === "unread" ? (
        <>
          <p className="text-sm font-semibold text-ink">All caught up</p>
          <p className="mt-1 text-sm text-ink-2">
            You have no unread messages.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">No messages yet</p>
          <p className="mt-1 text-sm text-ink-2">
            Start a conversation by tapping the compose button.
          </p>
        </>
      )}
    </div>
  );
}
