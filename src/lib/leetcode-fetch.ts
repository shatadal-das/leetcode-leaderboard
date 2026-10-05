import { LeetCodeUserConfig, LeaderboardData } from "./types";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const USER_DATA_QUERY = `
  query getUserData($username: String!) {
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      contestBadge {
        name
      }
      badges {
        name
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

export async function fetchUser(user: LeetCodeUserConfig): Promise<LeaderboardData> {
  const profileLink = `https://leetcode.com/u/${user.username}/`;

  try {
    const res = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://leetcode.com",
        origin: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: USER_DATA_QUERY,
        variables: { username: user.username },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const data = json.data;

    if (!data || !data.matchedUser) {
      throw new Error("User not found or no data returned");
    }

    // --- Badge Logic ---
    const contestBadge = data.matchedUser.contestBadge?.name || null;
    const generalBadges =
      data.matchedUser.badges?.map((b: { name: string }) => b.name) || [];

    // Check Knight
    const hasContestKnight = contestBadge === "Knight";
    const hasGeneralKnight = generalBadges.includes("Knight");
    const hasKnightBadge = hasContestKnight || hasGeneralKnight;

    // Check Guardian
    const hasContestGuardian = contestBadge === "Guardian";
    const hasGeneralGuardian = generalBadges.includes("Guardian");
    const hasGuardianBadge = hasContestGuardian || hasGeneralGuardian;

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

    const subs = (data.matchedUser.submitStats?.acSubmissionNum as {
      difficulty: "All" | "Easy" | "Medium" | "Hard";
      count: number;
    }[]) || [];

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
      hasKnightBadge,
      hasGuardianBadge,
      lastUpdated: new Date(),
      fetchSuccess: true,
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
      hasKnightBadge: false,
      hasGuardianBadge: false,
      fetchSuccess: false,
    };
  }
}
