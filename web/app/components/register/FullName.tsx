import React from "react";
import ActionButton from "../ActionButton";

interface FullNameProps {
  displayName: string;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
}

export default function FullName({
  displayName,
  setDisplayName,
}: FullNameProps) {
  const isNextDisabled = displayName.trim().length < 2;

  return (
    <div className="h-full relative w-full">
      <div className="flex flex-col w-full h-full justify-center gap-5">
        <div>
          <h4 className="font-medium">DISPLAY NAME</h4>
          <input
            type="text"
            value={displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDisplayName(e.target.value)
            }
            placeholder="e.g. John Doe"
            className="border border-black w-full px-4 py-3 rounded-lg focus:outline-none"
            required
            minLength={2}
            maxLength={30}
          />
        </div>
      </div>
      <ActionButton
        type="submit"
        className="fixed bottom-8 left-8 right-8 mx-auto"
        disabled={isNextDisabled}
      >
        NEXT
      </ActionButton>
    </div>
  );
}
