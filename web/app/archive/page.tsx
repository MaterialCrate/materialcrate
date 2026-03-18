"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Add, ArrowRight, FolderOpen } from "iconsax-reactjs";
import emptyWorkspace from "@/assets/icons/empty-workspace.svg";
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

export default function ArchivePage() {
  const router = useRouter();
  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [folderName, setFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
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

  const rootSavedPosts = useMemo(
    () => archive?.savedPosts?.filter((item) => !item.folderId) ?? [],
    [archive],
  );

  const foldersWithSavedPosts = useMemo(
    () =>
      (archive?.folders ?? []).map((folder) => ({
        ...folder,
        savedPosts:
          archive?.savedPosts?.filter((item) => item.folderId === folder.id) ??
          [],
      })),
    [archive],
  );

  const handleCreateFolder = async () => {
    const normalizedName = folderName.trim();
    if (!normalizedName || isCreatingFolder) return;

    setIsCreatingFolder(true);
    try {
      const response = await fetch("/api/archive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to create archive folder");
      }

      const folder = body?.folder;
      if (folder) {
        setArchive((current) =>
          current
            ? { ...current, folders: [...current.folders, folder] }
            : current,
        );
      }
      setFolderName("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create archive folder",
      );
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-32 pt-18">
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />

      <header className="fixed top-0 left-0 right-0 z-40 bg-[#F7F7F7] px-6 pt-6 pb-3">
        <h1 className="text-center text-xl font-medium">My Archive</h1>
      </header>

      <main className="space-y-6 px-6">
        <section className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Create archive folder"
              className="h-12 flex-1 rounded-full border border-black/10 px-4 text-sm outline-none"
              maxLength={80}
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateFolder();
              }}
              disabled={!folderName.trim() || isCreatingFolder}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#202020] px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Add size={20} color="white" />
              Create folder
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-[#8A3A25]">{error}</p>}
        </section>

        {isLoading ? (
          <p className="text-sm text-[#696969]">Loading archive...</p>
        ) : !archive ||
          (!archive.folders.length && !archive.savedPosts.length) ? (
          <div className="flex flex-col items-center justify-center gap-4 px-12 py-16 text-center">
            <Image
              src={emptyWorkspace}
              alt="Empty archive"
              width={80}
              height={80}
            />
            <p className="text-sm text-[#696969]">
              You haven&apos;t archived any files yet. Save attachments from the
              feed and they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FolderOpen size={20} color="#202020" />
                <h2 className="text-base font-medium text-[#202020]">
                  Folders
                </h2>
              </div>
              {foldersWithSavedPosts.length === 0 ? (
                <p className="text-sm text-[#696969]">
                  No archive folders yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {foldersWithSavedPosts.map((folder) => (
                    <div
                      key={folder.id}
                      className="rounded-[28px] bg-white px-5 py-5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Image src={folderIcon} alt="" width={24} height={24} />
                        <div>
                          <p className="text-base font-medium text-[#202020]">
                            {folder.name}
                          </p>
                          <p className="text-sm text-[#767676]">
                            {folder.savedPosts.length} saved file
                            {folder.savedPosts.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      {folder.savedPosts.length === 0 ? (
                        <p className="mt-4 text-sm text-[#696969]">
                          No files saved in this folder yet.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {folder.savedPosts.map((savedPost) => (
                            <ArchivedFileCard
                              key={savedPost.id}
                              savedPost={savedPost}
                              onOpenFile={(selectedPost) =>
                                setActivePdfPost(selectedPost)
                              }
                              onOpenPost={(postId) =>
                                router.push(
                                  `/post/${encodeURIComponent(postId)}`,
                                )
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-[#202020]">
                Loose Files
              </h2>
              {rootSavedPosts.length === 0 ? (
                <p className="text-sm text-[#696969]">
                  No top-level archived files yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {rootSavedPosts.map((savedPost) => (
                    <ArchivedFileCard
                      key={savedPost.id}
                      savedPost={savedPost}
                      onOpenFile={(selectedPost) =>
                        setActivePdfPost(selectedPost)
                      }
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
