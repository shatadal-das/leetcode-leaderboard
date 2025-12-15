"use server";

import { LeetCode } from "leetcode-query";
import { unstable_cache } from "next/cache";

const leetcode = new LeetCode();

type LeetCodeUserConfig = {
  username: string;
  name: string;
};

export type LeaderboardData = {
  id: string;
  username: string;
  rating: number;
  solved: {
    easy: number;
    medium: number;
    hard: number;
  };
  contests: number;
};

const USER_DATA_QUERY = `
  query getUserData($username: String!) {
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    userContestRanking(username: $username) {
      rating
      attendedContestsCount
    }
  }
`;

async function fetchUser(user: LeetCodeUserConfig): Promise<LeaderboardData> {
  try {
    const response = await leetcode.graphql({
      query: USER_DATA_QUERY,
      variables: { username: user.username },
    });

    const data = response.data;
    // console.dir(data, { depth: null });

    if (!data || !data.matchedUser) throw new Error("User not found");

    const subs = data.matchedUser.submitStats.acSubmissionNum as {
      difficulty: "All" | "Easy" | "Medium" | "Hard";
      count: number;
    }[];

    const solved = {
      easy: subs.find((sub) => sub.difficulty === "Easy")?.count || 0,
      medium: subs.find((sub) => sub.difficulty === "Medium")?.count || 0,
      hard: subs.find((sub) => sub.difficulty === "Hard")?.count || 0,
    };

    const rating = Math.round(data.userContestRanking?.rating || 0);
    const contests = data.userContestRanking?.attendedContestsCount || 0;

    return {
      id: user.username,
      username: user.name,
      rating,
      solved,
      contests,
    };
  } catch (error) {
    console.warn(`Error fetching ${user.username}, returning default.`);

    return {
      id: user.username,
      username: user.name,
      rating: 0,
      solved: {
        easy: 0,
        medium: 0,
        hard: 0,
      },
      contests: 0,
    };
  }
}

async function fetchInBatches(users: LeetCodeUserConfig[], batchSize: number) {
  const results: LeaderboardData[] = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((user) => fetchUser(user))
    );
    results.push(...batchResults);
  }

  return results;
}

export const getLeaderboardData = unstable_cache(
  async (users: LeetCodeUserConfig[]) => {
    // Fetch 10 users at a time to prevent rate limiting
    return await fetchInBatches(users, 10);
  },
  ["leetcode-leaderboard-data"],
  { revalidate: process.env.NODE_ENV === "development" ? false : 60 * 60 }
);
