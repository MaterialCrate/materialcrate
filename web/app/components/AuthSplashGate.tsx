"use client";

import { useAuth } from "@/app/lib/auth-client";
import AuthSplashScreen from "./AuthSplashScreen";

type AuthSplashGateProps = {
  children: React.ReactNode;
};

export default function AuthSplashGate({ children }: AuthSplashGateProps) {
  const { hasResolvedInitialAuth } = useAuth();

  if (!hasResolvedInitialAuth) {
    return <AuthSplashScreen />;
  }

  return <>{children}</>;
}
