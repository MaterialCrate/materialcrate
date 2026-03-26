"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/app/components/Alert";
import Header from "@/app/components/Header";
import Verification from "@/app/components/register/Verification";
import { refreshAuth, useAuth } from "@/app/lib/auth-client";

export default function Page() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!isLoading && user && !user.pendingEmail) {
      router.replace("/settings/account");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
        <Header title="Verify New Email" isLoading />
        <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[#3D3D3D]">
          Loading verification details...
        </div>
      </div>
    );
  }

  if (!user?.pendingEmail) {
    return (
      <div className="min-h-dvh bg-[#F7F7F7] px-6 pt-20">
        <Header title="Verify New Email" isLoading={false} />
        <Alert type="info" message="No pending email change found." />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pb-6 pt-20">
      <Header title="Verify New Email" isLoading={false} />
      <div className="overflow-hidden rounded-3xl border border-black/6 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
        <Verification
          email={user.pendingEmail}
          title="Confirm your new email"
          description={
            <>
              Enter the 4-digit code we sent to{" "}
              <span className="font-semibold text-[#202020]">
                {user.pendingEmail}
              </span>{" "}
              to finish updating your sign-in email.
            </>
          }
          verifyEndpoint="/api/auth/email-change/verify"
          resendEndpoint="/api/auth/email-change/resend"
          buildVerifyBody={(code) => ({ code })}
          buildResendBody={() => ({})}
          successRedirect="/settings/account?emailChanged=1"
          onVerified={async () => {
            await refreshAuth();
          }}
        />
      </div>
    </div>
  );
}
