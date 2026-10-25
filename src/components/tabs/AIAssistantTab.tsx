import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useSiteData } from "../../hooks/useSiteData";
import { buildAssistantContext } from "../../utils/siteAnalysis";
import { API_ORIGIN } from "../../config/api";
import AIChat from "../modular/ai/AIChat";
import SeoView from "../modular/ai/SeoView";
import AutopilotView from "../modular/ai/AutopilotView";
import InterlinkingView from "../modular/ai/InterlinkingView";
import SiteDataView from "../modular/ai/SiteDataView";
import { LiquidButton } from "../ui/liquid";

export type AIAssistantView = "seo" | "autopilot" | "links" | "data" | "chat";

const VIEW_COPY: Record<
  AIAssistantView,
  { title: string; description: string }
> = {
  seo: {
    title: "SEO & Keywords",
    description:
      "Pages and keywords ranked by on-page SEO score, why each keyword is failing, and how to fix it.",
  },
  autopilot: {
    title: "SEO Autopilot",
    description:
      "Plan, draft and apply SEO fixes for every page at once, ranked by predicted score gain.",
  },
  links: {
    title: "Interlinking",
    description:
      "Orphan pages, broken links, taxonomy gaps and mentions that should be internal links.",
  },
  data: {
    title: "Site Data",
    description:
      "Every storefront page with its SEO record, content depth, keywords and internal links.",
  },
  chat: {
    title: "AI Assistant",
    description:
      "Ask questions about your site data, or draft customer messages and product copy.",
  },
};

export default function AIAssistantTab({ view }: { view: AIAssistantView }) {
  const {
    data,
    analysis,
    error,
    loading,
    change,
    reload,
    replaceSeoRecord,
    replaceSeoRecords,
  } = useSiteData();
  const copy = VIEW_COPY[view];

  const siteContext = useMemo(
    () =>
      analysis
        ? buildAssistantContext(analysis, data?.readiness?.summary)
        : undefined,
    [analysis, data?.readiness],
  );

  const refreshButton = (
    <LiquidButton
      type="button"
      variant="soft"
      onClick={reload}
      disabled={loading}
      className="text-sm"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
      Refresh data
    </LiquidButton>
  );

  // The chat works without site data, so don't block it on loading.
  if (view === "chat") {
    return (
      <TabInnerContent title={copy.title} description={copy.description}>
        <AIChat siteContext={siteContext} />
      </TabInnerContent>
    );
  }

  return (
    <TabInnerContent title={copy.title} description={copy.description}>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {data && (
          <span className="text-xs text-slate-500 dark:text-white/50">
            Data from {API_ORIGIN.replace(/^https?:\/\//, "")} · loaded{" "}
            {new Date(data.loadedAt).toLocaleTimeString("en-IN")}
          </span>
        )}
        {refreshButton}
      </div>
      {error && !data ? (
        <div
          className="glass-card mx-auto max-w-lg p-8 text-center text-sm text-rose-600 dark:text-rose-300"
          role="alert"
        >
          {error}
        </div>
      ) : !analysis || !data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-500 dark:text-white/60">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading catalog, SEO records and readiness report…
        </div>
      ) : view === "seo" ? (
        <SeoView
          analysis={analysis}
          readiness={data.readiness}
          records={data.seoRecords}
          change={change}
          seoError={data.seoError}
          onSeoRecordSaved={replaceSeoRecord}
          onCatalogChanged={reload}
        />
      ) : view === "autopilot" ? (
        <AutopilotView
          analysis={analysis}
          readiness={data.readiness}
          records={data.seoRecords}
          change={change}
          onSeoRecordsSaved={replaceSeoRecords}
        />
      ) : view === "links" ? (
        <InterlinkingView analysis={analysis} />
      ) : (
        <SiteDataView analysis={analysis} data={data} />
      )}
    </TabInnerContent>
  );
}
