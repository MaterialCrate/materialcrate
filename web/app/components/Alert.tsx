import React from "react";

interface AlertProps {
  message: string;
  type: "success" | "error" | "info";
}

export default function Alert({ message, type }: AlertProps) {
  return (
    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white text-sm px-4 py-3 rounded-3xl border border-[#5A5959] shadow-lg flex items-center gap-5 z-50">
      <div
        className={`h-4 w-4 rounded-full bg-${type === "success" ? "green" : type === "error" ? "red" : "blue"}-500`}
      />
      <p>{message}</p>
    </div>
  );
}
