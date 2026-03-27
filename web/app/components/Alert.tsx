"use client";

import React from "react";

interface AlertProps {
  message: string | null;
  type: "success" | "error" | "info";
}

const indicatorClass: Record<AlertProps["type"], string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export default function Alert({ message, type }: AlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-5 z-200 flex justify-center animate-[mc-alert-slide_3000ms_ease-in-out_forwards]"
    >
      <div className="w-fit max-w-[calc(100vw-2rem)] overflow-hidden rounded-full origin-center animate-[mc-alert-expand_3000ms_ease-in-out_forwards]">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 shrink-0 rounded-full ${indicatorClass[type]}`}
          />
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-5 text-[#202020] animate-[mc-alert-text_3000ms_ease-in-out_forwards]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
