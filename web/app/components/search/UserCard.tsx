"use client";

import Image from "next/image";
import { User, Verify } from "iconsax-reactjs";
import { hasPaidSubscription } from "@/app/lib/subscription";

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
  const hasPaidPlan = hasPaidSubscription(user.subscriptionPlan);

  return (
    <button
      type="button"
      onClick={() => onClick(user)}
      className="flex w-full items-center gap-3 px-4 text-left transition hover:-translate-y-0.5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4f1eb]">
        {user.profilePicture ? (
          <Image
            src={user.profilePicture}
            alt={`${user.displayName}'s profile picture`}
            width={44}
            height={44}
            className="rounded-xl object-cover"
            unoptimized
          />
        ) : (
          <User size={20} color="#8d7a67" variant="Bold" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-0.5">
          <p className="truncate text-sm font-semibold text-[#000000]">
            {user.displayName}
          </p>
          {hasPaidPlan && <Verify size={16} color="#E1761F" variant="Bold" />}
        </div>
        <p className="truncate text-xs font-medium text-[#585858]">
          @{user.username}
        </p>
      </div>
    </button>
  );
}
