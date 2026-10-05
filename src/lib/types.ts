export type BatchKey = "1st Year" | "2nd Year" | "3rd Year";

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
  hasKnightBadge: boolean;
  hasGuardianBadge: boolean;
  lastUpdated?: Date;
  fetchSuccess?: boolean;
};
