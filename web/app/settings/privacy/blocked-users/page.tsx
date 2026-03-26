import React from "react";
import Header from "@/app/components/Header";
import { Forbidden2, Trash } from "iconsax-reactjs";
import ActionButton from "@/app/components/ActionButton";

const blockedUsers = [
  {
    id: 1,
    username: "ceo",
  },
  {
    id: 2,
    username: "dan_druff",
  },
  {
    id: 3,
    username: "john_doe",
  },
];

export default function Page() {
  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-6 pb-8 pt-20">
      <Header title="Blocked Users" isLoading={false} />
      <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Safety
        </p>
        <h2 className="mt-1 text-lg font-semibold">Manage blocked accounts.</h2>
        <p className="mt-1 text-xs text-white/72">
          Blocked people cannot easily find your profile or interact with your content.
        </p>
      </div>
      <div className="space-y-3">
        {blockedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-3 rounded-[20px] border border-black/6 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-[14px] bg-[#FDEEEE] p-2.5">
                <Forbidden2 size={18} color="#C04A4A" variant="Bulk" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D3D3D]">
                  @{user.username}
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  This user is currently blocked.
                </p>
              </div>
            </div>
            <button type="button" aria-label={`Unblock ${user.username}`}>
              <Trash size={18} color="#E00505" />
            </button>
          </div>
        ))}
      </div>
      <ActionButton className="mt-5 w-full">
        Unblock all
      </ActionButton>
    </div>
  );
}
