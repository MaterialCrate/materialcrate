import React from "react";
import ActionButton from "../ActionButton";

interface passwordTypes {
  institution: string;
  setInstitution: React.Dispatch<React.SetStateAction<string>>;
}

export default function Institution({
  institution,
  setInstitution,
}: passwordTypes) {
  return (
    <div className="h-screen relative w-full">
      <div className="text-center fixed top-30 w-70 left-0 right-0 mx-auto">
        <h1 className="font-serif text-4xl">What is your instituion name?</h1>
      </div>
      <div className="flex flex-col w-full h-full justify-center">
        <div>
          <h4 className="font-medium">INSTITUTION NAME</h4>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Copperbelt University"
            className="border border-black w-full px-4 py-3 rounded-lg"
            required
          />
        </div>
      </div>
      <ActionButton
        type="submit"
        disabled={!institution}
        className="fixed bottom-8 left-8 right-8 mx-auto"
      >
        NEXT
      </ActionButton>
    </div>
  );
}
