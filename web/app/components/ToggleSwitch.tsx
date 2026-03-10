import { useState } from "react";

interface ToggleProps {
  state: boolean;
  onChange: (newState: boolean) => void;
}

export default function Toggle({ state, onChange }: ToggleProps) {
  const [enabled, setEnabled] = useState(state);

  return (
    <button
      aria-label="switch"
      type="button"
      onClick={() => {
        const newState = !enabled;
        setEnabled(newState);
        onChange(newState);
      }}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
        enabled ? "bg-[#E1761F]" : "bg-gray-300"
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full transform transition ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
