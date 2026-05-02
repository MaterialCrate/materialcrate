"use client";

import { useState } from "react";
import {
  Trash,
  RotateLeft,
  DocumentText,
  Clock,
  InfoCircle,
  Image as ImageIcon,
  Warning2,
} from "iconsax-reactjs";
import Header from "../../../components/Header";

type PostType = "pdf" | "image" | "document";

interface DeletedPost {
  id: string;
  title: string;
  subject: string;
  type: PostType;
  deletedAt: Date;
  accentColor: string;
  pages?: number;
}

const NOW = new Date("2026-05-02T12:00:00Z");

function daysAgo(date: Date): number {
  return Math.floor((NOW.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function daysRemaining(date: Date): number {
  return 30 - daysAgo(date);
}

const EXAMPLE_POSTS: DeletedPost[] = [
  {
    id: "1",
    title: "Advanced Calculus — Chapter 5 Notes",
    subject: "Mathematics",
    type: "pdf",
    deletedAt: new Date("2026-04-30T09:15:00Z"),
    accentColor: "#4f46e5",
    pages: 18,
  },
  {
    id: "2",
    title: "Organic Chemistry Lab Report",
    subject: "Chemistry",
    type: "document",
    deletedAt: new Date("2026-04-25T14:30:00Z"),
    accentColor: "#059669",
    pages: 6,
  },
  {
    id: "3",
    title: "Machine Learning Lecture Slides",
    subject: "Computer Science",
    type: "pdf",
    deletedAt: new Date("2026-04-17T11:00:00Z"),
    accentColor: "#0284c7",
    pages: 42,
  },
  {
    id: "4",
    title: "Study Diagram — Cell Cycle",
    subject: "Biology",
    type: "image",
    deletedAt: new Date("2026-04-10T16:45:00Z"),
    accentColor: "#d97706",
  },
  {
    id: "5",
    title: "Physics Problem Set — Week 8",
    subject: "Physics",
    type: "pdf",
    deletedAt: new Date("2026-04-07T08:20:00Z"),
    accentColor: "#dc2626",
    pages: 4,
  },
];

function TypeIcon({ type }: { type: PostType }) {
  if (type === "image")
    return (
      <ImageIcon
        size={18}
        variant="Bold"
        className="text-ink-3"
        aria-hidden="true"
      />
    );
  return (
    <DocumentText
      size={18}
      variant="Bold"
      className="text-ink-3"
      aria-hidden="true"
    />
  );
}

function UrgencyPill({ remaining }: { remaining: number }) {
  if (remaining <= 5) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <Warning2 size={11} variant="Bold" />
        {remaining}d left
      </span>
    );
  }
  if (remaining <= 10) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
        <Clock size={11} variant="Bold" />
        {remaining}d left
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-edge px-2 py-0.5 text-[11px] font-medium text-ink-3">
      <Clock size={11} variant="Bold" />
      {remaining}d left
    </span>
  );
}

function PostCard({
  post,
  onRestore,
  onDelete,
}: {
  post: DeletedPost;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const ago = daysAgo(post.deletedAt);
  const remaining = daysRemaining(post.deletedAt);

  return (
    <div className="flex gap-3 rounded-[20px] border border-edge bg-surface p-3.5 transition-all duration-200">
      <div
        className="relative flex h-16 w-14 shrink-0 items-center justify-center rounded-[14px] opacity-70"
        style={{ backgroundColor: post.accentColor + "22" }}
      >
        <TypeIcon type={post.type} />
        <div
          className="absolute -bottom-1 -right-1 rounded-full p-0.5"
          style={{ backgroundColor: post.accentColor + "33" }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: post.accentColor }}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {post.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-3">{post.subject}</p>
          </div>
          <UrgencyPill remaining={remaining} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-ink-3">
            Deleted{" "}
            {ago === 0 ? "today" : ago === 1 ? "yesterday" : `${ago} days ago`}
            {post.pages ? ` · ${post.pages} pages` : ""}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRestore(post.id)}
              className="flex items-center gap-1 rounded-full border border-edge px-2.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-[#E1761F]/40 hover:bg-[#FBF7F2] hover:text-[#E1761F] active:scale-[0.97]"
            >
              <RotateLeft size={12} />
              Restore
            </button>
            <button
              title="trash"
              type="button"
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1 rounded-full border border-edge px-2.5 py-1 text-[11px] font-medium text-ink-3 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-[0.97] dark:hover:bg-red-950/30"
            >
              <Trash size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecentlyDeletedPage() {
  const [posts, setPosts] = useState<DeletedPost[]>(EXAMPLE_POSTS);
  const [toast, setToast] = useState<{
    message: string;
    type: "restore" | "delete";
  } | null>(null);

  function showToast(message: string, type: "restore" | "delete") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  }

  function handleRestore(id: string) {
    const post = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (post) showToast(`"${post.title.slice(0, 30)}…" restored`, "restore");
  }

  function handleDelete(id: string) {
    const post = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (post) showToast("Permanently deleted", "delete");
  }

  const urgentPosts = posts.filter((p) => daysRemaining(p.deletedAt) <= 5);

  return (
    <div className="min-h-screen bg-page">
      <Header title="Recently Deleted" />

      <div className="mx-auto max-w-xl space-y-4 px-4 pb-24 pt-20">
        <div className="flex gap-3 rounded-[20px] bg-[#F6EFE5] p-4">
          <div className="mt-0.5 shrink-0">
            <InfoCircle size={18} variant="Bold" className="text-[#A95A13]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#A95A13]">
              Posts are kept for 30 days
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#A95A13]/80">
              After 30 days, deleted posts and their files are permanently
              removed and cannot be recovered. Restore anything you want to
              keep.
            </p>
          </div>
        </div>

        {urgentPosts.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
            <Warning2
              size={15}
              variant="Bold"
              className="shrink-0 text-red-500"
            />
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {urgentPosts.length === 1
                ? "1 post is expiring in 5 days or less"
                : `${urgentPosts.length} posts are expiring in 5 days or less`}
            </p>
          </div>
        )}

        {posts.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
                {posts.length} item{posts.length !== 1 ? "s" : ""}
              </p>
            </div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onRestore={handleRestore}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-edge bg-surface px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#F6EFE5]">
              <Trash size={24} variant="Bold" className="text-[#A95A13]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Nothing here</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-3">
                Posts you delete will appear here for 30 days before being
                permanently removed.
              </p>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300 ${
            toast.type === "restore" ? "bg-[#E1761F]" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
