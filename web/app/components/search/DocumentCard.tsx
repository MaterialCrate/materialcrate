"use client";

export type SearchDocument = {
  id: string;
  title: string;
  courseCode: string;
  description?: string | null;
  year?: number | null;
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
  author?: {
    id: string;
    displayName: string;
    username: string;
    profilePicture?: string | null;
    subscriptionPlan?: string | null;
  } | null;
};

type DocumentCardProps = {
  document: SearchDocument;
  onClick: (document: SearchDocument) => void;
};

const formatRelativeTime = (timestamp: string) => {
  const parsedValue = new Date(timestamp).getTime();
  if (Number.isNaN(parsedValue)) {
    return "Recently";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsedValue) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(parsedValue);
};

const getDescriptionPreview = (value?: string | null) => {
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue) {
    return "No description provided.";
  }

  if (normalizedValue.length <= 120) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 117).trimEnd()}...`;
};

export default function DocumentCard({
  document,
  onClick,
}: DocumentCardProps) {
  const authorName =
    document.author?.displayName?.trim() ||
    document.author?.username?.trim() ||
    "Unknown user";

  return (
    <button
      type="button"
      onClick={() => onClick(document)}
      className="w-full rounded-[30px] border border-[#eadccb] bg-white p-5 text-left shadow-[0_24px_60px_rgba(92,57,16,0.06)] transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#bf6b1a]">
            {document.courseCode}
            {document.year ? ` • ${document.year}` : ""}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-6 text-[#20160b]">
            {document.title}
          </h2>
        </div>

        <div className="rounded-2xl bg-[#20160b] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
          PDF
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#5f5144]">
        {getDescriptionPreview(document.description)}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-[#8d7a67]">
        <span>By {authorName}</span>
        <span>&bull;</span>
        <span>{document.likeCount ?? 0} likes</span>
        <span>&bull;</span>
        <span>{document.commentCount ?? 0} comments</span>
        <span>&bull;</span>
        <span>{formatRelativeTime(document.createdAt)}</span>
      </div>
    </button>
  );
}
