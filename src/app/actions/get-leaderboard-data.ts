"use server";

import { BatchKey } from "@/components/leaderboard";
import {
  firstYearUsers,
  secondYearUsers,
  thirdYearUsers,
} from "@/lib/leetcode-usernames";
import { db } from "@/lib/db";
import { leaderboard } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { LeaderboardData } from "@/lib/types";
import { fetchUser } from "@/lib/leetcode-fetch";
export type { LeetCodeUserConfig, LeaderboardData } from "@/lib/types";



const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getUsersForBatch(batchKey: BatchKey) {
  switch (batchKey) {
    case "2nd Year": return secondYearUsers;
    case "3rd Year": return thirdYearUsers;
    default: return firstYearUsers;
  }
}

// 1. Instantly get stale data from DB
export const getLeaderboardData = async (batchKey: BatchKey) => {
  const users = getUsersForBatch(batchKey);
  const usernames = users.map((u) => u.username);

  const dbUsers = await db.select()
    .from(leaderboard)
    .where(inArray(leaderboard.id, usernames));

  const mappedUsers: LeaderboardData[] = users.map((user) => {
    const dbUser = dbUsers.find((u) => u.id === user.username);
    if (dbUser) {
      return {
        id: dbUser.id,
        username: dbUser.username,
        rating: dbUser.rating,
        solved: { easy: dbUser.easy, medium: dbUser.medium, hard: dbUser.hard },
        todaySolved: dbUser.todaySolved,
        contests: dbUser.contests,
        profileLink: dbUser.profileLink || `https://leetcode.com/u/${user.username}/`,
        hasKnightBadge: dbUser.hasKnightBadge,
        hasGuardianBadge: dbUser.hasGuardianBadge,
        lastUpdated: dbUser.lastUpdated,
      };
    }
    return {
      id: user.username,
      username: user.name,
      rating: 0,
      solved: { easy: 0, medium: 0, hard: 0 },
      todaySolved: 0,
      contests: 0,
      profileLink: `https://leetcode.com/u/${user.username}/`,
      hasKnightBadge: false,
      hasGuardianBadge: false,
    };
  });

  return mappedUsers
    .sort((a, b) => b.rating === a.rating ? b.contests - a.contests : b.rating - a.rating)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};

// 2. Fetch fresh data from LeetCode, save to DB, and return
export const syncLeaderboardData = async (batchKey: BatchKey) => {
  const users = getUsersForBatch(batchKey);
  
  const CHUNK_SIZE = 30; 
  const DELAY_BETWEEN_CHUNKS = 1000; 

  const results: LeaderboardData[] = [];

  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);
    
    const chunkResults = await Promise.all(
      chunk.map(user => fetchUser(user))
    );

    // Upsert into DB
    for (const data of chunkResults) {
      await db.insert(leaderboard)
        .values({
          id: data.id,
          username: data.username,
          rating: data.rating,
          easy: data.solved.easy,
          medium: data.solved.medium,
          hard: data.solved.hard,
          todaySolved: data.todaySolved,
          contests: data.contests,
          profileLink: data.profileLink,
          hasKnightBadge: data.hasKnightBadge,
          hasGuardianBadge: data.hasGuardianBadge,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: leaderboard.id,
          set: {
            username: data.username,
            rating: data.rating,
            easy: data.solved.easy,
            medium: data.solved.medium,
            hard: data.solved.hard,
            todaySolved: data.todaySolved,
            contests: data.contests,
            profileLink: data.profileLink,
            hasKnightBadge: data.hasKnightBadge,
            hasGuardianBadge: data.hasGuardianBadge,
            lastUpdated: new Date(),
          },
        });
    }
    
    results.push(...chunkResults);

    if (i + CHUNK_SIZE < users.length) {
      await delay(DELAY_BETWEEN_CHUNKS);
    }
  }

  return results
    .sort((a, b) => b.rating === a.rating ? b.contests - a.contests : b.rating - a.rating)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};
