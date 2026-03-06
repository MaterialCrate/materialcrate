import React from "react";
import ActionButton from "../ActionButton";

interface passwordTypes {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
}

export default function Username({ username, setUsername }: passwordTypes) {
  return (
    <div className="h-full relative w-full">
      <div className="flex flex-col w-full h-full justify-center">
        <div>
          <h4 className="font-medium">USERNAME</h4>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. bookworm"
            className="border border-black w-full px-4 py-3 rounded-lg focus:outline-none"
            required
          />
        </div>
      </div>
      <ActionButton
        type="submit"
        disabled={!username}
        className="fixed bottom-8 left-8 right-8 mx-auto"
      >
        NEXT
      </ActionButton>
    </div>
  );
}
