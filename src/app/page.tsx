export const maxDuration = 60;
import Leaderboard from "@/components/leaderboard";
import { Calendar } from "lucide-react";
import Link from "next/link";

import { getLeaderboardData } from "@/app/actions/get-leaderboard-data";

export default async function Home() {
  // Fetch default batch data on the server to prevent initial loading screen
  const [firstYear, secondYear, thirdYear] = await Promise.all([
    getLeaderboardData("1st Year"),
    getLeaderboardData("2nd Year"),
    getLeaderboardData("3rd Year"),
  ]);

  const initialData = {
    "1st Year": firstYear,
    "2nd Year": secondYear,
    "3rd Year": thirdYear,
  };

  return (
    <div className="mx-4">
      <div className="max-w-220 mx-auto py-4">
        <div className="flex justify-between items-center gap-10">
          <h1 className="my-8 md:text-2xl text-xl font-bold text-neutral-100 tracking-wide">
            Leetcode Eliteboard
          </h1>
          <Link href="/calendar" className="flex items-center gap-2 group">
            <Calendar className="size-4" />
            <div className="text-sm group-hover:underline">Upcoming Contests</div>
          </Link>
        </div>
        <Leaderboard initialData={initialData} />
      </div>
    </div>
  );
}
