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
import Alert from "@/app/components/Alert";

export default function Page() {
  const searchParams = useSearchParams();
  const isSocialSignup = searchParams.get("social") === "1";
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
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
          setDisplayName(user.displayName ?? "");
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

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSocialSignup) {
      if (step === 3 && username) {
        setStep(4);
      } else if (step === 4 && displayName.trim()) {
        setStep(5);
      } else if (step === 5 && institution) {
        setStep(6);
      } else if (step === 6 && program) {
        setStep(7);
      }
      return;
    }

    if (step === 1 && email) {
      const trimmedEmail = email.trim();
      try {
        const response = await fetch(
          `/api/auth/email-available?email=${encodeURIComponent(trimmedEmail)}`,
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Could not verify this email");
        }

        if (!body?.available) {
          setError("Account already exists with this email.");
          return;
        }
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not verify this email",
        );
        return;
      }

      setStep(2);
    } else if (step === 2 && password) {
      setStep(3);
    } else if (step === 3 && username) {
      setStep(4);
    } else if (step === 4 && displayName.trim()) {
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
            displayName,
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
          displayName,
          institution,
          program,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Oops, something went wrong :-(");
      }

      if (!body?.ok) {
        throw new Error("Oops, something went wrong :-(");
      }

      setStep(8);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Oops, something went wrong :-(");
    } finally {
      setLoading(false);
    }
  };

  const handleNoopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleUsernameValidated = (validatedUsername: string) => {
    setUsername(validatedUsername);
    if (isSocialSignup) {
      setStep(4);
      return;
    }
    setStep(4);
  };

  const handleBack = () => {
    if (!isSocialSignup) {
      setStep(step - 1);
      return;
    }

    if (step === 5) {
      setStep(4);
      return;
    }
    if (step === 4) {
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
      <Alert type="error" message={error} />
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
                  ? "Enter your display name"
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
          <Username
            username={username}
            setUsername={setUsername}
            onValidated={handleUsernameValidated}
          />
        ) : step === 4 ? (
          <FullName displayName={displayName} setDisplayName={setDisplayName} />
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
        <Username
          username={username}
          setUsername={setUsername}
          onValidated={handleUsernameValidated}
        />
      ) : step === 4 ? (
        <FullName displayName={displayName} setDisplayName={setDisplayName} />
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
    </form>
  );
}
