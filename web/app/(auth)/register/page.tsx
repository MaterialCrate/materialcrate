"use client";

import React, { useState } from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Verification from "@/app/components/register/Verification";
import Username from "@/app/components/register/Username";
import FullName from "@/app/components/register/FullName";
import Institution from "@/app/components/register/Institution";
import Program from "@/app/components/register/Program";
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
          setError("Could not load social profile details");
          console.error("Failed to prefill social profile:", caughtError);
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
        setError("Could not verify this email");
        console.error("Email availability check failed:", caughtError);
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

      if (!body?.verificationEmailSent) {
        throw new Error("Server error. Try again later.");
      }

      setStep(7);
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
  };

  return (
    <form
      className="min-h-dvh bg-surface-high px-4 py-4 sm:px-6 sm:py-6"
      onSubmit={
        isSocialSignup
          ? step < 6
            ? handleNext
            : step === 6
              ? handleSubmit
              : handleNoopSubmit
          : step < 6
            ? handleNext
            : step === 6
              ? handleSubmit
              : handleNoopSubmit
      }
    >
      <Alert type="error" message={error} />
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-130 flex-col rounded-[28px] bg-surface px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:px-6 sm:py-6">
        <div className="flex min-h-10 items-center">
          {((!isSocialSignup && step !== 1 && step !== 7) ||
            (isSocialSignup && step !== 3)) && (
            <button
              type="button"
              aria-label="Go back"
              onClick={handleBack}
              className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition-all duration-200 hover:bg-black/5 active:scale-95"
            >
              <HiOutlineArrowLeft size={26} />
            </button>
          )}
        </div>

        <div className="mx-auto mt-1 flex w-full max-w-md flex-col items-center gap-4 px-2 text-center sm:gap-5">
          <Image
            src="/logo.svg"
            alt="MaterialCrate Logo"
            width={50}
            height={50}
            className="h-auto w-11.5 sm:w-12.5"
          />
          <h1 className="font-serif text-3xl leading-tight text-center sm:text-4xl">
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
                      : step === 6 && "Enter your program/main option"}
          </h1>
        </div>

        <div className="mt-6 flex flex-1 flex-col justify-center transition-all duration-200 ease-out">
          {isSocialSignup ? (
            isPrefillingSocial ? (
              <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-2 text-center text-ink">
                Preparing your social profile...
              </div>
            ) : step === 3 ? (
              <Username
                username={username}
                setUsername={setUsername}
                onValidated={handleUsernameValidated}
                fixedAction
              />
            ) : step === 4 ? (
              <FullName
                displayName={displayName}
                setDisplayName={setDisplayName}
                fixedAction
              />
            ) : step === 5 ? (
              <Institution
                institution={institution}
                setInstitution={setInstitution}
                fixedAction
              />
            ) : step === 6 ? (
              <Program
                program={program}
                setProgram={setProgram}
                submitLabel={loading ? "SUBMITTING..." : "SUBMIT"}
                fixedAction
              />
            ) : null
          ) : step === 1 ? (
            <Email email={email} setEmail={setEmail} />
          ) : step === 2 ? (
            <Password
              password={password}
              setPassword={setPassword}
              fixedAction
            />
          ) : step === 3 ? (
            <Username
              username={username}
              setUsername={setUsername}
              onValidated={handleUsernameValidated}
              fixedAction
            />
          ) : step === 4 ? (
            <FullName
              displayName={displayName}
              setDisplayName={setDisplayName}
              fixedAction
            />
          ) : step === 5 ? (
            <Institution
              institution={institution}
              setInstitution={setInstitution}
              fixedAction
            />
          ) : step === 6 ? (
            <Program
              program={program}
              setProgram={setProgram}
              submitLabel={loading ? "SUBMITTING..." : "SUBMIT"}
              fixedAction
            />
          ) : (
            <Verification email={email} fixedAction />
          )}
        </div>
      </div>
    </form>
  );
}
