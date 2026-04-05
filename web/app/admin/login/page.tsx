"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body?.error || "Login failed");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1F1F1F]">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#888]">MaterialCrate</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="admin-email"
              className="text-sm font-medium text-[#444]"
            >
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[#D4D4D4] bg-white px-4 py-3 text-sm focus:border-[#E1761F] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-password"
              className="text-sm font-medium text-[#444]"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#D4D4D4] bg-white px-4 py-3 text-sm focus:border-[#E1761F] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full rounded-xl bg-[#E1761F] py-3 text-sm font-medium text-white transition-colors disabled:bg-[#E5E5E5] disabled:text-[#818181]"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
