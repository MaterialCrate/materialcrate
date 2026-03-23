"use client";

import React from "react";
import {
  Archive,
  Edit2,
  EyeSlash,
  Flag,
  MessageQuestion,
  ProfileAdd,
  Slash,
  Trash,
  UserCirlceAdd,
  VolumeMute,
} from "iconsax-reactjs";
import { useAuth } from "@/app/lib/auth-client";
import type { HomePost, PostOptionsAnchor } from "./Post";

interface OptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post?: HomePost | null;
  anchor?: PostOptionsAnchor | null;
  onEditPost?: (post: HomePost) => void;
}

export default function OptionsOptions({
  isOpen,
  post,
  anchor,
  onEditPost,
}: OptionsDrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const author = post?.author;
  const username = author?.username?.trim()
    ? `@${author.username}`
    : "@unknown";
  const isOwner =
    Boolean(user?.username?.trim()) &&
    user?.username?.trim().toLowerCase() ===
      author?.username?.trim().toLowerCase();

  const primaryActions = isOwner
    ? [
        {
          label: "Edit post",
          icon: <Edit2 size={20} color="#111111" variant="Bold" />,
        },
        {
          label: "Pin to profile",
          icon: <UserCirlceAdd size={20} color="#111111" variant="Bold" />,
        },
        {
          label: "Disable comments",
          icon: <MessageQuestion size={20} color="#111111" variant="Bold" />,
        },
      ]
    : [
        {
          label: `Follow ${username}`,
          icon: <ProfileAdd size={20} color="#111111" variant="Bold" />,
        },
        {
          label: `Mute ${username}`,
          icon: <VolumeMute size={20} color="#111111" variant="Bold" />,
        },
        {
          label: "Not interested in this post",
          icon: <EyeSlash size={20} color="#111111" variant="Bold" />,
        },
        {
          label: `Block ${username}`,
          icon: <Slash size={20} color="#111111" />,
        },
      ];

  const secondaryActions = isOwner
    ? [
        {
          label: "Move to archive",
          icon: <Archive size={20} color="#111111" variant="Bold" />,
        },
      ]
    : [
        {
          label: "Why am I seeing this post?",
          icon: <MessageQuestion size={20} color="#111111" variant="Bold" />,
        },
      ];

  const destructiveAction = isOwner
    ? {
        label: "Delete post",
        description: "Remove this material permanently",
        icon: <Trash size={20} color="#D12F2F" variant="Bold" />,
      }
    : {
        label: "Report post",
        description: "Flag this material for review",
        icon: <Flag size={20} color="#D12F2F" variant="Bold" />,
      };

  const [anchoredPosition, setAnchoredPosition] = React.useState<
    React.CSSProperties | undefined
  >(undefined);

  React.useLayoutEffect(() => {
    if (!anchor || typeof window === "undefined" || !isOpen) {
      setAnchoredPosition(undefined);
      return;
    }

    const updatePosition = () => {
      const gap = 8;
      const viewportPadding = 16;
      const viewportHeight = window.innerHeight;
      const drawerHeight = drawerRef.current?.offsetHeight ?? 0;
      const right = Math.max(
        viewportPadding,
        Math.round(window.innerWidth - anchor.right),
      );

      const fitsBelow =
        anchor.bottom + gap + drawerHeight <= viewportHeight - viewportPadding;

      if (fitsBelow) {
        setAnchoredPosition({
          top: `${Math.round(anchor.bottom + gap)}px`,
          right: `${right}px`,
        });
        return;
      }

      const top = Math.max(
        viewportPadding,
        Math.round(anchor.top - drawerHeight - gap),
      );

      setAnchoredPosition({
        top: `${top}px`,
        right: `${right}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [anchor, isOpen]);

  return (
    <div
      ref={drawerRef}
      style={anchoredPosition}
      className={`fixed z-100 rounded-4xl border border-black/6 bg-white p-2 shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out ${
        anchoredPosition ? "left-auto" : "inset-x-4 bottom-4 mx-auto"
      } ${
        isOpen
          ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
          : "translate-y-4 scale-[0.96] opacity-0 pointer-events-none"
      }`}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="overflow-hidden rounded-[26px] bg-[#F7F7F7]">
            {primaryActions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  if (action.label === "Edit post" && post) {
                    onEditPost?.(post);
                  }
                }}
                className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-black/3 ${
                  index < primaryActions.length - 1
                    ? "border-b border-black/6"
                    : ""
                }`}
              >
                <span>{action.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#111111]">
                    {action.label}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[26px] bg-[#F7F7F7]">
            {secondaryActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-black/3"
              >
                <span>{action.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#111111]">
                    {action.label}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[26px] bg-[#FFF1F1]">
            <button
              type="button"
              className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[#ffe7e7]"
            >
              <span>{destructiveAction.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm text-[#D12F2F]">
                  {destructiveAction.label}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
