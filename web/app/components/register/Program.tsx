import React from "react";
import ActionButton from "../ActionButton";

interface passwordTypes {
  program: string;
  setProgram: React.Dispatch<React.SetStateAction<string>>;
}

export default function Program({ program, setProgram }: passwordTypes) {
  return (
    <div className="h-screen relative w-full">
      <div className="text-center fixed top-30 w-70 left-0 right-0 mx-auto">
        <h1 className="font-serif text-4xl">Enter study program</h1>
      </div>
      <div className="flex flex-col w-full h-full justify-center">
        <div>
          <h4 className="font-medium">PROGRAM</h4>
          <input
            type="text"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="e.g. Computer science"
            className="border border-black w-full px-4 py-3 rounded-lg"
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
