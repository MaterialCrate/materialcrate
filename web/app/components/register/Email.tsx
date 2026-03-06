import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import ActionButton from "../ActionButton";

interface emailTypes {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
}

export default function Email({ email, setEmail }: emailTypes) {
  const pathname = usePathname();
  const router = useRouter();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const mode = pathname === "/register" ? "register" : "login";

  const handleSocialAuth = (provider: "google" | "facebook") => {
    router.push(`/api/auth/social/${provider}?mode=${mode}`);
  };

  return (
    <div className="h-full relative w-full mt-10">
      <div className="space-y-5 flex flex-col w-full h-full justify-center">
        <button
          type="button"
          onClick={() => handleSocialAuth("google")}
          className="border border-black flex items-center justify-between w-full px-4 py-3 rounded-lg"
        >
          <p className="font-medium">Continue with Google</p>
          <FaGoogle size={24} />
        </button>
        <button
          type="button"
          onClick={() => handleSocialAuth("facebook")}
          className="border border-black flex items-center justify-between w-full px-4 py-3 rounded-lg mb-15"
        >
          <p className="font-medium">Continue with Facebook</p>
          <FaFacebook size={24} />
        </button>
        <div className="flex items-center justify-between">
          <div className="h-px w-15 bg-linear-to-r from-transparent via-gray-500 to-black" />
          <p className="text-xs">OR CONTINUE WITH EMAIL</p>
          <div className="h-px w-15 bg-linear-to-l from-transparent via-gray-500 to-black" />
        </div>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="border border-black w-full px-4 py-3 rounded-lg mt-4 focus:outline-none"
            required
          />
          <p className="text-sm text-[#444444] font-medium mt-1.5">
            {pathname === "/register"
              ? "Already have an account? "
              : "Don't have an account? "}
            <span
              className="text-black font-semibold"
              onClick={() =>
                router.push(
                  `${pathname === "/register" ? "/login" : "/register"}`,
                )
              }
            >
              {pathname === "/register" ? "Sign in" : "Sign up"}
            </span>
          </p>
        </div>
        <ActionButton type="submit" disabled={!isValidEmail}>
          NEXT
        </ActionButton>
      </div>
    </div>
  );
}
