"use client";

import React, { useRef, useState } from "react";
import { GoXCircle } from "react-icons/go";
import { RiFolderUploadLine } from "react-icons/ri";
import { PiFilePdfLight, PiTrashLight } from "react-icons/pi";
import ActionButton from "../ActionButton";
import Alert from "../Alert";

interface UploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadDrawer({ isOpen, onClose }: UploadDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [courseCode, setCourseCode] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error" | "info">("error");
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      setAlertType("error");
      setAlertMessage("File size exceeds 5MB limit.");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setAlertMessage("");
    setSelectedFile(file);
    event.target.value = "";
  }

  const disabled =
    !selectedFile || title.length < 3 || courseCode.length < 3 || isPublishing;

  async function handlePublish() {
    if (!selectedFile || disabled) return;

    setIsPublishing(true);
    setAlertMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim());
      formData.append("courseCode", courseCode.trim());
      formData.append("description", description.trim());

      const response = await fetch("/api/posts/create", {
        method: "POST",
        body: formData,
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to upload document");
      }

      setAlertType("success");
      setAlertMessage("Document uploaded successfully.");
      setSelectedFile(null);
      setTitle("");
      setCourseCode("");
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    } catch (error: any) {
      setAlertType("error");
      setAlertMessage(error?.message || "Failed to upload document");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <>
      {alertMessage && <Alert key={`${alertType}-${alertMessage}`} message={alertMessage} type={alertType} />}
      <div
        className={`fixed inset-x-0 top-40 bottom-0 bg-white z-100 rounded-t-3xl px-6 py-6 space-y-3 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-[110%] opacity-0 pointer-events-none"
        }`}
      >
        <button
          aria-label="Close upload drawer"
          type="button"
          className="flex justify-end w-full"
          onClick={onClose}
        >
          <GoXCircle size={30} color="#737373" />
        </button>
        <h4 className="text-center font-medium text-xl text-[#202020]">
          Share a New Material
        </h4>
        <div className="space-y-1">
          <p className="text-[#5B5B5B] text-sm">
            Select document to share<span className="text-red-500">*</span>
          </p>
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
                <RiFolderUploadLine size={40} color="#B0B0B0" />
                <div>
                  <p className="text-xs font-medium text-[#737373]">
                    Drag and drop or{" "}
                    <span className="underline text-[#454545] text-center">
                      click to upload
                    </span>
                  </p>
                  <p className="text-[10px] text-[#737373] font-medium text-center">
                    Max file size: 5MB (PDF)
                  </p>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center gap-2 w-full">
                <div className="flex gap-2">
                  <PiFilePdfLight size={30} color="#E1761F" />
                  <div>
                    <p className="text-xs text-[#202020] font-medium truncate max-w-56">
                      {selectedFile.name}
                    </p>
                    <p className="text-[#B0B0B0] text-xs font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <PiTrashLight size={22} color="#E00505" />
                </button>
              </div>
            )}
          </label>
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
            maxLength={30}
            className="w-full rounded-lg px-3 py-3 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
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
            className="w-full rounded-lg px-3 py-3 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[#5B5B5B] text-sm">Document description</p>
          <textarea
            placeholder="E.g. 'Notes for the first lecture'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={250}
            className="w-full rounded-lg px-3 pt-3 h-28 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] resize-none focus:outline-none"
          />
        </div>
        <ActionButton
          type="button"
          className="fixed bottom-12 left-8 right-8 mx-auto"
          onClick={handlePublish}
          disabled={disabled}
        >
          {isPublishing ? "Publishing..." : "Publish"}
        </ActionButton>
      </div>
    </>
  );
}
