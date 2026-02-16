import React from "react";
import { More, Heart, Messages2, Archive } from "iconsax-reactjs";

export type HomePost = {
  id: string;
  fileUrl: string;
  title: string;
  courseCode: string;
  description?: string | null;
  year?: number | null;
  createdAt: string;
  author?: {
    id: string;
    username: string;
  } | null;
};

type PostProps = {
  post: HomePost;
};

function formatTimeAgo(timestamp: string) {
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return "Just now";

  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Post({ post }: PostProps) {
  const authorName = post.author?.username || "Unknown user";
  const createdLabel = formatTimeAgo(post.createdAt);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-[#D3D3D3] rounded-full" />
          <div>
            <p className="font-medium text-[#202020]">{authorName}</p>
            <div className="text-[#8C8C8C] text-xs font-medium flex items-center gap-1.5">
              <p>@{authorName.toLowerCase().replace(/\s+/g, "")}</p>
              <p>&bull;</p>
              <p>{createdLabel}</p>
            </div>
          </div>
        </div>
        <More size={28} color="#959595" />
      </div>
      {post.description && (
        <div className="px-6">
          <p className="text-[#373737] text-sm">{post.description}</p>
        </div>
      )}
      <div className="overflow-y-scroll flex gap-3 px-6">
        <a
          href={post.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-[#F3F3F3] h-45 w-full rounded-2xl p-3 flex gap-4"
        >
          <div className="bg-[#E8E8E8] h-full w-30 rounded-xl"></div>
          <div>
            <p className="text-[#202020] font-medium text-sm">{post.title}</p>
            <div className="text-[#8C8C8C] text-xs font-medium flex items-center gap-1.5">
              <p>{post.courseCode}</p>
              {post.year && (
                <>
                  <p>&bull;</p>
                  <p>{post.year}</p>
                </>
              )}
            </div>
          </div>
        </a>
      </div>
      <div className="px-6 flex items-center gap-20">
        <div className="flex items-center gap-1.5">
          <Heart size={24} color="#808080" />
          <p className="text-[#808080] text-xs">3.7K</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Messages2 size={24} color="#808080" />
          <p className="text-[#808080] text-xs">20</p>
        </div>
        <Archive size={24} color="#808080" />
      </div>
    </div>
  );
}
