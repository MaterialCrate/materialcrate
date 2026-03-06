"use client";

import React, { useState } from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { useSearchParams } from "next/navigation";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Verification from "@/app/components/register/Verification";
import Username from "@/app/components/register/Username";
import FullName from "@/app/components/register/FullName";
import Institution from "@/app/components/register/Institution";
import Program from "@/app/components/register/Program";
import Welcome from "@/app/components/register/Welcome";

export default function Page() {
  const searchParams = useSearchParams();
  const isSocialSignup = searchParams.get("social") === "1";
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [surname, setSurname] = useState<string>("");
  const [institution, setInstitution] = useState<string>("");
  const [program, setProgram] = useState<string>("");
  const [toGoPage, setToGoPage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPrefillingSocial, setIsPrefillingSocial] = useState<boolean>(false);

  React.useEffect(() => {
    const socialError = searchParams.get("error");
    if (socialError) {
      setError(socialError);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!isSocialSignup) return;
    setStep((currentStep) => (currentStep < 3 ? 3 : currentStep));
  }, [isSocialSignup]);

  React.useEffect(() => {
    if (!isSocialSignup) return;

    let isCancelled = false;
    const prefillFromSocialProfile = async () => {
      setIsPrefillingSocial(true);
      try {
        const response = await fetch("/api/auth/me");
        const body = await response.json().catch(() => ({}));
        const user = body?.user;

        if (!response.ok || !user) {
          throw new Error(
            "Social session expired. Please continue with Google/Facebook again.",
          );
        }

        if (!isCancelled) {
          setEmail(user.email ?? "");
          setFirstName(user.firstName ?? "");
          setSurname(user.surname ?? "");
          setUsername(user.username ?? "");
        }
      } catch (caughtError: unknown) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load social profile details",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsPrefillingSocial(false);
        }
      }
    };

    prefillFromSocialProfile();

    return () => {
      isCancelled = true;
    };
  }, [isSocialSignup]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSocialSignup) {
      if (step === 3 && username) {
        setStep(5);
      } else if (step === 5 && institution) {
        setStep(6);
      } else if (step === 6 && program) {
        setStep(7);
      }
      return;
    }

    if (step === 1 && email) {
      setStep(2);
    } else if (step === 2 && password) {
      setStep(3);
    } else if (step === 3 && username) {
      setStep(4);
    } else if (step === 4 && firstName && surname) {
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
      if (isSocialSignup) {
        const res = await fetch("/api/graphql/complete-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            firstName,
            surname,
            institution,
            program,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not complete social signup");
        }

        window.location.href = "/";
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          username,
          firstName,
          surname,
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

  const handleBack = () => {
    if (!isSocialSignup) {
      setStep(step - 1);
      return;
    }

    if (step === 5) {
      setStep(3);
      return;
    }
    if (step === 6) {
      setStep(5);
      return;
    }
    if (step === 7) {
      setStep(6);
    }
  };

  return (
    <form
      className="flex flex-col h-dvh items-center px-8 py-12 gap-16 relative"
      onSubmit={
        isSocialSignup
          ? step < 7
            ? handleNext
            : step === 7
              ? handleSubmit
              : handleNoopSubmit
          : step < 7
            ? handleNext
            : step === 7
              ? handleSubmit
              : handleNoopSubmit
      }
    >
      {((!isSocialSignup && step !== 1 && step !== 8) ||
        (isSocialSignup && step !== 3)) && (
        <HiOutlineArrowLeft
          className="absolute top-5 left-5"
          size={30}
          onClick={handleBack}
        />
      )}
      <div className="absolute flex flex-col items-center gap-5 px-12">
        <div className="w-12 h-12 bg-[#E1761F]" />
        <h1 className="font-serif text-4xl text-center">
          {step === 1
            ? "Let's get started"
            : step === 2
              ? "Create Password"
              : step === 3
                ? "Create your username"
                : step === 4
                  ? "Enter your full name"
                  : step === 5
                    ? "Enter your institution's name"
                    : step === 6
                      ? "Enter your program of study"
                      : step === 7 && "Where would you like to start?"}
        </h1>
      </div>
      {isSocialSignup ? (
        isPrefillingSocial ? (
          <div className="w-full pt-24 text-center text-[#444444]">
            Preparing your social profile...
          </div>
        ) : step === 3 ? (
          <Username username={username} setUsername={setUsername} />
        ) : step === 5 ? (
          <Institution
            institution={institution}
            setInstitution={setInstitution}
          />
        ) : step === 6 ? (
          <Program program={program} setProgram={setProgram} />
        ) : step === 7 ? (
          <Welcome selectedOption={toGoPage} setSelectedOption={setToGoPage} />
        ) : null
      ) : step === 1 ? (
        <Email email={email} setEmail={setEmail} />
      ) : step === 2 ? (
        <Password password={password} setPassword={setPassword} />
      ) : step === 3 ? (
        <Username username={username} setUsername={setUsername} />
      ) : step === 4 ? (
        <FullName
          firstName={firstName}
          setFirstName={setFirstName}
          surname={surname}
          setSurname={setSurname}
        />
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
