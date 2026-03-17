"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "iconsax-reactjs";
import Post, { type HomePost } from "@/app/components/home/Post";
import PdfViewerModal from "@/app/components/home/PdfViewerModal";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<HomePost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);

  useEffect(() => {
    const postId = params?.id?.trim();
    if (!postId) {
      setError("Post not found.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadPost = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load post");
        }

        setPost(body?.post ?? null);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load post",
          );
          setPost(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadPost();

    return () => controller.abort();
  }, [params?.id]);

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-18">
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-black/6 bg-[#F7F7F7] px-6 pt-6 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft size={24} color="#202020" />
        </button>
        <h1 className="text-lg font-medium text-[#202020]">Post</h1>
      </header>

      <main className="mx-auto max-w-2xl">
        {isLoading ? (
          <p className="px-6 py-8 text-sm text-[#696969]">Loading post...</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-[#8A3A25]">{error}</p>
        ) : post ? (
          <Post
            post={post}
            onFileClick={(selectedPost) => setActivePdfPost(selectedPost)}
          />
        ) : (
          <p className="px-6 py-8 text-sm text-[#696969]">Post not found.</p>
        )}
      </main>
    </div>
  );
}
