"use client";

import { useEffect, useState } from "react";
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
}

interface ApiPost {
  id: string;
  title: string;
  categories: string[];
  fileUrl: string;
  thumbnailUrl: string | null;
  deletedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  mathematics: "#4f46e5",
  chemistry: "#059669",
  "computer science": "#0284c7",
  biology: "#d97706",
  physics: "#dc2626",
  literature: "#7c3aed",
  history: "#b45309",
  economics: "#0891b2",
  engineering: "#c026d3",
  psychology: "#db2777",
};

const FALLBACK_COLORS = [
  "#4f46e5",
  "#059669",
  "#0284c7",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

function accentForCategory(categories: string[]): string {
  const first = (categories[0] ?? "").toLowerCase();
  if (CATEGORY_COLORS[first]) return CATEGORY_COLORS[first];
  const hash = first
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

function inferType(fileUrl: string): PostType {
  const ext = fileUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "document";
}

function mapApiPost(p: ApiPost): DeletedPost {
  return {
    id: p.id,
    title: p.title,
    subject: p.categories[0]
      ? p.categories[0].charAt(0).toUpperCase() + p.categories[0].slice(1)
      : "Uncategorized",
    type: inferType(p.fileUrl),
    deletedAt: (() => { const d = new Date(p.deletedAt); return isNaN(d.getTime()) ? new Date() : d; })(),
    accentColor: accentForCategory(p.categories),
  };
}

function daysAgo(date: Date): number {
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
}

function daysRemaining(date: Date): number {
  return 30 - daysAgo(date);
}

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

function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-[20px] border border-edge bg-surface p-3.5">
      <div className="h-16 w-14 shrink-0 animate-pulse rounded-[14px] bg-edge" />
      <div className="flex flex-1 flex-col gap-2.5 pt-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-edge" />
        <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-edge" />
        <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-edge" />
      </div>
    </div>
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
            <p className="truncate text-sm font-medium text-ink">{post.title}</p>
            <p className="mt-0.5 text-xs text-ink-3">{post.subject}</p>
          </div>
          <UrgencyPill remaining={remaining} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-ink-3">
            Deleted{" "}
            {ago === 0 ? "today" : ago === 1 ? "yesterday" : `${ago} days ago`}
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
              type="button"
              aria-label="Delete permanently"
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
  const [posts, setPosts] = useState<DeletedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "restore" | "delete";
  } | null>(null);

  useEffect(() => {
    fetch("/api/posts/deleted")
      .then((r) => r.json())
      .then((data) => {
        setPosts((data.posts ?? []).map(mapApiPost));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(message: string, type: "restore" | "delete") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function handleRestore(id: string) {
    const post = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));

    const res = await fetch("/api/posts/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    });

    if (!res.ok) {
      setPosts((prev) => (post ? [post, ...prev] : prev));
      showToast("Failed to restore post", "delete");
    } else {
      if (post) showToast(`"${post.title.slice(0, 30)}…" restored`, "restore");
    }
  }

  async function handleDelete(id: string) {
    const post = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));

    const res = await fetch("/api/posts/permanently-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    });

    if (!res.ok) {
      setPosts((prev) => (post ? [post, ...prev] : prev));
      showToast("Failed to delete post", "delete");
    } else {
      showToast("Permanently deleted", "delete");
    }
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

        {!loading && urgentPosts.length > 0 && (
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

        {loading ? (
          <div className="space-y-2.5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-2.5">
            <div className="px-1">
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
