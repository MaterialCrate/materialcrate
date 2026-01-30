import React from "react";

interface emailTypes {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
}

export default function Email({ email, setEmail }: emailTypes) {
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="h-screen relative w-full">
      <div className="text-center fixed top-30 w-70 left-0 right-0 mx-auto">
        <h1 className="font-serif text-4xl">Let&#39;s get started</h1>
      </div>
      <div className="space-y-5 flex flex-col w-full h-full justify-center">
        <button
          type="button"
          className="border border-black flex items-center justify-between w-full px-4 py-2 rounded-lg"
        >
          <p className="font-medium">Continue with Google</p>
          <div className="w-7 h-7 rounded-full bg-black"></div>
        </button>
        <button
          type="button"
          className="border border-black flex items-center justify-between w-full px-4 py-2 rounded-lg mb-15"
        >
          <p className="font-medium">Continue with Facebook</p>
          <div className="w-7 h-7 rounded-full bg-black"></div>
        </button>
        <div className="flex items-center justify-between">
          <div className="h-px w-15 bg-linear-to-r from-transparent via-gray-500 to-black" />
          <p className="text-xs">OR CONTINUE WITH EMAIL</p>
          <div className="h-px w-15 bg-linear-to-l from-transparent via-gray-500 to-black" />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border border-black w-full px-4 py-2 rounded-lg mt-4"
          required
        />
        <button
          type="submit"
          disabled={!isValidEmail}
          className={`
          w-full py-3 text-center rounded-4xl font-medium transition-all duration-200
          ${
            isValidEmail
              ? "bg-[#E1761F] text-white active:bg-black"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
