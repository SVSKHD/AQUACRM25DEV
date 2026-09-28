import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../services/api";

type AdminLinks = {
  readiness?: string;
  seo?: string;
  entity?: string;
  storefront?: string;
};

type ReadinessItem = {
  pageKey?: string;
  title?: string;
  priority?: string;
  score?: number;
  adminLinks?: AdminLinks;
};

type ReadinessPayload = Record<string, unknown> & {
  items?: ReadinessItem[];
  item?: ReadinessItem;
};

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

  const p0Items = useMemo(() => {
    if (Array.isArray(payload?.items)) {
      return payload.items.filter((item) => item?.priority === "P0");
    }
    if (payload?.item?.priority === "P0") return [payload.item];
    return [];
  }, [payload]);

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

        {!loading && !error && p0Items.length > 0 && (
          <section className="mb-4 rounded-xl border border-red-900/60 bg-red-950/20 p-4">
            <div className="mb-3">
              <h2 className="font-semibold text-red-200">P0 admin actions</h2>
              <p className="text-xs text-slate-400">
                Critical SEO items, ordered exactly as returned by the readiness engine.
              </p>
            </div>
            <div className="grid gap-3">
              {p0Items.map((item) => (
                <article
                  key={item.pageKey}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <strong className="block text-sm">{item.title || item.pageKey}</strong>
                      <code className="text-xs text-slate-400">{item.pageKey}</code>
                    </div>
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                      P0 · {item.score ?? 0}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.adminLinks?.seo && (
                      <a
                        href={item.adminLinks.seo}
                        className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
                      >
                        Fix SEO
                      </a>
                    )}
                    {item.adminLinks?.entity && (
                      <a
                        href={item.adminLinks.entity}
                        className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                      >
                        Edit content
                      </a>
                    )}
                    {item.adminLinks?.readiness && (
                      <a
                        href={item.adminLinks.readiness}
                        className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                      >
                        JSON
                      </a>
                    )}
                    {item.adminLinks?.storefront && (
                      <a
                        href={item.adminLinks.storefront}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                      >
                        View page
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
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
