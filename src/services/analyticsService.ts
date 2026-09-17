import { ecomApi } from "./api";

export type LiveAnalyticsResponse = {
  success: boolean;
  generatedAt: string;
  summary: {
    activeUsers: number;
    pageViewsToday: number;
    visitorsToday: number;
    averageEngagementSeconds: number;
  };
  liveVisitors: Array<{
    sessionId: string;
    pagePath: string;
    pageTitle?: string;
    referrer?: string;
    startedAt: string;
    lastSeenAt: string;
    durationSeconds: number;
  }>;
  topPages: Array<{
    pagePath: string;
    pageTitle?: string;
    views: number;
    users: number;
    averageDurationSeconds: number;
  }>;
};

export const analyticsService = {
  getLive() {
    return ecomApi.get<LiveAnalyticsResponse>("/analytics/live");
  },
};
