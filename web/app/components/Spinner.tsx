import React from "react";

type SpinnerProps = {
  className?: string;
  sizeClassName?: string;
};

export default function Spinner({
  className = "",
  sizeClassName = "h-6 w-6",
}: SpinnerProps) {
  return (
    <div
      className={`flex w-full items-center justify-center ${className}`}
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className={`inline-block animate-spin rounded-full border-2 border-[#E1761F]/25 border-t-[#E1761F] ${sizeClassName}`}
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
