import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  blogService,
  categoriesService,
  productsService,
  subcategoriesService,
} from "../services/apiService";
import {
  seoService,
  type SeoReadinessReport,
  type SeoRecord,
} from "../services/seoService";
import {
  analyzeSite,
  type Catalog,
  type SiteAnalysis,
} from "../utils/siteAnalysis";

export interface SiteData {
  catalog: Catalog;
  seoRecords: SeoRecord[];
  readiness: SeoReadinessReport | null;
  /** Set when SEO data couldn't be loaded (e.g. missing seo.read permission). */
  seoError: string;
  loadedAt: number;
}

export type ReadinessSummary = SeoReadinessReport["summary"];

/** Readiness before and after the latest reload, so fixes show up as a delta. */
export interface ReadinessChange {
  before: ReadinessSummary;
  after: ReadinessSummary;
  /** pageKey → [old score, new score] for pages whose score moved */
  pages: Map<string, [number, number]>;
  at: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractList = (data: any): Record<string, any>[] => {
  const candidates = [
    data?.data?.products,
    data?.data?.data,
    data?.data,
    data?.products,
    data,
  ];
  return candidates.find((item) => Array.isArray(item)) || [];
};

const seoErrorMessage = (result: { error?: string; status?: number }) =>
  result.status === 403
    ? "You need the seo.read permission to see SEO records and readiness scores."
    : result.error || "Failed to load SEO data";

// The AI Assistant views share one load; switching views doesn't refetch.
let cache: Promise<SiteData> | null = null;

const loadSiteData = async (): Promise<SiteData> => {
  const [products, categories, subcategories, blogs, records, readiness] =
    await Promise.all([
      productsService.getAll(),
      categoriesService.getAll(),
      subcategoriesService.getAll(),
      blogService.getAllBlogs(),
      seoService.listAll(),
      seoService.readiness(),
    ]);

  const catalogError = [products, categories, subcategories, blogs].find(
    (result) => result.error,
  );
  if (catalogError?.error) throw new Error(catalogError.error);

  const seoFailure = records.error
    ? records
    : readiness.error
      ? readiness
      : null;
  return {
    catalog: {
      products: extractList(products.data),
      categories: extractList(categories.data),
      subcategories: extractList(subcategories.data),
      blogs: extractList(blogs.data),
    },
    seoRecords: records.data || [],
    readiness: readiness.data || null,
    seoError: seoFailure ? seoErrorMessage(seoFailure) : "",
    loadedAt: Date.now(),
  };
};

const diffReadiness = (
  previous: SeoReadinessReport | null | undefined,
  next: SeoReadinessReport | null | undefined,
): ReadinessChange | null => {
  if (!previous || !next) return null;
  const oldScores = new Map(
    previous.items.map((item) => [item.pageKey, item.score]),
  );
  const pages = new Map<string, [number, number]>();
  next.items.forEach((item) => {
    const old = oldScores.get(item.pageKey);
    if (old !== undefined && old !== item.score)
      pages.set(item.pageKey, [old, item.score]);
  });
  return {
    before: previous.summary,
    after: next.summary,
    pages,
    at: Date.now(),
  };
};

export function useSiteData() {
  const [data, setData] = useState<SiteData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [change, setChange] = useState<ReadinessChange | null>(null);
  // Latest data for computing before/after deltas outside state updaters.
  const dataRef = useRef<SiteData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const load = useCallback(async (force = false) => {
    if (force || !cache) {
      cache = loadSiteData();
      cache.catch(() => {
        cache = null;
      });
    }
    setLoading(true);
    try {
      const next = await cache;
      if (force)
        setChange(diffReadiness(dataRef.current?.readiness, next.readiness));
      setData(next);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load site data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const analysis = useMemo<SiteAnalysis | null>(
    () =>
      data
        ? analyzeSite(
            data.catalog,
            data.seoRecords,
            data.readiness?.items || [],
          )
        : null,
    [data],
  );

  /** Re-scores pages on the server after an SEO change, without refetching the catalog. */
  const refreshReadiness = useCallback(async () => {
    const result = await seoService.readiness();
    if (result.data)
      setChange(diffReadiness(dataRef.current?.readiness, result.data));
    setData((current) => {
      if (!current) return current;
      const next = {
        ...current,
        readiness: result.data || current.readiness,
        seoError: result.error ? seoErrorMessage(result) : current.seoError,
      };
      cache = Promise.resolve(next);
      return next;
    });
  }, []);

  /** Swaps in saved SEO records, then asks the server for fresh readiness scores once. */
  const replaceSeoRecords = useCallback(
    (saved: SeoRecord[]) => {
      if (!saved.length) return;
      setData((current) => {
        if (!current) return current;
        const byId = new Map(saved.map((record) => [record._id, record]));
        const updated = current.seoRecords.map(
          (item) => byId.get(item._id) || item,
        );
        const known = new Set(current.seoRecords.map((item) => item._id));
        const next = {
          ...current,
          seoRecords: [
            ...updated,
            ...saved.filter((record) => !known.has(record._id)),
          ],
        };
        cache = Promise.resolve(next);
        return next;
      });
      refreshReadiness();
    },
    [refreshReadiness],
  );

  const replaceSeoRecord = useCallback(
    (record: SeoRecord) => replaceSeoRecords([record]),
    [replaceSeoRecords],
  );

  return {
    data,
    analysis,
    error,
    loading,
    change,
    reload: () => load(true),
    replaceSeoRecord,
    replaceSeoRecords,
    refreshReadiness,
  };
}
