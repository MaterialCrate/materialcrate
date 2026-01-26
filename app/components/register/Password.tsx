import React from "react";

interface passwordTypes {
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
}

type rule = {
  ok: boolean;
  text: string;
};

const Rule = ({ ok, text }: rule) => (
  <p
    className={`flex items-center gap-1 ${ok ? "text-green-600" : "text-[#444444]"}`}
  >
    <span>{ok ? "✔" : "•"}</span>
    {text}
  </p>
);

export default function Password({ password, setPassword }: passwordTypes) {
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isValidPassword =
    hasMinLength && hasNumber && hasUppercase && hasSpecial;

  return (
    <div className="flex flex-col h-screen justify-between">
      <div className="px-12 text-center">
        <h1 className="font-serif text-4xl">Create Password</h1>
      </div>
      <div className="space-y-5">
        <div>
          <h4 className="font-medium">Password</h4>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className="border border-black w-full px-4 py-2 rounded-lg"
            required
          />
          <div className="text-[11px] text-[#444444] font-medium mt-1.5">
            <Rule
              ok={hasMinLength}
              text="Password must contain at least eight characters"
            />
            <Rule
              ok={hasNumber}
              text="Password must contain at least one number"
            />
            <Rule
              ok={hasUppercase}
              text="Password must contain at least one uppercase letter"
            />
            <Rule
              ok={hasSpecial}
              text="Password must contain at least one special character"
            />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={!isValidPassword}
        className={`
          w-full py-3 text-center rounded-4xl font-medium transition-all duration-200
          ${
            isValidPassword
              ? "bg-[#E1761F] text-white active:bg-black"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        NEXT
      </button>
    </div>
  );
}
