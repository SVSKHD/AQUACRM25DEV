import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidInput,
  LiquidPanel,
  LiquidTextarea,
} from "../ui/liquid";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
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

const SEO_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "missing", label: "Needs SEO" },
  { value: "incomplete", label: "Incomplete" },
  { value: "complete", label: "Complete" },
];

const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

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

const normalizeSeoKeywords = (value: string) =>
  [
    ...new Set(
      value
        .split(/[\n\r,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];

const isAbsoluteHttpUrl = (value = "") => {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const validateSeoPayload = (record: SeoRecord) => {
  const errors: string[] = [];
  const keywords = record.keywords || [];

  if (!record.title?.trim()) errors.push("title: required");
  if ((record.title || "").length > 120) {
    errors.push("title: maximum 120 characters");
  }
  if ((record.description || "").length > 500) {
    errors.push("description: maximum 500 characters");
  }
  if (keywords.length > 50) errors.push("keywords: maximum 50 keywords");

  keywords.forEach((keyword, index) => {
    if (keyword.length > 100) {
      errors.push(`keywords[${index + 1}]: maximum 100 characters`);
    }
  });

  if (!isAbsoluteHttpUrl(record.canonicalUrl || "")) {
    errors.push("canonicalUrl: enter a valid http/https URL");
  }
  if (!isAbsoluteHttpUrl(record.ogImage || "")) {
    errors.push("ogImage: enter a valid http/https URL");
  }
  if (!isAbsoluteHttpUrl(record.twitterImage || "")) {
    errors.push("twitterImage: enter a valid http/https URL");
  }

  return errors;
};


const SEO_DRAFT_STORAGE_KEY = "aquacrm:seo-editor-drafts:v1";

type StoredSeoDraft = {
  key: string;
  savedAt: string;
  editingId?: string;
  editingPageKey?: string;
  entityType: SeoEntityType;
  selectedTargetId: string;
  draft: SeoRecord;
  schemaText: string;
};

type StoredSeoDraftCollection = {
  activeKey: string | null;
  drafts: Record<string, StoredSeoDraft>;
};

const emptyDraftCollection = (): StoredSeoDraftCollection => ({
  activeKey: null,
  drafts: {},
});

const readSeoDraftCollection = (): StoredSeoDraftCollection => {
  if (typeof window === "undefined") return emptyDraftCollection();

  try {
    const raw = window.localStorage.getItem(SEO_DRAFT_STORAGE_KEY);
    if (!raw) return emptyDraftCollection();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptyDraftCollection();
    }

    return {
      activeKey:
        typeof parsed.activeKey === "string" ? parsed.activeKey : null,
      drafts:
        parsed.drafts && typeof parsed.drafts === "object"
          ? parsed.drafts
          : {},
    };
  } catch {
    window.localStorage.removeItem(SEO_DRAFT_STORAGE_KEY);
    return emptyDraftCollection();
  }
};

const writeSeoDraftCollection = (collection: StoredSeoDraftCollection) => {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(
      SEO_DRAFT_STORAGE_KEY,
      JSON.stringify(collection),
    );
    return true;
  } catch {
    return false;
  }
};

const seoDraftKey = ({
  editing,
  draft,
  entityType,
  selectedTargetId,
}: {
  editing: SeoRecord | null;
  draft: SeoRecord;
  entityType: SeoEntityType;
  selectedTargetId: string;
}) => {
  if (editing?._id) return `record:${editing._id}`;
  if (draft.pageKey) return `page:${draft.pageKey}`;
  if (selectedTargetId) {
    return `target:${entityType}:${selectedTargetId}`;
  }
  return `new:${entityType}`;
};

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
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const draftRestoreAttemptedRef = useRef(false);
  const activeDraftKeyRef = useRef<string | null>(null);

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


  useEffect(() => {
    if (loading || draftRestoreAttemptedRef.current) return;

    draftRestoreAttemptedRef.current = true;
    const collection = readSeoDraftCollection();
    const activeDraft = collection.activeKey
      ? collection.drafts[collection.activeKey]
      : null;

    if (!activeDraft?.draft) return;

    const restoredType =
      activeDraft.entityType ||
      inferType(activeDraft.draft.pageKey || activeDraft.editingPageKey || "");

    const typeItems = fullCatalog
      .filter((item) => item.type === restoredType)
      .map(({ type: _type, ...item }) => item);

    const restoredCatalog =
      restoredType === "static" && !typeItems.length
        ? STATIC_SEO_PAGES
        : typeItems;

    const restoredTarget =
      restoredCatalog.find(
        (item) =>
          item.id === activeDraft.selectedTargetId ||
          item.pageKey === activeDraft.draft.pageKey,
      ) || null;

    const restoredEditing =
      records.find(
        (record) =>
          (activeDraft.editingId && record._id === activeDraft.editingId) ||
          (activeDraft.editingPageKey &&
            record.pageKey === activeDraft.editingPageKey),
      ) || null;

    setEntityType(restoredType);
    setCatalog(restoredCatalog);
    setSelectedTargetId(
      restoredTarget?.id || activeDraft.selectedTargetId || "",
    );
    setDraft({
      ...blankRecord(),
      ...activeDraft.draft,
    });
    setSchemaText(activeDraft.schemaText || "");
    setEditing(restoredEditing);
    setDraftSavedAt(activeDraft.savedAt || null);
    activeDraftKeyRef.current = activeDraft.key;
    setFormOpen(true);

    showToast("Unsaved SEO draft restored", "success");
  }, [fullCatalog, loading, records, showToast]);

  useEffect(() => {
    if (!formOpen || !draftRestoreAttemptedRef.current) return;

    const key = seoDraftKey({
      editing,
      draft,
      entityType,
      selectedTargetId,
    });
    const savedAt = new Date().toISOString();
    const collection = readSeoDraftCollection();

    collection.activeKey = key;
    collection.drafts[key] = {
      key,
      savedAt,
      editingId: editing?._id,
      editingPageKey: editing?.pageKey,
      entityType,
      selectedTargetId,
      draft,
      schemaText,
    };

    writeSeoDraftCollection(collection);
    activeDraftKeyRef.current = key;
    setDraftSavedAt(savedAt);
  }, [
    draft,
    editing,
    entityType,
    formOpen,
    schemaText,
    selectedTargetId,
  ]);

  const clearCurrentSeoDraft = () => {
    const collection = readSeoDraftCollection();
    const key =
      activeDraftKeyRef.current ||
      seoDraftKey({
        editing,
        draft,
        entityType,
        selectedTargetId,
      });

    const aliases = new Set([
      key,
      editing?._id ? `record:${editing._id}` : "",
      draft.pageKey ? `page:${draft.pageKey}` : "",
      selectedTargetId
        ? `target:${entityType}:${selectedTargetId}`
        : "",
      `new:${entityType}`,
    ]);

    aliases.forEach((alias) => {
      if (alias) delete collection.drafts[alias];
    });

    if (collection.activeKey && aliases.has(collection.activeKey)) {
      collection.activeKey = null;
    }

    writeSeoDraftCollection(collection);
    activeDraftKeyRef.current = null;
    setDraftSavedAt(null);
  };

  const discardAndClose = () => {
    clearCurrentSeoDraft();
    setFormOpen(false);
    setEditing(null);
    setDraft(blankRecord());
    setSchemaText("");
    setSelectedTargetId("");
  };


  const activateStoredDraft = (
    storedDraft: StoredSeoDraft,
    editingRecord: SeoRecord | null,
  ) => {
    const restoredType =
      storedDraft.entityType ||
      inferType(
        storedDraft.draft.pageKey ||
          editingRecord?.pageKey ||
          storedDraft.editingPageKey ||
          "",
      );

    setEditing(editingRecord);
    setDraft({
      ...blankRecord(),
      ...storedDraft.draft,
    });
    setSchemaText(storedDraft.schemaText || "");
    setDraftSavedAt(storedDraft.savedAt || null);
    activeDraftKeyRef.current = storedDraft.key;
    setTargetType(
      restoredType,
      storedDraft.draft.pageKey ||
        editingRecord?.pageKey ||
        storedDraft.editingPageKey ||
        "",
    );

    if (storedDraft.selectedTargetId) {
      setSelectedTargetId(storedDraft.selectedTargetId);
    }

    const collection = readSeoDraftCollection();
    collection.activeKey = storedDraft.key;
    writeSeoDraftCollection(collection);

    setFormOpen(true);
    showToast("Unsaved SEO draft restored", "success");
  };

  const openNew = () => {
    setEditing(null);
    setDraft(blankRecord());
    setSchemaText("");
    setDraftSavedAt(null);
    activeDraftKeyRef.current = null;
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

    const collection = readSeoDraftCollection();
    const storedDraft = collection.drafts[`page:${item.pageKey}`];

    if (storedDraft?.draft) {
      activateStoredDraft(storedDraft, null);
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
    setDraftSavedAt(null);
    activeDraftKeyRef.current = null;
    setFormOpen(true);
    setTargetType(item.type, item.pageKey);
  };

  const openEdit = (record: SeoRecord) => {
    const collection = readSeoDraftCollection();
    const storedDraft =
      (record._id
        ? collection.drafts[`record:${record._id}`]
        : undefined) ||
      collection.drafts[`page:${record.pageKey}`];

    if (storedDraft?.draft) {
      activateStoredDraft(storedDraft, record);
      return;
    }

    const type = inferType(record.pageKey);
    setEditing(record);
    setDraft({ ...blankRecord(), ...record });
    setSchemaText(
      record.schemaJson ? JSON.stringify(record.schemaJson, null, 2) : "",
    );
    setDraftSavedAt(null);
    activeDraftKeyRef.current = null;
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
      pageKey: selectedTarget.pageKey,
      route: selectedTarget.route,
      title: draft.title.trim(),
      description: (draft.description || "").trim(),
      keywords: Array.isArray(draft.keywords)
        ? [...new Set(draft.keywords.map((item) => item.trim()).filter(Boolean))]
        : [],
      canonicalUrl: (draft.canonicalUrl || "").trim(),
      robots: (draft.robots || "").trim(),
      ogTitle: (draft.ogTitle || "").trim(),
      ogDescription: (draft.ogDescription || "").trim(),
      ogImage: (draft.ogImage || "").trim(),
      twitterTitle: (draft.twitterTitle || "").trim(),
      twitterDescription: (draft.twitterDescription || "").trim(),
      twitterImage: (draft.twitterImage || "").trim(),
      schemaJson,
      active: draft.active !== false,
    };

    const validationErrors = validateSeoPayload(payload);
    if (validationErrors.length) {
      showToast(`SEO validation failed: ${validationErrors.join(" • ")}`, "error");
      return;
    }

    const response = editing?._id
      ? await seoMappingService.updateSeo(editing._id, payload)
      : await seoMappingService.createSeo(payload);

    if (response.error) {
      const details = response.errors || [];
      const detailText = details
        .map((item) => `${item.field ? `${item.field}: ` : ""}${item.message}`)
        .filter(Boolean);
      const message = [response.error, ...detailText]
        .filter((item, index, items) => item && items.indexOf(item) === index)
        .join(" • ");
      showToast(message, "error");
      return;
    }

    showToast(
      editing ? "SEO configuration updated" : "SEO configuration created",
      "success",
    );
    clearCurrentSeoDraft();
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
              <LiquidButton type="button" variant="soft" onClick={() => void loadData()}>
                <RefreshCw /> Refresh
              </LiquidButton>
              <LiquidButton type="button" variant="primary" onClick={openNew}>
                <Plus /> Add SEO
              </LiquidButton>
            </div>
          </div>

          <div className="seo-summary-grid">
            <LiquidButton
              type="button"
              variant="ghost"
              className={`commerce-card seo-summary-card ${filter === "all" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("all")}
            >
              <span>Total pages</span>
              <strong>{summary.total}</strong>
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="ghost"
              className={`commerce-card seo-summary-card seo-summary-complete ${filter === "complete" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("complete")}
            >
              <span>Complete</span>
              <strong>{summary.complete}</strong>
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="ghost"
              className={`commerce-card seo-summary-card seo-summary-incomplete ${filter === "incomplete" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("incomplete")}
            >
              <span>Incomplete</span>
              <strong>{summary.incomplete}</strong>
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="ghost"
              className={`commerce-card seo-summary-card seo-summary-missing ${filter === "missing" ? "seo-summary-card-active" : ""}`}
              onClick={() => setFilter("missing")}
            >
              <span>Needs SEO</span>
              <strong>{summary.missing}</strong>
            </LiquidButton>
          </div>

          <div className="seo-toolbar">
            <div className="seo-search-field">
              <SearchCheck aria-hidden="true" />
              <LiquidInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search page, pageKey or route"
                aria-label="Search SEO coverage"
              />
            </div>
            <LiquidDropdown
              value={filter}
              options={SEO_STATUS_OPTIONS}
              onChange={(value) => setFilter(value as typeof filter)}
              ariaLabel="Filter SEO status"
            />
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
                          <LiquidButton
                            type="button"
                            variant={status === "NEEDS SEO" ? "primary" : "soft"}
                            className="seo-action-button"
                            onClick={() => openCoverageTarget(item)}
                          >
                            {record ? <Pencil /> : <Plus />}
                            {record ? "Edit" : "NEEDS SEO"}
                          </LiquidButton>
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

        <ResizableFloatingSidebar
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editing ? "Edit SEO configuration" : "Add SEO configuration"}
          subtitle={
            selectedTarget
              ? `${selectedTarget.label} · ${selectedTarget.route}`
              : "Choose the ecommerce page and complete its search metadata"
          }
          widthStorageKey="aquacrm:seo-editor-width"
          initialWidth={760}
          minWidth={520}
          maxWidth={1080}
        >
          <form className="space-y-5" onSubmit={save}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span className="text-xs font-bold text-emerald-100">
                  Draft auto-saves in this browser
                </span>
              </div>
              <span className="text-[11px] text-white/40">
                {draftSavedAt
                  ? `Saved ${new Date(draftSavedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Saving locally…"}
              </span>
            </div>

            <LiquidPanel className="p-5">
              <div className="mb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-300">
                  SEO target
                </p>
                <h3 className="mt-1 text-base font-black text-white">
                  Select the page this metadata belongs to
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Product, category, blog and static-page SEO all use the same
                  editor.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <LiquidDropdown
                  label="SEO target type"
                  value={entityType}
                  options={ENTITY_TYPE_OPTIONS}
                  onChange={(value) =>
                    onTypeChange(value as SeoEntityType)
                  }
                />

                <LiquidDropdown
                  label={ENTITY_LABELS[entityType]}
                  value={selectedTargetId}
                  options={[
                    { value: "", label: "Select target" },
                    ...catalog.map((item) => ({
                      value: item.id,
                      label: item.label,
                    })),
                  ]}
                  onChange={setSelectedTargetId}
                />

                <LiquidInput label="Page key" value={draft.pageKey} readOnly />
                <LiquidInput label="Route" value={draft.route} readOnly />
              </div>

              {selectedTarget && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-bold text-white">
                    {selectedTarget.label}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-white/45">
                    {draft.canonicalUrl ||
                      `https://aquakart.co.in${selectedTarget.route}`}
                  </p>
                </div>
              )}
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <div className="mb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                  Search result
                </p>
                <h3 className="mt-1 text-base font-black text-white">
                  Core search metadata
                </h3>
              </div>

              <div className="space-y-4">
                <LiquidInput
                  label="SEO title"
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

                <div>
                  <LiquidTextarea
                    label="Meta description"
                    rows={4}
                    maxLength={500}
                    value={draft.description || ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                  <p className="mt-1 text-right text-[10px] font-semibold text-white/35">
                    {(draft.description || "").length}/500
                  </p>
                </div>

                <LiquidTextarea
                  label={`Keywords — comma or one per line (${draft.keywords?.length || 0}/50)`}
                  rows={5}
                  value={(draft.keywords || []).join("\n")}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      keywords: normalizeSeoKeywords(event.target.value),
                    }))
                  }
                />

                <LiquidInput
                  label="Canonical URL"
                  type="url"
                  value={draft.canonicalUrl || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      canonicalUrl: event.target.value,
                    }))
                  }
                />

                <LiquidInput
                  label="Robots"
                  value={draft.robots || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      robots: event.target.value,
                    }))
                  }
                  placeholder="index,follow"
                />
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <div className="mb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">
                  Social sharing
                </p>
                <h3 className="mt-1 text-base font-black text-white">
                  Open Graph & Twitter
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Control how this page appears when customers share it.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <LiquidInput
                  label="Open Graph title"
                  maxLength={120}
                  value={draft.ogTitle || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ogTitle: event.target.value,
                    }))
                  }
                />

                <LiquidInput
                  label="Open Graph image"
                  type="url"
                  value={draft.ogImage || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ogImage: event.target.value,
                    }))
                  }
                />

                <LiquidTextarea
                  label="Open Graph description"
                  wrapperClassName="md:col-span-2"
                  rows={3}
                  maxLength={500}
                  value={draft.ogDescription || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ogDescription: event.target.value,
                    }))
                  }
                />

                <LiquidInput
                  label="Twitter title"
                  maxLength={120}
                  value={draft.twitterTitle || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      twitterTitle: event.target.value,
                    }))
                  }
                />

                <LiquidInput
                  label="Twitter image"
                  type="url"
                  value={draft.twitterImage || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      twitterImage: event.target.value,
                    }))
                  }
                />

                <LiquidTextarea
                  label="Twitter description"
                  wrapperClassName="md:col-span-2"
                  rows={3}
                  maxLength={500}
                  value={draft.twitterDescription || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      twitterDescription: event.target.value,
                    }))
                  }
                />
              </div>
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <div className="mb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">
                  Structured data
                </p>
                <h3 className="mt-1 text-base font-black text-white">
                  JSON-LD schema
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Paste a valid JSON object. Invalid JSON is blocked before save.
                </p>
              </div>

              <LiquidTextarea
                label="JSON-LD schema"
                name="schemaJson"
                rows={14}
                spellCheck={false}
                value={schemaText}
                onChange={(event) => setSchemaText(event.target.value)}
                className="font-mono text-xs"
              />
            </LiquidPanel>

            <LiquidPanel className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">
                    Publishing status
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Disabled SEO records stay saved but are not treated as
                    published configuration.
                  </p>
                </div>

                <LiquidCheckbox
                  label="Publish this SEO configuration"
                  checked={draft.active !== false}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
              </div>
            </LiquidPanel>

            <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-xl">
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => setFormOpen(false)}
              >
                Close
              </LiquidButton>

              <LiquidButton
                type="button"
                variant="danger"
                onClick={discardAndClose}
              >
                Discard draft
              </LiquidButton>

              {editing?._id && (
                <LiquidButton
                  type="button"
                  variant={editing.active === false ? "primary" : "danger"}
                  onClick={() => void toggleActive(editing)}
                >
                  {editing.active === false ? "Enable" : "Disable"}
                </LiquidButton>
              )}

              <LiquidButton variant="primary" type="submit">
                <Check />
                Save SEO
              </LiquidButton>
            </div>
          </form>
        </ResizableFloatingSidebar>

      </div>
    </TabInnerContent>
  );
}
