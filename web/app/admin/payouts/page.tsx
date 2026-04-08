"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PayoutUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  tokenBalance: number;
  tokensEarned: number;
};

type PayoutRequest = {
  id: string;
  userId: string;
  tokensAmount: number;
  cashAmount: number;
  status: string;
  payoutMethod: string;
  payoutDetails: string;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: PayoutUser;
};

type StatusFilter = "all" | "pending" | "approved" | "paid" | "rejected";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  approved: "bg-blue-100 text-blue-800 border-blue-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

const METHOD_LABELS: Record<string, string> = {
  paypal: "PayPal",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
};

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function parseDetails(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function PayoutDetailRows({ method, raw }: { method: string; raw: string }) {
  const d = parseDetails(raw);
  if (method === "paypal") {
    return (
      <Row label="PayPal email" value={d.email ?? "—"} copyable />
    );
  }
  if (method === "mobile_money") {
    return (
      <>
        <Row label="Provider" value={d.provider ?? "—"} />
        <Row label="Phone" value={d.phone ?? "—"} copyable />
        <Row label="Name" value={d.name ?? "—"} />
      </>
    );
  }
  if (method === "bank_transfer") {
    return (
      <>
        <Row label="Bank" value={d.bankName ?? "—"} />
        <Row label="Account holder" value={d.accountName ?? "—"} />
        <Row label="Account number" value={d.accountNumber ?? "—"} copyable />
        {d.routingCode && (
          <Row label="Routing / SWIFT" value={d.routingCode} copyable />
        )}
      </>
    );
  }
  return null;
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-[#666] min-w-[110px]">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-medium text-[#1F1F1F] truncate">
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#F0F0F0] text-[#555] hover:bg-[#E4E4E4] transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review modal state
  const [reviewing, setReviewing] = useState<PayoutRequest | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(
    async (filter: StatusFilter) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (filter !== "all") params.set("status", filter);
        const res = await fetch(`/api/admin/payouts?${params}`);
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.error ?? "Failed to load requests");
          return;
        }
        setRequests(body.requests ?? []);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void fetchRequests(statusFilter);
  }, [statusFilter, fetchRequests]);

  const openReview = (req: PayoutRequest) => {
    setReviewing(req);
    setNewStatus(req.status);
    setAdminNote(req.adminNote ?? "");
    setError(null);
  };

  const submitReview = async () => {
    if (!reviewing || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reviewing.id,
          status: newStatus,
          adminNote: adminNote.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Update failed");
        return;
      }
      setSuccessMsg(`Request updated to "${newStatus}"`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setReviewing(null);
      void fetchRequests(statusFilter);
    } finally {
      setIsSubmitting(false);
    }
  };

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "paid", label: "Paid" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E8E8E8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="text-xs text-[#888] hover:text-[#333] transition-colors"
            >
              ← Dashboard
            </button>
            <span className="text-[#CCC]">/</span>
            <h1 className="text-base font-bold text-[#1F1F1F]">
              Payout Requests
            </h1>
            {statusFilter === "pending" && pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-xs text-[#999]">MaterialCrate Admin</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Alerts */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-[#1F1F1F] text-white"
                  : "bg-white text-[#555] border border-[#D4D4D4] hover:bg-[#F0F0F0]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Request list */}
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-[#999]">Loading…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-[#E4E4E4] bg-white p-10 text-center">
            <p className="text-sm text-[#999]">
              No{" "}
              {statusFilter !== "all" ? statusFilter : ""} payout requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const details = parseDetails(req.payoutDetails);
              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-[#E4E4E4] bg-white overflow-hidden"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#F0F0F0]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-[#1F1F1F]">
                          ${req.cashAmount.toFixed(2)}
                        </span>
                        <span className="text-xs text-[#888]">
                          ({fmt(req.tokensAmount)} tokens)
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                            STATUS_COLORS[req.status] ??
                            "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#888]">
                        Submitted {fmtDate(req.createdAt)}
                        {req.reviewedAt && ` · Reviewed ${fmtDate(req.reviewedAt)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openReview(req)}
                      className="shrink-0 rounded-full bg-[#1F1F1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#333] transition-colors active:scale-95"
                    >
                      Review
                    </button>
                  </div>

                  {/* User info + payout details */}
                  <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#F0F0F0]">
                    {/* User */}
                    <div className="px-5 py-3.5 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-2">
                        User
                      </p>
                      <Row label="Name" value={req.user.displayName} />
                      <Row label="Username" value={`@${req.user.username}`} />
                      <Row label="Email" value={req.user.email} copyable />
                      <Row
                        label="Token balance"
                        value={`${fmt(req.user.tokenBalance)} tokens`}
                      />
                      <Row
                        label="Lifetime earned"
                        value={`${fmt(req.user.tokensEarned)} tokens`}
                      />
                    </div>

                    {/* Payout details */}
                    <div className="px-5 py-3.5 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-2">
                        Payout via{" "}
                        {METHOD_LABELS[req.payoutMethod] ?? req.payoutMethod}
                      </p>
                      <PayoutDetailRows
                        method={req.payoutMethod}
                        raw={req.payoutDetails}
                      />
                    </div>
                  </div>

                  {/* Admin note */}
                  {req.adminNote && (
                    <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA]">
                      <p className="text-xs text-[#666]">
                        <span className="font-semibold">Note:</span>{" "}
                        {req.adminNote}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isSubmitting && setReviewing(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-[#1F1F1F] mb-1">
              Review Payout
            </h2>
            <p className="text-sm text-[#666] mb-5">
              {reviewing.user.displayName} ·{" "}
              <span className="font-semibold text-[#1F1F1F]">
                ${reviewing.cashAmount.toFixed(2)}
              </span>{" "}
              via{" "}
              {METHOD_LABELS[reviewing.payoutMethod] ?? reviewing.payoutMethod}
            </p>

            {/* Payout details summary */}
            <div className="rounded-xl bg-[#F5F5F5] px-4 py-3 mb-5 space-y-1">
              <PayoutDetailRows
                method={reviewing.payoutMethod}
                raw={reviewing.payoutDetails}
              />
            </div>

            {/* Status selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-[#666] block mb-2">
                Update status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["pending", "approved", "paid", "rejected"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewStatus(s)}
                      className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-all ${
                        newStatus === s
                          ? STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700"
                          : "border-[#E4E4E4] bg-white text-[#555] hover:bg-[#F5F5F5]"
                      }`}
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Admin note */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-[#666] block mb-1.5">
                Note for user (optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="e.g. Payment sent via M-Pesa on Apr 8"
                className="w-full rounded-xl border border-[#E4E4E4] bg-[#FAFAFA] px-3 py-2 text-sm text-[#1F1F1F] outline-none focus:border-[#1F1F1F] resize-none placeholder:text-[#AAA]"
              />
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !isSubmitting && setReviewing(null)}
                className="flex-1 rounded-full border border-[#E4E4E4] py-2.5 text-sm font-semibold text-[#555] hover:bg-[#F5F5F5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReview()}
                disabled={isSubmitting || newStatus === reviewing.status && adminNote.trim() === (reviewing.adminNote ?? "")}
                className="flex-1 rounded-full bg-[#1F1F1F] py-2.5 text-sm font-semibold text-white hover:bg-[#333] transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
