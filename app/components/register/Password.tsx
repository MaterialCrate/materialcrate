"use client";

import React from "react";
import { usePathname } from "next/navigation";

interface passwordTypes {
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
}

type rule = {
  ok: boolean;
  text: string;
};

const Rule = ({ ok, text }: rule) => (
  <p
    className={`flex items-center gap-1 ${ok ? "text-green-600" : "text-[#444444]"}`}
  >
    <span>{ok ? "✔" : "•"}</span>
    {text}
  </p>
);

export default function Password({ password, setPassword }: passwordTypes) {
  const pathname = usePathname();
  const isRegister = pathname === "/register";
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);

  const isValidPassword = hasMinLength && hasNumber && hasUppercase;

  const shouldDisable = isRegister && !isValidPassword;

  return (
    <div className="h-screen relative w-full">
      <div className="text-center fixed top-30 w-70 left-0 right-0 mx-auto">
        <h1 className="font-serif text-4xl">
          {pathname === "/register" ? "Create password" : "Enter password"}
        </h1>
      </div>
      <div className="flex flex-col w-full h-full justify-center">
        <h4 className="font-medium">PASSWORD</h4>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
          className="border border-black w-full px-4 py-2 rounded-lg"
          required
        />
        {isRegister && (
          <div className="text-[11px] text-[#444444] font-medium mt-1.5">
            <Rule
              ok={hasMinLength}
              text="Password must contain at least eight characters"
            />
            <Rule
              ok={hasNumber}
              text="Password must contain at least one number"
            />
            <Rule
              ok={hasUppercase}
              text="Password must contain at least one uppercase letter"
            />
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={shouldDisable || password.length < 1}
        className={`
          py-3 text-center rounded-4xl font-medium transition-all duration-200 fixed bottom-12 left-8 right-8 mx-auto
          ${
            shouldDisable || password.length < 1
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#E1761F] text-white active:bg-black"
          }
        `}
      >
        NEXT
      </button>
    </div>
  );
}
