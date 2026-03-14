"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Edit2, Setting2 } from "iconsax-reactjs";
import proStar from "@/assets/svg/pro-star.svg";

type ProfileHeaderProps = {
  displayName: string;
  username: string;
  profilePictureUrl?: string;
  followers?: number;
  following?: number;
  subscriptionPlan?: string | null;
  isOwner?: boolean;
  postsLabel?: string;
};

export default function Header({
  displayName,
  username,
  profilePictureUrl,
  followers = 0,
  following = 0,
  subscriptionPlan = "free",
  isOwner = false,
  postsLabel = "Posts",
}: ProfileHeaderProps) {
  const router = useRouter();

  return (
    <header className="w-full bg-linear-to-br from-[#E1761F] via-[#ffecdc] to-stone-200 pt-12 px-6 z-50">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-19 h-19">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={displayName}
                width={76}
                height={76}
                className="w-full h-full object-cover rounded-xl"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-300 rounded-xl flex items-center justify-center">
                <span className="text-gray-500 text-2xl font-bold">
                  {displayName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="-space-y-1">
            <p className="text-lg font-medium">{displayName}</p>
            <p className="text-[#333333] text-sm">{username}</p>
          </div>
        </div>
        {isOwner ? (
          subscriptionPlan === "free" ? (
            <div className="flex items-center gap-6">
              <button
                type="button"
                aria-label="edit profile"
                onClick={() => router.push("/settings/profile")}
              >
                <Edit2 size={22} color="#444444" />
              </button>
              <button
                type="button"
                aria-label="settings"
                onClick={() => router.push("/settings")}
              >
                <Setting2 size={22} color="#444444" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="px-3 py-2 rounded-full border border-[#F4B400] bg-linear-to-r from-[#F7B500] via-[#ffdb71] to-[#e4d9b7] flex items-center justify-center gap-1.5"
            >
              <Image src={proStar} alt="Pro star" width={16} height={16} />
              <p className="text-white text-sm font-medium">Pro</p>
            </button>
          )
        ) : null}
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-[#343434]">Follwers</p>
            <p className="text-xl font-semibold">{followers}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#343434]">Following</p>
            <p className="text-xl font-semibold">{following}</p>
          </div>
        </div>
        {isOwner ? (
          subscriptionPlan === "free" ? (
            <button
              type="button"
              className="px-3 py-2 rounded-full border border-[#F4B400] bg-linear-to-r from-[#F7B500] via-[#ffdb71] to-[#e4d9b7] flex items-center justify-center gap-1.5"
            >
              <Image src={proStar} alt="Pro star" width={16} height={16} />
              <p className="text-white text-sm font-medium">Upgrade to Pro</p>
            </button>
          ) : (
            <div className="flex items-center gap-6">
              <button
                type="button"
                aria-label="edit profile"
                onClick={() => router.push("/settings/profile")}
              >
                <Edit2 size={22} color="#444444" />
              </button>
              <button
                type="button"
                aria-label="settings"
                onClick={() => router.push("/settings")}
              >
                <Setting2 size={22} color="#444444" />
              </button>
            </div>
          )
        ) : null}
      </div>
      <div className="flex items-center justify-between mt-10">
        <button
          type="button"
          className="text-[#1E1E1E] font-medium border-b-3 border-[#404040] pb-3 w-40"
        >
          Achievements
        </button>
        <button type="button" className="text-[#787777] font-medium pb-3 w-40">
          {postsLabel}
        </button>
      </div>
    </header>
  );
}
