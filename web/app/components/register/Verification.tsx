import React, { useRef, useState } from "react";
import ActionButton from "../ActionButton";

interface VerificationProps {
  email: string;
}

export default function Verification({ email }: VerificationProps) {
  const [code, setCode] = useState<string[]>(["", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="h-screen relative w-full">
      <div className="text-center fixed top-30 w-70 left-0 right-0 mx-auto text-4xl">
        <h1>Verify email</h1>
        <h2 className="text-sm text-[#333333] mt-2">
          We’ve sent a verification code to{" "}
          <span className="font-semibold">{email}</span>. Check your inbox.
        </h2>
      </div>
      <div className="flex flex-col w-full h-full justify-center items-center">
        <div className="flex gap-5">
          {code.map((digit, i) => (
            <input
              title="Verification input"
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              type="text"
              maxLength={1}
              placeholder=" "
              value={digit}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="w-15 h-15 text-center text-2xl border rounded-lg focus:outline-none focus:border-[#E1761F]"
            />
          ))}
        </div>
      </div>
      <ActionButton
        type="submit"
        className="fixed bottom-8 left-8 right-8 mx-auto"
        disabled={code.some((digit) => digit === "")}
      >
        VERIFY
      </ActionButton>
    </div>
  );
}
