"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Email from "@/app/components/register/Email";
import Password from "@/app/components/register/Password";
import Alert from "@/app/components/Alert";
import { useSystemPopup } from "@/app/components/SystemPopup";
import { refreshAuth } from "@/app/lib/auth-client";

const formatRestoreDeadline = (value?: string | null) => {
  if (!value) return "within 30 days";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "within 30 days";

  return parsed.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function Page() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const popup = useSystemPopup();
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const restorePromptShownRef = useRef(false);

  const handleRestorePrompt = useCallback(
    async (restoreDeadline?: string | null) => {
      const shouldRestore = await popup.confirm({
        title: "Restore account?",
        message: `This account is currently deleted. If you continue, it will be restored and available again. You can restore it until ${formatRestoreDeadline(
          restoreDeadline,
        )}.`,
        confirmLabel: "Restore account",
        cancelLabel: "Cancel",
      });

      if (!shouldRestore) {
        await fetch("/api/auth/restore", { method: "DELETE" }).catch(
          () => null,
        );
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/restore", {
          method: "POST",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to restore account");
        }

        await refreshAuth();
        window.location.href = "/";
      } catch (caughtError: unknown) {
        setError("Failed to restore account");
        console.error("Failed to restore: ", caughtError);
      } finally {
        setLoading(false);
      }
    },
    [popup],
  );

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
          setError("Incorrect email or password");
          return;
        }

        if (rawError === "Email is not verified") {
          setError("Please verify your email");
          return;
        }

        setError(rawError);
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (body?.restoreRequired) {
        await handleRestorePrompt(body?.restoreDeadline);
        return;
      }

      await refreshAuth();
      window.location.href = "/";
    } catch (err: unknown) {
      setError("Login failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const socialError = searchParams.get("error");
    if (socialError) {
      setError(socialError);
    }
  }, [searchParams]);

  useEffect(() => {
    const deleted = searchParams.get("deleted");
    if (deleted === "1") {
      setError(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const restore = searchParams.get("restore");
    const restoreDeadline = searchParams.get("restoreDeadline");

    if (restore !== "1" || restorePromptShownRef.current) {
      return;
    }

    restorePromptShownRef.current = true;
    void handleRestorePrompt(restoreDeadline);
  }, [handleRestorePrompt, searchParams]);

  return (
    <div className="min-h-dvh bg-[#FAFAFA] px-4 py-4 sm:px-6 sm:py-6">
      {searchParams.get("deleted") === "1" ? (
        <Alert
          type="info"
          message={`Account deleted. Log back in by ${formatRestoreDeadline(
            searchParams.get("restoreDeadline"),
          )} to restore it.`}
        />
      ) : null}
      {error && <Alert type="error" message={error} />}

      <form
        className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col rounded-[28px] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:px-6 sm:py-6"
        onSubmit={step < 2 ? handleNext : handleSubmit}
      >
        <div className="flex min-h-10 items-center">
          {step !== 1 && (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => setStep(step - 1)}
              className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full text-[#202020] transition-all duration-200 hover:bg-black/5 active:scale-95"
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
            className="h-auto w-[46px] sm:w-[50px]"
          />
          <h1 className="font-serif text-3xl leading-tight text-center sm:text-4xl">
            {step === 1 ? "Welcome Back" : "Enter your password"}
          </h1>
        </div>

        <div className="mt-6 flex flex-1 flex-col justify-center transition-all duration-200 ease-out">
          {step === 1 ? (
            <Email email={email} setEmail={setEmail} />
          ) : (
            <Password
              password={password}
              setPassword={setPassword}
              submitLabel={loading ? "SIGNING IN..." : "SIGN IN"}
              fixedAction
            />
          )}
          {loading && step === 1 ? (
            <p className="mt-4 text-center text-sm text-[#444444]">
              Signing in...
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
