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
    <div>
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
        className="flex flex-col h-dvh items-center px-8 py-12 gap-16 relative"
        onSubmit={step < 2 ? handleNext : handleSubmit}
      >
        {step !== 1 && (
          <HiOutlineArrowLeft
            className="absolute top-5 left-5"
            size={30}
            onClick={() => setStep(step - 1)}
          />
        )}
        <div className="absolute flex flex-col items-center gap-5 px-12">
          <Image
            src="/logo.svg"
            alt="MaterialCrate Logo"
            width={50}
            height={50}
          />
          <h1 className="font-serif text-4xl text-center">
            {step === 1 ? "Welcome Back" : "Enter your password"}
          </h1>
        </div>
        {step === 1 ? (
          <Email email={email} setEmail={setEmail} />
        ) : (
          <Password password={password} setPassword={setPassword} />
        )}
        {loading ? (
          <p className="text-sm text-[#444444]">Signing in...</p>
        ) : null}
      </form>
    </div>
  );
}
