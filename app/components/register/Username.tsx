import React from "react";

interface passwordTypes {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
}

export default function Username({ username, setUsername }: passwordTypes) {
  return (
    <div className="flex flex-col h-screen justify-between">
      <div className="px-12 text-center">
        <h1 className="font-serif text-4xl">Enter username</h1>
      </div>
      <div className="space-y-5">
        <div>
          <h4 className="font-medium">Username</h4>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="border border-black w-full px-4 py-2 rounded-lg"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full bg-[#E1761F] py-3 text-center text-white rounded-4xl font-medium active:bg-black transition-all duration-200"
      >
        NEXT
      </button>
    </div>
  );
}
