"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ActionButton from "../ActionButton";

interface PasswordProps {
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  submitLabel?: string;
}

type RuleProps = {
  ok: boolean;
  text: string;
};

const Rule = ({ ok, text }: RuleProps) => (
  <p
    className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-[#444444]"}`}
  >
    <span>{ok ? "✔" : "•"}</span>
    {text}
  </p>
);

export default function Password({
  password,
  setPassword,
  submitLabel = "NEXT",
}: PasswordProps) {
  const pathname = usePathname();
  const isRegister = pathname === "/register";
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);

  const isValidPassword = hasMinLength && hasNumber && hasUppercase;
  const shouldDisable = isRegister && !isValidPassword;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-[#202020]">PASSWORD</h4>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#FAFAFA] px-4 py-3.5 text-[16px] transition-all duration-200 focus:border-[#E1761F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E1761F]/15"
            required
          />
        </div>
        {isRegister && (
          <div className="space-y-1 text-[11px] font-medium text-[#444444]">
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
      <ActionButton
        type="submit"
        disabled={shouldDisable || password.length < 1}
        className="mt-8 w-full"
      >
        {submitLabel}
      </ActionButton>
    </div>
  );
}
