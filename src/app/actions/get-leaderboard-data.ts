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
  rank: number;
  rating: number;
  solved: number;
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
    // FIX: Pass a single object containing both 'query' and 'variables'
    const response = await leetcode.graphql({
      query: USER_DATA_QUERY,
      variables: { username: user.username },
    });

    const data = response.data;

    // Safety check if user exists or data is missing
    if (!data || !data.matchedUser) {
      // Sometimes user exists but has no contest data; handle gracefully
      const rating = Math.round(data?.userContestRanking?.rating || 0);
      const contests = data?.userContestRanking?.attendedContestsCount || 0;

      // If matchedUser is null, they might have deleted account or changed name
      if (!data.matchedUser) throw new Error("User not found");

      return {
        id: user.username,
        username: user.name,
        rank: 0,
        rating,
        solved: 0,
        contests,
      };
    }

    const solvedCount =
      data.matchedUser.submitStats.acSubmissionNum.find(
        (s: { difficulty: string; count: number }) => s.difficulty === "All"
      )?.count || 0;

    const rating = Math.round(data.userContestRanking?.rating || 0);
    const contests = data.userContestRanking?.attendedContestsCount || 0;

    return {
      id: user.username,
      username: user.name,
      rank: 0,
      rating,
      solved: solvedCount,
      contests,
    };
  } catch (error) {
    console.warn(`Error fetching ${user.username}, returning default.`);
    return {
      id: user.username,
      username: user.name,
      rank: 0,
      rating: 0,
      solved: 0,
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
  { revalidate: 3600 }
);
