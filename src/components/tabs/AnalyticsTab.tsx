import { useEffect, useState } from "react";
import { Activity, Clock, Eye, RefreshCw, Users } from "lucide-react";
import { analyticsService, LiveAnalyticsResponse } from "../../services/analyticsService";
import TabInnerContent from "../Layout/tabInnerlayout";
import { LiquidButton, LiquidPanel } from "../ui/liquid";

const formatDuration = (seconds = 0) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const shortSession = (sessionId: string) => `#${sessionId.slice(0, 8)}`;

export default function AnalyticsTab() {
  const [data, setData] = useState<LiveAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (withSpinner = false) => {
    if (withSpinner) setLoading(true);
    const response = await analyticsService.getLive();
    if (response.error || !response.data) {
      setError(response.error || "Unable to load analytics");
    } else {
      setData(response.data);
      setError("");
    }
    setLoading(false);
  };

  useEffect(() => {
    load(true);
    const timer = window.setInterval(() => load(false), 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <TabInnerContent
      title="Live Analytics"
      description="Real-time AquaKart ecommerce visitor activity"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-white/50">
            Auto-refreshes every 15 seconds
            {data?.generatedAt
              ? ` · Last updated ${new Date(data.generatedAt).toLocaleTimeString("en-IN")}`
              : ""}
          </p>
          <LiquidButton onClick={() => load(true)} variant="soft">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </LiquidButton>
        </div>

        {error && (
          <LiquidPanel className="p-4 text-sm font-bold text-rose-600 dark:text-rose-300">
            {error}
          </LiquidPanel>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Activity className="h-5 w-5" />} label="Active now" value={String(data?.summary.activeUsers ?? 0)} />
          <StatCard icon={<Eye className="h-5 w-5" />} label="Page views today" value={String(data?.summary.pageViewsToday ?? 0)} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Visitors today" value={String(data?.summary.visitorsToday ?? 0)} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Avg engagement" value={formatDuration(data?.summary.averageEngagementSeconds ?? 0)} />
        </div>

        <LiquidPanel className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-4 dark:border-white/10">
            <h3 className="font-black text-neutral-950 dark:text-white">Live visitors</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
              A visitor is considered active when their page heartbeat was seen within the last 2 minutes.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-left text-xs uppercase text-slate-500 dark:text-white/50">
                  <th className="px-4 py-3">Visitor</th>
                  <th className="px-4 py-3">Current page</th>
                  <th className="px-4 py-3">Stayed</th>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {(data?.liveVisitors || []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No active visitors right now</td></tr>
                ) : (
                  data?.liveVisitors.map((visitor) => (
                    <tr key={visitor.sessionId}>
                      <td className="px-4 py-3 font-bold text-neutral-950 dark:text-white">{shortSession(visitor.sessionId)}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-950 dark:text-white">{visitor.pageTitle || visitor.pagePath}</div>
                        <div className="max-w-[320px] truncate text-xs text-slate-500">{visitor.pagePath}</div>
                      </td>
                      <td className="px-4 py-3">{formatDuration(visitor.durationSeconds)}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-slate-500">{visitor.referrer || "Direct"}</td>
                      <td className="px-4 py-3">{new Date(visitor.lastSeenAt).toLocaleTimeString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </LiquidPanel>

        <LiquidPanel className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-4 dark:border-white/10">
            <h3 className="font-black text-neutral-950 dark:text-white">Top pages · last 24 hours</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-left text-xs uppercase text-slate-500 dark:text-white/50">
                  <th className="px-4 py-3">Page</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Visitors</th>
                  <th className="px-4 py-3">Avg stay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {(data?.topPages || []).map((page) => (
                  <tr key={page.pagePath}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-950 dark:text-white">{page.pageTitle || page.pagePath}</div>
                      <div className="max-w-[400px] truncate text-xs text-slate-500">{page.pagePath}</div>
                    </td>
                    <td className="px-4 py-3 font-bold">{page.views}</td>
                    <td className="px-4 py-3">{page.users}</td>
                    <td className="px-4 py-3">{formatDuration(page.averageDurationSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LiquidPanel>
      </div>
    </TabInnerContent>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <LiquidPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-sky-600 dark:text-sky-300">{icon}<span className="text-sm font-bold">{label}</span></div>
      <p className="text-3xl font-black text-neutral-950 dark:text-white">{value}</p>
    </LiquidPanel>
  );
}
