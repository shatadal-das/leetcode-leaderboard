import Leaderboard from "@/components/leaderboard";
import { Calendar } from "lucide-react";
import Link from "next/link";

function Home() {
  return (
    <div className="mx-4">
      <div className="max-w-200 mx-auto py-4">
        <div className="flex justify-between items-center gap-10">
          <h1 className="my-8 md:text-2xl text-xl font-bold text-neutral-100 tracking-wide">
            Leetcode Eliteboard
          </h1>
          <Link href="/calendar" className="flex items-center gap-2 group">
            <Calendar className="size-4" />
            <div className="text-sm group-hover:underline">Upcoming Contests</div>
          </Link>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
export default Home;
