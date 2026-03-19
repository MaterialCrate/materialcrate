"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArchivedFileCard from "@/app/components/archive/ArchivedFileCard";
import { ArrowLeft, DocumentText, Trash } from "iconsax-reactjs";
import PdfViewerModal from "@/app/components/home/PdfViewerModal";
import type { HomePost } from "@/app/components/home/Post";
import type {
  ArchiveFolder,
  ArchiveSavedPost,
} from "@/app/components/archive/ArchivedFileCard";
import LoadingBar from "@/app/components/LoadingBar";
import Alert from "@/app/components/Alert";

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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

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

  const folder = useMemo(
    () => archive?.folders.find((item) => item.id === folderId) ?? null,
    [archive, folderId],
  );

  useEffect(() => {
    if (!folder) {
      return;
    }

    setFolderNameDraft(folder.name);
  }, [folder]);

  useEffect(() => {
    if (!isEditingTitle) {
      return;
    }

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  const folderSavedPosts = useMemo(
    () =>
      archive?.savedPosts.filter((item) => item.folderId === folderId) ?? [],
    [archive, folderId],
  );

  const submitFolderRename = async () => {
    if (!folder || isRenaming) {
      return;
    }

    const trimmedName = folderNameDraft.trim();
    if (!trimmedName) {
      setFolderNameDraft(folder.name);
      setIsEditingTitle(false);
      setError("Folder name is required");
      return;
    }

    if (trimmedName === folder.name) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setIsRenaming(true);
      setError("");

      const response = await fetch("/api/archive/folders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: folder.id,
          name: trimmedName,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to rename archive folder");
      }

      setArchive((currentArchive) => {
        if (!currentArchive) {
          return currentArchive;
        }

        return {
          ...currentArchive,
          folders: currentArchive.folders.map((item) =>
            item.id === folder.id ? { ...item, name: trimmedName } : item,
          ),
        };
      });
      setFolderNameDraft(trimmedName);
      setIsEditingTitle(false);
    } catch (renameError) {
      setError("Failed to rename archive folder");
      console.error("Error renaming archive folder:", renameError);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folder || isDeleting) {
      return;
    }

    if (folderSavedPosts.length > 0) {
      const confirmed = window.confirm(
        "Deleting this folder will unarchive all files inside it. Continue?",
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setIsDeleting(true);
      setError("");

      const response = await fetch("/api/archive/folders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: folder.id,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to delete archive folder");
      }

      router.push("/archive");
    } catch (deleteError) {
      setError("Failed to delete archive folder");
      console.error("Error deleting archive folder:", deleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] pb-32 pt-22">
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />

      {error && <Alert type="error" message={error} />}

      <div className="fixed top-0 left-0 right-0 z-40">
        <header className="bg-[#F7F7F7] px-6 pt-6 pb-3">
          <div className="relative flex items-center justify-center min-h-10">
            <button
              type="button"
              aria-label="Back to archive"
              onClick={() => router.push("/archive")}
              className="absolute left-0 top-1/2 -translate-y-1/2"
            >
              <ArrowLeft size={22} color="#202020" />
            </button>
            <div className="flex w-full justify-center px-12">
              {folder && isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={folderNameDraft}
                  onChange={(event) => setFolderNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitFolderRename();
                    }

                    if (event.key === "Escape") {
                      setFolderNameDraft(folder.name);
                      setIsEditingTitle(false);
                      setError("");
                    }
                  }}
                  disabled={isRenaming}
                  maxLength={30}
                  aria-label="Rename archive folder"
                  className="w-full max-w-55 bg-transparent text-center text-xl font-medium outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!folder) {
                      return;
                    }

                    setError("");
                    setFolderNameDraft(folder.name);
                    setIsEditingTitle(true);
                  }}
                  className="max-w-55 truncate text-center text-xl font-medium"
                >
                  {folder?.name || "Archive Folder"}
                </button>
              )}
            </div>
            <button
              aria-label="Delete folder"
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2"
              onClick={() => void handleDeleteFolder()}
              disabled={isDeleting}
            >
              <Trash size={22} color="#202020" />
            </button>
          </div>
        </header>
        {isLoading && <LoadingBar />}
      </div>

      {!isLoading && (
        <main className="space-y-6 px-6">
          {!folder ? (
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
              <section className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DocumentText size={20} color="#202020" />
                  <h2 className="text-base font-medium text-[#202020]">
                    Files
                  </h2>
                </div>
                <span className="text-sm text-[#767676]">
                  {folderSavedPosts.length}
                </span>
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
      )}
    </div>
  );
}
