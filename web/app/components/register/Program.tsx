import React from "react";
import ActionButton from "../ActionButton";

interface passwordTypes {
  program: string;
  setProgram: React.Dispatch<React.SetStateAction<string>>;
}

export default function Program({ program, setProgram }: passwordTypes) {
  return (
    <div className="h-full relative w-full">
      <div className="flex flex-col w-full h-full justify-center">
        <div>
          <h4 className="font-medium">PROGRAM</h4>
          <input
            type="text"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="e.g. Computer science"
            className="border border-black w-full px-4 py-3 rounded-lg focus:outline-none"
            required
          />
        </div>
      </div>
      <ActionButton
        type="submit"
        disabled={!program}
        className="fixed bottom-8 left-8 right-8 mx-auto"
      >
        NEXT
      </ActionButton>
    </div>
  );
}
