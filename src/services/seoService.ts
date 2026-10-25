import { ecomApi } from "./api";

export type SeoPriority = "P0" | "P1" | "P2" | "P3";
export type SeoReadinessStatus = "READY" | "INCOMPLETE" | "NEEDS_SEO";
export type SeoEntityType =
  "static" | "product" | "category" | "subcategory" | "blog";

export interface SeoIssue {
  code: string;
  severity: "critical" | "high" | "medium" | "low";
  field: string;
  message: string;
  action?: string;
}

export interface SeoReadinessItem {
  pageKey: string;
  entityType: SeoEntityType;
  entityId: string | null;
  title: string;
  route: string;
  canonicalUrl: string;
  status: SeoReadinessStatus;
  priority: SeoPriority;
  score: number;
  scores: Record<
    "technical" | "metadata" | "content" | "schema" | "merchant" | "media",
    number | null
  >;
  missing: string[];
  issues: SeoIssue[];
  recommendedActions: { action: string; field: string; reason: string }[];
  lastSeoUpdateAt: string | null;
}

export interface SeoReadinessReport {
  generatedAt: string;
  site: string;
  summary: {
    totalPages: number;
    ready: number;
    needsSeo: number;
    missingSeo: number;
    critical: number;
    high: number;
    medium: number;
    overallScore: number;
  };
  items: SeoReadinessItem[];
}

export interface SeoRecord {
  _id: string;
  pageKey: string;
  route: string;
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  robots: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  schemaJson?: unknown;
  active: boolean;
  updatedAt?: string;
}

export type SeoRecordInput = Partial<
  Pick<
    SeoRecord,
    | "pageKey"
    | "route"
    | "title"
    | "description"
    | "keywords"
    | "canonicalUrl"
    | "robots"
    | "ogTitle"
    | "ogDescription"
    | "ogImage"
    | "schemaJson"
    | "active"
  >
>;

export interface SeoResult<T> {
  data?: T;
  error?: string;
  status?: number;
}

const SEO_PAGE_SIZE = 500;

// SEO data changes while staff fix pages, so never reuse a cached response.
const FRESH: RequestInit = { cache: "no-store" };

export const seoService = {
  async readiness(): Promise<SeoResult<SeoReadinessReport>> {
    const { data, error, status } = await ecomApi.get<
      SeoReadinessReport & { success: boolean }
    >("admin/seo/readiness", FRESH);
    if (error || !data)
      return { error: error || "Failed to load SEO readiness", status };
    return {
      data: { ...data, items: Array.isArray(data.items) ? data.items : [] },
    };
  },

  /** Every SEO record, following pagination. */
  async listAll(): Promise<SeoResult<SeoRecord[]>> {
    const records: SeoRecord[] = [];
    for (let page = 1; page < 50; page += 1) {
      const { data, error, status } = await ecomApi.get<{
        data: SeoRecord[];
        pagination?: { totalPages: number };
      }>(`admin/seo?limit=${SEO_PAGE_SIZE}&page=${page}`, FRESH);
      if (error || !data)
        return { error: error || "Failed to load SEO records", status };
      records.push(...(data.data || []));
      if (!data.pagination || page >= data.pagination.totalPages) break;
    }
    return { data: records };
  },

  async create(body: SeoRecordInput): Promise<SeoResult<SeoRecord>> {
    const { data, error, status } = await ecomApi.post<{ data: SeoRecord }>(
      "admin/seo",
      body,
    );
    if (error || !data)
      return { error: error || "Failed to create SEO record", status };
    return { data: data.data };
  },

  async patch(id: string, body: SeoRecordInput): Promise<SeoResult<SeoRecord>> {
    const { data, error, status } = await ecomApi.patch<{ data: SeoRecord }>(
      `admin/seo/${id}`,
      body,
    );
    if (error || !data)
      return { error: error || "Failed to update SEO record", status };
    return { data: data.data };
  },
};
