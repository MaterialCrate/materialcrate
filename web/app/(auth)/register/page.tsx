"use client";

import React, { useState } from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Verification from "@/app/components/register/Verification";
import Username from "@/app/components/register/Username";
import FullName from "@/app/components/register/FullName";
import Institution from "@/app/components/register/Institution";
import Program from "@/app/components/register/Program";
import Welcome from "@/app/components/register/Welcome";

export default function Page() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
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
    } else if (step === 4 && fullName) {
      setStep(5);
    } else if (step === 5 && institution) {
      setStep(6);
    } else if (step === 6 && program) {
      setStep(7);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          username,
          fullName,
          institution,
          program,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Signup failed");
      }

      setStep(8);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleNoopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form
      className="flex flex-col h-screen items-center px-8 py-12 gap-16 relative"
      onSubmit={step < 7 ? handleNext : step === 7 ? handleSubmit : handleNoopSubmit}
    >
      {step !== 1 && step !== 8 && (
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
        <FullName fullName={fullName} setFullName={setFullName} />
      ) : step === 5 ? (
        <Institution
          institution={institution}
          setInstitution={setInstitution}
        />
      ) : step === 6 ? (
        <Program program={program} setProgram={setProgram} />
      ) : step === 7 ? (
        <Welcome selectedOption={toGoPage} setSelectedOption={setToGoPage} />
      ) : (
        <Verification email={email} />
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[#444444]">Working...</p> : null}
    </form>
  );
}
