"use client";

import { useEffect, useState } from "react";
import { Add, DocumentUpload } from "iconsax-reactjs";
import Post, {
  type HomePost,
  type PostOptionsAnchor,
} from "./components/home/Post";
import UploadDrawer from "./components/home/UploadDrawer";
import CommentDrawer from "./components/home/CommentDrawer";
import OptionsDrawer from "./components/home/PostOptions";
import PdfViewerModal from "./components/home/PdfViewerModal";
import Header from "./components/home/Header";
import ArchiveDrawer from "./components/home/ArchiveDrawer";

type ArchiveSavedPost = {
  id: string;
  postId: string;
};

export default function Home() {
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
  const [archiveSavedPostIdsByPostId, setArchiveSavedPostIdsByPostId] =
    useState<Record<string, string>>({});
  const [archiveBusyPostIds, setArchiveBusyPostIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      try {
        const response = await fetch("/api/posts", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        const body = await response.json().catch(() => ({}));
        setPosts(Array.isArray(body?.posts) ? body.posts : []);
      } catch {
        if (!controller.signal.aborted) {
          setPosts([]);
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
              current.map((post) => (post.id === savedPost.id ? savedPost : post)),
            );
            return;
          }

          setPosts((current) => [savedPost, ...current]);
        }}
      />
      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => {
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
        }}
        postId={activeCommentPostId}
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
        onEditPost={(selectedPost) => {
          setEditingPost(selectedPost);
          setIsUploadDrawerOpen(true);
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
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
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
          setActivePdfPost(null);
        }}
      />
      <div className="bottom-28 right-6 fixed z-50 flex flex-col items-end gap-2">
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
            setIsArchiveDrawerOpen(false);
            setActiveArchivePost(null);
            setActivePdfPost(null);
            setMoreOptionsOpen(false);
          }}
          className={`flex items-center gap-3 bg-white py-3 px-5 rounded-3xl transition-all duration-300 ease-out ${
            moreOptionsOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-3 scale-95 pointer-events-none"
          }`}
        >
          <DocumentUpload size={24} />
          <p>Upload</p>
        </button>
        <button
          title="more actions"
          type="button"
          className={`w-12 h-12 bg-white drop-shadow-xl rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
            moreOptionsOpen ? "rotate-45 scale-105" : "rotate-0 scale-100"
          }`}
          onClick={() => setMoreOptionsOpen((prev) => !prev)}
        >
          <Add size={30} />
        </button>
      </div>
      <Header />
      <main>
        {isLoadingPosts ? (
          <p className="px-6 py-8 text-sm text-[#696969]">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[#696969]">No posts yet.</p>
        ) : (
          posts.map((post, index) => (
            <div key={post.id}>
              <Post
                post={post}
                isArchived={Boolean(archiveSavedPostIdsByPostId[post.id])}
                isArchiveBusy={Boolean(archiveBusyPostIds[post.id])}
                onCommentClick={(selectedPost) => {
                  setActiveCommentPostId(selectedPost.id);
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
          ))
        )}
      </main>
    </div>
  );
}
