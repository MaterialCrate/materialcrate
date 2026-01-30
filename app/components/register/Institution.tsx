import React from "react";

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
            className="border border-black w-full px-4 py-2 rounded-lg"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!institution}
        className={`
          py-3 text-center rounded-4xl font-medium transition-all duration-200 fixed bottom-8 left-8 right-12 mx-auto
          ${
            institution
              ? "bg-[#E1761F] text-white active:bg-black"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        NEXT
      </button>
    </div>
  );
}
