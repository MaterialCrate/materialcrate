"use client";

import { useEffect, useState } from "react";
import { Book, ArrowDown2, Add, DocumentUpload } from "iconsax-reactjs";
import Post, { type HomePost } from "./components/home/Post";
import UploadDrawer from "./components/home/UploadDrawer";
import CommentDrawer from "./components/home/CommentDrawer";

export default function Home() {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
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
    <div>
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
      />
      <CommentDrawer isOpen={isCommentDrawerOpen} onClose={() => setIsCommentDrawerOpen(false)} />
      <button
        aria-label="Close more options"
        type="button"
        className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
          moreOptionsOpen || isUploadDrawerOpen || isCommentDrawerOpen
            ? "bg-black/25 backdrop-blur-[2px] opacity-100 pointer-events-auto"
            : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          setMoreOptionsOpen(false);
          setIsUploadDrawerOpen(false);
          setIsCommentDrawerOpen(false);
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
      <header className="flex px-6 py-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)]">
        <div className="p-2 rounded-lg bg-[#EEEEEE] flex items-center gap-1">
          <Book size={22} variant="Bold" />
          <ArrowDown2 size={14} color="#959595" />
        </div>
        <input
          placeholder="What material do you want to find?"
          className="flex-1 pl-4 placeholder:text-[#B0B0B0] outline-none text-sm"
        />
      </header>
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
                onCommentClick={() => {
                  setIsCommentDrawerOpen(true);
                  setMoreOptionsOpen(false);
                  setIsUploadDrawerOpen(false);
                }}
              />
              {index < posts.length - 1 ? (
                <div className="px-6">
                  <div className="h-px w-full bg-black/40 mt-4" />
                </div>
              ) : null}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
