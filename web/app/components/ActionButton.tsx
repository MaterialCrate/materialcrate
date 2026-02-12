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
        py-3 text-center rounded-4xl font-medium transition-all duration-200
        ${
          disabled
            ? "bg-[#E5E5E5] text-[#818181] cursor-not-allowed"
            : "bg-[#E1761F] text-white active:bg-black"
        }
        ${className}
        `}
      {...props}
    >
      {children ?? label ?? "NEXT"}
    </button>
  );
}
