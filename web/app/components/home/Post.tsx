"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { More, Heart, Messages2, Archive, User, Verify } from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";
import Image from "next/image";
import PdfThumbnail from "./PdfThumbnail";

export type HomePost = {
  id: string;
  fileUrl: string;
  title: string;
  courseCode: string;
  description?: string | null;
  year?: number | null;
  likeCount?: number;
  commentCount?: number;
  viewerHasLiked?: boolean;
  createdAt: string;
  author?: {
    id: string;
    displayName: string;
    username: string;
    profilePicture?: string | null;
    profilePictureUrl?: string | null;
    subscriptionPlan?: string | null;
  } | null;
};

type PostProps = {
  post: HomePost;
  onCommentClick?: (post: HomePost) => void;
  onOptionsClick?: (post: HomePost) => void;
  onFileClick?: (post: HomePost) => void;
};

function formatTimeAgo(timestamp: string) {
  const trimmed = timestamp?.trim();
  if (!trimmed) return "Just now";

  let value = Number.NaN;
  const numericTimestamp = Number(trimmed);

  if (Number.isFinite(numericTimestamp)) {
    value =
      numericTimestamp < 1_000_000_000_000
        ? numericTimestamp * 1000
        : numericTimestamp;
  } else {
    value = new Date(trimmed).getTime();
  }

  if (Number.isNaN(value)) return "Just now";

  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Post({
  post,
  onCommentClick,
  onOptionsClick,
  onFileClick,
}: PostProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const authorFullName = post.author?.displayName?.trim() || "Unknown user";
  const authorUsername = post.author?.username
    ? `@${post.author.username}`
    : "@unknown";
  const authorProfilePicture = post.author?.profilePicture;
  const subscriptionPlan = post.author?.subscriptionPlan?.trim().toLowerCase();
  const authorRoute = post.author?.username
    ? `/user/${encodeURIComponent(post.author.username)}`
    : null;
  const createdLabel = formatTimeAgo(post.createdAt);
  const [likeCount, setLikeCount] = useState<number>(post.likeCount ?? 0);
  const [viewerHasLiked, setViewerHasLiked] = useState<boolean>(
    Boolean(post.viewerHasLiked),
  );
  const [isLiking, setIsLiking] = useState<boolean>(false);

  const ensureAuthenticated = () => {
    if (isLoading) return false;
    if (!user) {
      router.push("/login");
      return false;
    }
    return true;
  };

  const handleLike = async () => {
    if (isLiking || !ensureAuthenticated()) return;

    setIsLiking(true);
    try {
      const response = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to toggle like");
      }

      const nextLikeCount = body?.post?.likeCount;
      const nextViewerHasLiked = body?.post?.viewerHasLiked;

      setLikeCount((previous) =>
        Number.isFinite(nextLikeCount) ? nextLikeCount : previous,
      );
      setViewerHasLiked(Boolean(nextViewerHasLiked));
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center px-6">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => {
            if (!authorRoute) return;
            router.push(authorRoute);
          }}
          disabled={!authorRoute}
        >
          <div className="w-10 h-10 aspect-square bg-[#F3F3F3] rounded-full flex items-center justify-center overflow-hidden">
            {authorProfilePicture ? (
              <Image
                src={authorProfilePicture}
                alt={`${authorFullName}'s profile picture`}
                className="object-cover rounded-full"
                width={40}
                height={40}
                unoptimized
              />
            ) : (
              <User size={18} color="#808080" variant="Bold" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              <p className="font-medium text-[#202020]">{authorFullName}</p>
              {subscriptionPlan === "pro" && (
                <Verify size={18} color="#E1761F" variant="Bold" />
              )}
            </div>
            <div className="text-[#8C8C8C] text-xs font-medium flex items-center gap-1.5">
              <p>{authorUsername}</p>
              <p>&bull;</p>
              <p>{createdLabel}</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          aria-label="Post options"
          onClick={() => onOptionsClick?.(post)}
        >
          <More size={28} color="#959595" />
        </button>
      </div>
      {post.description && (
        <div className="px-6">
          <p className="text-[#373737] text-sm">{post.description}</p>
        </div>
      )}
      <div className="overflow-y-scroll flex gap-3 px-6">
        <button
          type="button"
          aria-label={`Open ${post.title}`}
          onClick={() => onFileClick?.(post)}
          className="bg-[#F3F3F3] h-45 w-full rounded p-2 flex items-center gap-4"
        >
          <PdfThumbnail fileUrl={post.fileUrl} title={post.title} />
          <div className="space-y-1 text-left h-full">
            <p className="text-[#202020] font-medium text-sm">{post.title}</p>
            <div className="text-[#8C8C8C] text-xs font-medium flex items-center gap-1.5">
              <p>{post.courseCode}</p>
              {post.year && (
                <>
                  <p>&bull;</p>
                  <p>{post.year}</p>
                </>
              )}
            </div>
          </div>
        </button>
      </div>
      <div className="px-6 flex items-center gap-20">
        <button
          type="button"
          className="flex items-center gap-1.5 disabled:opacity-60"
          onClick={handleLike}
          disabled={isLiking}
        >
          <Heart
            size={24}
            color={viewerHasLiked ? "#E00505" : "#808080"}
            variant={viewerHasLiked ? "Bold" : "Linear"}
          />
          <p className="text-[#808080] text-xs">{likeCount}</p>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5"
          onClick={() => {
            if (!ensureAuthenticated()) return;
            onCommentClick?.(post);
          }}
        >
          <Messages2 size={24} color="#808080" />
          <p className="text-[#808080] text-xs">{post.commentCount ?? 0}</p>
        </button>
        <Archive size={24} color="#808080" />
      </div>
    </div>
  );
}
