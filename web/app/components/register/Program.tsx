import React from "react";
import ActionButton from "../ActionButton";

interface ProgramProps {
  program: string;
  setProgram: React.Dispatch<React.SetStateAction<string>>;
  submitLabel?: string;
}

export default function Program({
  program,
  setProgram,
  submitLabel = "NEXT",
}: ProgramProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
      <div>
        <h4 className="font-medium text-[#202020]">PROGRAM</h4>
        <input
          type="text"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          placeholder="e.g. Computer science"
          className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3.5 text-[16px] transition-all duration-200 focus:border-[#E1761F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E1761F]/15"
          required
        />
      </div>
      <ActionButton type="submit" disabled={!program} className="mt-8 w-full">
        {submitLabel}
      </ActionButton>
    </div>
  );
}
