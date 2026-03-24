import React from "react";
import Header from "@/app/components/Header";
import { Trash } from "iconsax-reactjs";
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
    <div className="pt-30 px-6 bg-[#F7F7F7] h-dvh relative">
      <Header title="Blocked Users" />
      <div className="space-y-3">
        {blockedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
          >
            <p className="text-sm text-[#3D3D3D]">{user.username}</p>
            <Trash size={18} color="#E00505" />
          </div>
        ))}
      </div>
      <ActionButton className="absolute bottom-6 right-6 left-6">
        Unblock all
      </ActionButton>
    </div>
  );
}
