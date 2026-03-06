"use server";

// --- Types ---
export interface Contest {
  name: string;
  url: string;
  start_time: string; // ISO String
  end_time: string; // ISO String
  duration: number; // Seconds
  site: "LeetCode" | "CodeForces" | "CodeChef" | "AtCoder";
  status: "UPCOMING" | "ONGOING";
}

async function getLeetCodeContests(): Promise<Contest[]> {
  try {
    const query = `
      query {
        allContests {
          title
          titleSlug
          startTime
          duration
          originStartTime
          isVirtual
        }
      }
    `;
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ContestCalendar/1.0)",
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const nowSeconds = Date.now() / 1000;

    return (data.data.allContests || [])
      .filter((c: any) => !c.isVirtual && c.startTime > nowSeconds - c.duration)
      .map((c: any) => ({
        name: c.title,
        url: `https://leetcode.com/contest/${c.titleSlug}`,
        start_time: new Date(c.startTime * 1000).toISOString(),
        end_time: new Date((c.startTime + c.duration) * 1000).toISOString(),
        duration: c.duration,
        site: "LeetCode",
        status: c.startTime > nowSeconds ? "UPCOMING" : "ONGOING",
      }));
  } catch (e) {
    console.error("LeetCode fetch error:", e);
    return [];
  }
}

async function getCodeForcesContests(): Promise<Contest[]> {
  try {
    const res = await fetch("https://codeforces.com/api/contest.list", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK") return [];

    return data.result
      .filter((c: any) => ["BEFORE", "CODING"].includes(c.phase))
      .map((c: any) => ({
        name: c.name,
        url: `https://codeforces.com/contest/${c.id}`,
        start_time: new Date(c.startTimeSeconds * 1000).toISOString(),
        end_time: new Date(
          (c.startTimeSeconds + c.durationSeconds) * 1000
        ).toISOString(),
        duration: c.durationSeconds,
        site: "CodeForces",
        status: c.phase === "BEFORE" ? "UPCOMING" : "ONGOING",
      }));
  } catch (e) {
    console.error("CodeForces fetch error:", e);
    return [];
  }
}

async function getCodeChefContests(): Promise<Contest[]> {
  try {
    const res = await fetch(
      "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawContests = [...data.present_contests, ...data.future_contests];

    return rawContests.map((c: any) => ({
      name: c.contest_name,
      url: `https://www.codechef.com/${c.contest_code}`,
      start_time: new Date(c.contest_start_date_iso).toISOString(),
      end_time: new Date(c.contest_end_date_iso).toISOString(),
      duration:
        (new Date(c.contest_end_date_iso).getTime() -
          new Date(c.contest_start_date_iso).getTime()) /
        1000,
      site: "CodeChef",
      status:
        new Date(c.contest_start_date_iso) > new Date()
          ? "UPCOMING"
          : "ONGOING",
    }));
  } catch (e) {
    console.error("CodeChef fetch error:", e);
    return [];
  }
}

import { fetchUpcomingContests } from "@qatadaazzeh/atcoder-api";

async function getAtCoderContests(): Promise<Contest[]> {
  try {
    const data = await fetchUpcomingContests();
    if (!data) return [];

    const now = new Date();

    return data.map((c: any) => {
      const startTimeStr = c.contestTime.replace('+0900', '+09:00');
      const startTime = new Date(startTimeStr);
      
      const [hours, mins] = c.contestDuration.split(':').map(Number);
      const durationSeconds = (hours * 3600) + (mins * 60);
      const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

      return {
        name: c.contestName,
        url: c.contestUrl,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationSeconds,
        site: "AtCoder",
        status: startTime > now ? "UPCOMING" : "ONGOING",
      };
    });
  } catch (e) {
    console.error("AtCoder API fetch error:", e);
    return [];
  }
}


export async function fetchContestsAction(): Promise<Contest[]> {
  const [lc, cf, cc, ac] = await Promise.all([
    getLeetCodeContests(),
    getCodeForcesContests(),
    getCodeChefContests(),
    getAtCoderContests(),
  ]);
  const all = [...lc, ...cf, ...cc, ...ac].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  return all;
}
