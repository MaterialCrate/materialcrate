"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Edit2, Setting2, Verify } from "iconsax-reactjs";
import proStar from "@/assets/icons/pro-star.svg";
import {
  getProfileBackgroundPresentation,
  isDefaultProfileBackground,
} from "@/app/lib/profile-background";

export type ProfileTab = "posts" | "achievements";

type ProfileHeaderProps = {
  displayName: string;
  username: string;
  profilePictureUrl?: string;
  profileBackground?: string | null;
  followers?: number;
  following?: number;
  subscriptionPlan?: string | null;
  isOwner?: boolean;
  postsLabel?: string;
  followLabel?: "Follow" | "Following" | "Follow back" | "Requested";
  isFollowLoading?: boolean;
  onFollowClick?: () => void;
  onFollowListOpen?: (tab: "followers" | "following") => void;
  selectedTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
};

export default function Header({
  displayName,
  username,
  profilePictureUrl,
  profileBackground,
  followers = 0,
  following = 0,
  subscriptionPlan = "free",
  isOwner = false,
  postsLabel = "Posts",
  followLabel = "Follow",
  isFollowLoading = false,
  onFollowClick,
  onFollowListOpen,
  selectedTab,
  onTabChange,
}: ProfileHeaderProps) {
  const router = useRouter();
  const profileBackgroundPresentation =
    getProfileBackgroundPresentation(profileBackground);
  const hasCustomBackground = !isDefaultProfileBackground(profileBackground);
  const primaryTextClass = hasCustomBackground
    ? "text-white"
    : "text-[#1F1F1F]";
  const secondaryTextClass = hasCustomBackground
    ? "text-white/80"
    : "text-[#333333]";
  const iconColor = hasCustomBackground ? "#FFFFFF" : "#444444";
  const iconButtonClass = hasCustomBackground
    ? "flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-black/28 backdrop-blur-md"
    : "flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/82 backdrop-blur";
  const statLabelClass = hasCustomBackground
    ? "text-white/78"
    : "text-[#343434]";
  const followMutedClass = hasCustomBackground
    ? "border-white/18 bg-white/88 text-[#202020] backdrop-blur"
    : "border-[#979797] bg-white text-[#202020]";
  const followPrimaryClass = hasCustomBackground
    ? "border-white/18 bg-black/45 text-white backdrop-blur"
    : "border-black bg-[#131212] text-white";
  const tabActiveClass = hasCustomBackground ? "text-white" : "text-[#1E1E1E]";
  const tabInactiveClass = hasCustomBackground
    ? "text-white/55"
    : "text-[#787777]";
  const indicatorClass = hasCustomBackground ? "bg-white" : "bg-[#404040]";

  return (
    <header
      className={`relative w-full overflow-hidden ${profileBackgroundPresentation.className} pt-12 px-6 z-50`}
      style={profileBackgroundPresentation.style}
    >
      {hasCustomBackground ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.14)_32%,rgba(0,0,0,0.26)_100%)]"
        />
      ) : null}
      <div className="relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-19 h-19 rounded-xl overflow-hidden bg-gray-300">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={displayName}
                width={76}
                height={76}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-500 text-2xl font-bold">
                  {displayName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="-space-y-1">
            <div className="flex items-center gap-0.5">
              <p className={`text-lg font-medium ${primaryTextClass}`}>
                {displayName}
              </p>
              {subscriptionPlan?.trim().toLowerCase() === "pro" ? (
                <Verify size={18} color="#E1761F" variant="Bold" />
              ) : null}
            </div>
            <p className={`text-sm ${secondaryTextClass}`}>{username}</p>
          </div>
        </div>
        {isOwner &&
          (subscriptionPlan === "free" ? (
            <div className="flex items-center gap-6">
              <button
                type="button"
                aria-label="edit profile"
                onClick={() => router.push("/settings/profile")}
                className={iconButtonClass}
              >
                <Edit2 size={20} color={iconColor} />
              </button>
              <button
                type="button"
                aria-label="settings"
                onClick={() => router.push("/settings")}
                className={iconButtonClass}
              >
                <Setting2 size={20} color={iconColor} />
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
          ))}
      </div>
      <div className="relative z-10 flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-center"
            onClick={() => onFollowListOpen?.("followers")}
          >
            <p className={`text-xs ${statLabelClass}`}>Followers</p>
            <p className={`text-xl font-semibold ${primaryTextClass}`}>
              {followers}
            </p>
          </button>
          <button
            type="button"
            className="text-center"
            onClick={() => onFollowListOpen?.("following")}
          >
            <p className={`text-xs ${statLabelClass}`}>Following</p>
            <p className={`text-xl font-semibold ${primaryTextClass}`}>
              {following}
            </p>
          </button>
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
                className={iconButtonClass}
              >
                <Edit2 size={20} color={iconColor} />
              </button>
              <button
                type="button"
                aria-label="settings"
                onClick={() => router.push("/settings")}
                className={iconButtonClass}
              >
                <Setting2 size={20} color={iconColor} />
              </button>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={onFollowClick}
            disabled={isFollowLoading}
            className={`px-5 py-2 rounded-full border text-sm font-medium ${
              followLabel === "Following" || followLabel === "Requested"
                ? followMutedClass
                : followPrimaryClass
            } disabled:opacity-60`}
          >
            <p>{isFollowLoading ? "..." : followLabel}</p>
          </button>
        )}
      </div>
      <div className="relative z-10 mt-10 -mx-6 grid grid-cols-2 px-6">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-6 h-0.75 w-[calc(50%-1.5rem)] ${indicatorClass} transition-transform duration-300 ease-out ${
            selectedTab === "posts" ? "translate-x-0" : "translate-x-full"
          }`}
        />
        <button
          type="button"
          className={`font-medium pb-3 text-center transition-colors duration-300 ${
            selectedTab === "posts" ? tabActiveClass : tabInactiveClass
          }`}
          onClick={() => onTabChange("posts")}
        >
          {postsLabel}
        </button>
        <button
          type="button"
          className={`font-medium pb-3 text-center transition-colors duration-300 ${
            selectedTab === "achievements" ? tabActiveClass : tabInactiveClass
          }`}
          onClick={() => onTabChange("achievements")}
        >
          Achievements
        </button>
      </div>
    </header>
  );
}
