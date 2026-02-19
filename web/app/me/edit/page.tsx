"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit } from "iconsax-reactjs";
import ActionButton from "@/app/components/ActionButton";

type UserProfile = {
  username: string;
  firstname: string;
  surname: string;
  instituion: string;
  program: string;
};

export default function ProfileEdit() {
  const [profile, setProfile] = useState<UserProfile>({
    username: "johndoe",
    firstname: "John",
    surname: "Doe",
    instituion: "University of Example",
    program: "Computer Science",
  });
  const [message, setMessage] = useState<string>("");

  const router = useRouter();

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
      value: profile.firstname,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, firstname: e.target.value }),
      key: "firstname",
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
      value: profile.instituion,
      onchange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setProfile({ ...profile, instituion: e.target.value }),
      key: "instituion",
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

  const isSaveDisabled = textInputs.some(
    (input) => input.value.trim().length < input.minLength,
  );

  return (
    <div>
      <header className="fixed top-0 left-0 right-0 bg-white pb-4 pt-12 px-6 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.1)] flex items-center">
        <button aria-label="Back" type="button" onClick={() => router.back()}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 text-xl font-medium">
          <h1>Profile</h1>
        </div>
      </header>
      <form className="pt-30 px-6 flex flex-col items-center gap-10">
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
                required
                minLength={input.minLength}
                maxLength={input.maxLength}
                className="w-full rounded-lg px-3 py-3 bg-[#F3F3F3]/50 shadow text-xs placeholder:text-[#B1B1B1] focus:outline-none"
              />
            </div>
          ))}
        </div>
        <ActionButton
          type="submit"
          label="Save Changes"
          className="fixed left-8 right-8 bottom-12"
          disabled={isSaveDisabled}
        />
      </form>
    </div>
  );
}
