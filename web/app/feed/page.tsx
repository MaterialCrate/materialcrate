"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentUpload, More2, Notification } from "iconsax-reactjs";
import Post, {
  type HomePost,
  type PostOptionsAnchor,
} from "../components/home/Post";
import UploadDrawer from "../components/home/UploadDrawer";
import CommentDrawer from "../components/home/CommentDrawer";
import OptionsDrawer from "../components/home/PostOptions";
import PdfViewerModal from "../components/home/PdfViewerModal";
import Header from "../components/home/Header";
import ArchiveDrawer from "../components/home/ArchiveDrawer";
import Spinner from "../components/Spinner";

type ArchiveSavedPost = {
  id: string;
  postId: string;
};

type NotificationListItem = {
  id: string | number;
  unread?: boolean;
  time?: string;
};

const NOTIFICATIONS_LAST_OPENED_AT_STORAGE_KEY =
  "mc.notifications.lastOpenedAt";
const FEED_PAGE_SIZE = 15;

export default function Home() {
  const router = useRouter();
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<HomePost | null>(null);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [isPostOptionsDrawerOpen, setIsPostOptionsDrawerOpen] = useState(false);
  const [isArchiveDrawerOpen, setIsArchiveDrawerOpen] = useState(false);
  const [archiveCloseRequestKey, setArchiveCloseRequestKey] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [activeCommentPost, setActiveCommentPost] = useState<HomePost | null>(
    null,
  );
  const [activeOptionsPost, setActiveOptionsPost] = useState<HomePost | null>(
    null,
  );
  const [activeOptionsAnchor, setActiveOptionsAnchor] =
    useState<PostOptionsAnchor | null>(null);
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);
  const [activeArchivePost, setActiveArchivePost] = useState<HomePost | null>(
    null,
  );
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [archiveSavedPostIdsByPostId, setArchiveSavedPostIdsByPostId] =
    useState<Record<string, string>>({});
  const [archiveBusyPostIds, setArchiveBusyPostIds] = useState<
    Record<string, boolean>
  >({});
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [hasUnopenedNotifications, setHasUnopenedNotifications] =
    useState(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const refreshNotificationIndicators = async () => {
    try {
      const response = await fetch(
        "/api/notifications?limit=100&unreadOnly=true",
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        return;
      }

      const notifications = Array.isArray(body?.notifications)
        ? (body.notifications as NotificationListItem[])
        : [];

      setUnreadNotificationCount(notifications.length);

      if (typeof window === "undefined") {
        setHasUnopenedNotifications(notifications.length > 0);
        return;
      }

      const lastOpenedAt = Number.parseInt(
        window.localStorage.getItem(NOTIFICATIONS_LAST_OPENED_AT_STORAGE_KEY) ||
          "0",
        10,
      );

      const newestUnreadAt = notifications.reduce((latest, notification) => {
        const createdAt = Date.parse(notification.time || "");
        return Number.isFinite(createdAt)
          ? Math.max(latest, createdAt)
          : latest;
      }, 0);

      setHasUnopenedNotifications(
        notifications.length > 0 && newestUnreadAt > lastOpenedAt,
      );
    } catch {}
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      try {
        const response = await fetch(
          `/api/posts?limit=${FEED_PAGE_SIZE}&offset=0`,
          {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const body = await response.json().catch(() => ({}));
        const initialPosts = Array.isArray(body?.posts) ? body.posts : [];
        setPosts(initialPosts);
        setNextOffset(initialPosts.length);
        setHasMorePosts(Boolean(body?.hasMore));
      } catch {
        if (!controller.signal.aborted) {
          setPosts([]);
          setNextOffset(0);
          setHasMorePosts(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPosts(false);
        }
      }
    }

    void loadPosts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadArchiveState = async () => {
      try {
        const response = await fetch("/api/archive", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          return;
        }

        const nextArchiveMap = Object.fromEntries(
          (Array.isArray(body?.archive?.savedPosts)
            ? body.archive.savedPosts
            : []
          ).map((savedPost: ArchiveSavedPost) => [
            savedPost.postId,
            savedPost.id,
          ]),
        );

        setArchiveSavedPostIdsByPostId(nextArchiveMap);
      } catch {
        if (!controller.signal.aborted) {
          setArchiveSavedPostIdsByPostId({});
        }
      }
    };

    void loadArchiveState();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    void refreshNotificationIndicators();

    const onWindowFocus = () => {
      void refreshNotificationIndicators();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNotificationIndicators();
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingPosts || isLoadingMorePosts || !hasMorePosts) {
      return;
    }

    setIsLoadingMorePosts(true);
    try {
      const response = await fetch(
        `/api/posts?limit=${FEED_PAGE_SIZE}&offset=${nextOffset}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const body = await response.json().catch(() => ({}));
      const incomingPosts = Array.isArray(body?.posts) ? body.posts : [];

      setPosts((current) => {
        const seenIds = new Set(current.map((post) => post.id));
        const dedupedIncoming = incomingPosts.filter(
          (post: HomePost) => !seenIds.has(post.id),
        );
        return [...current, ...dedupedIncoming];
      });
      setNextOffset((current) => current + incomingPosts.length);
      setHasMorePosts(Boolean(body?.hasMore));
    } catch {
      setHasMorePosts(false);
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [hasMorePosts, isLoadingMorePosts, isLoadingPosts, nextOffset]);

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: "0px 0px 240px 0px",
        threshold: 0,
      },
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [loadMorePosts]);

  const refreshArchiveState = async () => {
    try {
      const response = await fetch("/api/archive", {
        method: "GET",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const nextArchiveMap = Object.fromEntries(
        (Array.isArray(body?.archive?.savedPosts)
          ? body.archive.savedPosts
          : []
        ).map((savedPost: ArchiveSavedPost) => [
          savedPost.postId,
          savedPost.id,
        ]),
      );

      setArchiveSavedPostIdsByPostId(nextArchiveMap);
    } catch {}
  };

  const handleArchiveRemove = async (post: HomePost) => {
    const savedPostId = archiveSavedPostIdsByPostId[post.id];
    if (!savedPostId) return;

    setArchiveBusyPostIds((previous) => ({ ...previous, [post.id]: true }));

    try {
      const response = await fetch("/api/archive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedPostId }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to remove archived file");
      }

      setArchiveSavedPostIdsByPostId((previous) => {
        const next = { ...previous };
        delete next[post.id];
        return next;
      });
    } finally {
      setArchiveBusyPostIds((previous) => ({ ...previous, [post.id]: false }));
    }
  };

  const handlePostPinned = (pinnedPost: HomePost) => {
    setPosts((current) => {
      const nextPosts = current.map((post) => {
        if (post.id === pinnedPost.id) {
          return { ...post, ...pinnedPost, pinned: Boolean(pinnedPost.pinned) };
        }

        if (
          post.author?.id &&
          pinnedPost.author?.id &&
          post.author.id === pinnedPost.author.id
        ) {
          return { ...post, pinned: false };
        }

        return post;
      });

      return nextPosts;
    });

    setActiveOptionsPost((current) =>
      current?.id === pinnedPost.id
        ? { ...current, ...pinnedPost, pinned: Boolean(pinnedPost.pinned) }
        : current,
    );
  };

  const handlePostUpdated = (updatedPost: HomePost) => {
    const updatedAuthorUsername =
      updatedPost.author?.username?.trim().toLowerCase() || "";

    setPosts((current) =>
      current.map((post) =>
        post.id === updatedPost.id
          ? { ...post, ...updatedPost }
          : updatedAuthorUsername &&
              post.author?.username?.trim().toLowerCase() ===
                updatedAuthorUsername
            ? {
                ...post,
                isAuthorFollowedByCurrentUser:
                  updatedPost.isAuthorFollowedByCurrentUser,
                isAuthorMutedByCurrentUser:
                  updatedPost.isAuthorMutedByCurrentUser,
                isAuthorBlockedByCurrentUser:
                  updatedPost.isAuthorBlockedByCurrentUser,
              }
            : post,
      ),
    );
    setActiveOptionsPost((current) =>
      current?.id === updatedPost.id ? { ...current, ...updatedPost } : current,
    );
    setActiveCommentPost((current) =>
      current?.id === updatedPost.id ? { ...current, ...updatedPost } : current,
    );
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((current) => current.filter((post) => post.id !== deletedPostId));
    setActiveOptionsPost((current) =>
      current?.id === deletedPostId ? null : current,
    );
    setActiveCommentPost((current) =>
      current?.id === deletedPostId ? null : current,
    );
    setActiveCommentPostId((current) =>
      current === deletedPostId ? null : current,
    );
    setActivePdfPost((current) =>
      current?.id === deletedPostId ? null : current,
    );
    setActiveArchivePost((current) =>
      current?.id === deletedPostId ? null : current,
    );
    setArchiveSavedPostIdsByPostId((current) => {
      const next = { ...current };
      delete next[deletedPostId];
      return next;
    });
  };

  return (
    <div className="py-18">
      <ArchiveDrawer
        isOpen={isArchiveDrawerOpen}
        post={activeArchivePost}
        closeRequestKey={archiveCloseRequestKey}
        onClose={() => {
          setIsArchiveDrawerOpen(false);
          setActiveArchivePost(null);
          void refreshArchiveState();
        }}
      />
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        post={editingPost}
        onClose={() => {
          setIsUploadDrawerOpen(false);
          setEditingPost(null);
        }}
        onPostSaved={(savedPost, mode) => {
          if (mode === "edit") {
            setPosts((current) =>
              current.map((post) =>
                post.id === savedPost.id ? savedPost : post,
              ),
            );
            return;
          }

          setPosts((current) => [savedPost, ...current]);
          setNextOffset((current) => current + 1);
        }}
      />
      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => {
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
          setActiveCommentPost(null);
        }}
        postId={activeCommentPostId}
        post={activeCommentPost}
      />
      <OptionsDrawer
        isOpen={isPostOptionsDrawerOpen}
        onClose={() => {
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
        }}
        post={activeOptionsPost}
        anchor={activeOptionsAnchor}
        onPostPinned={handlePostPinned}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
        onPostHidden={(hiddenPostId) => {
          setPosts((current) =>
            current.filter((post) => post.id !== hiddenPostId),
          );
          setActiveOptionsPost((current) =>
            current?.id === hiddenPostId ? null : current,
          );
        }}
        onEditPost={(selectedPost) => {
          setEditingPost(selectedPost);
          setIsUploadDrawerOpen(true);
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
          setActiveCommentPost(null);
          setIsArchiveDrawerOpen(false);
          setActiveArchivePost(null);
          setActivePdfPost(null);
          setMoreOptionsOpen(false);
        }}
      />
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />
      <button
        aria-label="Close more options"
        type="button"
        className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
          moreOptionsOpen ||
          isUploadDrawerOpen ||
          isCommentDrawerOpen ||
          isPostOptionsDrawerOpen ||
          isArchiveDrawerOpen ||
          activePdfPost
            ? "bg-black/12 opacity-100 pointer-events-auto"
            : "bg-black/0 opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          if (isArchiveDrawerOpen) {
            setArchiveCloseRequestKey((previous) => previous + 1);
            return;
          }
          setMoreOptionsOpen(false);
          setIsUploadDrawerOpen(false);
          setEditingPost(null);
          setIsCommentDrawerOpen(false);
          setIsPostOptionsDrawerOpen(false);
          setActiveCommentPostId(null);
          setActiveCommentPost(null);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
          setActivePdfPost(null);
        }}
      />
      <div className="fixed right-6 bottom-28 z-50">
        <button
          aria-label="Upload button"
          type="button"
          onClick={() => {
            setEditingPost(null);
            setIsUploadDrawerOpen(true);
            setIsPostOptionsDrawerOpen(false);
            setActiveOptionsPost(null);
            setActiveOptionsAnchor(null);
            setIsCommentDrawerOpen(false);
            setActiveCommentPostId(null);
            setActiveCommentPost(null);
            setIsArchiveDrawerOpen(false);
            setActiveArchivePost(null);
            setActivePdfPost(null);
            setMoreOptionsOpen(false);
          }}
          className={`absolute right-0 bottom-16 flex items-center gap-3 rounded-3xl bg-white px-5 py-3 transition-all duration-300 ease-out ${
            moreOptionsOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-3 scale-95 pointer-events-none"
          }`}
        >
          <DocumentUpload size={24} variant="Bold" />
          <p>Upload</p>
        </button>
        <button
          aria-label="Upload button"
          type="button"
          className={`absolute right-16 bottom-0 flex items-center gap-3 rounded-3xl bg-white px-5 py-3 transition-all duration-300 ease-out ${
            moreOptionsOpen
              ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-x-3 scale-95 pointer-events-none"
          }`}
          onClick={() => {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                NOTIFICATIONS_LAST_OPENED_AT_STORAGE_KEY,
                String(Date.now()),
              );
            }
            setHasUnopenedNotifications(false);
            router.push("/notifications");
          }}
        >
          <div className="relative">
            <Notification size={24} variant="Bold" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-500 rounded-full transition-opacity duration-200 flex items-center justify-center text-white text-xs">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            )}
          </div>
          <p>Notification</p>
        </button>
        <button
          title="more actions"
          type="button"
          className={`w-12 h-12 relative bg-white drop-shadow-xl rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
            moreOptionsOpen ? "rotate-180 scale-105" : "rotate-0 scale-100"
          }`}
          onClick={() => setMoreOptionsOpen((prev) => !prev)}
        >
          <More2 size={30} />
          <span
            className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full transition-opacity duration-200 ${hasUnopenedNotifications && !moreOptionsOpen ? "opacity-100" : "opacity-0"}`}
          />
        </button>
      </div>
      <Header />
      <main>
        {isLoadingPosts ? (
          <p className="px-6 py-8 text-sm text-[#696969]">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[#696969]">No posts yet.</p>
        ) : (
          <>
            {posts.map((post, index) => (
              <div key={post.id} data-scroll-item>
                <Post
                  post={post}
                  isArchived={Boolean(archiveSavedPostIdsByPostId[post.id])}
                  isArchiveBusy={Boolean(archiveBusyPostIds[post.id])}
                  onCommentClick={(selectedPost) => {
                    setActiveCommentPostId(selectedPost.id);
                    setActiveCommentPost(selectedPost);
                    setIsCommentDrawerOpen(true);
                    setMoreOptionsOpen(false);
                    setIsUploadDrawerOpen(false);
                    setEditingPost(null);
                    setIsPostOptionsDrawerOpen(false);
                    setIsArchiveDrawerOpen(false);
                    setActiveOptionsPost(null);
                    setActiveOptionsAnchor(null);
                    setActiveArchivePost(null);
                  }}
                  onOptionsClick={(selectedPost, anchor) => {
                    setActiveOptionsPost(selectedPost);
                    setActiveOptionsAnchor(anchor);
                    setIsPostOptionsDrawerOpen(true);
                    setMoreOptionsOpen(false);
                    setIsUploadDrawerOpen(false);
                    setEditingPost(null);
                    setIsCommentDrawerOpen(false);
                    setIsArchiveDrawerOpen(false);
                    setActiveCommentPostId(null);
                    setActiveCommentPost(null);
                    setActivePdfPost(null);
                    setActiveArchivePost(null);
                  }}
                  onFileClick={(selectedPost) => {
                    setActivePdfPost(selectedPost);
                    setMoreOptionsOpen(false);
                    setIsUploadDrawerOpen(false);
                    setEditingPost(null);
                    setIsCommentDrawerOpen(false);
                    setActiveCommentPostId(null);
                    setActiveCommentPost(null);
                    setIsPostOptionsDrawerOpen(false);
                    setActiveOptionsPost(null);
                    setActiveOptionsAnchor(null);
                    setIsArchiveDrawerOpen(false);
                    setActiveArchivePost(null);
                  }}
                  onArchiveClick={(selectedPost) => {
                    setActiveArchivePost(selectedPost);
                    setIsArchiveDrawerOpen(true);
                    setMoreOptionsOpen(false);
                    setIsUploadDrawerOpen(false);
                    setEditingPost(null);
                    setIsCommentDrawerOpen(false);
                    setActiveCommentPostId(null);
                    setActiveCommentPost(null);
                    setIsPostOptionsDrawerOpen(false);
                    setActiveOptionsPost(null);
                    setActiveOptionsAnchor(null);
                    setActivePdfPost(null);
                  }}
                  onArchiveRemoveClick={(selectedPost) => {
                    void handleArchiveRemove(selectedPost);
                  }}
                />
                {index < posts.length - 1 && (
                  <div className="px-6">
                    <div className="h-px w-full bg-black/20 mt-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoadingMorePosts && (
              <div className="px-6 py-4">
                <Spinner />
              </div>
            )}
            {hasMorePosts && <div ref={loadMoreTriggerRef} className="h-1" />}
          </>
        )}
      </main>
    </div>
  );
}
