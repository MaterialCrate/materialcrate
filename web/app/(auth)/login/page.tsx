"use client";

import React, { useState } from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Alert from "@/app/components/Alert";

export default function Page() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && email) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const rawError =
          typeof body?.error === "string" ? body.error : "Login failed";

        if (rawError === "Invalid credentials") {
          setError("Incorrect email or password.");
          return;
        }

        if (rawError === "Email is not verified") {
          setError("Please verify your email before logging in.");
          return;
        }

        setError(rawError);
        return;
      }

      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <Alert type="error" message={error} />}
      <form
        className="flex flex-col h-screen items-center px-8 py-12 gap-16 relative"
        onSubmit={step < 2 ? handleNext : handleSubmit}
      >
        {step !== 1 && (
          <HiOutlineArrowLeft
            className="absolute top-5 left-5"
            size={30}
            onClick={() => setStep(step - 1)}
          />
        )}
        <div className="w-12 h-12 bg-[#E1761F] fixed"></div>
        {step === 1 ? (
          <Email email={email} setEmail={setEmail} />
        ) : (
          <Password password={password} setPassword={setPassword} />
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-[#444444]">Signing in...</p>
        ) : null}
      </form>
    </div>
  );
}
