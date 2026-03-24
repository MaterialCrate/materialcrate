import Image from "next/image";
import emptyWorkspace from "@/assets/icons/empty-workspace.svg";
import { Add } from "iconsax-reactjs";

export default function WorkspacePage() {
  return (
    <div className="h-screen relative">
      <header className="flex justify-center fixed top-0 left-0 right-0 mx-0 bg-[#F7F7F7] pt-6 pb-2">
        <h1 className="text-lg font-medium">My Workspace</h1>
      </header>
      <div className="h-full flex flex-col items-center justify-center px-24 gap-4">
        <Image
          src={emptyWorkspace}
          alt="Empty workspace"
          width={80}
          height={80}
        />
        <p className="text-sm text-[#696969] text-center">
          We can’t find any workspace folder. Create a folder to work on
        </p>
      </div>
      <button
        type="button"
        className="bottom-28 right-6 fixed z-50 flex items-center gap-2 bg-white py-2 px-5 rounded-3xl shadow-lg"
      >
        <Add size={30} />
        <p className="font-medium">Create</p>
      </button>
    </div>
  );
}
