"use client";

import { useEffect, useState } from "react";
import { Add, DocumentUpload } from "iconsax-reactjs";
import Post, { type HomePost } from "./components/home/Post";
import UploadDrawer from "./components/home/UploadDrawer";
import CommentDrawer from "./components/home/CommentDrawer";
import OptionsDrawer from "./components/home/OptionsDrawer";
import PdfViewerModal from "./components/home/PdfViewerModal";
import Header from "./components/home/Header";

export default function Home() {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [isPostOptionsDrawerOpen, setIsPostOptionsDrawerOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [activeOptionsPost, setActiveOptionsPost] = useState<HomePost | null>(
    null,
  );
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

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

    loadPosts();
    return () => controller.abort();
  }, []);

  return (
    <div className="py-18">
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
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
        }}
        authorUsername={activeOptionsPost?.author?.username}
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
          activePdfPost
            ? "bg-black/25 backdrop-blur-[2px] opacity-100 pointer-events-auto"
            : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          setMoreOptionsOpen(false);
          setIsUploadDrawerOpen(false);
          setIsCommentDrawerOpen(false);
          setIsPostOptionsDrawerOpen(false);
          setActiveCommentPostId(null);
          setActiveOptionsPost(null);
          setActivePdfPost(null);
        }}
      />
      <div className="bottom-28 right-6 fixed z-50 flex flex-col items-end gap-2">
        <button
          aria-label="Upload button"
          type="button"
          onClick={() => setIsUploadDrawerOpen(true)}
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
                onCommentClick={(selectedPost) => {
                  setActiveCommentPostId(selectedPost.id);
                  setIsCommentDrawerOpen(true);
                  setMoreOptionsOpen(false);
                  setIsUploadDrawerOpen(false);
                  setIsPostOptionsDrawerOpen(false);
                  setActiveOptionsPost(null);
                }}
                onOptionsClick={(selectedPost) => {
                  setActiveOptionsPost(selectedPost);
                  setIsPostOptionsDrawerOpen(true);
                  setMoreOptionsOpen(false);
                  setIsUploadDrawerOpen(false);
                  setIsCommentDrawerOpen(false);
                  setActiveCommentPostId(null);
                  setActivePdfPost(null);
                }}
                onFileClick={(selectedPost) => {
                  setActivePdfPost(selectedPost);
                  setMoreOptionsOpen(false);
                  setIsUploadDrawerOpen(false);
                  setIsCommentDrawerOpen(false);
                  setActiveCommentPostId(null);
                  setIsPostOptionsDrawerOpen(false);
                  setActiveOptionsPost(null);
                }}
              />
              {index < posts.length - 1 ? (
                <div className="px-6">
                  <div className="h-px w-full bg-black/20 mt-4" />
                </div>
              ) : null}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
