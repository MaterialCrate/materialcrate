import React from "react";
import ActionButton from "../ActionButton";

interface ProgramProps {
  program: string;
  setProgram: React.Dispatch<React.SetStateAction<string>>;
  submitLabel?: string;
  fixedAction?: boolean;
}

export default function Program({
  program,
  setProgram,
  submitLabel = "NEXT",
  fixedAction = false,
}: ProgramProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <div>
          <h4 className="font-medium text-ink">PROGRAM/Main Option</h4>
          <input
            type="text"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="e.g. Computer science / ADDMA"
            className="mt-2 w-full rounded-2xl border border-edge-mid bg-surface-high px-4 py-3.5 text-[16px] transition-all duration-200 focus:border-[#E1761F] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[#E1761F]/15"
            required
          />
        </div>
      </div>
      <ActionButton
        type="submit"
        disabled={!program}
        fixedBottom={fixedAction}
        className="mt-8 w-full"
      >
        {submitLabel}
      </ActionButton>
    </div>
  );
}
