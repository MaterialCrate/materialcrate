"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit } from "iconsax-reactjs";
import { IoMdCheckmarkCircle, IoMdCloseCircle } from "react-icons/io";
import Alert from "@/app/components/Alert";

type UserProfile = {
  username: string;
  firstName: string;
  surname: string;
  institution: string;
  program: string;
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;

export default function ProfileEdit() {
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    firstName: "",
    surname: "",
    institution: "",
    program: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [usernameMessage, setUsernameMessage] = useState<string>("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [isLiveChecking, setIsLiveChecking] = useState<boolean>(false);
  const [isSubmitChecking, setIsSubmitChecking] = useState<boolean>(false);
  const lastLiveCheckedUsernameRef = useRef<string>("");
  const isChecking = isLiveChecking || isSubmitChecking;
  const [fetchedUsername, setFetchedUsername] = useState<string>("");

  const router = useRouter();

  const getValidationError = useCallback((value: string) => {
    if (!USERNAME_REGEX.test(value)) {
      return "Username may only contain letters, numbers, and underscores.";
    }
    return "";
  }, []);

  const checkUsernameAvailability = useCallback(
    async (candidate: string, signal?: AbortSignal) => {
      const response = await fetch(
        `/api/auth/username-available?username=${encodeURIComponent(candidate)}`,
        { signal },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          ok: false,
          available: false,
          error:
            body?.error ||
            "Error connecting to server. Please try again later.",
        };
      }

      return {
        ok: true,
        available: Boolean(body?.available),
        error: "",
      };
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/auth/me", { method: "GET" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.user) {
          throw new Error("Failed to load profile");
        }

        if (!mounted) return;
        setProfile({
          username: body.user.username ?? "",
          firstName: body.user.firstName ?? "",
          surname: body.user.surname ?? "",
          institution: body.user.institution ?? "",
          program: body.user.program ?? "",
        });
        setFetchedUsername(body.user.username ?? "");
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const trimmedUsername = profile.username.trim();

    if (!trimmedUsername) {
      setUsernameMessage("");
      setIsLiveChecking(false);
      return;
    }

    const validationError = getValidationError(trimmedUsername);
    if (validationError) {
      setUsernameMessage(validationError);
      setIsLiveChecking(false);
      return;
    }

    if (trimmedUsername === lastLiveCheckedUsernameRef.current) {
      setIsLiveChecking(false);
      return;
    }

    setIsLiveChecking(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(
          trimmedUsername,
          controller.signal,
        );

        if (!result.ok) {
          setUsernameMessage(result.error);
          return;
        }

        lastLiveCheckedUsernameRef.current = trimmedUsername;
        setIsUsernameAvailable(result.available ? true : false);
        setUsernameMessage("");
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setUsernameMessage(
          "Error connecting to server. Please try again later.",
        );
      } finally {
        setIsLiveChecking(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [checkUsernameAvailability, getValidationError, profile.username]);

  const textInputs = [
    {
      label: "First Name",
      value: profile.firstName,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, firstName: e.target.value }),
      key: "firstName",
      minLength: 2,
      maxLength: 12,
    },
    {
      label: "Surname",
      value: profile.surname,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, surname: e.target.value }),
      key: "surname",
      minLength: 2,
      maxLength: 15,
    },
    {
      label: "Institution",
      value: profile.institution,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, institution: e.target.value }),
      key: "institution",
      minLength: 3,
      maxLength: 50,
    },
    {
      label: "Program",
      value: profile.program,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, program: e.target.value }),
      key: "program",
      minLength: 3,
      maxLength: 50,
    },
  ];

  const isSaveDisabled =
    !profile.username.trim() ||
    profile.username.length < MIN_USERNAME_LENGTH ||
    getValidationError(profile.username.trim()) !== "" ||
    (isUsernameAvailable === false && profile.username !== fetchedUsername) ||
    textInputs.some((input) => input.value.trim().length < input.minLength) ||
    isLoading ||
    isSaving ||
    isSubmitChecking;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    setIsSaving(true);
    setSuccessMessage("");
    setError("");

    try {
      setIsSubmitChecking(true);
      const trimmedUsername = profile.username.trim();

      const validationError = getValidationError(trimmedUsername);
      if (validationError) {
        setUsernameMessage(validationError);
        return;
      }

      const usernameResult = await checkUsernameAvailability(trimmedUsername);
      if (!usernameResult.ok) {
        setUsernameMessage(usernameResult.error);
        return;
      }

      if (!usernameResult.available) {
        setIsUsernameAvailable(false);
        return;
      }

      lastLiveCheckedUsernameRef.current = trimmedUsername;
      setUsernameMessage("");

      const response = await fetch("/api/graphql/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          firstName: profile.firstName.trim(),
          surname: profile.surname.trim(),
          institution: profile.institution.trim(),
          program: profile.program.trim() || null,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to save profile");
      }

      setSuccessMessage("Profile updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSubmitChecking(false);
      setIsSaving(false);
    }
  };

  return (
    <div>
      {successMessage && <Alert type="success" message={successMessage} />}
      {error && <Alert type="error" message={error} />}
      <header className="fixed top-0 left-0 right-0 bg-white pb-4 pt-12 px-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] flex items-center justify-between z-50">
        <button aria-label="Back" type="button" onClick={() => router.back()}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center text-xl font-medium">
          <h1>Profile</h1>
        </div>
        <button
          type="submit"
          form="profile-form"
          disabled={isSaveDisabled}
          className="text-sm font-semibold text-[#E1761F] disabled:text-[#818181]"
        >
          Save
        </button>
      </header>
      <form
        id="profile-form"
        className="pt-30 px-6 flex flex-col items-center gap-10"
        onSubmit={handleSave}
      >
        <div className="w-35 h-35 rounded-full bg-[#F1F1F1] relative">
          <button
            aria-label="edit pfp"
            type="button"
            className="w-10 h-10 bg-white shadow-xl rounded-full absolute bottom-1 right-1 flex items-center justify-center"
          >
            <Edit size={24} color="#797979" />
          </button>
        </div>
        <div className="w-full">
          <h2 className="text-xl font-semibold">Personal Information</h2>
          <div className="space-y-1 mt-4">
            <p className="text-[#5B5B5B] text-sm font-medium">Username</p>
            <div className="relative">
              <input
                placeholder={profile.username}
                value={profile.username}
                onChange={(e) => {
                  setProfile({ ...profile, username: e.target.value });
                  lastLiveCheckedUsernameRef.current = "";
                }}
                disabled={isLoading || isSaving}
                required
                minLength={MIN_USERNAME_LENGTH}
                maxLength={15}
                className="w-full rounded-lg px-3 py-3 pr-12 bg-[#F3F3F3]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
              />
              {isChecking && profile.username.length >= MIN_USERNAME_LENGTH ? (
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-[#E1761F] border-t-transparent animate-spin"
                />
              ) : (
                profile.username.length >= MIN_USERNAME_LENGTH &&
                !usernameMessage &&
                profile.username !== fetchedUsername && (
                  <p
                    className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold ${isUsernameAvailable ? "text-green-500" : "text-red-500"}`}
                  >
                    {isUsernameAvailable ? (
                      <IoMdCheckmarkCircle size={24} />
                    ) : (
                      <IoMdCloseCircle size={24} />
                    )}
                  </p>
                )
              )}
            </div>
            <p className="text-[12px] text-red-500">{usernameMessage}</p>
          </div>
          {textInputs.map((input) => (
            <div className="space-y-1 mt-4" key={input.key}>
              <p className="text-[#5B5B5B] text-sm font-medium">
                {input.label}
              </p>
              <input
                placeholder={input.value}
                value={input.value}
                onChange={input.onchange}
                disabled={isLoading || isSaving}
                required
                minLength={input.minLength}
                maxLength={input.maxLength}
                className="w-full rounded-lg px-3 py-3 bg-[#F3F3F3]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
              />
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}
