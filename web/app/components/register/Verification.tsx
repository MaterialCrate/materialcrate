import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "../ActionButton";

interface VerificationProps {
  email: string;
}

export default function Verification({ email }: VerificationProps) {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;

    const nextCode = ["", "", "", ""];
    pasted.split("").forEach((digit, idx) => {
      nextCode[idx] = digit;
    });
    setCode(nextCode);

    const focusIndex = Math.min(pasted.length, 4) - 1;
    if (focusIndex >= 0) {
      inputs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 4) return;

    setIsVerifying(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Verification failed");
      }

      setIsVerified(true);
      setStatus("Email verified successfully. You can continue to login.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to resend verification code");
      }

      setCode(["", "", "", ""]);
      inputs.current[0]?.focus();
      setStatus("A new verification code was sent.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-full relative w-full">
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
              onPaste={handlePaste}
              className="w-15 h-15 text-center text-2xl border rounded-lg focus:outline-none focus:border-[#E1761F]"
            />
          ))}
        </div>
        {status ? <p className="text-sm text-green-700 mt-4">{status}</p> : null}
        {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-sm underline mt-4 disabled:text-gray-400"
        >
          {isResending ? "Sending..." : "Resend code"}
        </button>
      </div>
      <ActionButton
        type={isVerified ? "button" : "button"}
        onClick={isVerified ? () => router.push("/login") : handleVerify}
        className="fixed bottom-8 left-8 right-8 mx-auto"
        disabled={
          (!isVerified && code.some((digit) => digit === "")) ||
          isVerifying ||
          isResending
        }
      >
        {isVerified ? "CONTINUE TO LOGIN" : isVerifying ? "VERIFYING..." : "VERIFY"}
      </ActionButton>
    </div>
  );
}
