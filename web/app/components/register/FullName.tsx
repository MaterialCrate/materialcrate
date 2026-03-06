import React from "react";
import ActionButton from "../ActionButton";

interface FullNameProps {
  firstName: string;
  setFirstName: React.Dispatch<React.SetStateAction<string>>;
  surname: string;
  setSurname: React.Dispatch<React.SetStateAction<string>>;
}

export default function FullName({
  firstName,
  setFirstName,
  surname,
  setSurname,
}: FullNameProps) {
  const nameInputs = [
    {
      label: "FIRST NAME",
      value: firstName,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFirstName(e.target.value),
      key: "firstName",
      placeholder: "e.g. John",
      minLength: 2,
      maxLength: 12,
    },
    {
      label: "SURNAME",
      value: surname,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setSurname(e.target.value),
      key: "surname",
      placeholder: "e.g. Doe",
      minLength: 2,
      maxLength: 15,
    },
  ];

  const isNextDisabled = nameInputs.some(
    (input) => (input.value ?? "").trim().length < input.minLength,
  );

  return (
    <div className="h-full relative w-full">
      <div className="flex flex-col w-full h-full justify-center gap-5">
        {nameInputs.map((input) => (
          <div key={input.key}>
            <h4 className="font-medium">{input.label}</h4>
            <input
              type="text"
              value={input.value}
              onChange={input.onChange}
              placeholder={input.placeholder}
              className="border border-black w-full px-4 py-3 rounded-lg focus:outline-none"
              required
              minLength={input.minLength}
              maxLength={input.maxLength}
            />
          </div>
        ))}
      </div>
      <ActionButton
        type="submit"
        className="fixed bottom-8 left-8 right-8 mx-auto"
        disabled={isNextDisabled}
      >
        NEXT
      </ActionButton>
    </div>
  );
}
