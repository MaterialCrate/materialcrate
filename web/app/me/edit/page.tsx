"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "iconsax-reactjs";
import { IoMdCheckmarkCircle, IoMdCloseCircle } from "react-icons/io";
import Alert from "@/app/components/Alert";
import ProfilePictureField from "@/app/components/me/ProfilePictureField";

type UserProfile = {
  username: string;
  displayName: string;
  profilePictureUrl?: string;
  institution: string;
  program: string;
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;

export default function ProfileEdit() {
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    displayName: "",
    institution: "",
    program: "",
    profilePictureUrl: "",
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
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null,
  );
  const [profilePicturePreviewUrl, setProfilePicturePreviewUrl] =
    useState<string>("");
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(
    null,
  );

  const router = useRouter();

  const profilePictureToRender =
    profilePicturePreviewUrl || profile.profilePictureUrl || "";

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
          displayName: body.user.displayName ?? "",
          institution: body.user.institution ?? "",
          program: body.user.program ?? "",
          profilePictureUrl:
            body.user.profilePicture ?? body.user.profilePictureUrl ?? "",
        });
        setInitialProfile({
          username: body.user.username ?? "",
          displayName: body.user.displayName ?? "",
          institution: body.user.institution ?? "",
          program: body.user.program ?? "",
          profilePictureUrl:
            body.user.profilePicture ?? body.user.profilePictureUrl ?? "",
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
    return () => {
      if (profilePicturePreviewUrl) {
        URL.revokeObjectURL(profilePicturePreviewUrl);
      }
    };
  }, [profilePicturePreviewUrl]);

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
      label: "Display Name",
      value: profile.displayName,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, displayName: e.target.value }),
      key: "displayName",
      minLength: 2,
      maxLength: 30,
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

  const hasTextChanges = initialProfile
    ? profile.username.trim() !== initialProfile.username.trim() ||
      profile.displayName.trim() !== initialProfile.displayName.trim() ||
      profile.institution.trim() !== initialProfile.institution.trim() ||
      profile.program.trim() !== initialProfile.program.trim()
    : false;
  const hasProfilePictureChange = Boolean(profilePictureFile);
  const hasPendingChanges = hasTextChanges || hasProfilePictureChange;

  const isSaveDisabled =
    !hasPendingChanges ||
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

      if (trimmedUsername !== fetchedUsername) {
        const usernameResult = await checkUsernameAvailability(trimmedUsername);
        if (!usernameResult.ok) {
          setUsernameMessage(usernameResult.error);
          return;
        }

        if (!usernameResult.available) {
          setIsUsernameAvailable(false);
          return;
        }
      }

      lastLiveCheckedUsernameRef.current = trimmedUsername;
      setUsernameMessage("");

      const formData = new FormData();
      formData.append("username", trimmedUsername);
      formData.append("displayName", profile.displayName.trim());
      formData.append("institution", profile.institution.trim());
      const trimmedProgram = profile.program.trim();
      if (trimmedProgram) {
        formData.append("program", trimmedProgram);
      }
      if (profilePictureFile) {
        formData.append("profilePictureFile", profilePictureFile);
      }

      const response = await fetch("/api/graphql/complete-profile", {
        method: "POST",
        body: formData,
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to save profile");
      }

      const updatedUser = body?.user;
      if (updatedUser) {
        const nextProfile = {
          username: updatedUser.username ?? profile.username,
          displayName: updatedUser.displayName ?? profile.displayName,
          institution: updatedUser.institution ?? profile.institution,
          program: updatedUser.program ?? profile.program,
          profilePictureUrl:
            updatedUser.profilePicture ??
            updatedUser.profilePictureUrl ??
            profile.profilePictureUrl,
        };
        setProfile(nextProfile);
        setInitialProfile(nextProfile);
        setFetchedUsername(updatedUser.username ?? trimmedUsername);
      } else {
        setInitialProfile((previous) =>
          previous
            ? {
                ...previous,
                username: profile.username,
                displayName: profile.displayName,
                institution: profile.institution,
                program: profile.program,
              }
            : previous,
        );
        setFetchedUsername(trimmedUsername);
      }

      setProfilePictureFile(null);
      setProfilePicturePreviewUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return "";
      });
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
        <ProfilePictureField
          imageUrl={profilePictureToRender}
          onError={setError}
          onClearStatus={() => {
            setError("");
            setSuccessMessage("");
          }}
          onImageReady={(file, previewUrl) => {
            setProfilePictureFile(file);
            setProfilePicturePreviewUrl((previous) => {
              if (previous) {
                URL.revokeObjectURL(previous);
              }
              return previewUrl;
            });
          }}
        />
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
