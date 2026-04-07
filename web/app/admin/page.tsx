"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  POST_CATEGORIES,
} from "@/app/lib/post-categories";

type Bot = {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  institution?: string | null;
  program?: string | null;
  createdAt: string;
};

const ADJECTIVES = [
  "Quick",
  "Brave",
  "Calm",
  "Eager",
  "Fresh",
  "Happy",
  "Kind",
  "Neat",
  "Sharp",
  "Wise",
  "Bold",
  "Cool",
  "Fair",
  "Grand",
  "Lively",
  "Noble",
  "Pure",
  "Swift",
  "Vivid",
  "Witty",
];

const NOUNS = [
  "Panda",
  "Eagle",
  "Tiger",
  "Falcon",
  "Wolf",
  "Hawk",
  "Bear",
  "Fox",
  "Lion",
  "Owl",
  "Deer",
  "Crane",
  "Lynx",
  "Raven",
  "Viper",
  "Swan",
  "Bison",
  "Cedar",
  "Maple",
  "Stone",
];

const INSTITUTIONS = [
  "Stanford University",
  "MIT",
  "Harvard University",
  "UC Berkeley",
  "Yale University",
  "Princeton University",
  "Columbia University",
  "University of Toronto",
  "Oxford University",
  "Cambridge University",
  "McGill University",
  "UCLA",
  "NYU",
  "University of Michigan",
  "Georgia Tech",
];

const PROGRAMS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Engineering",
  "Biology",
  "Chemistry",
  "Economics",
  "Psychology",
  "Business Administration",
  "Data Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Statistics",
  "Philosophy",
  "Political Science",
];

const DICEBEAR_STYLES = [
  "avataaars",
  "bottts",
  "fun-emoji",
  "lorelei",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
  "thumbs",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomBot() {
  const adj = randomPick(ADJECTIVES);
  const noun = randomPick(NOUNS);
  const num = Math.floor(Math.random() * 99) + 1;
  const username = `${adj}${noun}${num}`;
  const displayName = `${adj} ${noun}`;
  const style = randomPick(DICEBEAR_STYLES);
  const profilePicture = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(username)}`;
  const institution = randomPick(INSTITUTIONS);
  const program = randomPick(PROGRAMS);

  return { username, displayName, profilePicture, institution, program };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Bot creation
  const [botUsername, setBotUsername] = useState("");
  const [botDisplayName, setBotDisplayName] = useState("");
  const [botInstitution, setBotInstitution] = useState("");
  const [botProgram, setBotProgram] = useState("");
  const [botProfilePicture, setBotProfilePicture] = useState("");
  const [isCreatingBot, setIsCreatingBot] = useState(false);

  // Upload
  const [selectedBotId, setSelectedBotId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategories, setUploadCategories] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadYear, setUploadYear] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"bots" | "upload">("bots");

  const fetchBots = useCallback(async () => {
    setIsLoadingBots(true);
    try {
      const res = await fetch("/api/admin/bots");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const body = await res.json();
      setBots(body.bots ?? []);
    } catch {
      setError("Failed to load bots");
    } finally {
      setIsLoadingBots(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  function handleRandomize() {
    const bot = generateRandomBot();
    setBotUsername(bot.username);
    setBotDisplayName(bot.displayName);
    setBotProfilePicture(bot.profilePicture);
    setBotInstitution(bot.institution);
    setBotProgram(bot.program);
  }

  async function handleCreateBot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsCreatingBot(true);

    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: botUsername,
          displayName: botDisplayName,
          institution: botInstitution || null,
          program: botProgram || null,
          profilePicture: botProfilePicture || null,
        }),
      });

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error || "Failed to create bot");
        return;
      }

      setSuccess(`Bot @${body.bot.username} created`);
      setBotUsername("");
      setBotDisplayName("");
      setBotInstitution("");
      setBotProgram("");
      setBotProfilePicture("");
      fetchBots();
    } catch {
      setError("Failed to create bot");
    } finally {
      setIsCreatingBot(false);
    }
  }

  const filteredCategoryOptions = POST_CATEGORIES.filter((cat) => {
    if (uploadCategories.includes(cat)) return false;
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return true;
    return cat.toLowerCase().includes(q);
  }).slice(0, 12);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (
      !uploadFile ||
      !selectedBotId ||
      uploadTitle.length < 3 ||
      uploadCategories.length === 0
    )
      return;

    setError("");
    setSuccess("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("botId", selectedBotId);
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      for (const cat of uploadCategories) {
        formData.append("categories", cat);
      }
      formData.append("description", uploadDescription);
      if (uploadYear) formData.append("year", uploadYear);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error || "Failed to upload");
        return;
      }

      setSuccess(
        `Document "${uploadTitle}" uploaded as @${bots.find((b) => b.id === selectedBotId)?.username}`,
      );
      setUploadFile(null);
      setUploadTitle("");
      setUploadCategories([]);
      setCategoryQuery("");
      setUploadDescription("");
      setUploadYear("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Failed to upload");
    } finally {
      setIsUploading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 60 }, (_, i) =>
    String(currentYear - i),
  );

  const uploadDisabled =
    !selectedBotId ||
    !uploadFile ||
    uploadTitle.length < 3 ||
    uploadCategories.length === 0 ||
    isUploading;

  return (
    <div className="min-h-screen bg-surface-high">
      <header className="sticky top-0 z-50 border-b border-[#E8E8E8] bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-bold text-ink">Admin Dashboard</h1>
          <p className="text-xs text-ink-3">MaterialCrate</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setError("")}
            >
              dismiss
            </button>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setSuccess("")}
            >
              dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("bots")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === "bots"
                ? "bg-[#1F1F1F] text-white"
                : "bg-surface text-ink-2 border border-[#D4D4D4]"
            }`}
          >
            Bots ({bots.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "bg-[#1F1F1F] text-white"
                : "bg-surface text-ink-2 border border-[#D4D4D4]"
            }`}
          >
            Upload as Bot
          </button>
        </div>

        {/* Bot management tab */}
        {activeTab === "bots" && (
          <div className="space-y-6">
            {/* Create bot form */}
            <div className="rounded-2xl border border-[#E4E4E4] bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink">Create Bot</h2>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="rounded-full bg-surface-high px-4 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-high transition-colors"
                >
                  Randomize
                </button>
              </div>

              {botProfilePicture && (
                <div className="flex justify-center">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-surface-high">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={botProfilePicture}
                      alt="Bot avatar preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateBot} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-ink-2">
                      Username
                    </label>
                    <input
                      value={botUsername}
                      onChange={(e) => setBotUsername(e.target.value)}
                      required
                      placeholder="e.g. QuickPanda42"
                      className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-ink-2">
                      Display Name
                    </label>
                    <input
                      value={botDisplayName}
                      onChange={(e) => setBotDisplayName(e.target.value)}
                      required
                      placeholder="e.g. Quick Panda"
                      className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-ink-2">
                      Institution
                    </label>
                    <input
                      value={botInstitution}
                      onChange={(e) => setBotInstitution(e.target.value)}
                      placeholder="e.g. MIT"
                      className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-ink-2">
                      Program
                    </label>
                    <input
                      value={botProgram}
                      onChange={(e) => setBotProgram(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-2">
                    Profile Picture URL
                  </label>
                  <input
                    value={botProfilePicture}
                    onChange={(e) => setBotProfilePicture(e.target.value)}
                    placeholder="Auto-generated from DiceBear if empty"
                    className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingBot || !botUsername || !botDisplayName}
                  className="w-full rounded-xl bg-[#E1761F] py-3 text-sm font-medium text-white transition-colors disabled:bg-surface-high disabled:text-ink-3"
                >
                  {isCreatingBot ? "Creating..." : "Create Bot"}
                </button>
              </form>
            </div>

            {/* Bot list */}
            <div className="rounded-2xl border border-[#E4E4E4] bg-surface p-6 space-y-3">
              <h2 className="font-semibold text-ink">Existing Bots</h2>
              {isLoadingBots ? (
                <p className="text-sm text-ink-3">Loading…</p>
              ) : bots.length === 0 ? (
                <p className="text-sm text-ink-3">No bots created yet</p>
              ) : (
                <div className="space-y-2">
                  {bots.map((bot) => (
                    <div
                      key={bot.id}
                      className="flex items-center gap-3 rounded-xl border border-[#F0F0F0] bg-surface-high px-4 py-3"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-high">
                        {bot.profilePicture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bot.profilePicture}
                            alt={bot.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-ink-3">
                            {bot.displayName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-ink">
                            {bot.displayName}
                          </p>
                          <span className="shrink-0 rounded bg-[#E8F4FD] px-1.5 py-0.5 text-[10px] font-semibold text-[#2196F3]">
                            BOT
                          </span>
                        </div>
                        <p className="truncate text-xs text-ink-3">
                          @{bot.username}
                          {bot.institution && ` · ${bot.institution}`}
                        </p>
                      </div>
                      <p className="shrink-0 text-[10px] text-ink-3">
                        {new Date(bot.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload tab */}
        {activeTab === "upload" && (
          <div className="rounded-2xl border border-[#E4E4E4] bg-surface p-6">
            <h2 className="font-semibold text-ink mb-4">Upload as Bot</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Bot selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  Select Bot<span className="text-red-500">*</span>
                </label>
                <select
                  title="Select Bot"
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                >
                  <option value="">Choose a bot...</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      @{bot.username} — {bot.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  PDF Document<span className="text-red-500">*</span>
                </label>
                <input
                  title="PDF Input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                  className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-high file:px-3 file:py-1 file:text-xs file:font-medium focus:outline-none"
                />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  Title<span className="text-red-500">*</span>
                </label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  placeholder="At least 3 characters"
                  className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                />
              </div>

              {/* Categories */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  Categories<span className="text-red-500">*</span>
                  <span className="text-ink-3 ml-1">
                    ({uploadCategories.length}/3)
                  </span>
                </label>
                {uploadCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {uploadCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 rounded-full bg-[#FFF3E7] px-3 py-1 text-xs font-medium text-[#E1761F]"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() =>
                            setUploadCategories((prev) =>
                              prev.filter((c) => c !== cat),
                            )
                          }
                          className="ml-0.5 text-[#E1761F]/60 hover:text-[#E1761F]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    value={categoryQuery}
                    onChange={(e) => {
                      setCategoryQuery(e.target.value);
                      setIsCategoryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                    placeholder="Search categories..."
                    disabled={uploadCategories.length >= 3}
                    className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none disabled:bg-surface-high"
                  />
                  {isCategoryDropdownOpen &&
                    filteredCategoryOptions.length > 0 &&
                    uploadCategories.length < 3 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#E4E4E4] bg-surface shadow-lg">
                        {filteredCategoryOptions.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setUploadCategories((prev) => [...prev, cat]);
                              setCategoryQuery("");
                              setIsCategoryDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-surface-high text-ink"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Year</label>
                <select
                  title="Year selector"
                  value={uploadYear}
                  onChange={(e) => setUploadYear(e.target.value)}
                  className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none"
                >
                  <option value="">Select year (optional)</option>
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-[#D4D4D4] bg-surface px-3 py-2.5 text-sm focus:border-[#E1761F] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={uploadDisabled}
                className="w-full rounded-xl bg-[#E1761F] py-3 text-sm font-medium text-white transition-colors disabled:bg-surface-high disabled:text-ink-3"
              >
                {isUploading ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
