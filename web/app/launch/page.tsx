"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Orbitron, Sora } from "next/font/google";
import { getLaunchTimeMs, isBeforeLaunch } from "@/app/lib/launch";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getCountdownParts = (remainingMs: number): CountdownParts => {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(clamped / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
};

const formatSegment = (value: number) => String(value).padStart(2, "0");

export default function LaunchPage() {
  const router = useRouter();
  const launchTimeMs = useMemo(() => getLaunchTimeMs(), []);
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, launchTimeMs - Date.now()),
  );

  const countdown = useMemo(
    () => getCountdownParts(remainingMs),
    [remainingMs],
  );

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, launchTimeMs - Date.now()));
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [launchTimeMs]);

  useEffect(() => {
    if (!isBeforeLaunch()) {
      const timeout = window.setTimeout(() => {
        router.replace("/");
      }, 700);

      return () => window.clearTimeout(timeout);
    }

    return;
  }, [remainingMs, router]);

  const launchDateLabel = new Date(launchTimeMs).toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const countdownCards = [
    { label: "Days", value: countdown.days },
    { label: "Hours", value: countdown.hours },
    { label: "Mins", value: countdown.minutes },
    { label: "Secs", value: countdown.seconds },
  ];

  const isLaunched = remainingMs <= 0;

  return (
    <main
      className={`${sora.className} relative min-h-dvh overflow-hidden bg-[#111418] text-white`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#ff6f1f]/25 blur-3xl" />
        <div className="absolute -right-30 top-[30%] h-96 w-96 rounded-full bg-[#2f7dff]/25 blur-3xl" />
        <div className="absolute -bottom-30 left-1/3 h-80 w-80 rounded-full bg-[#ffc23a]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-4 py-2 backdrop-blur">
            <Image
              src="/logo.png"
              alt="Material Crate logo"
              width={26}
              height={26}
              className="h-6.5 w-6.5"
              priority
            />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
              Material Crate Launch
            </span>
          </div>
        </div>

        <section className="mt-10 flex flex-1 flex-col items-center justify-center text-center sm:mt-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9a62]">
            Countdown in Progress
          </p>
          <h1
            className={`${orbitron.className} text-balance text-4xl font-extrabold uppercase leading-[0.95] tracking-[0.04em] text-white sm:text-6xl md:text-7xl`}
          >
            We launch soon
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
            Full access opens on {launchDateLabel}. Until then, this launch
            screen is the only page available on the live domain.
          </p>

          <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
            {countdownCards.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:rounded-3xl sm:px-4 sm:py-5"
              >
                <p
                  className={`${orbitron.className} text-3xl font-bold leading-none text-[#ffd7bf] sm:text-4xl`}
                >
                  {formatSegment(item.value)}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  {item.label}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-7 rounded-full border border-white/15 bg-black/25 px-5 py-2 text-xs tracking-[0.18em] text-white/80 sm:text-sm">
            {isLaunched
              ? "Launch unlocked. Redirecting..."
              : "See you at 8:00 PM"}
          </div>

          {process.env.NODE_ENV !== "production" ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 rounded-full border border-[#ff9a62] bg-[#ff9a62]/15 px-5 py-2 text-sm font-semibold text-[#ffd9c2] transition hover:bg-[#ff9a62]/30"
            >
              Continue to app (dev only)
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
