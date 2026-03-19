import React from "react";
import type { HomePost } from "@/app/components/home/Post";
import { ArrowRight } from "iconsax-reactjs";
import PdfThumbnail from "../home/PdfThumbnail";

export type ArchiveFolder = {
  id: string;
  archiveId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ArchiveSavedPost = {
  id: string;
  archiveId: string;
  folderId?: string | null;
  postId: string;
  createdAt: string;
  post: HomePost;
  folder?: ArchiveFolder | null;
};

export default function ArchivedFileCard({
  savedPost,
  onOpenFile,
  onOpenPost,
}: {
  savedPost: ArchiveSavedPost;
  onOpenFile: (post: HomePost) => void;
  onOpenPost: (postId: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-black/8 bg-[#FBFBFB] p-3">
      <div className="flex gap-2">
        <button
          aria-label="Saved document"
          type="button"
          className="text-left"
          onClick={() => onOpenFile(savedPost.post)}
        >
          <PdfThumbnail
            postId={savedPost.post.id}
            fileUrl={savedPost.post.fileUrl}
            title={savedPost.post.title}
          />
        </button>
        <div className="w-full flex flex-col justify-between">
          <div>
            <p className="line-clamp-2 text-sm font-medium text-[#202020]">
              {savedPost.post.title}
            </p>
            <p className="mt-1 text-xs text-[#767676]">
              {savedPost.post.courseCode}
              {savedPost.post.year && ` • ${savedPost.post.year}`}
            </p>
          </div>
          <div className="w-full space-y-1">
            <div className="flex justify-end">
              <span className="text-xs text-[#8C8C8C]">Attachment saved</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#202020]"
                onClick={() => onOpenPost(savedPost.postId)}
              >
                View full post
                <ArrowRight size={16} color="#202020" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
