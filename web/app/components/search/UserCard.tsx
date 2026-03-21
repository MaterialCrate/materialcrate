"use client";

import Image from "next/image";
import { User, Verify } from "iconsax-reactjs";

export type SearchUser = {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  subscriptionPlan?: string | null;
  institution?: string | null;
  program?: string | null;
};

type UserCardProps = {
  user: SearchUser;
  onClick: (user: SearchUser) => void;
};

export default function UserCard({ user, onClick }: UserCardProps) {
  const isPro = user.subscriptionPlan?.trim().toLowerCase() === "pro";
  const meta = [user.institution, user.program].filter(Boolean).join(" • ");

  return (
    <button
      type="button"
      onClick={() => onClick(user)}
      className="flex w-full items-start gap-4 rounded-[30px] border border-[#eadccb] bg-white px-4 py-4 text-left shadow-[0_24px_60px_rgba(92,57,16,0.06)] transition hover:-translate-y-0.5"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f4f1eb]">
        {user.profilePicture ? (
          <Image
            src={user.profilePicture}
            alt={`${user.displayName}'s profile picture`}
            width={56}
            height={56}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <User size={24} color="#8d7a67" variant="Bold" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-base font-semibold text-[#20160b]">
            {user.displayName}
          </p>
          {isPro && <Verify size={18} color="#E1761F" variant="Bold" />}
        </div>
        <p className="mt-0.5 text-sm font-medium text-[#8d7a67]">
          @{user.username}
        </p>
        {meta && <p className="mt-3 text-sm leading-5 text-[#5f5144]">{meta}</p>}
      </div>
    </button>
  );
}
