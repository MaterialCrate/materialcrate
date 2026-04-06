import React from "react";

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export default function ActionButton({
  label,
  className = "",
  disabled = false,
  type = "button",
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center rounded-4xl px-5 py-3 text-center font-medium
        transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#E1761F]/35 focus-visible:ring-offset-2
        ${
          disabled
            ? "cursor-not-allowed bg-[#E5E5E5] text-[#818181] shadow-none"
            : "cursor-pointer bg-[#E1761F] text-white hover:bg-[#c86518] hover:shadow-[0_10px_24px_rgba(225,118,31,0.18)] active:scale-[0.98]"
        }
        ${className}
      `}
      {...props}
    >
      {children ?? label ?? "NEXT"}
    </button>
  );
}
