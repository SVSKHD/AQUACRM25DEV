import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  SearchCheck,
  XCircle,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import {
  seoMappingService,
  STATIC_SEO_PAGES,
  type SeoCatalogItem,
  type SeoEntityType,
  type SeoRecord,
} from "../../services/seoMappingService";

type CoverageItem = SeoCatalogItem & { type: SeoEntityType };

const ENTITY_LABELS: Record<SeoEntityType, string> = {
  static: "Static page",
  product: "Product",
  category: "Category",
  subcategory: "Subcategory",
  blog: "Blog",
};

const inferType = (pageKey = ""): SeoEntityType => {
  if (pageKey.startsWith("product.")) return "product";
  if (pageKey.startsWith("category.")) return "category";
  if (pageKey.startsWith("subcategory.")) return "subcategory";
  if (pageKey.startsWith("blog.")) return "blog";
  return "static";
};

const blankRecord = (): SeoRecord => ({
  pageKey: "",
  route: "",
  title: "",
  description: "",
  keywords: [],
  canonicalUrl: "",
  robots: "index,follow",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  schemaJson: null,
  active: true,
});

const normalizeRows = (response: any): SeoRecord[] =>
  Array.isArray(response?.data?.data) ? response.data.data : [];

const seoMissingFields = (record?: SeoRecord) => {
  if (!record) return ["SEO record"];
  const missing: string[] = [];
  if (!record.title?.trim()) missing.push("title");
  if (!record.description?.trim()) missing.push("description");
  if (!record.canonicalUrl?.trim()) missing.push("canonical");
  if (!record.robots?.trim()) missing.push("robots");
  if (!record.ogTitle?.trim()) missing.push("OG title");
  if (!record.ogDescription?.trim()) missing.push("OG description");
  if (!record.ogImage?.trim()) missing.push("OG image");
  if (!record.schemaJson) missing.push("schema");
  if (record.active === false) missing.push("disabled");
  return missing;
};

const statusLabel = (record?: SeoRecord) => {
  if (!record) return "NEEDS SEO";
  return seoMissingFields(record).length ? "INCOMPLETE" : "COMPLETE";
};

const merchantMissingFields = (product: any) => {
  const missing: string[] = [];
  if (!product?.title) missing.push("title");
  if (!Number(product?.price)) missing.push("price");
  if (!product?.brand) missing.push("brand");
  if (!product?.slug && !product?._id) missing.push("URL");
  if (!Array.isArray(product?.photos) || !product.photos[0]?.secure_url) {
    missing.push("image");
  }
  if (product?.identifierExists !== false && !product?.gtin && !product?.mpn) {
    missing.push("GTIN/MPN");
  }
  if (!product?.googleProductCategory) missing.push("Google category");
  if (product?.merchantEnabled === false) missing.push("feed disabled");
  return missing;
};

export default function SeoTab() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<SeoRecord[]>([]);
  const [fullCatalog, setFullCatalog] = useState<CoverageItem[]>([]);
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "incomplete" | "complete">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SeoRecord | null>(null);
  const [entityType, setEntityType] = useState<SeoEntityType>("static");
  const [catalog, setCatalog] = useState<SeoCatalogItem[]>(STATIC_SEO_PAGES);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [draft, setDraft] = useState<SeoRecord>(blankRecord());
  const [schemaText, setSchemaText] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [seoResponse, catalogItems, products] = await Promise.all([
        seoMappingService.listSeo(1, ""),
        seoMappingService.loadFullCatalog(),
        seoMappingService.loadMerchantProducts(),
      ]);

      if (seoResponse.error) {
        showToast(seoResponse.error, "error");
        return;
      }

      setRecords(normalizeRows(seoResponse));
      setFullCatalog(catalogItems);
      setMerchantProducts(products);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load SEO coverage",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const recordByKey = useMemo(
    () => new Map(records.map((record) => [record.pageKey, record])),
    [records],
  );

  const coverage = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fullCatalog.filter((item) => {
      const record = recordByKey.get(item.pageKey);
      const status = statusLabel(record);
      const matchesSearch =
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.pageKey.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q) ||
        record?.title?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (filter === "missing") return status === "NEEDS SEO";
      if (filter === "incomplete") return status === "INCOMPLETE";
      if (filter === "complete") return status === "COMPLETE";
      return true;
    });
  }, [filter, fullCatalog, recordByKey, search]);

  const summary = useMemo(() => {
    const statuses = fullCatalog.map((item) =>
      statusLabel(recordByKey.get(item.pageKey)),
    );
    return {
      total: statuses.length,
      complete: statuses.filter((s) => s === "COMPLETE").length,
      incomplete: statuses.filter((s) => s === "INCOMPLETE").length,
      missing: statuses.filter((s) => s === "NEEDS SEO").length,
    };
  }, [fullCatalog, recordByKey]);

  const setTargetType = (type: SeoEntityType, selectedPageKey = "") => {
    const items = fullCatalog
      .filter((item) => item.type === type)
      .map(({ type: _type, ...item }) => item);
    setEntityType(type);
    setCatalog(type === "static" && !items.length ? STATIC_SEO_PAGES : items);

    if (selectedPageKey) {
      const selected = items.find((item) => item.pageKey === selectedPageKey);
      setSelectedTargetId(selected?.id || "");
    } else {
      setSelectedTargetId("");
    }
  };

  const openNew = () => {
    setEditing(null);
    setDraft(blankRecord());
    setSchemaText("");
    setFormOpen(true);
    const staticItems = fullCatalog
      .filter((item) => item.type === "static")
      .map(({ type: _type, ...item }) => item);
    setEntityType("static");
    setCatalog(staticItems.length ? staticItems : STATIC_SEO_PAGES);
    setSelectedTargetId("");
  };

  const openCoverageTarget = (item: CoverageItem) => {
    const existing = recordByKey.get(item.pageKey);
    if (existing) {
      openEdit(existing);
      return;
    }

    setEditing(null);
    setDraft({
      ...blankRecord(),
      pageKey: item.pageKey,
      route: item.route,
      canonicalUrl: `https://aquakart.co.in${item.route}`,
    });
    setSchemaText("");
    setFormOpen(true);
    setTargetType(item.type, item.pageKey);
  };

  const openEdit = (record: SeoRecord) => {
    const type = inferType(record.pageKey);
    setEditing(record);
    setDraft({ ...blankRecord(), ...record });
    setSchemaText(
      record.schemaJson ? JSON.stringify(record.schemaJson, null, 2) : "",
    );
    setFormOpen(true);
    setTargetType(type, record.pageKey);
  };

  const selectedTarget = useMemo(
    () => catalog.find((item) => item.id === selectedTargetId) || null,
    [catalog, selectedTargetId],
  );

  useEffect(() => {
    if (!selectedTarget) return;
    setDraft((current) => ({
      ...current,
      pageKey: selectedTarget.pageKey,
      route: selectedTarget.route,
      canonicalUrl:
        current.canonicalUrl ||
        `https://aquakart.co.in${selectedTarget.route}`,
    }));
  }, [selectedTarget]);

  const onTypeChange = (type: SeoEntityType) => {
    setDraft(blankRecord());
    setSchemaText("");
    setTargetType(type);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTarget) {
      showToast("Select the ecommerce page this SEO record belongs to", "error");
      return;
    }

    let schemaJson: Record<string, unknown> | null = null;
    if (schemaText.trim()) {
      try {
        const parsed = JSON.parse(schemaText);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          throw new Error("Schema must be a JSON object");
        }
        schemaJson = parsed;
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Schema JSON is invalid",
          "error",
        );
        return;
      }
    }

    const payload: SeoRecord = {
      ...draft,
      pageKey: selectedTarget.pageKey,
      route: selectedTarget.route,
      keywords: Array.isArray(draft.keywords) ? draft.keywords : [],
      schemaJson,
    };

    const response = editing?._id
      ? await seoMappingService.updateSeo(editing._id, payload)
      : await seoMappingService.createSeo(payload);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast(
      editing ? "SEO configuration updated" : "SEO configuration created",
      "success",
    );
    setFormOpen(false);
    setEditing(null);
    await loadData();
  };

  const toggleActive = async (record: SeoRecord) => {
    if (!record._id) return;
    const response = await seoMappingService.updateSeo(record._id, {
      active: record.active === false,
    });
    if (response.error) return showToast(response.error, "error");
    await loadData();
  };

  return (
    <TabInnerContent
      title="SEO & Indexing Control Center"
      description="See every ecommerce page, what is indexed-ready, what is incomplete, and what still needs SEO."
    >
      <div className="commerce-admin">
        <section className="commerce-panel">
          <div className="commerce-panel-head">
            <div>
              <h3>SEO coverage</h3>
              <p className="text-sm text-slate-500">
                Static pages, products, categories, subcategories and blogs are checked against CRM SEO records.
              </p>
            </div>
            <div className="commerce-actions">
              <button onClick={() => void loadData()}>
                <RefreshCw /> Refresh
              </button>
              <button className="commerce-primary" onClick={openNew}>
                <Plus /> Add SEO
              </button>
            </div>
          </div>

          <div className="seo-summary-grid">
            <button
              className={`commerce-card seo-summary-card ${filter === "all" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("all")}
            >
              <span>Total pages</span>
              <strong>{summary.total}</strong>
            </button>
            <button
              className={`commerce-card seo-summary-card seo-summary-complete ${filter === "complete" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("complete")}
            >
              <span>Complete</span>
              <strong>{summary.complete}</strong>
            </button>
            <button
              className={`commerce-card seo-summary-card seo-summary-incomplete ${filter === "incomplete" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("incomplete")}
            >
              <span>Incomplete</span>
              <strong>{summary.incomplete}</strong>
            </button>
            <button
              className={`commerce-card seo-summary-card seo-summary-missing ${filter === "missing" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("missing")}
            >
              <span>Needs SEO</span>
              <strong>{summary.missing}</strong>
            </button>
          </div>

          <div className="seo-toolbar">
            <div className="seo-search-field">
              <SearchCheck aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search page, pageKey or route"
              />
            </div>
            <select
              className="seo-filter-select"
              aria-label="Filter SEO status"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as typeof filter)
              }
            >
              <option value="all">All statuses</option>
              <option value="missing">Needs SEO</option>
              <option value="incomplete">Incomplete</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          {loading ? (
            <div className="commerce-empty">Checking SEO coverage…</div>
          ) : (
            <div className="commerce-table-wrap">
              <table className="commerce-table seo-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>pageKey</th>
                    <th>Route</th>
                    <th>SEO status</th>
                    <th>Missing</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((item) => {
                    const record = recordByKey.get(item.pageKey);
                    const status = statusLabel(record);
                    const missing = seoMissingFields(record);

                    return (
                      <tr key={item.pageKey}>
                        <td>
                          <strong>{item.label}</strong>
                          <small>{ENTITY_LABELS[item.type]}</small>
                        </td>
                        <td><code>{item.pageKey}</code></td>
                        <td>{item.route}</td>
                        <td>
                          <span
                            className={`commerce-status ${
                              status === "COMPLETE"
                                ? "commerce-status-active"
                                : status === "INCOMPLETE"
                                  ? "commerce-status-pending"
                                  : "commerce-status-rejected"
                            }`}
                          >
                            {status === "COMPLETE" ? (
                              <CheckCircle2 className="inline h-4 w-4" />
                            ) : status === "INCOMPLETE" ? (
                              <AlertTriangle className="inline h-4 w-4" />
                            ) : (
                              <XCircle className="inline h-4 w-4" />
                            )}{" "}
                            {status}
                          </span>
                        </td>
                        <td>
                          <small>
                            {status === "COMPLETE"
                              ? "Nothing"
                              : missing.join(", ")}
                          </small>
                        </td>
                        <td>
                          <button
                            className={status === "NEEDS SEO" ? "commerce-primary seo-action-button" : "seo-action-button"}
                            onClick={() => openCoverageTarget(item)}
                          >
                            {record ? <Pencil /> : <Plus />}
                            {record ? "Edit" : "NEEDS SEO"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="commerce-panel">
          <div className="commerce-panel-head">
            <div>
              <h3>Google product readiness</h3>
              <p className="text-sm text-slate-500">
                Products marked READY have the core data needed by the live Merchant feed. Fix missing fields from Products.
              </p>
            </div>
            <strong>
              {merchantProducts.filter((product) => merchantMissingFields(product).length === 0).length}
              /{merchantProducts.length} ready
            </strong>
          </div>

          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Merchant status</th>
                  <th>Identifiers</th>
                  <th>Google category</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>
                {merchantProducts.map((product) => {
                  const missing = merchantMissingFields(product);
                  return (
                    <tr key={product._id || product.slug || product.title}>
                      <td>
                        <strong>{product.title}</strong>
                        <small>{product.slug || product._id}</small>
                      </td>
                      <td>
                        <span className={`commerce-status ${missing.length ? "commerce-status-pending" : "commerce-status-active"}`}>
                          {missing.length ? "Needs fix" : "Ready"}
                        </span>
                      </td>
                      <td>
                        <small>
                          {product.gtin ? `GTIN: ${product.gtin}` : product.mpn ? `MPN: ${product.mpn}` : "None"}
                        </small>
                      </td>
                      <td>
                        <small>{product.googleProductCategory || "Not added"}</small>
                      </td>
                      <td>
                        <small>{missing.length ? missing.join(", ") : "Nothing"}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="commerce-panel">
          <div className="commerce-panel-head">
            <div>
              <h3>Indexing endpoints</h3>
              <p className="text-sm text-slate-500">
                Deploy status targets used by Google and AI/search engines.
              </p>
            </div>
            <SearchCheck />
          </div>
          <div className="commerce-grid seo-endpoint-grid">
            <div className="commerce-card seo-endpoint-card">
              <span>Sitemap</span>
              <strong>/sitemap.xml</strong>
              <small>Google search discovery and page coverage</small>
            </div>
            <div className="commerce-card seo-endpoint-card">
              <span>Google product feed</span>
              <strong>/google-products.xml</strong>
              <small>Merchant Center product source</small>
            </div>
            <div className="commerce-card seo-endpoint-card">
              <span>AI discovery</span>
              <strong>/llms.txt</strong>
              <small>Supplementary AI/search crawler guidance</small>
            </div>
          </div>
        </section>

        {formOpen && (
          <section className="commerce-panel">
            <div className="commerce-panel-head">
              <h3>{editing ? `Edit ${editing.pageKey}` : "Add SEO"}</h3>
              <SearchCheck />
            </div>

            <form
              className="commerce-form commerce-form-columns seo-form"
              onSubmit={save}
            >
              <label>
                SEO target type
                <select
                  value={entityType}
                  onChange={(event) =>
                    onTypeChange(event.target.value as SeoEntityType)
                  }
                >
                  {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                {ENTITY_LABELS[entityType]}
                <select
                  required
                  value={selectedTargetId}
                  onChange={(event) => setSelectedTargetId(event.target.value)}
                >
                  <option value="">Select target</option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Page key
                <input value={draft.pageKey} readOnly />
              </label>
              <label>
                Route
                <input value={draft.route} readOnly />
              </label>

              <label className="seo-wide">
                SEO title
                <input
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="seo-wide">
                Meta description
                <textarea
                  rows={3}
                  maxLength={500}
                  value={draft.description || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="seo-wide">
                Keywords, comma separated
                <textarea
                  rows={2}
                  value={(draft.keywords || []).join(", ")}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      keywords: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </label>

              <label className="seo-wide">
                Canonical URL
                <input
                  type="url"
                  value={draft.canonicalUrl || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      canonicalUrl: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Robots
                <input
                  value={draft.robots || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      robots: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Open Graph image
                <input
                  type="url"
                  value={draft.ogImage || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ogImage: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Open Graph title
                <input
                  maxLength={120}
                  value={draft.ogTitle || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ogTitle: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Open Graph description
                <textarea
                  maxLength={500}
                  value={draft.ogDescription || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ogDescription: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Twitter title
                <input
                  maxLength={120}
                  value={draft.twitterTitle || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      twitterTitle: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Twitter image
                <input
                  type="url"
                  value={draft.twitterImage || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      twitterImage: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="seo-wide">
                Twitter description
                <textarea
                  maxLength={500}
                  value={draft.twitterDescription || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      twitterDescription: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="seo-wide">
                JSON-LD schema
                <textarea
                  rows={10}
                  spellCheck={false}
                  value={schemaText}
                  onChange={(event) => setSchemaText(event.target.value)}
                />
              </label>

              <label className="seo-active">
                <input
                  type="checkbox"
                  checked={draft.active !== false}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />{" "}
                Publish this SEO configuration
              </label>

              <div className="commerce-form-actions">
                <button type="button" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                {editing?._id && (
                  <button type="button" onClick={() => void toggleActive(editing)}>
                    {editing.active === false ? "Enable" : "Disable"}
                  </button>
                )}
                <button className="commerce-primary" type="submit">
                  <Check /> Save SEO
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </TabInnerContent>
  );
}
