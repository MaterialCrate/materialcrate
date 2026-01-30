import React from "react";

interface options {
  selectedOption: string;
  setSelectedOption: React.Dispatch<React.SetStateAction<string>>;
}

const options = [
  { id: "upload", label: "Upload or Share Materials" },
  { id: "browse", label: "Browse or Find Materials" },
  { id: "space", label: "My Study Space" },
  { id: "none", label: "Not Sure" },
];

export default function Welcome({
  selectedOption,
  setSelectedOption,
}: options) {
  return (
    <div className="h-screen relative w-full">
      <div className="text-center fixed top-30 w-70 left-0 right-0 mx-auto text-4xl">
        <h1>Welcome to Material Crate!</h1>
        <h2 className="text-xl">Where would you like to start?</h2>
      </div>
      <div className="space-y-2 flex flex-col w-full h-full justify-center">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelectedOption(option.id)}
            className={`
              w-full px-4 py-2 rounded-lg text-left border font-medium
              ${
                selectedOption === option.id
                  ? "border-black bg-[#E8E8E8]"
                  : "border-[#CCCCCC] hover:bg-gray-50"
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={!selectedOption}
        className={`
          py-3 text-center rounded-4xl font-medium transition-all duration-200 fixed bottom-8 left-8 right-12 mx-auto
          ${
            selectedOption
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
