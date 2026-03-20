"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ArchivedFileCard from "@/app/components/archive/ArchivedFileCard";
import { FolderOpen, Folder2, DocumentText } from "iconsax-reactjs";
import emptyWorkspace from "@/assets/icons/empty-workspace.svg";
import PdfViewerModal from "@/app/components/home/PdfViewerModal";
import type { HomePost } from "@/app/components/home/Post";
import type {
  ArchiveFolder,
  ArchiveSavedPost,
} from "@/app/components/archive/ArchivedFileCard";
import LoadingBar from "../components/LoadingBar";
import Alert from "../components/Alert";

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
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);
  const [removingSavedPostIds, setRemovingSavedPostIds] = useState<
    Record<string, boolean>
  >({});

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
          setError("Failed to fetch archive");
          console.error("Error fetching archive:", loadError);
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

  const totalFileCount = rootSavedPosts.length;
  const totalFolderCount = archive?.folders.length ?? 0;

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

  const handleRemoveFromArchive = async (savedPost: ArchiveSavedPost) => {
    if (removingSavedPostIds[savedPost.id]) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this file from your archive?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingSavedPostIds((current) => ({ ...current, [savedPost.id]: true }));
      setError("");

      const response = await fetch("/api/archive", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          savedPostId: savedPost.id,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to remove archived file");
      }

      setArchive((currentArchive) => {
        if (!currentArchive) {
          return currentArchive;
        }

        return {
          ...currentArchive,
          savedPosts: currentArchive.savedPosts.filter(
            (item) => item.id !== savedPost.id,
          ),
        };
      });
    } catch (removeError) {
      setError("Failed to remove archived file");
      console.error("Error removing archived file:", removeError);
    } finally {
      setRemovingSavedPostIds((current) => ({ ...current, [savedPost.id]: false }));
    }
  };

  return (
    <div className="min-h-dvh bg-[#FFFFFF] pb-32 pt-20">
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />

      {error && <Alert type="error" message={error} />}

      <div className="fixed top-0 left-0 right-0 z-40 ">
        <header className="bg-[#F7F7F7] px-6 pt-6 pb-3">
          <h1 className="text-center text-xl font-medium">My Archive</h1>
        </header>
        {isLoading && <LoadingBar />}
      </div>

      {!isLoading && (
        <main className="space-y-6 px-6">
          {!archive ||
          (!archive.folders.length && !archive.savedPosts.length) ? (
            <div className="flex flex-col items-center justify-center gap-4 px-12 py-16 text-center">
              <Image
                src={emptyWorkspace}
                alt="Empty archive"
                width={80}
                height={80}
              />
              <p className="text-sm text-[#696969]">
                You haven&apos;t archived any files yet. Save attachments from
                the feed and they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <>
              {foldersWithSavedPosts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={20} color="#202020" />
                      <h2 className="text-base font-medium text-[#202020]">
                        Folders
                      </h2>
                    </div>
                    <span className="text-sm text-[#767676]">
                      {totalFolderCount}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-y-5">
                    {foldersWithSavedPosts.map((folder) => (
                      <button
                        type="button"
                        key={folder.id}
                        className="flex flex-col items-center gap-2 text-center"
                        onClick={() =>
                          router.push(
                            `/archive/folder/${encodeURIComponent(folder.id)}`,
                          )
                        }
                      >
                        <Folder2 size={48} color="#9e9e9e" variant="Bold" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#323232]">
                            {folder.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {rootSavedPosts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DocumentText size={20} color="#202020" />
                      <h2 className="text-base font-medium text-[#202020]">
                        Files
                      </h2>
                    </div>
                    <span className="text-sm text-[#767676]">
                      {totalFileCount}
                    </span>
                  </div>
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
                        onRemove={(selectedSavedPost) =>
                          void handleRemoveFromArchive(selectedSavedPost)
                        }
                        isRemoving={Boolean(removingSavedPostIds[savedPost.id])}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}
