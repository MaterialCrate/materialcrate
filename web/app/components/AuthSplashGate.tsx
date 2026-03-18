"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/auth-client";
import AuthSplashScreen from "./AuthSplashScreen";

type AuthSplashGateProps = {
  children: React.ReactNode;
};

const MIN_SPLASH_DURATION_MS = 2500;

export default function AuthSplashGate({ children }: AuthSplashGateProps) {
  const { hasResolvedInitialAuth } = useAuth();
  const [hasMetMinimumDelay, setHasMetMinimumDelay] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasMetMinimumDelay(true);
    }, MIN_SPLASH_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!hasResolvedInitialAuth || !hasMetMinimumDelay) {
    return <AuthSplashScreen />;
  }

  return <>{children}</>;
}
