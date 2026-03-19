"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "iconsax-reactjs";
import folderIcon from "@/assets/icons/folder.svg";
import PdfThumbnail from "@/app/components/home/PdfThumbnail";
import PdfViewerModal from "@/app/components/home/PdfViewerModal";
import type { HomePost } from "@/app/components/home/Post";

type ArchiveFolder = {
  id: string;
  archiveId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ArchiveSavedPost = {
  id: string;
  archiveId: string;
  folderId?: string | null;
  postId: string;
  createdAt: string;
  post: HomePost;
  folder?: ArchiveFolder | null;
};

type ArchiveData = {
  id: string;
  name: string;
  folders: ArchiveFolder[];
  savedPosts: ArchiveSavedPost[];
};

export default function ArchiveFolderPage() {
  const router = useRouter();
  const params = useParams<{ folderId: string }>();
  const folderId = typeof params?.folderId === "string" ? params.folderId : "";

  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadArchive = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch("/api/archive", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to fetch archive");
        }

        setArchive(body?.archive ?? null);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to fetch archive",
          );
          setArchive(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadArchive();
    return () => controller.abort();
  }, []);

  const folder = useMemo(
    () => archive?.folders.find((item) => item.id === folderId) ?? null,
    [archive, folderId],
  );

  const folderSavedPosts = useMemo(
    () => archive?.savedPosts.filter((item) => item.folderId === folderId) ?? [],
    [archive, folderId],
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-32 pt-18">
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />

      <header className="fixed top-0 left-0 right-0 z-40 bg-[#F7F7F7] px-6 pt-6 pb-3">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            aria-label="Back to archive"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white"
            onClick={() => router.push("/archive")}
          >
            <ArrowLeft size={18} color="#202020" />
          </button>
          <h1 className="text-center text-xl font-medium">Archive Folder</h1>
          <div />
        </div>
      </header>

      <main className="space-y-6 px-6">
        {isLoading ? (
          <p className="text-sm text-[#696969]">Loading folder...</p>
        ) : error ? (
          <p className="text-sm text-[#8A3A25]">{error}</p>
        ) : !folder ? (
          <div className="rounded-[28px] bg-white px-5 py-6 shadow-sm">
            <p className="text-base font-medium text-[#202020]">
              Folder not found.
            </p>
            <p className="mt-2 text-sm text-[#696969]">
              This archive folder may have been removed.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Image src={folderIcon} alt="" width={28} height={28} />
                <div>
                  <h2 className="text-lg font-medium text-[#202020]">
                    {folder.name}
                  </h2>
                  <p className="text-sm text-[#767676]">
                    {folderSavedPosts.length} file
                    {folderSavedPosts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {folderSavedPosts.length === 0 ? (
                <p className="text-sm text-[#696969]">
                  No files saved in this folder yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {folderSavedPosts.map((savedPost) => (
                    <ArchivedFileCard
                      key={savedPost.id}
                      savedPost={savedPost}
                      onOpenFile={(selectedPost) => setActivePdfPost(selectedPost)}
                      onOpenPost={(postId) =>
                        router.push(`/post/${encodeURIComponent(postId)}`)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function ArchivedFileCard({
  savedPost,
  onOpenFile,
  onOpenPost,
}: {
  savedPost: ArchiveSavedPost;
  onOpenFile: (post: HomePost) => void;
  onOpenPost: (postId: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-black/8 bg-[#FBFBFB] p-3">
      <button
        type="button"
        className="flex w-full gap-3 text-left"
        onClick={() => onOpenFile(savedPost.post)}
      >
        <PdfThumbnail
          postId={savedPost.post.id}
          fileUrl={savedPost.post.fileUrl}
          title={savedPost.post.title}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="line-clamp-2 text-sm font-medium text-[#202020]">
              {savedPost.post.title}
            </p>
            <p className="mt-1 text-xs text-[#767676]">
              {savedPost.post.courseCode}
              {savedPost.post.year ? ` • ${savedPost.post.year}` : ""}
            </p>
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-[#8C8C8C]">Attachment saved</span>
          </div>
        </div>
      </button>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#202020]"
          onClick={() => onOpenPost(savedPost.postId)}
        >
          View full post
          <ArrowRight size={16} color="#202020" />
        </button>
      </div>
    </div>
  );
}
