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

// TODO: re-enable tomorrow when email quota resets
const TEMPORARILY_DISABLED = true;

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

        if (res.status === 403 && body?.verificationRequired) {
          const deadline = body?.verificationDeadline
            ? new Date(body.verificationDeadline).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : null;
          const params = new URLSearchParams({ email, verify: "1" });
          if (deadline) params.set("verificationDeadline", body.verificationDeadline);
          window.location.href = `/register?${params.toString()}`;
          return;
        }

        const rawError =
          typeof body?.error === "string" ? body.error : "Login failed";

        if (rawError === "Invalid credentials") {
          setError("Incorrect email or password");
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

  if (TEMPORARILY_DISABLED) {
    return (
      <div className="min-h-dvh bg-surface-high px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-130 flex-col rounded-[28px] bg-surface px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:px-6 sm:py-6">
          <div className="mx-auto mt-8 flex w-full max-w-md flex-col items-center gap-4 px-2 text-center">
            <Image src="/logo.svg" alt="MaterialCrate Logo" width={46} height={46} className="h-auto w-11.5 sm:w-12.5" />
            <h1 className="font-serif text-3xl leading-tight">Welcome Back</h1>
          </div>
          <div className="mt-6 flex flex-1 flex-col justify-center">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
              <div className="space-y-4 sm:space-y-5">
                <button
                  type="button"
                  onClick={() => { window.location.assign("/api/auth/social/google?mode=login"); }}
                  className="cursor-pointer flex w-full items-center justify-between rounded-2xl border border-edge-mid bg-surface px-4 py-3.5 text-left transition-all duration-200 hover:border-[#E1761F]/35 hover:bg-[#FFF9F4] active:scale-[0.98]"
                >
                  <p className="font-medium text-ink">Continue with Google</p>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" className="text-ink"><path d="M21.35 11.1c0-.67-.06-1.32-.16-1.94H11v3.67h5.8a4.96 4.96 0 0 1-2.15 3.25v2.7h3.48c2.04-1.88 3.22-4.64 3.22-7.68Z" fill="#4285F4"/><path d="M11 22c2.9 0 5.34-.96 7.12-2.6l-3.48-2.7c-.96.64-2.19 1.02-3.64 1.02-2.8 0-5.17-1.89-6.02-4.43H1.4v2.79A10.99 10.99 0 0 0 11 22Z" fill="#34A853"/><path d="M4.98 13.29A6.6 6.6 0 0 1 4.64 11c0-.8.14-1.57.34-2.29V5.92H1.4A11 11 0 0 0 0 11c0 1.77.42 3.45 1.4 4.08l3.58-1.79Z" fill="#FBBC05"/><path d="M11 4.38c1.58 0 3 .54 4.12 1.6l3.08-3.08A10.96 10.96 0 0 0 11 0 10.99 10.99 0 0 0 1.4 5.92l3.58 2.79C5.83 6.27 8.2 4.38 11 4.38Z" fill="#EA4335"/></svg>
                </button>
                <p className="text-center text-xs text-ink-2">
                  Email sign-in is temporarily unavailable. Please check back tomorrow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface-high px-4 py-4 sm:px-6 sm:py-6">
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
        className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-130 flex-col rounded-[28px] bg-surface px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.04)] ring-1 ring-black/5 sm:px-6 sm:py-6"
        onSubmit={step < 2 ? handleNext : handleSubmit}
      >
        <div className="flex min-h-10 items-center">
          {step !== 1 && (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => setStep(step - 1)}
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
            <p className="mt-4 text-center text-sm text-ink">
              Signing in...
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
