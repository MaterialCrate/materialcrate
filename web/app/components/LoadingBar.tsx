import React from "react";

type LoadingBarProps = {
  className?: string;
};

export default function LoadingBar({ className = "" }: LoadingBarProps) {
  return (
    <>
      <div
        className={`relative h-1 w-full overflow-hidden bg-[#E1761F]/15 ${className}`}
        aria-hidden="true"
      >
        <div className="loading-bar-sweep absolute inset-y-0 w-1/3 min-w-16 bg-[#E1761F]" />
      </div>

      <style jsx>{`
        .loading-bar-sweep {
          animation: loading-bar-sweep 0.85s linear infinite;
          will-change: transform;
        }

        @keyframes loading-bar-sweep {
          from {
            transform: translateX(-120%);
          }
          to {
            transform: translateX(420%);
          }
        }
      `}</style>
    </>
  );
}
