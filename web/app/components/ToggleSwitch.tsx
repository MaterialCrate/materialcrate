import { useEffect, useState } from "react";

interface ToggleProps {
  state: boolean;
  onChange: (newState: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({
  state,
  onChange,
  disabled = false,
}: ToggleProps) {
  const [enabled, setEnabled] = useState(state);

  useEffect(() => {
    setEnabled(state);
  }, [state]);

  return (
    <button
      aria-label="switch"
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        const newState = !enabled;
        setEnabled(newState);
        onChange(newState);
      }}
      className={`h-6 w-12 flex items-center rounded-full p-1 transition ${
        disabled
          ? "cursor-not-allowed bg-gray-200"
          : enabled
            ? "bg-[#E1761F]"
            : "bg-gray-300"
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full bg-surface transform transition ${
          enabled ? "translate-x-6" : "translate-x-0"
        } ${disabled ? "opacity-70" : "opacity-100"}`}
      />
    </button>
  );
}
