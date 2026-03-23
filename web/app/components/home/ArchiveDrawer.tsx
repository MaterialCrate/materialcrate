"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AddCircle, CloseCircle, TickCircle, Folder2 } from "iconsax-reactjs";
import Alert from "../Alert";
import folderIcon from "@/assets/icons/folder.svg";
import type { HomePost } from "./Post";

type ArchiveFolder = {
  id: string;
  archiveId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ArchiveDrawerProps = {
  isOpen: boolean;
  post: HomePost | null;
  closeRequestKey?: number;
  onClose: () => void;
  onSaved?: () => void;
};

export default function ArchiveDrawer({
  isOpen,
  post,
  closeRequestKey = 0,
  onClose,
  onSaved,
}: ArchiveDrawerProps) {
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<
    "success" | "error" | "info"
  >("info");
  const [hasSavedCurrentPost, setHasSavedCurrentPost] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFolderName("");
      setHasSavedCurrentPost(false);
      return;
    }

    let isCancelled = false;

    const loadArchive = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/archive", {
          method: "GET",
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load saved files");
        }

        if (!isCancelled) {
          setFolders(
            Array.isArray(body?.archive?.folders) ? body.archive.folders : [],
          );
        }
      } catch (error) {
        if (!isCancelled) {
          setFeedbackType("error");
          setFeedbackMessage(
            error instanceof Error ? error.message : "Failed to load saved files",
          );
          setFolders([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadArchive();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    [folders],
  );

  const savePost = useCallback(
    async (folderId?: string | null) => {
      if (!post?.id || isSaving || hasSavedCurrentPost) return true;

      setIsSaving(true);

      try {
        const response = await fetch("/api/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: post.id,
            folderId: folderId ?? null,
          }),
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to save file");
        }

        setHasSavedCurrentPost(true);
        setFeedbackType("success");
        setFeedbackMessage(
          folderId ? "File saved to folder." : "File saved.",
        );
        onSaved?.();
        return true;
      } catch (error) {
        setFeedbackType("error");
        setFeedbackMessage(
          error instanceof Error
            ? error.message
            : "Failed to save file",
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [hasSavedCurrentPost, isSaving, onSaved, post?.id],
  );

  const handleClose = useCallback(async () => {
    if (post && !hasSavedCurrentPost) {
      const saved = await savePost(null);
      if (!saved) return;
    }
    onClose();
  }, [hasSavedCurrentPost, onClose, post, savePost]);

  const handleCreateFolder = useCallback(async () => {
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
        throw new Error(body?.error || "Failed to create saved folder");
      }

      const createdFolder = body?.folder;
      if (createdFolder) {
        setFolders((previous) => [...previous, createdFolder]);
      }
      setFolderName("");
      setFeedbackType("success");
      setFeedbackMessage("Saved folder created.");
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Failed to create saved folder",
      );
    } finally {
      setIsCreatingFolder(false);
    }
  }, [folderName, isCreatingFolder]);

  useEffect(() => {
    if (!isOpen || closeRequestKey === 0) return;
    void handleClose();
  }, [closeRequestKey, handleClose, isOpen]);

  return (
    <>
      <Alert type={feedbackType} message={feedbackMessage} />
      <div
        className={`fixed inset-x-0 bottom-0 z-100 rounded-t-3xl bg-white px-6 py-6 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-[110%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                void handleClose();
              }}
              disabled={isSaving}
            >
              <CloseCircle size={24} color="#959595" />
            </button>
          </div>

          <div>
            <h1 className="text-lg font-medium text-[#202020]">Save file</h1>
            <p className="mt-1 text-sm text-[#696969]">
              Save this attachment inside a folder or close to save it at the
              top level.
            </p>
          </div>

          <div className="rounded-2xl bg-[#F5F5F5] px-4 py-3">
            <p className="truncate text-sm font-medium text-[#202020]">
              {post?.title ?? "No file selected"}
            </p>
            <p className="mt-1 text-xs text-[#767676]">
              {post?.courseCode ?? ""}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Create a new folder"
                className="h-11 flex-1 rounded-full border border-black/10 px-4 text-sm outline-none"
                maxLength={30}
              />
              <button
                type="button"
                onClick={() => {
                  void handleCreateFolder();
                }}
                disabled={!folderName.trim() || isCreatingFolder}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#202020] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                <AddCircle size={18} color="white" />
                Create
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-[#696969]">Loading folders...</p>
            ) : sortedFolders.length === 0 ? (
              <p className="text-sm text-[#696969]">
                No folders yet. Create one or close to save the file at the top
                level.
              </p>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {sortedFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-2xl border border-black/8 px-4 py-3 text-left"
                    disabled={isSaving}
                    onClick={async () => {
                      const saved = await savePost(folder.id);
                      if (saved) {
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Folder2 size={32} color="#202020" variant="Bold" />
                      <div>
                        <p className="text-sm font-medium text-[#202020]">
                          {folder.name}
                        </p>
                        <p className="text-xs text-[#767676]">
                          Save attachment here
                        </p>
                      </div>
                    </div>
                    <TickCircle size={20} color="#B0B0B0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
