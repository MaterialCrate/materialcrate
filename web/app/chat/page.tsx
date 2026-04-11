"use client";

import {
  useState,
  useDeferredValue,
  useRef,
  useEffect,
  useCallback,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-client";
import {
  Edit2,
  SearchNormal1,
  Message,
  TickCircle,
  ArrowLeft,
  UserAdd,
} from "iconsax-reactjs";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatFilter = "all" | "unread";

type ChatConversation = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null; // ISO string
  unreadCount: number;
  isOnline: boolean;
  isSentByMe: boolean;
  isRead: boolean;
};

type ChatUserSuggestion = {
  id: string;
  displayName: string;
  username: string;
  profilePicture: string | null;
  followersCount: number;
  isFollowing: boolean;
  hasExistingConversation: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsgDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfMsgDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConversationItem({
  chat,
  onClick,
}: {
  chat: ChatConversation;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-high active:bg-surface-high active:opacity-70"
      >
        <div className="relative shrink-0">
          <div
            className={`relative flex h-13 w-13 items-center justify-center overflow-hidden rounded-[18px] text-sm font-semibold ${avatarColor(chat.id)}`}
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
              {formatRelativeTime(chat.lastMessageTime)}
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
                {chat.lastMessage ?? ""}
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
  );
}

function UserSuggestionItem({
  user,
  onClick,
  isLoading,
}: {
  user: ChatUserSuggestion;
  onClick: () => void;
  isLoading: boolean;
}) {
  const hint = user.hasExistingConversation
    ? "Recent chat"
    : user.isFollowing
      ? "Following"
      : null;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-surface-high active:opacity-70 disabled:opacity-60"
      >
        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold ${avatarColor(user.id)}`}
        >
          {user.profilePicture ? (
            <Image
              src={user.profilePicture}
              alt={user.displayName}
              fill
              sizes="48px"
              unoptimized
              className="object-cover"
            />
          ) : (
            getInitials(user.displayName)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {user.displayName}
          </p>
          <p className="truncate text-xs text-ink-3">@{user.username}</p>
        </div>

        {hint && (
          <span className="shrink-0 rounded-full bg-surface-high px-2.5 py-1 text-[10px] font-semibold text-ink-2">
            {hint}
          </span>
        )}
      </button>
    </li>
  );
}

function SkeletonRow() {
  return (
    <li className="flex items-center gap-3.5 px-4 py-3.5">
      <div className="h-13 w-13 shrink-0 animate-pulse rounded-[18px] bg-surface-high" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 w-32 animate-pulse rounded-full bg-surface-high" />
          <div className="h-3 w-10 animate-pulse rounded-full bg-surface-high" />
        </div>
        <div className="h-3 w-48 animate-pulse rounded-full bg-surface-high" />
      </div>
    </li>
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

// ─── Compose overlay ──────────────────────────────────────────────────────────

function ComposeView({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [users, setUsers] = useState<ChatUserSuggestion[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch suggestions whenever deferred query changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingUsers(true);

    const url =
      deferredQuery
        ? `/api/chat/users?q=${encodeURIComponent(deferredQuery)}`
        : "/api/chat/users";

    fetch(url, { cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((body) => {
        if (cancelled) return;
        setUsers(Array.isArray(body?.users) ? body.users : []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  const handleSelectUser = useCallback(
    async (user: ChatUserSuggestion) => {
      if (startingId) return;
      setStartingId(user.id);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const body = await res.json().catch(() => ({}));
        const conversationId = body?.conversation?.id;
        if (conversationId) {
          router.push(`/chat/${encodeURIComponent(conversationId)}`);
        }
      } finally {
        setStartingId(null);
      }
    },
    [startingId, router],
  );

  return (
    <div className="flex h-dvh flex-col bg-page">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 py-3">
        <button
          type="button"
          aria-label="Cancel"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-high active:opacity-60"
        >
          <ArrowLeft size={22} color="var(--ink)" />
        </button>
        <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-surface-high px-4 py-2.5">
          <SearchNormal1 size={16} color="#959595" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs font-medium text-ink-3 transition-colors hover:text-ink-2"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Section label */}
      <div className="shrink-0 px-4 pb-1 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">
          {query ? "Results" : "Suggested"}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingUsers ? (
          <ul>
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3.5 px-4 py-3"
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-surface-high" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 animate-pulse rounded-full bg-surface-high" />
                  <div className="h-3 w-20 animate-pulse rounded-full bg-surface-high" />
                </div>
              </li>
            ))}
          </ul>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-surface-high">
              <UserAdd size={28} color="#959595" variant="Bulk" />
            </div>
            <p className="text-sm font-semibold text-ink">
              {query ? "No users found" : "No suggestions yet"}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {query
                ? `No one matches "${query}".`
                : "Follow people or start chatting to see suggestions."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-edge">
            {users.map((user) => (
              <UserSuggestionItem
                key={user.id}
                user={user}
                onClick={() => handleSelectUser(user)}
                isLoading={startingId === user.id}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [view, setView] = useState<"list" | "compose">("list");

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.push("/login");
    }
  }, [isLoadingAuth, user, router]);

  // Conversation list state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / filter state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  // Scroll-hide search bar refs
  const [searchVisible, setSearchVisible] = useState(true);
  const lastScrollY = useRef(0);
  const listRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const lastBottomHitAt = useRef(0);

  useEffect(() => {
    if (topBarRef.current) {
      setTopBarHeight(topBarRef.current.offsetHeight);
    }
  }, []);

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

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to load conversations");
        return;
      }
      const raw: {
        id: string;
        participant: {
          id: string;
          name: string;
          username: string;
          avatar: string | null;
          isOnline: boolean;
        };
        lastMessage: string | null;
        lastMessageTime: string | null;
        lastMessageSentByMe: boolean;
        lastMessageIsRead: boolean;
        unreadCount: number;
      }[] = Array.isArray(body?.conversations) ? body.conversations : [];

      setConversations(
        raw.map((c) => ({
          id: c.id,
          name: c.participant.name,
          username: c.participant.username,
          avatar: c.participant.avatar,
          lastMessage: c.lastMessage,
          lastMessageTime: c.lastMessageTime,
          unreadCount: c.unreadCount,
          isOnline: c.participant.isOnline,
          isSentByMe: c.lastMessageSentByMe,
          isRead: c.lastMessageIsRead,
        })),
      );
    } catch {
      setError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const filtered = conversations.filter((chat) => {
    const matchesFilter =
      filter === "all" || (filter === "unread" && chat.unreadCount > 0);
    const matchesSearch =
      !deferredSearch ||
      chat.name.toLowerCase().includes(deferredSearch) ||
      chat.username.toLowerCase().includes(deferredSearch) ||
      (chat.lastMessage?.toLowerCase().includes(deferredSearch) ?? false);
    return matchesFilter && matchesSearch;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (isLoadingAuth || !user) return null;

  if (view === "compose") {
    return <ComposeView onClose={() => setView("list")} />;
  }

  return (
    <div className="flex h-dvh flex-col bg-page">
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
            onClick={() => setView("compose")}
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
          {isLoading ? (
            <ul>
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </ul>
          ) : error ? (
            <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
              <p className="text-sm font-semibold text-ink">
                Something went wrong
              </p>
              <p className="mt-1 text-sm text-ink-2">{error}</p>
              <button
                type="button"
                onClick={() => void fetchConversations()}
                className="mt-4 rounded-full bg-[#E1761F] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80 active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState search={search} filter={filter} />
          ) : (
            <ul className="divide-y divide-edge">
              {filtered.map((chat) => (
                <ConversationItem
                  key={chat.id}
                  chat={chat}
                  onClick={() =>
                    router.push(`/chat/${encodeURIComponent(chat.id)}`)
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
