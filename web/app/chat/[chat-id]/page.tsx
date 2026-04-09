"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Add,
  Send2,
  DocumentText,
  TickCircle,
  Paperclip2,
} from "iconsax-reactjs";

type MessageStatus = "sending" | "sent" | "delivered" | "read";

type Message = {
  id: string;
  text: string;
  sentByMe: boolean;
  timestamp: Date;
  status?: MessageStatus;
  attachment?: { name: string; size: string };
};

type Participant = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isOnline: boolean;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const PARTICIPANTS: Record<string, Participant> = {
  "1": {
    id: "1",
    name: "Amara Osei",
    username: "amara.osei",
    avatar: null,
    isOnline: true,
  },
  "2": {
    id: "2",
    name: "Kofi Mensah",
    username: "kofi.mensah",
    avatar: null,
    isOnline: true,
  },
  "3": {
    id: "3",
    name: "Fatima Al-Hassan",
    username: "fatima_h",
    avatar: null,
    isOnline: false,
  },
  "4": {
    id: "4",
    name: "Daniel Kwame",
    username: "dkwame",
    avatar: null,
    isOnline: false,
  },
  "5": {
    id: "5",
    name: "Naomi Abubakar",
    username: "naomi_ab",
    avatar: null,
    isOnline: false,
  },
};

const SEED_MESSAGES: Message[] = [
  {
    id: "m1",
    text: "Hey! Did you check out the thermodynamics notes I uploaded?",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "m2",
    text: "Yeah I did! Super helpful, the second law explanation was exactly what I needed.",
    sentByMe: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 45),
    status: "read",
  },
  {
    id: "m3",
    text: "Glad it helped! Are you also looking for the heat transfer chapter?",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
  },
  {
    id: "m4",
    text: "Yes please, I've been struggling with that section all week.",
    sentByMe: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.4),
    status: "read",
  },
  {
    id: "m5",
    text: "I'll upload it tonight after my lab session. It has some great worked examples.",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
  },
  {
    id: "m6",
    text: "Perfect, I'll keep an eye out for it. Also do you have the formula sheet from last semester's exam?",
    sentByMe: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 50),
    status: "read",
  },
  {
    id: "m7",
    text: "I do! One sec, let me find it.",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 48),
  },
  {
    id: "m8",
    text: "Thermo Formula Sheet.pdf",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 47),
    attachment: { name: "Thermo Formula Sheet.pdf", size: "248 KB" },
  },
  {
    id: "m9",
    text: "This is amazing, thank you so much!",
    sentByMe: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: "delivered",
  },
  {
    id: "m10",
    text: "No worries! Good luck on the exam.",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
  },
  {
    id: "m11",
    text: "Hey, did you see the notes I uploaded for thermodynamics?",
    sentByMe: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-[#FFE6CF] text-[#B76217]",
  "bg-[#E8EBFF] text-[#4150D8]",
  "bg-[#DBF5EC] text-[#197356]",
  "bg-[#FFE0E8] text-[#B33F61]",
  "bg-[#EEE8FF] text-[#684AD9]",
  "bg-amber-100 text-amber-700",
];

function avatarColor(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfItemDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfItemDay.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupMessagesByDay(
  messages: Message[],
): { label: string; messages: Message[] }[] {
  const map = new Map<string, Message[]>();
  for (const msg of messages) {
    const key = formatDateSeparator(msg.timestamp);
    const group = map.get(key) ?? [];
    group.push(msg);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([label, msgs]) => ({
    label,
    messages: msgs,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusTick({ status }: { status?: MessageStatus }) {
  if (!status || status === "sending") return null;
  return (
    <TickCircle
      size={12}
      color={status === "read" ? "#E1761F" : "var(--ink-3)"}
      variant={status === "read" ? "Bold" : "Linear"}
    />
  );
}

function AttachmentBubble({
  attachment,
  sentByMe,
}: {
  attachment: { name: string; size: string };
  sentByMe: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 ${
        sentByMe ? "bg-white/20" : "border border-edge bg-surface"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          sentByMe ? "bg-white/20" : "bg-[#FFE6CF]"
        }`}
      >
        <DocumentText
          size={18}
          color={sentByMe ? "#fff" : "#B76217"}
          variant="Bulk"
        />
      </div>
      <div className="min-w-0">
        <p
          className={`truncate text-xs font-semibold ${
            sentByMe ? "text-white" : "text-ink"
          }`}
        >
          {attachment.name}
        </p>
        <p
          className={`text-[10px] ${sentByMe ? "text-white/60" : "text-ink-3"}`}
        >
          {attachment.size}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const { sentByMe, text, timestamp, status, attachment } = message;
  const isAttachmentOnly = attachment && text === attachment.name;

  return (
    <div className={`flex ${sentByMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[78%] flex-col gap-1 ${
          sentByMe ? "items-end" : "items-start"
        }`}
      >
        {attachment && (
          <AttachmentBubble attachment={attachment} sentByMe={sentByMe} />
        )}

        {text && !isAttachmentOnly && (
          <div
            className={`rounded-[18px] px-3.5 py-2.5 ${
              sentByMe
                ? "rounded-br-md bg-[#E1761F] text-white"
                : "rounded-bl-md bg-surface-high text-ink"
            }`}
          >
            <p className="text-sm leading-relaxed">{text}</p>
          </div>
        )}

        <div
          className={`flex items-center gap-1 px-1 ${
            sentByMe ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-[10px] text-ink-3">
            {formatTime(timestamp)}
          </span>
          {sentByMe && <StatusTick status={status} />}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = Array.isArray(params["chat-id"])
    ? params["chat-id"][0]
    : params["chat-id"];

  const participant: Participant = PARTICIPANTS[chatId ?? ""] ?? {
    id: chatId ?? "unknown",
    name: "Unknown",
    username: "unknown",
    avatar: null,
    isOnline: false,
  };

  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on mount + new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const draftRef = useRef("");

  const triggerFakeTyping = () => {
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2200);
    }, 800);
  };

  const sendMessage = () => {
    const text = draftRef.current.trim();
    if (!text) return;

    const newMsg: Message = {
      id: `m${Date.now()}`,
      text,
      sentByMe: true,
      timestamp: new Date(),
      status: "sending",
    };

    setMessages((prev) => [...prev, newMsg]);
    draftRef.current = "";
    setDraft("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMsg.id ? { ...m, status: "delivered" } : m,
        ),
      );
    }, 600);

    triggerFakeTyping();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const groups = groupMessagesByDay(messages);

  return (
    <div className="flex h-dvh flex-col bg-page">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 py-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-high active:opacity-60"
        >
          <ArrowLeft size={22} color="var(--ink)" />
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(`/user/${encodeURIComponent(participant.username)}`)
          }
          className="flex flex-1 items-center gap-3 rounded-xl py-1 text-left transition-opacity active:opacity-60"
        >
          <div className="relative shrink-0">
            <div
              className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] text-xs font-semibold ${avatarColor(participant.id)}`}
            >
              {participant.avatar ? (
                <Image
                  src={participant.avatar}
                  alt={participant.name}
                  fill
                  sizes="40px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                getInitials(participant.name)
              )}
            </div>
            {participant.isOnline && (
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-[#1F9D75]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {participant.name}
            </p>
            <p className="text-[11px] text-ink-3">
              {participant.isOnline ? "Active now" : `@${participant.username}`}
            </p>
          </div>
        </button>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-5">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Date separator */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-edge" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-edge" />
              </div>

              <div className="space-y-1.5">
                {group.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-md bg-surface-high px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-3 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-edge bg-surface px-4 pb-4 pt-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2.5">
          {/* Attach */}
          <button
            type="button"
            aria-label="Add attachment"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-high active:scale-95 active:opacity-60"
          >
            <Add size={22} color="var(--ink-2)" />
          </button>

          {/* Input field */}
          <div className="flex flex-1 items-end gap-2 rounded-2xl bg-surface-high px-4 py-2.5">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Message…"
              value={draft}
              onChange={(e) => {
                draftRef.current = e.target.value;
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              className="max-h-30 flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none"
            />
            <button
              type="button"
              aria-label="Attach file"
              className="mb-0.5 shrink-0 transition-opacity hover:opacity-60 active:scale-95 active:opacity-40"
            >
              <Paperclip2 size={18} color="var(--ink-3)" />
            </button>
          </div>

          {/* Send */}
          <button
            type="button"
            aria-label="Send message"
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1761F] transition-all active:scale-95 disabled:opacity-35"
          >
            <Send2 size={18} color="#fff" variant="Bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
