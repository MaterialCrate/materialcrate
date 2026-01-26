"use client";

import React, { useState } from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Username from "@/app/components/register/Username";

export default function Page() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && email) {
      setStep(2);
    } else if (step === 2 && password) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting: ", { email, password, username });
  };

  return (
    <form
      className="flex flex-col h-screen items-center px-12 pt-30 pb-12 gap-16 relative"
      onSubmit={step < 3 ? handleNext : handleSubmit}
    >
      {step !== 1 && (
        <HiOutlineArrowLeft
          className="absolute top-5 left-5"
          size={30}
          onClick={() => setStep(step - 1)}
        />
      )}
      <div className="w-12 h-12 bg-[#E1761F]"></div>
      {step === 1 ? (
        <Email email={email} setEmail={setEmail} />
      ) : step === 2 ? (
        <Password password={password} setPassword={setPassword} />
      ) : (
        step === 3 && <Username username={username} setUsername={setUsername} />
      )}
    </form>
  );
}
