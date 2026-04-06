import React from "react";
import ActionButton from "../ActionButton";

interface InstitutionProps {
  institution: string;
  setInstitution: React.Dispatch<React.SetStateAction<string>>;
}

export default function Institution({
  institution,
  setInstitution,
}: InstitutionProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
      <div>
        <h4 className="font-medium text-[#202020]">INSTITUTION NAME</h4>
        <input
          type="text"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="e.g. Copperbelt University"
          className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3.5 text-[16px] transition-all duration-200 focus:border-[#E1761F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E1761F]/15"
          required
        />
      </div>
      <ActionButton
        type="submit"
        disabled={!institution}
        className="mt-8 w-full"
      >
        NEXT
      </ActionButton>
    </div>
  );
}
