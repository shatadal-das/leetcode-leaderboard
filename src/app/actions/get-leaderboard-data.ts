"use server";

import {
  firstYearUsers,
  secondYearUsers,
  thirdYearUsers,
} from "@/lib/leetcode-usernames";
import { db } from "@/lib/db";
import { leaderboard } from "@/lib/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { BatchKey, LeaderboardData } from "@/lib/types";
import { fetchUser } from "@/lib/leetcode-fetch";
export type { BatchKey, LeetCodeUserConfig, LeaderboardData } from "@/lib/types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getUsersForBatch(batchKey: BatchKey) {
  switch (batchKey) {
    case "2nd Year": return secondYearUsers;
    case "3rd Year": return thirdYearUsers;
    default: return firstYearUsers;
  }
}

function getAllDatasetUsernames() {
  return [
    ...firstYearUsers,
    ...secondYearUsers,
    ...thirdYearUsers,
  ].map((u) => u.username);
}

// 1. Instantly get stale data from DB
export const getLeaderboardData = async (batchKey: BatchKey) => {
  const users = getUsersForBatch(batchKey);
  const usernames = users.map((u) => u.username);

  let dbUsers: (typeof leaderboard.$inferSelect)[] = [];
  try {
    dbUsers = await db
      .select()
      .from(leaderboard)
      .where(inArray(leaderboard.id, usernames));
  } catch (dbError) {
    console.error("Failed to query leaderboard from DB:", dbError);
  }

  const mappedUsers: LeaderboardData[] = users.map((user) => {
    const dbUser = dbUsers.find((u) => u.id === user.username);
    if (dbUser) {
      return {
        id: dbUser.id,
        username: user.name, // Always keep configured display name from dataset
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

const lastSyncTimestamp: Record<string, number> = {};
const SERVER_SYNC_COOLDOWN_MS = 30 * 1000;

// 2. Fetch fresh data from LeetCode, save to DB, prune deleted users, and return
export const syncLeaderboardData = async (batchKey: BatchKey) => {
  const now = Date.now();
  const lastSync = lastSyncTimestamp[batchKey] || 0;

  // Rate-limit sync calls to prevent LeetCode API throttling
  if (now - lastSync < SERVER_SYNC_COOLDOWN_MS) {
    return getLeaderboardData(batchKey);
  }
  lastSyncTimestamp[batchKey] = now;

  const users = getUsersForBatch(batchKey);
  const usernames = users.map((u) => u.username);
  const allDatasetUsernames = getAllDatasetUsernames();

  // Prune users from DB who have been removed from the dataset or this batch
  try {
    if (allDatasetUsernames.length > 0) {
      await db
        .delete(leaderboard)
        .where(notInArray(leaderboard.id, allDatasetUsernames));
    }
    if (usernames.length > 0) {
      await db
        .delete(leaderboard)
        .where(
          and(
            eq(leaderboard.batch, batchKey),
            notInArray(leaderboard.id, usernames)
          )
        );
    }
  } catch (cleanErr) {
    console.error("Could not prune removed users from DB:", cleanErr);
  }

  // Get current DB data so we don't erase existing valid data on transient fetch error
  let existingDbUsers: (typeof leaderboard.$inferSelect)[] = [];
  try {
    existingDbUsers = await db
      .select()
      .from(leaderboard)
      .where(inArray(leaderboard.id, usernames));
  } catch (err) {
    console.error("Could not fetch existing DB users before sync:", err);
  }

  const CHUNK_SIZE = 15;
  const DELAY_BETWEEN_CHUNKS = 150;

  const results: LeaderboardData[] = [];

  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.all(
      chunk.map((user) => fetchUser(user))
    );

    // Upsert only successfully fetched users into DB
    const successfulFetches = chunkResults.filter((data) => data.fetchSuccess);

    if (successfulFetches.length > 0) {
      try {
        await Promise.all(
          successfulFetches.map((data) => {
            const configUser = users.find((u) => u.username === data.id);
            const displayName = configUser?.name || data.username;
            return db
              .insert(leaderboard)
              .values({
                id: data.id,
                username: displayName,
                batch: batchKey,
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
                  username: displayName,
                  batch: batchKey,
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
          })
        );
      } catch (dbErr) {
        console.error("Failed to upsert chunk to DB:", dbErr);
      }
    }

    // For any user where fetch failed, fallback to existing DB data if present
    for (const data of chunkResults) {
      const configUser = users.find((u) => u.username === data.id);
      const displayName = configUser?.name || data.username;

      if (!data.fetchSuccess) {
        const existing = existingDbUsers.find((u) => u.id === data.id);
        if (existing) {
          results.push({
            id: existing.id,
            username: displayName,
            rating: existing.rating,
            solved: { easy: existing.easy, medium: existing.medium, hard: existing.hard },
            todaySolved: existing.todaySolved,
            contests: existing.contests,
            profileLink: existing.profileLink || `https://leetcode.com/u/${existing.id}/`,
            hasKnightBadge: existing.hasKnightBadge,
            hasGuardianBadge: existing.hasGuardianBadge,
            lastUpdated: existing.lastUpdated,
          });
          continue;
        }
      }
      results.push({
        ...data,
        username: displayName,
      });
    }

    if (i + CHUNK_SIZE < users.length) {
      await delay(DELAY_BETWEEN_CHUNKS);
    }
  }

  return results
    .sort((a, b) => b.rating === a.rating ? b.contests - a.contests : b.rating - a.rating)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};
