import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CloseCircle, Heart, Send, User, Verify } from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";
import { subscribeToPostActivity } from "@/app/lib/post-activity-realtime";
import Alert from "../Alert";
import type { HomePost } from "./Post";

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string | null;
  post?: HomePost | null;
}

type CommentAuthor = {
  id: string;
  displayName?: string | null;
  username?: string | null;
  profilePicture?: string | null;
  profilePictureUrl?: string | null;
  subscriptionPlan?: string | null;
};

type DrawerComment = {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  replyCount: number;
  likeCount: number;
  viewerHasLiked?: boolean;
  createdAt: string;
  author?: CommentAuthor | null;
};

type ReplyTarget = {
  parentCommentId: string;
  mention: string;
};

const REPLIES_BATCH_SIZE = 10;
const COMMENTS_BATCH_SIZE = 50;
const COMMENTS_REALTIME_REFRESH_DEBOUNCE_MS = 700;
const COMMENTS_REALTIME_MIN_REFRESH_INTERVAL_MS = 1500;

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

function getAuthorName(author?: CommentAuthor | null) {
  const displayName = author?.displayName?.trim();
  if (displayName) return displayName;
  if (author?.username?.trim()) return author.username;
  return "Unknown user";
}

function getAuthorMention(author?: CommentAuthor | null) {
  const username = author?.username?.trim();
  if (username) return `@${username}`;

  const fallback = getAuthorName(author).replace(/\s+/g, "").toLowerCase();
  return `@${fallback || "user"}`;
}

function getAuthorProfilePicture(author?: CommentAuthor | null) {
  return author?.profilePicture || author?.profilePictureUrl || "";
}

function getAuthorSubscriptionPlan(author?: CommentAuthor | null) {
  return author?.subscriptionPlan?.trim().toLowerCase() || "";
}

export default function CommentDrawer({
  isOpen,
  onClose,
  postId,
  post,
}: CommentDrawerProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [comments, setComments] = useState<DrawerComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [expandedRepliesByCommentId, setExpandedRepliesByCommentId] = useState<
    Record<string, boolean>
  >({});
  const [repliesByCommentId, setRepliesByCommentId] = useState<
    Record<string, DrawerComment[]>
  >({});
  const [isLoadingRepliesByCommentId, setIsLoadingRepliesByCommentId] =
    useState<Record<string, boolean>>({});
  const [isLikingByCommentId, setIsLikingByCommentId] = useState<
    Record<string, boolean>
  >({});
  const expandedRepliesRef = React.useRef<Record<string, boolean>>({});
  const realtimeRefreshTimeoutRef = React.useRef<number | null>(null);
  const lastRealtimeRefreshRef = React.useRef(0);
  const isOwner =
    Boolean(typeof user?.username === "string" && user.username.trim()) &&
    typeof user?.username === "string" &&
    user.username.trim().toLowerCase() ===
      post?.author?.username?.trim().toLowerCase();
  const commentsLocked = Boolean(post?.commentsDisabled) && !isOwner;

  const resetState = useCallback(() => {
    setExpandedRepliesByCommentId({});
    setRepliesByCommentId({});
    setDraftComment("");
    setReplyTarget(null);
  }, []);

  const mentionRegex = useMemo(() => /(@[A-Za-z0-9._]+)/g, []);
  const ensureAuthenticated = useCallback(() => {
    if (isLoading) return false;
    if (!user) {
      router.push("/login");
      return false;
    }
    return true;
  }, [isLoading, router, user]);

  const fetchComments = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!postId) {
        setComments([]);
        return;
      }

      if (!silent) {
        setIsLoadingComments(true);
      }
      setCommentsError(null);

      try {
        const response = await fetch(
          `/api/comments?postId=${encodeURIComponent(postId)}&limit=${COMMENTS_BATCH_SIZE}&offset=0`,
          { method: "GET", cache: "no-store" },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load comments");
        }

        setComments(Array.isArray(body?.comments) ? body.comments : []);
      } catch (error) {
        if (!silent) {
          setComments([]);
        }
        setCommentsError("Failed to load comments");
        console.error("Failed to load comments for post", error);
      } finally {
        if (!silent) {
          setIsLoadingComments(false);
        }
      }
    },
    [postId],
  );

  useEffect(() => {
    if (!isOpen || !postId) return;
    void fetchComments();
  }, [fetchComments, isOpen, postId]);

  const loadReplies = useCallback(
    async (commentId: string, offset: number) => {
      if (!postId) return;

      setIsLoadingRepliesByCommentId((previous) => ({
        ...previous,
        [commentId]: true,
      }));

      try {
        const response = await fetch(
          `/api/comments?postId=${encodeURIComponent(postId)}&parentCommentId=${encodeURIComponent(commentId)}&limit=${REPLIES_BATCH_SIZE}&offset=${offset}`,
          { method: "GET", cache: "no-store" },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load replies");
        }

        const incomingReplies = Array.isArray(body?.comments)
          ? body.comments
          : [];
        setRepliesByCommentId((previous) => ({
          ...previous,
          [commentId]:
            offset === 0
              ? incomingReplies
              : [...(previous[commentId] ?? []), ...incomingReplies],
        }));
        setCommentsError(null);
      } catch (error) {
        setCommentsError("Failed to load replies");
        console.error("Failed to load replies for comment", commentId, error);
      } finally {
        setIsLoadingRepliesByCommentId((previous) => ({
          ...previous,
          [commentId]: false,
        }));
      }
    },
    [postId],
  );

  useEffect(() => {
    expandedRepliesRef.current = expandedRepliesByCommentId;
  }, [expandedRepliesByCommentId]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && realtimeRefreshTimeoutRef.current) {
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
      }
    };
  }, []);

  const scheduleRealtimeCommentsRefresh = useCallback(
    (delay = COMMENTS_REALTIME_REFRESH_DEBOUNCE_MS) => {
      if (!isOpen || !postId || typeof window === "undefined") {
        return;
      }

      if (document.visibilityState === "hidden") {
        return;
      }

      if (realtimeRefreshTimeoutRef.current) {
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      const elapsed = Date.now() - lastRealtimeRefreshRef.current;
      const nextDelay =
        elapsed >= COMMENTS_REALTIME_MIN_REFRESH_INTERVAL_MS
          ? delay
          : Math.max(
              delay,
              COMMENTS_REALTIME_MIN_REFRESH_INTERVAL_MS - elapsed,
            );

      realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
        lastRealtimeRefreshRef.current = Date.now();
        void fetchComments({ silent: true });

        Object.entries(expandedRepliesRef.current).forEach(
          ([commentId, isExpanded]) => {
            if (isExpanded) {
              void loadReplies(commentId, 0);
            }
          },
        );
      }, nextDelay);
    },
    [fetchComments, isOpen, loadReplies, postId],
  );

  const handleToggleReplies = async (comment: DrawerComment) => {
    const commentId = comment.id;
    const isOpenForComment = Boolean(expandedRepliesByCommentId[commentId]);

    if (isOpenForComment) {
      setExpandedRepliesByCommentId((previous) => ({
        ...previous,
        [commentId]: false,
      }));
      return;
    }

    setExpandedRepliesByCommentId((previous) => ({
      ...previous,
      [commentId]: true,
    }));

    if (!repliesByCommentId[commentId]?.length) {
      await loadReplies(commentId, 0);
    }
  };

  const handleShowMoreReplies = async (comment: DrawerComment) => {
    const commentId = comment.id;
    const currentReplies = repliesByCommentId[commentId] ?? [];
    await loadReplies(commentId, currentReplies.length);
  };

  const applyUpdatedComment = useCallback(
    (updated: Partial<DrawerComment> & { id: string }) => {
      setComments((previous) =>
        previous.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setRepliesByCommentId((previous) => {
        const next: Record<string, DrawerComment[]> = {};
        for (const [parentId, replies] of Object.entries(previous)) {
          next[parentId] = replies.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item,
          );
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || !postId) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isDisposed = false;

    void (async () => {
      const cleanup = await subscribeToPostActivity(postId, (event) => {
        if (event.commentId && typeof event.commentLikeCount === "number") {
          applyUpdatedComment({
            id: event.commentId,
            likeCount: event.commentLikeCount,
          });
        }

        if (event.parentCommentId && typeof event.replyCount === "number") {
          applyUpdatedComment({
            id: event.parentCommentId,
            replyCount: event.replyCount,
          });
        }

        if (event.reason === "comment-created") {
          scheduleRealtimeCommentsRefresh(250);
        }
      });

      if (isDisposed) {
        cleanup();
        return;
      }

      unsubscribe = cleanup;
    })();

    return () => {
      isDisposed = true;
      unsubscribe?.();
    };
  }, [applyUpdatedComment, isOpen, postId, scheduleRealtimeCommentsRefresh]);

  useEffect(() => {
    if (!isOpen || !postId || typeof window === "undefined") {
      return;
    }

    const handleResume = () => {
      if (document.visibilityState === "visible") {
        scheduleRealtimeCommentsRefresh(0);
      }
    };

    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [isOpen, postId, scheduleRealtimeCommentsRefresh]);

  const handleLikeComment = async (commentId: string) => {
    if (isLikingByCommentId[commentId] || !ensureAuthenticated()) return;

    setIsLikingByCommentId((previous) => ({ ...previous, [commentId]: true }));
    try {
      const response = await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to toggle comment like");
      }

      const updatedComment = body?.comment;
      if (updatedComment?.id) {
        applyUpdatedComment({
          id: updatedComment.id,
          likeCount:
            typeof updatedComment.likeCount === "number"
              ? updatedComment.likeCount
              : 0,
          viewerHasLiked: Boolean(updatedComment.viewerHasLiked),
        });
      }
      setCommentsError(null);
    } catch (error) {
      setCommentsError("Failed to toggle comment like");
      console.error("Failed to toggle like for comment", commentId, error);
    } finally {
      setIsLikingByCommentId((previous) => ({
        ...previous,
        [commentId]: false,
      }));
    }
  };

  const handleReplyToComment = (target: DrawerComment) => {
    if (commentsLocked) return;
    if (!ensureAuthenticated()) return;

    const parentCommentId = target.parentId ?? target.id;
    const mention = getAuthorMention(target.author);

    setReplyTarget({ parentCommentId, mention });
    setExpandedRepliesByCommentId((previous) => ({
      ...previous,
      [parentCommentId]: true,
    }));
    setDraftComment((previous) => {
      const trimmed = previous.trimStart();
      if (trimmed.startsWith(`${mention} `) || trimmed === mention) {
        return previous;
      }
      return `${mention} ${trimmed}`.trim();
    });
  };

  const renderContentWithMentions = (content: string) => {
    const parts = content.split(mentionRegex);
    const mentionPartRegex = /^@[A-Za-z0-9._]+$/;
    return parts.map((part, index) =>
      mentionPartRegex.test(part) ? (
        <span key={`${part}-${index}`} className="text-[#1A66FF] font-medium">
          {part}
        </span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ),
    );
  };

  const handleSubmitComment = async () => {
    const baseContent = draftComment.trim();
    const content = replyTarget
      ? baseContent.startsWith(replyTarget.mention)
        ? baseContent
        : `${replyTarget.mention} ${baseContent}`.trim()
      : baseContent;
    if (
      commentsLocked ||
      !postId ||
      !content ||
      isSubmittingComment ||
      !ensureAuthenticated()
    ) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content,
          parentCommentId: replyTarget?.parentCommentId ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to post comment");
      }

      if (body?.comment) {
        const createdComment = body.comment as DrawerComment;
        if (replyTarget?.parentCommentId) {
          setRepliesByCommentId((previous) => ({
            ...previous,
            [replyTarget.parentCommentId]: [
              ...(previous[replyTarget.parentCommentId] ?? []),
              createdComment,
            ],
          }));
          setComments((previous) =>
            previous.map((item) =>
              item.id === replyTarget.parentCommentId
                ? { ...item, replyCount: item.replyCount + 1 }
                : item,
            ),
          );
          setExpandedRepliesByCommentId((previous) => ({
            ...previous,
            [replyTarget.parentCommentId]: true,
          }));
        } else {
          setComments((previous) => [createdComment, ...previous]);
        }
      }
      setDraftComment("");
      setReplyTarget(null);
      setCommentsError(null);
    } catch (error) {
      setCommentsError("Failed to post comment");
      console.error("Failed to post comment", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && realtimeRefreshTimeoutRef.current) {
      window.clearTimeout(realtimeRefreshTimeoutRef.current);
      realtimeRefreshTimeoutRef.current = null;
    }

    resetState();
    onClose();
  };

  return (
    <>
      {commentsError && <Alert type="error" message={commentsError} />}
      <div
        className={`fixed inset-x-0 top-[15%] bottom-0 bg-white z-100 rounded-t-3xl px-6 py-6 space-y-3 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-[110%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex justify-center items-center relative">
          <h1 className="text-lg text-[#202020] font-medium">Comments</h1>
          <button
            type="button"
            aria-label="Close comments"
            onClick={handleClose}
            className="absolute right-0"
          >
            <CloseCircle size={24} color="#959595" />
          </button>
        </div>
        <div className="relative space-y-4 pb-18">
          {!postId ? (
            <p className="text-xs text-[#6D6D6D]">
              Select a post to view comments.
            </p>
          ) : isLoadingComments ? (
            <p className="text-xs text-[#6D6D6D]">Loading comments...</p>
          ) : comments.length === 0 ? null : (
            comments.map((comment) => {
              const commentId = comment.id;
              const isRepliesOpen = Boolean(
                expandedRepliesByCommentId[commentId],
              );
              const replies = repliesByCommentId[commentId] ?? [];
              const hasMoreReplies = replies.length < comment.replyCount;
              const hiddenRepliesCount = comment.replyCount - replies.length;
              const isLoadingReplies = Boolean(
                isLoadingRepliesByCommentId[commentId],
              );

              return (
                <div key={commentId}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 bg-[#D3D3D3] aspect-square rounded-full flex items-center justify-center overflow-hidden">
                      {getAuthorProfilePicture(comment.author) ? (
                        <Image
                          src={getAuthorProfilePicture(comment.author)}
                          alt={`${getAuthorName(comment.author)}'s profile picture`}
                          width={28}
                          height={28}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized
                        />
                      ) : (
                        <User size={14} color="#808080" variant="Bold" />
                      )}
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-0.5">
                        <p className="text-xs text-[#444444] font-semibold">
                          {getAuthorName(comment.author)}
                        </p>
                        {getAuthorSubscriptionPlan(comment.author) === "pro" ? (
                          <Verify size={14} color="#E1761F" variant="Bold" />
                        ) : null}
                      </div>
                      <p className="text-xs text-[#202020]">
                        {renderContentWithMentions(comment.content)}
                      </p>
                      <div className="flex items-center font-medium justify-between text-xs text-[#5B5B5B] ">
                        <div className="flex items-center gap-5">
                          <p>{formatTimeAgo(comment.createdAt)}</p>
                          <button
                            type="button"
                            onClick={() => handleReplyToComment(comment)}
                            disabled={commentsLocked}
                            className="disabled:opacity-50"
                          >
                            Reply
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="">{comment.likeCount ?? 0}</p>
                          <button
                            type="button"
                            aria-label="like button"
                            onClick={() => void handleLikeComment(comment.id)}
                            disabled={Boolean(isLikingByCommentId[comment.id])}
                            className="disabled:opacity-60"
                          >
                            <Heart
                              size={18}
                              color={
                                comment.viewerHasLiked ? "#E00505" : "#808080"
                              }
                              variant={
                                comment.viewerHasLiked ? "Bold" : "Linear"
                              }
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {comment.replyCount > 0 ? (
                    <div className="flex items-center gap-2 ml-9 mt-3 ">
                      <div className="pointer-events-none h-px w-4 border border-[#A8A8A8]/20 " />
                      <button
                        type="button"
                        onClick={() => void handleToggleReplies(comment)}
                        className="text-xs text-[#7C7C7C] font-medium"
                      >
                        {isRepliesOpen
                          ? "Close replies"
                          : `View all ${comment.replyCount} replies`}
                      </button>
                    </div>
                  ) : null}

                  {isRepliesOpen ? (
                    <div className="ml-11 mt-3 space-y-3">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3 ">
                          <div className="w-10 aspect-square bg-[#D3D3D3] rounded-full flex items-center justify-center overflow-hidden">
                            {getAuthorProfilePicture(reply.author) ? (
                              <Image
                                src={getAuthorProfilePicture(reply.author)}
                                alt={`${getAuthorName(reply.author)}'s profile picture`}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover rounded-full"
                                unoptimized
                              />
                            ) : (
                              <User size={14} color="#808080" variant="Bold" />
                            )}
                          </div>
                          <div className="space-y-1 w-full">
                            <div className="flex items-center gap-0.5">
                              <p className="text-xs text-[#444444] font-semibold">
                                {getAuthorName(reply.author)}
                              </p>
                              {getAuthorSubscriptionPlan(reply.author) ===
                              "pro" ? (
                                <Verify
                                  size={14}
                                  color="#E1761F"
                                  variant="Bold"
                                />
                              ) : null}
                            </div>
                            <p className="text-xs text-[#202020]">
                              {renderContentWithMentions(reply.content)}
                            </p>
                            <div className="flex items-center justify-between text-xs text-[#5B5B5B] font-medium ">
                              <div className="flex items-center gap-5">
                                <p>{formatTimeAgo(reply.createdAt)}</p>
                                <button
                                  type="button"
                                  onClick={() => handleReplyToComment(reply)}
                                  disabled={commentsLocked}
                                  className="disabled:opacity-50"
                                >
                                  Reply
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <p>{reply.likeCount ?? 0}</p>
                                <button
                                  type="button"
                                  aria-label="like comment"
                                  onClick={() =>
                                    void handleLikeComment(reply.id)
                                  }
                                  disabled={Boolean(
                                    isLikingByCommentId[reply.id],
                                  )}
                                  className="disabled:opacity-60"
                                >
                                  <Heart
                                    size={18}
                                    color={
                                      reply.viewerHasLiked
                                        ? "#E00505"
                                        : "#808080"
                                    }
                                    variant={
                                      reply.viewerHasLiked ? "Bold" : "Linear"
                                    }
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoadingReplies ? (
                        <p className="text-xs text-[#7C7C7C]">
                          Loading replies...
                        </p>
                      ) : null}
                      {hasMoreReplies && !isLoadingReplies ? (
                        <button
                          type="button"
                          onClick={() => void handleShowMoreReplies(comment)}
                          className="text-xs text-[#7C7C7C] font-medium"
                        >
                          Show 10 more replies ({hiddenRepliesCount} left)
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <div className="absolute bottom-8 left-6 right-6 space-y-2">
          {replyTarget ? (
            <div className="flex items-center justify-between text-[11px] text-[#6A6A6A] px-1">
              <p>
                Replying to{" "}
                <span className="text-[#1A66FF] font-semibold">
                  {replyTarget.mention}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="text-[#6A6A6A]"
              >
                Cancel
              </button>
            </div>
          ) : null}
          {commentsLocked ? (
            <p className="px-1 text-[11px] text-[#6A6A6A]">
              Comments are disabled for this post.
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-7">
            <input
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              placeholder={
                commentsLocked
                  ? "Comments are disabled"
                  : "Share your thoughts... "
              }
              disabled={commentsLocked}
              className="placeholder:text-[#828282] placeholder:text-xs text-xs py-3 px-3 w-full bg-[#EBEBEB] rounded-3xl drop-shadow-xs focus:outline-0 disabled:opacity-60"
            />
            <button
              type="button"
              aria-label="submit comment"
              onClick={() => void handleSubmitComment()}
              disabled={
                commentsLocked ||
                !postId ||
                !draftComment.trim() ||
                isSubmittingComment
              }
              className="disabled:opacity-50"
            >
              <Send size={32} color="#5B5B5B" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
