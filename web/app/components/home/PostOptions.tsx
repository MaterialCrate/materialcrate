"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Edit2,
  EyeSlash,
  Flag,
  MessageQuestion,
  ProfileAdd,
  Slash,
  Trash,
  VolumeMute,
  Location,
  LocationSlash,
  Clock,
} from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";
import type { HomePost, PostOptionsAnchor } from "./Post";

interface OptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post?: HomePost | null;
  anchor?: PostOptionsAnchor | null;
  onEditPost?: (post: HomePost) => void;
  onPostPinned?: (post: HomePost) => void;
  onPostUpdated?: (post: HomePost) => void;
  onPostDeleted?: (postId: string) => void;
  onPostHidden?: (postId: string) => void;
}

export default function OptionsOptions({
  isOpen,
  onClose,
  post,
  anchor,
  onEditPost,
  onPostPinned,
  onPostUpdated,
  onPostDeleted,
  onPostHidden,
}: OptionsDrawerProps) {
  const router = useRouter();
  const drawerRef = React.useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [isPinning, setIsPinning] = React.useState(false);
  const [isTogglingComments, setIsTogglingComments] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = React.useState(false);
  const [isUpdatingMute, setIsUpdatingMute] = React.useState(false);
  const [isMarkingUninterested, setIsMarkingUninterested] =
    React.useState(false);
  const author = post?.author;
  const username = author?.username?.trim()
    ? `@${author.username}`
    : "@unknown";
  const isOwner =
    Boolean(user?.username?.trim()) &&
    user?.username?.trim().toLowerCase() ===
      author?.username?.trim().toLowerCase();
  const pinActionLabel = post?.pinned ? "Unpin from profile" : "Pin to profile";
  const commentsActionLabel = post?.commentsDisabled
    ? "Enable comments"
    : "Disable comments";
  const followActionLabel = post?.isAuthorFollowedByCurrentUser
    ? `Unfollow ${username}`
    : `Follow ${username}`;
  const muteActionLabel = post?.isAuthorMutedByCurrentUser
    ? `Unmute ${username}`
    : `Mute ${username}`;
  const pinActionIcon = post?.pinned ? (
    <LocationSlash size={20} color="#111111" variant="Bold" />
  ) : (
    <Location size={20} color="#111111" variant="Bold" />
  );

  const primaryActions = isOwner
    ? [
        {
          label: "Edit post",
          icon: <Edit2 size={20} color="#111111" variant="Bold" />,
        },
        {
          label: pinActionLabel,
          icon: pinActionIcon,
        },
        {
          label: commentsActionLabel,
          icon: <MessageQuestion size={20} color="#111111" variant="Bold" />,
        },
      ]
    : [
        {
          label: followActionLabel,
          icon: <ProfileAdd size={20} color="#111111" variant="Bold" />,
        },
        {
          label: muteActionLabel,
          icon: <VolumeMute size={20} color="#111111" variant="Bold" />,
        },
        {
          label: "Not interested in this post",
          icon: <EyeSlash size={20} color="#111111" variant="Bold" />,
        },
        {
          label: `Block ${username}`,
          icon: <Slash size={20} color="#111111" />,
        },
      ];

  const secondaryAction = {
    label: "View history",
    icon: <Clock size={20} color="#111111" variant="Bold" />,
  };

  const destructiveAction = isOwner
    ? {
        label: "Delete post",
        icon: <Trash size={20} color="#D12F2F" variant="Bold" />,
      }
    : {
        label: "Report post",
        icon: <Flag size={20} color="#D12F2F" variant="Bold" />,
      };

  const [anchoredPosition, setAnchoredPosition] = React.useState<
    React.CSSProperties | undefined
  >(undefined);

  React.useLayoutEffect(() => {
    if (!anchor || typeof window === "undefined" || !isOpen) {
      setAnchoredPosition(undefined);
      return;
    }

    const updatePosition = () => {
      const gap = 8;
      const viewportPadding = 16;
      const viewportHeight = window.innerHeight;
      const drawerHeight = drawerRef.current?.offsetHeight ?? 0;
      const right = Math.max(
        viewportPadding,
        Math.round(window.innerWidth - anchor.right),
      );

      const fitsBelow =
        anchor.bottom + gap + drawerHeight <= viewportHeight - viewportPadding;

      if (fitsBelow) {
        setAnchoredPosition({
          top: `${Math.round(anchor.bottom + gap)}px`,
          right: `${right}px`,
        });
        return;
      }

      const top = Math.max(
        viewportPadding,
        Math.round(anchor.top - drawerHeight - gap),
      );

      setAnchoredPosition({
        top: `${top}px`,
        right: `${right}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [anchor, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (drawerRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={drawerRef}
      style={anchoredPosition}
      className={`fixed z-100 rounded-4xl border border-black/6 bg-white p-2 shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out ${
        anchoredPosition ? "left-auto" : "inset-x-4 bottom-4 mx-auto"
      } ${
        isOpen
          ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
          : "translate-y-4 scale-[0.96] opacity-0 pointer-events-none"
      }`}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="overflow-hidden rounded-[26px] bg-[#F7F7F7]">
            {primaryActions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                disabled={
                  isPinning ||
                  isTogglingComments ||
                  isDeleting ||
                  isUpdatingFollow ||
                  isUpdatingMute ||
                  isMarkingUninterested
                }
                onClick={async () => {
                  if (!post) return;

                  if (action.label === "Edit post") {
                    onEditPost?.(post);
                    return;
                  }

                  if (
                    action.label === `Follow ${username}` ||
                    action.label === `Unfollow ${username}`
                  ) {
                    const targetUsername = post.author?.username?.trim();
                    if (!targetUsername) return;

                    const shouldUnfollow = Boolean(
                      post.isAuthorFollowedByCurrentUser,
                    );
                    const optimisticPost = {
                      ...post,
                      isAuthorFollowedByCurrentUser: !shouldUnfollow,
                    };

                    onPostUpdated?.(optimisticPost);

                    try {
                      setIsUpdatingFollow(true);
                      const response = await fetch(
                        `/api/users/${encodeURIComponent(targetUsername)}/follow`,
                        {
                          method: shouldUnfollow ? "DELETE" : "POST",
                        },
                      );
                      const body = await response.json().catch(() => ({}));

                      if (!response.ok) {
                        throw new Error(
                          body?.error || "Failed to update follow state",
                        );
                      }

                      onClose();
                    } catch (error) {
                      onPostUpdated?.(post);
                      console.error("Failed to update follow state:", error);
                    } finally {
                      setIsUpdatingFollow(false);
                    }

                    return;
                  }

                  if (
                    action.label === `Mute ${username}` ||
                    action.label === `Unmute ${username}`
                  ) {
                    const targetUsername = post.author?.username?.trim();
                    if (!targetUsername) return;

                    const shouldUnmute = Boolean(
                      post.isAuthorMutedByCurrentUser,
                    );
                    const optimisticPost = {
                      ...post,
                      isAuthorMutedByCurrentUser: !shouldUnmute,
                    };

                    onPostUpdated?.(optimisticPost);

                    try {
                      setIsUpdatingMute(true);
                      const response = await fetch(
                        `/api/users/${encodeURIComponent(targetUsername)}/mute`,
                        {
                          method: shouldUnmute ? "DELETE" : "POST",
                        },
                      );
                      const body = await response.json().catch(() => ({}));

                      if (!response.ok) {
                        throw new Error(
                          body?.error || "Failed to update mute state",
                        );
                      }

                      onClose();
                    } catch (error) {
                      onPostUpdated?.(post);
                      console.error("Failed to update mute state:", error);
                    } finally {
                      setIsUpdatingMute(false);
                    }

                    return;
                  }

                  if (action.label === "Not interested in this post") {
                    try {
                      setIsMarkingUninterested(true);
                      const response = await fetch("/api/posts/not-interested", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ postId: post.id }),
                      });
                      const body = await response.json().catch(() => ({}));

                      if (!response.ok || !body?.ok) {
                        throw new Error(
                          body?.error || "Failed to hide post from feed",
                        );
                      }

                      onPostHidden?.(post.id);
                      onClose();
                    } catch (error) {
                      console.error("Failed to hide post from feed:", error);
                    } finally {
                      setIsMarkingUninterested(false);
                    }

                    return;
                  }

                  if (
                    action.label === "Disable comments" ||
                    action.label === "Enable comments"
                  ) {
                    try {
                      setIsTogglingComments(true);
                      const response = await fetch("/api/posts/comments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ postId: post.id }),
                      });
                      const body = await response.json().catch(() => ({}));

                      if (!response.ok || !body?.post) {
                        throw new Error(
                          body?.error || "Failed to update comment settings",
                        );
                      }

                      onPostUpdated?.(body.post);
                      onClose();
                    } catch (error) {
                      console.error(
                        "Failed to update comment settings:",
                        error,
                      );
                    } finally {
                      setIsTogglingComments(false);
                    }

                    return;
                  }

                  if (
                    action.label !== "Pin to profile" &&
                    action.label !== "Unpin from profile"
                  ) {
                    return;
                  }

                  try {
                    setIsPinning(true);
                    const response = await fetch("/api/posts/pin", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ postId: post.id }),
                    });
                    const body = await response.json().catch(() => ({}));

                    if (!response.ok || !body?.post) {
                      throw new Error(body?.error || "Failed to pin post");
                    }

                    onPostPinned?.(body.post);
                    onPostUpdated?.(body.post);
                    onClose();
                  } catch (error) {
                    console.error("Failed to pin post:", error);
                  } finally {
                    setIsPinning(false);
                  }
                }}
                className={`flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-black/3 disabled:opacity-60 active:opacity-40 transition-all duration-300 ${
                  index < primaryActions.length - 1 && "border-b border-black/6"
                }`}
              >
                <span>{action.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#111111]">
                    {action.label}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[26px] bg-[#F7F7F7] active:opacity-40 transition-opacity duration-300">
            {secondaryAction && (
              <button
                key={secondaryAction.label}
                type="button"
                disabled={!post}
                onClick={() => {
                  if (!post?.id) return;
                  router.push(`/post/${encodeURIComponent(post.id)}/history`);
                  onClose();
                }}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-black/3 disabled:opacity-60"
              >
                <span>{secondaryAction.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#111111]">
                    {secondaryAction.label}
                  </span>
                </span>
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-[26px] bg-[#FFF1F1] active:opacity-40 transition-opacity duration-300">
            <button
              type="button"
              disabled={!post || isDeleting || isPinning || isTogglingComments}
              onClick={async () => {
                if (!post || !isOwner) return;

                try {
                  setIsDeleting(true);
                  const response = await fetch("/api/posts/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId: post.id }),
                  });
                  const body = await response.json().catch(() => ({}));

                  if (!response.ok || !body?.ok) {
                    throw new Error(body?.error || "Failed to delete post");
                  }

                  onPostDeleted?.(post.id);
                  onClose();
                } catch (error) {
                  console.error("Failed to delete post:", error);
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[#ffe7e7]"
            >
              <span>{destructiveAction.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm text-[#D12F2F]">
                  {destructiveAction.label}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
