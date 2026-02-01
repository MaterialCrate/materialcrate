import { FaBook, FaChevronDown } from "react-icons/fa";
import CompleteProfileSync from "@/app/components/CompleteProfileSync";
import Post from "./components/Post";

export default function Home() {
  return (
    <div className="pt-6">
      <CompleteProfileSync />
      <div className="flex px-6 pb-6 border-b border-b-black/40">
        <div className="p-3 rounded-lg bg-[#EEEEEE] flex items-center gap-1">
          <FaBook size={20} />
          <FaChevronDown size={14} color="#959595" />
        </div>
        <input
          placeholder="What material do you want to find?"
          className="flex-1 pl-4"
        />
      </div>
      <main className="">
        <Post />
        <div className="px-6">
          <div className="h-px w-full bg-black/40 mt-6" />
        </div>
        <Post />
      </main>
    </div>
  );
}
