import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const leaderboard = pgTable('leaderboard', {
  id: text('id').primaryKey(), // This is the LeetCode username (unique)
  username: text('username').notNull(), // This is the person's real name
  rating: integer('rating').notNull().default(0),
  easy: integer('easy').notNull().default(0),
  medium: integer('medium').notNull().default(0),
  hard: integer('hard').notNull().default(0),
  todaySolved: integer('today_solved').notNull().default(0),
  contests: integer('contests').notNull().default(0),
  profileLink: text('profile_link'),
  hasKnightBadge: boolean('has_knight_badge').notNull().default(false),
  hasGuardianBadge: boolean('has_guardian_badge').notNull().default(false),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});
