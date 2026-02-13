"use client";

import React from "react";

interface AlertProps {
  message: string;
  type: "success" | "error" | "info";
}

const typeClass: Record<AlertProps["type"], string> = {
  success: "mc-alert--success",
  error: "mc-alert--error",
  info: "mc-alert--info",
};

export default function Alert({ message, type }: AlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`mc-alert ${typeClass[type]}`}
    >
      <div className="mc-alert__bubble">
        <div className="mc-alert__content">
          <div className="mc-alert__dot" />
          <p className="mc-alert__text">{message}</p>
        </div>
      </div>
    </div>
  );
}
