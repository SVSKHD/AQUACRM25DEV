import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../services/api";

type ReadinessPayload = Record<string, unknown>;

export default function NeedsSeoPage() {
  const { pageKey: routePageKey } = useParams();
  const [searchParams] = useSearchParams();
  const queryPageKey = searchParams.get("pageKey") || searchParams.get("key");
  const pageKey = routePageKey || queryPageKey || "";
  const [payload, setPayload] = useState<ReadinessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const endpoint = useMemo(
    () =>
      pageKey
        ? `/seo/readiness/${encodeURIComponent(pageKey)}`
        : "/seo/readiness",
    [pageKey],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await adminApi.get<ReadinessPayload>(endpoint);
    if (response.error) {
      setPayload(null);
      setError(response.error);
    } else {
      setPayload(response.data || {});
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const json = useMemo(
    () => JSON.stringify(payload, null, 2),
    [payload],
  );

  const copyJson = async () => {
    if (!json) return;
    await navigator.clipboard.writeText(json);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Aquakart SEO Readiness JSON</h1>
            <p className="text-sm text-slate-400">
              {pageKey ? `Key: ${pageKey}` : "Priority-sorted SEO work queue"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void copyJson()}
              disabled={!payload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900 disabled:opacity-50"
            >
              <Copy size={16} />
              Copy JSON
            </button>
          </div>
        </div>

        {loading && (
          <pre className="overflow-auto rounded-xl border border-slate-800 bg-black p-4 text-sm">
            {JSON.stringify({ success: true, loading: true }, null, 2)}
          </pre>
        )}

        {!loading && error && (
          <pre className="overflow-auto rounded-xl border border-red-900 bg-black p-4 text-sm text-red-300">
            {JSON.stringify({ success: false, error }, null, 2)}
          </pre>
        )}

        {!loading && !error && payload && (
          <pre className="max-h-[calc(100vh-150px)] overflow-auto rounded-xl border border-slate-800 bg-black p-4 text-xs leading-5 md:text-sm">
            {json}
          </pre>
        )}
      </div>
    </main>
  );
}
