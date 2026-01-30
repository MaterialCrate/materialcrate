"use client";

import React, { useState } from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Username from "@/app/components/register/Username";
import Institution from "@/app/components/register/Institution";
import Program from "@/app/components/register/Program";
import Welcome from "@/app/components/register/Welcome";

export default function Page() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [institution, setInstitution] = useState<string>("");
  const [program, setProgram] = useState<string>("");
  const [toGoPage, setToGoPage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && email) {
      setStep(2);
    } else if (step === 2 && password) {
      setStep(3);
    } else if (step === 3 && username) {
      setStep(4);
    } else if (step === 4 && institution) {
      setStep(5);
    } else if (step === 5 && program) {
      setStep(6);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/custom-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          username,
          institution,
          program,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Signup failed");
      }

      try {
        localStorage.setItem(
          "pendingProfile",
          JSON.stringify({ email, username, institution, program }),
        );
      } catch {
        // If storage fails, continue to login without profile sync.
      }

      const loginUrl = new URL("/auth/login", window.location.origin);
      loginUrl.searchParams.set("login_hint", email);
      loginUrl.searchParams.set("returnTo", "/");
      window.location.href = loginUrl.toString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="flex flex-col h-screen items-center px-8 py-12 gap-16 relative"
      onSubmit={step < 6 ? handleNext : handleSubmit}
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
      ) : step === 2 ? (
        <Password password={password} setPassword={setPassword} />
      ) : step === 3 ? (
        <Username username={username} setUsername={setUsername} />
      ) : step === 4 ? (
        <Institution
          institution={institution}
          setInstitution={setInstitution}
        />
      ) : step === 5 ? (
        <Program program={program} setProgram={setProgram} />
      ) : (
        <Welcome selectedOption={toGoPage} setSelectedOption={setToGoPage} />
      )}
    </form>
  );
}
