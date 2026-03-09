"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit } from "iconsax-reactjs";
import Alert from "@/app/components/Alert";

type UserProfile = {
  username: string;
  firstName: string;
  surname: string;
  institution: string;
  program: string;
};

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
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const router = useRouter();

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

  const textInputs = [
    {
      label: "Username",
      value: profile.username,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, username: e.target.value }),
      key: "username",
      minLength: 3,
      maxLength: 15,
    },
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
    textInputs.some((input) => input.value.trim().length < input.minLength) ||
    isLoading ||
    isSaving;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/graphql/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username.trim(),
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

      setMessage("Profile updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {message && <Alert type="success" message={message} />}
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
