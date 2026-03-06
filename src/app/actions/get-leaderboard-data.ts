"use server";

import { BatchKey } from "@/components/leaderboard";
import { firstYearUsers, secondYearUsers } from "@/lib/leetcode-usernames";
import { LeetCode } from "leetcode-query";
import { unstable_cache } from "next/cache";

const leetcode = new LeetCode();

export type LeetCodeUserConfig = {
  username: string;
  name: string;
};

export type LeaderboardData = {
  id: string;
  username: string;
  rank?: number;
  rating: number;
  solved: {
    easy: number;
    medium: number;
    hard: number;
  };
  todaySolved: number;
  contests: number;
  profileLink?: string;
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
    recentAcSubmissionList(username: $username, limit: 50) {
      titleSlug
      timestamp
    }
  }
`;

async function fetchUser(
  user: LeetCodeUserConfig,
  isFirstYear: boolean,
): Promise<LeaderboardData> {
  const profileLink = isFirstYear
    ? undefined
    : `https://leetcode.com/u/${user.username}/`;

  try {
    const response = await leetcode.graphql({
      query: USER_DATA_QUERY,
      variables: { username: user.username },
    });

    const data = response.data;

    if (!data || !data.matchedUser) throw new Error("User not found");

    const now = new Date();
    const startOfTodayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfTodayTimestamp = startOfTodayUTC.getTime() / 1000;

    const recentSubmissions = data.recentAcSubmissionList || [];
    const uniqueTodaySolved = new Set();

    recentSubmissions.forEach(
      (sub: { titleSlug: string; timestamp: string }) => {
        if (Number(sub.timestamp) >= startOfTodayTimestamp) {
          uniqueTodaySolved.add(sub.titleSlug);
        }
      },
    );

    const todaySolved = uniqueTodaySolved.size;

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
      todaySolved,
      contests,
      profileLink,
    };
  } catch (error) {
    return {
      id: user.username,
      username: user.name,
      rating: 0,
      solved: {
        easy: 0,
        medium: 0,
        hard: 0,
      },
      todaySolved: 0,
      contests: 0,
      profileLink,
    };
  }
}

export const getLeaderboardData = async (batchKey: BatchKey) => {
  const isFirstYear = batchKey === "1st Year";
  const users = isFirstYear ? firstYearUsers : secondYearUsers;

  const getCachedData = unstable_cache(
    async () => {
      const BATCH_SIZE = 10;
      const allUsers: LeaderboardData[] = [];

      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map((user) => fetchUser(user, isFirstYear)),
        );
        allUsers.push(...batchResults);
      }

      const rankedUsers = allUsers
        .sort((a, b) => {
          if (b.rating === a.rating) {
            return b.contests - a.contests;
          }

          return b.rating - a.rating;
        })
        .map((user, index) => ({ ...user, rank: index + 1 }));

      return rankedUsers;
    },
    [`leetcode-leaderboard-${batchKey}`],
    { revalidate: process.env.NODE_ENV === "development" ? 1 : 60 },
  );

  return await getCachedData();
};
