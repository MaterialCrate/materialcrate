"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown2,
  CloseCircle,
  DocumentUpload,
  Trash,
  DocumentText,
} from "iconsax-reactjs";
import { createPdfThumbnailBase64 } from "@/app/lib/pdf-thumbnail";
import ActionButton from "../ActionButton";
import Alert from "../Alert";
import type { HomePost } from "./Post";

interface UploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post?: HomePost | null;
  onPostSaved?: (post: HomePost, mode: "create" | "edit") => void;
}

export default function UploadDrawer({
  isOpen,
  onClose,
  post,
  onPostSaved,
}: UploadDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [courseCode, setCourseCode] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "error",
  );
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] =
    useState<boolean>(false);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 60 }, (_, index) =>
    String(currentYear - index),
  );
  const isEditMode = Boolean(post);

  useEffect(() => {
    if (!isOpen) return;

    setAlertMessage("");
    setAlertType("error");
    setIsPublishing(false);
    setIsGeneratingThumbnail(false);
    setSelectedFile(null);
    setThumbnailBase64(null);
    setTitle(post?.title ?? "");
    setCourseCode(post?.courseCode ?? "");
    setYear(post?.year ? String(post.year) : "");
    setDescription(post?.description ?? "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [isOpen, post]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 100 * 1024 * 1024) {
      setAlertType("error");
      setAlertMessage("File size exceeds 100MB limit.");
      setSelectedFile(null);
      setThumbnailBase64(null);
      setIsGeneratingThumbnail(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setAlertMessage("");
    setSelectedFile(file);
    setThumbnailBase64(null);
    event.target.value = "";

    if (!file) {
      setIsGeneratingThumbnail(false);
      return;
    }

    setIsGeneratingThumbnail(true);

    try {
      const nextThumbnailBase64 = await createPdfThumbnailBase64(file);
      setThumbnailBase64(nextThumbnailBase64);
    } catch {
      setThumbnailBase64(null);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  }

  const disabled =
    title.length < 3 ||
    courseCode.length < 3 ||
    isPublishing ||
    isGeneratingThumbnail ||
    (!isEditMode && !selectedFile);

  async function handlePublish() {
    if (disabled) return;

    setIsPublishing(true);
    setAlertMessage("");

    try {
      let response: Response;

      if (isEditMode && post) {
        response = await fetch("/api/posts/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: post.id,
            title: title.trim(),
            courseCode: courseCode.trim(),
            description: description.trim(),
            year: year || null,
          }),
        });
      } else {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);
        if (thumbnailBase64) {
          formData.append("thumbnailBase64", thumbnailBase64);
        }
        formData.append("title", title.trim());
        formData.append("courseCode", courseCode.trim());
        formData.append("description", description.trim());
        if (year) {
          formData.append("year", year);
        }

        response = await fetch("/api/posts/create", {
          method: "POST",
          body: formData,
        });
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          isEditMode
            ? "Failed to update document"
            : "Failed to upload document",
        );
        console.error("Upload error details:", {
          status: response.status,
          statusText: response.statusText,
          body,
        });
      }

      setAlertType("success");
      setAlertMessage(
        isEditMode
          ? "Document updated successfully."
          : "Document uploaded successfully.",
      );
      setSelectedFile(null);
      setThumbnailBase64(null);
      setTitle("");
      setCourseCode("");
      setYear("");
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (body?.post) {
        onPostSaved?.(body.post, isEditMode ? "edit" : "create");
      }
      onClose();
    } catch (error: unknown) {
      setAlertType("error");
      setAlertMessage(
        isEditMode ? "Failed to update document" : "Failed to upload document",
      );
      console.error("Error details:", error);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <>
      {alertMessage && (
        <Alert
          key={`${alertType}-${alertMessage}`}
          message={alertMessage}
          type={alertType}
        />
      )}
      <div
        className={`fixed inset-x-0 top-[15%] bottom-0 bg-white z-100 rounded-t-3xl transition-all duration-300 ease-out overflow-hidden flex flex-col ${
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-[110%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="shrink-0 px-6 py-5 bg-white">
          <div className="relative flex items-center justify-center">
            <h4 className="text-center font-medium text-lg text-[#202020]">
              {isEditMode ? "Edit Material" : "Share a New Material"}
            </h4>
            <button
              aria-label="Close upload drawer"
              type="button"
              className="absolute right-0 flex items-center justify-center"
              onClick={onClose}
            >
              <CloseCircle size={24} color="#737373" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          <div className="space-y-1">
            <p className="text-[#5B5B5B] text-sm">
              {isEditMode ? "Document" : "Select document to share"}
              {!isEditMode && <span className="text-red-500">*</span>}
            </p>
            {isEditMode ? (
              <div className="w-full rounded-xl border border-[#E4E4E4] bg-[#F7F7F7] px-4 py-4">
                <div className="flex items-center gap-3">
                  <DocumentText size={30} color="#E1761F" variant="Bold" />
                  <div>
                    <p className="text-xs font-medium text-[#202020]">
                      {post?.title || "Current document"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  id="material-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  required
                />
                <label
                  htmlFor="material-upload"
                  className="w-full py-6 px-3 border border-[#B0B0B0] border-dashed rounded-xl flex flex-col items-center justify-center gap-5 cursor-pointer"
                >
                  {!selectedFile ? (
                    <>
                      <DocumentUpload size={40} color="#B0B0B0" />
                      <div>
                        <p className="text-xs font-medium text-[#737373]">
                          Drag and drop or{" "}
                          <span className="underline text-[#454545] text-center">
                            click to upload
                          </span>
                        </p>
                        <p className="text-[10px] text-[#737373] font-medium text-center">
                          Max file size: 100MB (PDF)
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center gap-2 w-full">
                      <div className="flex gap-2 items-center">
                        <DocumentText
                          size={38}
                          color="#E1761F"
                          variant="Bold"
                        />
                        <div className="flex flex-col justify-between">
                          <p className="text-xs text-[#202020] font-medium truncate max-w-56">
                            {selectedFile.name}
                          </p>
                          <p className="text-[#B0B0B0] text-xs font-medium">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                          </p>
                          {isGeneratingThumbnail && (
                            <p className="text-[#B0B0B0] text-[10px] font-medium">
                              Generating preview...
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setThumbnailBase64(null);
                          setIsGeneratingThumbnail(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        <Trash size={22} color="#E00505" />
                      </button>
                    </div>
                  )}
                </label>
              </>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[#5B5B5B] text-sm">
              Document title<span className="text-red-500">*</span>
            </p>
            <input
              placeholder="E.g. 'Stanford CS 101 Notes' (at least 3 characters)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={50}
              style={{ fontSize: "0.75rem" }}
              className="w-full rounded-lg px-3 py-3 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] placeholder:text-xs focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[#5B5B5B] text-sm">
              Course code<span className="text-red-500">*</span>
            </p>
            <input
              placeholder="E.g. 'CS 101' (at least 3 characters)"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              required
              maxLength={8}
              style={{ fontSize: "0.75rem" }}
              className="w-full rounded-lg px-3 py-3 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] placeholder:text-xs  focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[#5B5B5B] text-sm">Year</p>
            <div className="relative">
              <select
                title="Year picker"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{ fontSize: "0.75rem" }}
                className={`w-full appearance-none rounded-lg px-3 py-3 pr-10 bg-[#F0F0F0]/50 shadow focus:outline-none ${
                  year ? "text-black" : "text-[#B1B1B1]"
                }`}
              >
                <option
                  value=""
                  className="text-[#B1B1B1]"
                  style={{ fontSize: "0.75rem" }}
                >
                  Select year
                </option>
                {yearOptions.map((optionYear) => (
                  <option key={optionYear} value={optionYear}>
                    {optionYear}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <ArrowDown2 size={16} color="#737373" />
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[#5B5B5B] text-sm">Document description</p>
            <textarea
              placeholder="E.g. 'Notes for the first lecture'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              style={{ fontSize: "0.75rem" }}
              className="w-full rounded-lg px-3 pt-3 h-28 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] placeholder:text-xs resize-none focus:outline-none"
            />
          </div>
          <ActionButton
            type="button"
            className="w-full"
            onClick={handlePublish}
            disabled={disabled}
          >
            {isGeneratingThumbnail
              ? "Preparing preview..."
              : isPublishing
                ? isEditMode
                  ? "Saving..."
                  : "Publishing..."
                : isEditMode
                  ? "Save changes"
                  : "Publish"}
          </ActionButton>
        </div>
      </div>
    </>
  );
}
