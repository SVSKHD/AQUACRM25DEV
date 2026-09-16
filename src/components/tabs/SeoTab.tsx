import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, SearchCheck } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import {
  seoMappingService,
  STATIC_SEO_PAGES,
  type SeoCatalogItem,
  type SeoEntityType,
  type SeoRecord,
} from "../../services/seoMappingService";

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

export default function SeoTab() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<SeoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SeoRecord | null>(null);
  const [entityType, setEntityType] = useState<SeoEntityType>("static");
  const [catalog, setCatalog] = useState<SeoCatalogItem[]>(STATIC_SEO_PAGES);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [draft, setDraft] = useState<SeoRecord>(blankRecord());
  const [schemaText, setSchemaText] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    const response = await seoMappingService.listSeo(page, search);
    if (response.error) {
      showToast(response.error, "error");
      setLoading(false);
      return;
    }
    setRows(normalizeRows(response));
    setTotalPages(response?.data?.pagination?.totalPages || 1);
    setLoading(false);
  }, [page, search, showToast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const loadCatalog = useCallback(
    async (type: SeoEntityType, pageKeyToSelect = "") => {
      setCatalogLoading(true);
      try {
        const items = await seoMappingService.loadCatalog(type);
        setCatalog(items);
        const matched = items.find((item) => item.pageKey === pageKeyToSelect);
        setSelectedTargetId(matched?.id || "");
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Unable to load SEO targets",
          "error",
        );
        setCatalog([]);
        setSelectedTargetId("");
      } finally {
        setCatalogLoading(false);
      }
    },
    [showToast],
  );

  const openNew = () => {
    setEditing(null);
    setEntityType("static");
    setCatalog(STATIC_SEO_PAGES);
    setSelectedTargetId("");
    setDraft(blankRecord());
    setSchemaText("");
    setFormOpen(true);
  };

  const openEdit = (record: SeoRecord) => {
    const type = inferType(record.pageKey);
    setEditing(record);
    setEntityType(type);
    setDraft({ ...blankRecord(), ...record });
    setSchemaText(record.schemaJson ? JSON.stringify(record.schemaJson, null, 2) : "");
    setFormOpen(true);
    void loadCatalog(type, record.pageKey);
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
        current.canonicalUrl || `https://aquakart.co.in${selectedTarget.route}`,
    }));
  }, [selectedTarget]);

  const onTypeChange = (type: SeoEntityType) => {
    setEntityType(type);
    setSelectedTargetId("");
    setDraft((current) => ({
      ...current,
      pageKey: "",
      route: "",
      canonicalUrl: "",
    }));
    void loadCatalog(type);
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

    showToast(editing ? "SEO configuration updated" : "SEO configuration created", "success");
    setFormOpen(false);
    setEditing(null);
    await loadRows();
  };

  const toggleActive = async (record: SeoRecord) => {
    if (!record._id) return;
    const response = await seoMappingService.updateSeo(record._id, {
      active: record.active === false,
    });
    if (response.error) return showToast(response.error, "error");
    showToast(record.active === false ? "SEO enabled" : "SEO disabled", "success");
    await loadRows();
  };

  return (
    <TabInnerContent
      title="E-commerce SEO"
      description="Map CRM SEO directly to Aquakart Next.js pages using the same backend page keys."
    >
      <div className="commerce-admin">
        <section className="commerce-panel">
          <div className="commerce-panel-head">
            <div>
              <h3>Mapped SEO pages</h3>
              <p className="text-sm text-slate-500">
                Page keys and routes are generated from real ecommerce records and cannot be typed manually.
              </p>
            </div>
            <button className="commerce-primary" onClick={openNew}>
              <Plus /> Create SEO mapping
            </button>
          </div>

          <div className="seo-toolbar">
            <label>
              <span className="sr-only">Search SEO pages</span>
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search page key, route or title"
              />
            </label>
            <button onClick={() => void loadRows()}>
              <RefreshCw /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="commerce-empty">Loading SEO records…</div>
          ) : !rows.length ? (
            <div className="commerce-empty">No SEO records found.</div>
          ) : (
            <div className="commerce-table-wrap">
              <table className="commerce-table seo-table">
                <thead>
                  <tr>
                    <th>Mapping</th>
                    <th>Search preview</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((seo) => (
                    <tr key={seo._id || seo.pageKey}>
                      <td>
                        <strong>{seo.pageKey}</strong>
                        <small>{seo.route}</small>
                        <small>{ENTITY_LABELS[inferType(seo.pageKey)]}</small>
                      </td>
                      <td>
                        <div className="seo-serp-preview">
                          <strong>{seo.title}</strong>
                          <small>{seo.canonicalUrl || seo.route}</small>
                          <p>{seo.description || "No description provided"}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`commerce-status commerce-status-${seo.active === false ? "disabled" : "active"}`}>
                          {seo.active === false ? "disabled" : "active"}
                        </span>
                      </td>
                      <td>
                        <div className="commerce-actions">
                          <button onClick={() => openEdit(seo)}>
                            <Pencil /> Edit
                          </button>
                          <button onClick={() => void toggleActive(seo)}>
                            {seo.active === false ? "Enable" : "Disable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="commerce-pager">
              <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          )}
        </section>

        {formOpen && (
          <section className="commerce-panel">
            <div className="commerce-panel-head">
              <h3>{editing ? `Edit ${editing.pageKey}` : "Create ecommerce SEO"}</h3>
              <SearchCheck />
            </div>
            <form className="commerce-form commerce-form-columns seo-form" onSubmit={save}>
              <label>
                SEO target type
                <select
                  value={entityType}
                  onChange={(event) => onTypeChange(event.target.value as SeoEntityType)}
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
                  disabled={catalogLoading}
                  value={selectedTargetId}
                  onChange={(event) => setSelectedTargetId(event.target.value)}
                >
                  <option value="">
                    {catalogLoading ? "Loading…" : `Select ${ENTITY_LABELS[entityType].toLowerCase()}`}
                  </option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Page key
                <input name="pageKey" value={draft.pageKey} readOnly />
              </label>
              <label>
                Route
                <input name="route" value={draft.route} readOnly />
              </label>

              <label className="seo-wide">
                SEO title
                <input
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label className="seo-wide">
                Meta description
                <textarea
                  rows={3}
                  maxLength={500}
                  value={draft.description || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
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
                      keywords: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                    }))
                  }
                />
              </label>

              <label className="seo-wide">
                Canonical URL
                <input
                  type="url"
                  value={draft.canonicalUrl || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, canonicalUrl: event.target.value }))}
                />
              </label>

              <label>
                Robots
                <input
                  value={draft.robots || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, robots: event.target.value }))}
                />
              </label>
              <label>
                Open Graph image
                <input
                  type="url"
                  value={draft.ogImage || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, ogImage: event.target.value }))}
                />
              </label>
              <label>
                Open Graph title
                <input
                  maxLength={120}
                  value={draft.ogTitle || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, ogTitle: event.target.value }))}
                />
              </label>
              <label>
                Open Graph description
                <textarea
                  maxLength={500}
                  value={draft.ogDescription || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, ogDescription: event.target.value }))}
                />
              </label>
              <label>
                Twitter title
                <input
                  maxLength={120}
                  value={draft.twitterTitle || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, twitterTitle: event.target.value }))}
                />
              </label>
              <label>
                Twitter image
                <input
                  type="url"
                  value={draft.twitterImage || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, twitterImage: event.target.value }))}
                />
              </label>
              <label className="seo-wide">
                Twitter description
                <textarea
                  maxLength={500}
                  value={draft.twitterDescription || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, twitterDescription: event.target.value }))}
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
                  onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
                />{" "}
                Publish this SEO configuration
              </label>

              <div className="commerce-form-actions">
                <button type="button" onClick={() => setFormOpen(false)}>Cancel</button>
                <button className="commerce-primary" type="submit">
                  <Check /> Save SEO mapping
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </TabInnerContent>
  );
}
