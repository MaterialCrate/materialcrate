"use client";

import React, { useState } from "react";
import { GoXCircle } from "react-icons/go";
import { RiFolderUploadLine } from "react-icons/ri";
import ActionButton from "../ActionButton";

interface UploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadDrawer({ isOpen, onClose }: UploadDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  return (
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
        <p className="text-[#5B5B5B] text-sm">Select document to share</p>
        <input
          id="material-upload"
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <label
          htmlFor="material-upload"
          className="w-full h-42 border border-[#B0B0B0] border-dashed rounded-xl flex flex-col items-center justify-center gap-5 cursor-pointer"
        >
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
            {selectedFile && (
              <p className="text-[10px] text-[#454545] font-medium text-center mt-1 truncate max-w-56">
                {selectedFile.name}
              </p>
            )}
          </div>
        </label>
      </div>
      <div className="space-y-1">
        <p className="text-[#5B5B5B] text-sm">Document title</p>
        <input
          placeholder="E.g. 'Stanford CS 101 Notes'"
          className="w-full rounded-lg px-3 py-3 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <p className="text-[#5B5B5B] text-sm">Document description</p>
        <textarea
          placeholder="E.g. 'Notes for the first lecture'"
          className="w-full rounded-lg px-3 pt-3 h-28 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] resize-none focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <p className="text-[#5B5B5B] text-sm">Course code</p>
        <input
          placeholder="E.g. 'CS 101'"
          className="w-full rounded-lg px-3 py-3 bg-[#F0F0F0]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
        />
      </div>
      <ActionButton
        type="button"
        className="fixed bottom-12 left-8 right-8 mx-auto"
      >
        Share Material
      </ActionButton>
    </div>
  );
}
