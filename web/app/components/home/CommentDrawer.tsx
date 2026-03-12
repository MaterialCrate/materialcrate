import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CloseCircle, Heart, Send, User } from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string | null;
}

type CommentAuthor = {
  id: string;
  displayName?: string | null;
  username?: string | null;
  profilePicture?: string | null;
  profilePictureUrl?: string | null;
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

function formatTimeAgo(timestamp: string) {
  const value = new Date(timestamp).getTime();
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

export default function CommentDrawer({
  isOpen,
  onClose,
  postId,
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

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([]);
      return;
    }

    setIsLoadingComments(true);
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
      setComments([]);
      setCommentsError(
        error instanceof Error ? error.message : "Failed to load comments",
      );
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!isOpen || !postId) return;
    void fetchComments();
  }, [fetchComments, isOpen, postId]);

  const loadReplies = async (commentId: string, offset: number) => {
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
      setCommentsError(
        error instanceof Error ? error.message : "Failed to load replies",
      );
    } finally {
      setIsLoadingRepliesByCommentId((previous) => ({
        ...previous,
        [commentId]: false,
      }));
    }
  };

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
      setCommentsError(
        error instanceof Error
          ? error.message
          : "Failed to toggle comment like",
      );
    } finally {
      setIsLikingByCommentId((previous) => ({
        ...previous,
        [commentId]: false,
      }));
    }
  };

  const handleReplyToComment = (target: DrawerComment) => {
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
    if (!postId || !content || isSubmittingComment || !ensureAuthenticated()) {
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
      setCommentsError(
        error instanceof Error ? error.message : "Failed to post comment",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div
      className={`fixed inset-x-0 top-40 bottom-0 bg-white z-100 rounded-t-3xl px-6 py-6 space-y-3 transition-all duration-300 ease-out ${
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
                  <div className="h-6 w-6 aspect-square bg-[#D3D3D3] rounded-full flex items-center justify-center overflow-hidden">
                    {getAuthorProfilePicture(comment.author) ? (
                      <Image
                        src={getAuthorProfilePicture(comment.author)}
                        alt={`${getAuthorName(comment.author)}'s profile picture`}
                        width={24}
                        height={24}
                        className="w-full h-full object-cover rounded-full"
                        unoptimized
                      />
                    ) : (
                      <User size={14} color="#808080" variant="Bold" />
                    )}
                  </div>
                  <div className="space-y-1 w-full">
                    <p className="text-xs text-[#444444] font-semibold">
                      {getAuthorName(comment.author)}
                    </p>
                    <p className="text-xs text-[#202020]">
                      {renderContentWithMentions(comment.content)}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-[#5B5B5B] font-medium flex items-center gap-5">
                        <p>{formatTimeAgo(comment.createdAt)}</p>
                        <button
                          type="button"
                          onClick={() => void handleLikeComment(comment.id)}
                          disabled={Boolean(isLikingByCommentId[comment.id])}
                          className="disabled:opacity-60"
                        >
                          Like
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplyToComment(comment)}
                        >
                          Reply
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] text-[#5B5B5B] font-medium">
                          {comment.likeCount ?? 0}
                        </p>
                        <Heart
                          size={14}
                          color={comment.viewerHasLiked ? "#E00505" : "#808080"}
                          variant={comment.viewerHasLiked ? "Bold" : "Linear"}
                        />
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
                        <div className="h-5 w-5 aspect-square bg-[#D3D3D3] rounded-full flex items-center justify-center overflow-hidden">
                          {getAuthorProfilePicture(reply.author) ? (
                            <Image
                              src={getAuthorProfilePicture(reply.author)}
                              alt={`${getAuthorName(reply.author)}'s profile picture`}
                              width={20}
                              height={20}
                              className="w-full h-full object-cover rounded-full"
                              unoptimized
                            />
                          ) : (
                            <User size={12} color="#808080" variant="Bold" />
                          )}
                        </div>
                        <div className="space-y-1 w-full">
                          <p className="text-xs text-[#444444] font-semibold">
                            {getAuthorName(reply.author)}
                          </p>
                          <p className="text-xs text-[#202020]">
                            {renderContentWithMentions(reply.content)}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-[#5B5B5B] font-medium flex items-center gap-5">
                              <p>{formatTimeAgo(reply.createdAt)}</p>
                              <button
                                type="button"
                                onClick={() => void handleLikeComment(reply.id)}
                                disabled={Boolean(
                                  isLikingByCommentId[reply.id],
                                )}
                                className="disabled:opacity-60"
                              >
                                Like
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplyToComment(reply)}
                              >
                                Reply
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <p className="text-[10px] text-[#5B5B5B] font-medium">
                                {reply.likeCount ?? 0}
                              </p>
                              <Heart
                                size={14}
                                color={
                                  reply.viewerHasLiked ? "#E00505" : "#808080"
                                }
                                variant={
                                  reply.viewerHasLiked ? "Bold" : "Linear"
                                }
                              />
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
        {commentsError ? (
          <p className="text-xs text-[#B10000]">{commentsError}</p>
        ) : null}
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
        <div className="flex items-center justify-between gap-7">
          <input
            value={draftComment}
            onChange={(event) => setDraftComment(event.target.value)}
            placeholder="Share your thoughts... "
            className="placeholder:text-[#828282] text-xs py-3 px-3 w-full bg-[#EBEBEB] rounded-3xl drop-shadow-xs focus:outline-0"
          />
          <button
            type="button"
            aria-label="submit comment"
            onClick={() => void handleSubmitComment()}
            disabled={!postId || !draftComment.trim() || isSubmittingComment}
            className="disabled:opacity-50"
          >
            <Send size={32} color="#5B5B5B" />
          </button>
        </div>
      </div>
    </div>
  );
}
