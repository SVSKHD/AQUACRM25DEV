import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Edit2,
  Eye,
  FileDown,
  FileText,
  ListChecks,
  Mail,
  MessageCircle,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserCheck,
  UserRound,
  UserX,
  XCircle,
} from "lucide-react";
import {
  DELIVERY_LABELS,
  ENRICHMENT_LABELS,
  PAID_LABELS,
  deliveryStatusOf,
  enrichmentStatusOf,
  paidStatusOf,
  type DeliveryStatus,
  type EnrichmentStatus,
  type PaidStatus,
} from "../../utils/invoiceStatus";
import { invoicesService, productsService } from "../../services/apiService";
import priceUtils from "../../utils/priceUtils";
import { downloadPublicInvoicePdf } from "../../utils/invoicePdf";
import {
  getAdminInvoicePath,
  resolvePersistedInvoiceId,
} from "../../utils/invoiceViews";
import {
  downloadInvoicesExcel,
  downloadInvoicesPdf,
  getInvoiceLinksText,
} from "../../utils/invoiceBulkExports";
import { useToast } from "../Toast";
import TabInnerContent from "../Layout/tabInnerlayout";
import AquaGenericTable, {
  AquaTableAction,
  AquaTableColumn,
} from "../modular/invoices/invoiceTable";
import AquaInvoiceFormDialog from "../modular/invoices/invoiceDialog";
import AquaInvoiceViewDialog from "../modular/invoices/invoiceView";
import InvoiceBackfillPanel from "../modular/invoices/InvoiceBackfillPanel";
import {
  DbProduct,
  Invoice,
  InvoiceTypeFilter,
  Product,
} from "../modular/invoices/invoice.types";
import {
  mapInvoiceFromApi,
  parseInvoiceDate,
} from "../modular/invoices/mapInvoice";
import {
  LiquidBadge,
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidIconButton,
  LiquidInput,
  LiquidPanel,
} from "../ui/liquid";

const initialFormData = {
  invoice_no: "",
  date: new Date().toISOString().split("T")[0],
  customer_name: "",
  customer_phone: 0,
  customer_email: "",
  customer_address: "",
  gst: false,
  po: false,
  quotation: false,
  gst_name: "",
  gst_no: "",
  gst_phone: "",
  gst_email: "",
  gst_address: "",
  products: [] as Product[],
  delivered_by: "",
  delivery_date: "",
  paid_status: "unpaid",
  payment_type: "cash",
  aquakart_online_user: false,
  aquakart_invoice: false,
};

const initialProductForm = {
  productName: "",
  productQuantity: 1,
  productPrice: 0,
  productSerialNo: "",
  productId: "",
  productSlug: "",
  productLink: "",
};

const months = [
  { value: "all", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const invoiceTypeOptions = [
  { value: "all", label: "All Invoices" },
  { value: "gst", label: "GST Invoices" },
  { value: "no-gst", label: "No GST" },
  { value: "po", label: "PO Invoices" },
];

const manualProducts: DbProduct[] = [
  { name: "Crompton 1 hp", price: 12000, id: "crompton-1-hp", sku: null },
  {
    name: "Kent Automatic Sandfilter",
    price: 15000,
    id: "kent-auto-sandfilter",
    sku: null,
  },
  { name: "Crompton 0.5 hp", price: 8000, id: "crompton-0-5-hp", sku: null },
  { name: "Racold Heat pump", price: 12000, id: "racold-heat-pump", sku: null },
  {
    name: "Plumbing-services",
    price: 1000,
    id: "plumbing-services",
    sku: null,
  },
];

const TONES = {
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  bad: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  muted: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
};

type StatusMeta = { icon: typeof CheckCircle; className: string };

const paidMeta: Record<PaidStatus, StatusMeta> = {
  paid: { icon: CheckCircle, className: TONES.good },
  partial: { icon: Clock, className: TONES.warn },
  unpaid: { icon: XCircle, className: TONES.bad },
};

const deliveryMeta: Record<DeliveryStatus, StatusMeta> = {
  delivered: { icon: PackageCheck, className: TONES.good },
  scheduled: { icon: CalendarClock, className: TONES.info },
  assigned: { icon: Truck, className: TONES.warn },
  pending: { icon: PackageX, className: TONES.muted },
};

const enrichmentMeta: Record<EnrichmentStatus, StatusMeta> = {
  enriched: { icon: UserCheck, className: TONES.good },
  "not-enriched": { icon: UserX, className: TONES.muted },
};

const PAID_ORDER: PaidStatus[] = ["paid", "partial", "unpaid"];
const DELIVERY_ORDER: DeliveryStatus[] = [
  "delivered",
  "scheduled",
  "assigned",
  "pending",
];
const ENRICHMENT_ORDER: EnrichmentStatus[] = ["enriched", "not-enriched"];
/** Line items listed per row/card before collapsing into "+N more". */
const ITEMS_SHOWN = 3;
const LONG_PRESS_MS = 450;

function formatAmount(value: number) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value)
    : "₹0";
}

function formatDate(value?: string | null) {
  const parsed = parseInvoiceDate(value);
  return parsed ? parsed.toLocaleDateString("en-IN") : "—";
}

function normalizePrice(value: any) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const cleaned = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(cleaned) ? cleaned : 0;
}

export default function InvoicesTab() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const deliveryInFlight = useRef(new Set<string>());
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [invoiceRequestState, setInvoiceRequestState] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [invoiceRequestError, setInvoiceRequestError] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [availableProducts, setAvailableProducts] = useState<DbProduct[]>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(
    new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number | "all">(
    new Date().getFullYear(),
  );
  const [invoiceTypeFilter, setInvoiceTypeFilter] =
    useState<InvoiceTypeFilter>("all");
  const [invoiceSourceFilter, setInvoiceSourceFilter] = useState<
    "current" | "migrated" | "all"
  >("current");
  const [openedFilter, setOpenedFilter] = useState("all");
  const [enrichedFilter, setEnrichedFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState<PaidStatus | "all">("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | "all">(
    "all",
  );
  // Checkboxes and the bulk bar appear only while selecting (Select button or long-press).
  const [selectMode, setSelectMode] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [formData, setFormData] = useState({ ...initialFormData });
  const [productForm, setProductForm] = useState({ ...initialProductForm });
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(
    null,
  );
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(
    new Set(),
  );

  const fetchInvoices = async ({
    withLoading = true,
  }: { withLoading?: boolean } = {}) => {
    if (withLoading) setLoading(true);
    try {
      const { data, error } = await invoicesService.getAll();
      if (error) {
        setInvoices([]);
        return;
      }
      const rawInvoices = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];
      setInvoices(
        rawInvoices
          .map(mapInvoiceFromApi)
          .filter((invoice: Invoice) => Boolean(invoice.id)),
      );
    } finally {
      if (withLoading) setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await productsService.getAll();
    if (error || !data) {
      setAvailableProducts(manualProducts);
      return;
    }
    const payload = data as any;
    const candidates = [
      payload?.data?.products,
      payload?.data?.data,
      payload?.data,
      payload?.products,
      payload,
    ];
    const rawProducts = candidates.find((item) => Array.isArray(item)) || [];
    const normalized: DbProduct[] = rawProducts
      .map((p: any, index: number) => {
        const discountedPrice =
          p.discountPriceStatus || p.discount_price_status
            ? (p.discountPrice ?? p.discount_price)
            : undefined;
        return {
          id: p.id ?? p._id ?? p.product_id ?? p.sku ?? `product-${index}`,
          name: p.name ?? p.title ?? p.product_name ?? p.productName ?? "",
          price: normalizePrice(
            discountedPrice ??
              p.price ??
              p.selling_price ??
              p.salePrice ??
              p.mrp ??
              0,
          ),
          dpPrice: p.dpPrice || 0,
          sku: p.sku ?? p.sku_code ?? p.skuCode ?? p.code ?? null,
          slug: p.slug ?? p.seoSlug ?? null,
          link: p.productLink ?? p.link ?? null,
        };
      })
      .filter((product: DbProduct) => product.name);
    setAvailableProducts([...normalized, ...manualProducts]);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetchInvoices({ withLoading: false }),
        fetchProducts(),
      ]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const draft = localStorage.getItem("invoiceDraft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.formData)
          setFormData({ ...initialFormData, ...parsed.formData });
        if (parsed.productForm)
          setProductForm({ ...initialProductForm, ...parsed.productForm });
      } catch (error) {
        console.error("Failed to parse saved draft", error);
      }
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    localStorage.setItem(
      "invoiceDraft",
      JSON.stringify({ formData, productForm }),
    );
  }, [formData, productForm, draftHydrated]);

  // Period, type, source and opened narrow the set the status chips count.
  const periodInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const date = parseInvoiceDate(invoice.date);
      const monthOk =
        selectedMonth === "all" ||
        Boolean(date && date.getMonth() + 1 === selectedMonth);
      const yearOk =
        selectedYear === "all" ||
        Boolean(date && date.getFullYear() === selectedYear);
      const typeOk =
        invoiceTypeFilter === "all" ||
        (invoiceTypeFilter === "gst" && invoice.gst) ||
        (invoiceTypeFilter === "no-gst" && !invoice.gst) ||
        (invoiceTypeFilter === "po" && invoice.po);
      const sourceOk =
        invoiceSourceFilter === "all" ||
        (invoiceSourceFilter === "current" && !invoice.migrated) ||
        (invoiceSourceFilter === "migrated" && invoice.migrated);
      const opened = invoice.invoice_open_count > 0;
      const openedOk =
        openedFilter === "all" ||
        (openedFilter === "opened" && opened) ||
        (openedFilter === "not-opened" && !opened);
      return monthOk && yearOk && typeOk && sourceOk && openedOk;
    });
  }, [
    invoices,
    selectedMonth,
    selectedYear,
    invoiceTypeFilter,
    invoiceSourceFilter,
    openedFilter,
  ]);

  // The status chips (paid, delivery, enriched) filter on top of the period set.
  const filteredInvoices = useMemo(
    () =>
      periodInvoices.filter((invoice) => {
        const enrichedOk =
          enrichedFilter === "all" ||
          (enrichedFilter === "enriched" && invoice.invoice_login_linked) ||
          (enrichedFilter === "pending" && !invoice.invoice_login_linked);
        return (
          enrichedOk &&
          (paidFilter === "all" || paidStatusOf(invoice) === paidFilter) &&
          (deliveryFilter === "all" ||
            deliveryStatusOf(invoice) === deliveryFilter)
        );
      }),
    [periodInvoices, enrichedFilter, paidFilter, deliveryFilter],
  );

  const statusSummary = useMemo(() => {
    type Bucket = { count: number; amount: number };
    const buckets = <S extends string>(order: S[]) =>
      Object.fromEntries(
        order.map((key) => [key, { count: 0, amount: 0 }]),
      ) as Record<S, Bucket>;
    const paid = buckets(PAID_ORDER);
    const delivery = buckets(DELIVERY_ORDER);
    const enrichment = buckets(ENRICHMENT_ORDER);
    periodInvoices.forEach((invoice) => {
      const amount = Number(invoice.total_amount) || 0;
      [
        paid[paidStatusOf(invoice)],
        delivery[deliveryStatusOf(invoice)],
        enrichment[enrichmentStatusOf(invoice)],
      ].forEach((bucket) => {
        bucket.count += 1;
        bucket.amount += amount;
      });
    });
    return { paid, delivery, enrichment };
  }, [periodInvoices]);

  // The Enriched chips drive main's existing enrichedFilter ("enriched" / "pending").
  const enrichmentChipValue: EnrichmentStatus | "all" =
    enrichedFilter === "enriched"
      ? "enriched"
      : enrichedFilter === "pending"
        ? "not-enriched"
        : "all";
  const setEnrichmentChip = (value: EnrichmentStatus | "all") =>
    setEnrichedFilter(
      value === "enriched"
        ? "enriched"
        : value === "not-enriched"
          ? "pending"
          : "all",
    );
  const statusFiltersActive =
    paidFilter !== "all" ||
    deliveryFilter !== "all" ||
    enrichedFilter !== "all";
  const clearStatusFilters = () => {
    setPaidFilter("all");
    setDeliveryFilter("all");
    setEnrichedFilter("all");
  };

  const searchedInvoices = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();
    if (!search) return filteredInvoices;

    // Search is intentionally global across every loaded invoice. The regular
    // month/year/source filters remain useful for browsing, but they should not
    // hide a matching invoice when the user knows a customer, phone, GST,
    // invoice number, product, amount, or other invoice detail.
    return invoices.filter((invoice) => {
      const invoiceDate = formatDate(invoice.date);
      const deliveryDate = formatDate(invoice.delivery_date);
      const searchableText = [
        invoice.id,
        invoice.invoice_no,
        invoiceDate,
        invoice.date,
        invoice.customer_name,
        invoice.customer_phone,
        invoice.customer_email,
        invoice.customer_address,
        invoice.gst ? "gst gst invoice with gst" : "no gst non gst without gst",
        invoice.po ? "po purchase order" : "",
        invoice.quotation ? "quotation quote" : "",
        invoice.gst_no,
        invoice.gst_name,
        invoice.gst_phone,
        invoice.gst_email,
        invoice.gst_address,
        invoice.paid_status,
        invoice.payment_type,
        invoice.total_amount,
        formatAmount(Number(invoice.total_amount) || 0),
        invoice.delivered_by,
        deliveryDate,
        invoice.delivery_date,
        invoice.aquakart_online_user ? "online user" : "offline user",
        invoice.aquakart_invoice ? "aquakart invoice" : "",
        invoice.invoice_login_linked
          ? "enriched linked"
          : "pending not enriched",
        invoice.invoice_open_count > 0
          ? "opened customer opened"
          : "not opened",
        invoice.invoice_open_count,
        invoice.invoice_last_opened_at,
        invoice.migrated ? "migrated" : "current",
        invoice.migration_reviewed
          ? "migration reviewed reviewed"
          : "migration pending",
        invoice.created_at,
        ...invoice.products.flatMap((product) => [
          product.productName,
          product.productSerialNo,
          product.productId,
          product.productSlug,
          product.productLink,
          product.productQuantity,
          product.productPrice,
          formatAmount(Number(product.productPrice) || 0),
        ]),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [invoices, filteredInvoices, invoiceSearch]);

  const selectedInvoices = useMemo(
    () => invoices.filter((invoice) => selectedInvoiceIds.has(invoice.id)),
    [invoices, selectedInvoiceIds],
  );

  const allFilteredInvoicesSelected =
    searchedInvoices.length > 0 &&
    searchedInvoices.every((invoice) => selectedInvoiceIds.has(invoice.id));

  const toggleAllFilteredInvoices = () => {
    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      searchedInvoices.forEach((invoice) => {
        if (allFilteredInvoicesSelected) next.delete(invoice.id);
        else next.add(invoice.id);
      });
      return next;
    });
  };

  const toggleInvoiceSelection = (invoiceId: string) =>
    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedInvoiceIds(new Set());
  };

  // Esc leaves selection mode, unless a dialog or sidebar is open (it handles Esc itself).
  useEffect(() => {
    if (!selectMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"]')) return;
      setSelectMode(false);
      setSelectedInvoiceIds(new Set());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectMode]);

  useEffect(() => {
    const availableIds = new Set(invoices.map((invoice) => invoice.id));
    setSelectedInvoiceIds((current) => {
      const next = new Set(
        Array.from(current).filter((invoiceId) => availableIds.has(invoiceId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [invoices]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const set = new Set<number>();
    invoices.forEach((invoice) => {
      const date = parseInvoiceDate(invoice.date);
      if (date) set.add(date.getFullYear());
    });
    for (let i = 0; i < 5; i++) set.add(current - i);
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices]);

  const yearOptions = [
    { value: "all", label: "All Years" },
    ...years.map((year) => ({ value: String(year), label: String(year) })),
  ];

  const totalValue = filteredInvoices.reduce(
    (total, invoice) => total + invoice.total_amount,
    0,
  );
  const totalInvoices = filteredInvoices.length;
  const openedInvoices = filteredInvoices.filter(
    (invoice) => invoice.invoice_open_count > 0,
  ).length;
  const enrichedInvoices = filteredInvoices.filter(
    (invoice) => invoice.invoice_login_linked,
  ).length;
  const migratedInvoices = invoices.filter((invoice) => invoice.migrated);
  const migratedReviewedInvoices = migratedInvoices.filter(
    (invoice) => invoice.migration_reviewed,
  ).length;
  const currentInvoiceCount = invoices.length - migratedInvoices.length;
  const averageSale = totalInvoices > 0 ? totalValue / totalInvoices : 0;
  const outstandingValue = filteredInvoices.reduce(
    (total, invoice) =>
      paidStatusOf(invoice) === "paid"
        ? total
        : total + (Number(invoice.total_amount) || 0),
    0,
  );
  const profitOnSales = filteredInvoices.reduce((totalProfit, invoice) => {
    return (
      totalProfit +
      invoice.products.reduce((invoiceProfit, item) => {
        const product = availableProducts.find(
          (p) => p.name.toLowerCase() === item.productName.toLowerCase(),
        );
        return invoiceProfit + (item.productPrice - (product?.dpPrice || 0));
      }, 0)
    );
  }, 0);

  const calculateTotal = (products: Product[]) =>
    products.reduce((sum, product) => sum + product.productPrice, 0);

  const buildApiPayload = (base: typeof formData, total: number) => ({
    invoiceNo: base.invoice_no,
    date: base.date,
    customerDetails: {
      name: base.customer_name,
      phone: base.customer_phone,
      email: base.customer_email,
      address: base.customer_address,
    },
    gst: base.gst,
    po: base.po,
    quotation: base.quotation,
    gstDetails: {
      gstName: base.gst_name,
      gstNo: base.gst_no,
      gstPhone: base.gst_phone,
      gstEmail: base.gst_email,
      gstAddress: base.gst_address,
    },
    products: base.products.map((p) => ({
      productName: p.productName,
      productQuantity: p.productQuantity,
      productPrice: p.productPrice,
      productSerialNo: p.productSerialNo,
      productId: p.productId || undefined,
      productSlug: p.productSlug || undefined,
      productLink: p.productLink || undefined,
    })),
    transport: {
      deliveredBy: base.delivered_by,
      deliveryDate: base.delivery_date || null,
    },
    paidStatus: base.paid_status,
    paymentType: base.payment_type,
    aquakartOnlineUser: base.aquakart_online_user,
    aquakartInvoice: base.aquakart_invoice,
    total_amount: total,
  });

  const resetForm = () => {
    setInvoiceRequestState("idle");
    setInvoiceRequestError("");
    setEditingProductIndex(null);
    setProductForm({ ...initialProductForm });
    setFormData({ ...initialFormData });
    setEditingInvoice(null);
    localStorage.removeItem("invoiceDraft");
    setShowModal(false);
  };

  const clearDraft = () => {
    setEditingProductIndex(null);
    setProductForm({ ...initialProductForm });
    setFormData({ ...initialFormData });
    setEditingInvoice(null);
    localStorage.removeItem("invoiceDraft");
  };

  const isDraftDirty = useMemo(() => {
    return Boolean(
      formData.invoice_no ||
      formData.customer_name ||
      formData.customer_phone ||
      formData.customer_email ||
      formData.customer_address ||
      formData.gst ||
      formData.po ||
      formData.gst_name ||
      formData.gst_no ||
      formData.products.length ||
      productForm.productName ||
      productForm.productPrice > 0,
    );
  }, [formData, productForm]);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (invoiceRequestState === "loading") return;
    setInvoiceRequestState("loading");
    setInvoiceRequestError("");
    const total = calculateTotal(formData.products);
    const payload = buildApiPayload(formData, total);

    try {
      if (editingInvoice) {
        const { data, error } = await invoicesService.update(
          editingInvoice.id,
          payload,
        );
        if (error) throw error;
        const updated = (data as any)?.data ?? data;
        if (editingInvoice.migrated) {
          showToast(
            updated?.migrationReviewed
              ? "Migrated invoice reviewed. Invoice and service automations are now enabled."
              : "Migrated invoice saved. Link every product to a current AquaKart product to enable automations.",
            "success",
          );
        } else {
          showToast("Invoice updated successfully", "success");
        }
      } else {
        const { data, error } = await invoicesService.create(payload);
        if (error) throw error;
        const created = (data as any)?.data ?? data;
        const id = resolvePersistedInvoiceId(created);
        if (!id)
          throw new Error("Created invoice did not return a persisted ID");
        const verifiedResponse = await invoicesService.fetchAdminView(id);
        if (verifiedResponse.error || !verifiedResponse.data) {
          throw new Error(
            verifiedResponse.error || "Created invoice could not be verified",
          );
        }
        const createdInvoice = mapInvoiceFromApi(verifiedResponse.data);
        setInvoices((current) => [
          createdInvoice,
          ...current.filter((invoice) => invoice.id !== id),
        ]);
        setViewingInvoice(createdInvoice);
        setShowViewModal(true);

        const whatsappDelivery = (created as any)?.whatsappDelivery;
        if (whatsappDelivery?.sent || whatsappDelivery?.duplicate) {
          showToast(
            whatsappDelivery?.channel === "sms"
              ? `Invoice created. WhatsApp failed, so SMS was sent to ${createdInvoice.customer_phone}`
              : `Invoice created and sent on WhatsApp to ${createdInvoice.customer_phone}`,
            "success",
          );
        } else if (whatsappDelivery?.attempted) {
          showToast(
            whatsappDelivery.message
              ? `Invoice created. WhatsApp failed: ${whatsappDelivery.message}`
              : "Invoice created, but WhatsApp delivery failed",
            "error",
          );
        } else {
          showToast("Invoice created and ready to open", "success");
        }
      }
      if (editingInvoice) await fetchInvoices();
      setInvoiceRequestState("success");
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error || "Failed to save invoice");
      setInvoiceRequestState("error");
      setInvoiceRequestError(message);
      showToast(message, "error");
    }
  };

  const handleWhatsAppSend = async (invoice: Invoice) => {
    const id = resolvePersistedInvoiceId(invoice);
    if (!id) {
      showToast("Invoice ID is missing", "error");
      return;
    }
    const deliveryKey = `${id}:whatsapp`;
    if (deliveryInFlight.current.has(deliveryKey)) return;
    deliveryInFlight.current.add(deliveryKey);
    try {
      const response = await invoicesService.sendWhatsApp(id);
      if (response.error) throw new Error(response.error);
      showToast(
        (response.data as any)?.delivery?.channel === "sms"
          ? `WhatsApp failed. Invoice sent by SMS to ${invoice.customer_phone}`
          : `Invoice sent on WhatsApp to ${invoice.customer_phone}`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to send invoice on WhatsApp",
        "error",
      );
    } finally {
      deliveryInFlight.current.delete(deliveryKey);
    }
  };

  const handleEmailSend = async (invoice: Invoice) => {
    const id = resolvePersistedInvoiceId(invoice);
    if (!id) {
      showToast("Invoice ID is missing", "error");
      return;
    }
    const deliveryKey = `${id}:email`;
    if (deliveryInFlight.current.has(deliveryKey)) return;
    deliveryInFlight.current.add(deliveryKey);
    try {
      if (!invoice.customer_email) throw new Error("Customer email is missing");
      const response = await invoicesService.sendEmail(id);
      if (response.error) throw new Error(response.error);
      showToast(`Invoice emailed to ${invoice.customer_email}`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to email invoice",
        "error",
      );
    } finally {
      deliveryInFlight.current.delete(deliveryKey);
    }
  };

  const handleInvoiceDownload = async (invoice: Invoice) => {
    try {
      await downloadPublicInvoicePdf(invoice);
      showToast(
        `Invoice ${invoice.invoice_no || invoice.id} downloaded`,
        "success",
      );
    } catch (error) {
      console.error("Invoice PDF download failed", error);
      showToast("Failed to download invoice", "error");
    }
  };

  const openAdminView = (invoice: Invoice) => {
    const id = resolvePersistedInvoiceId(invoice);
    if (!id) {
      showToast("This invoice has no persisted database ID", "error");
      return;
    }
    window.open(getAdminInvoicePath(id), "_blank", "noopener,noreferrer");
  };

  const openCustomerView = async (invoice: Invoice) => {
    const id = resolvePersistedInvoiceId(invoice);
    if (!id) {
      showToast("This invoice has no persisted database ID", "error");
      return;
    }

    const customerTab = window.open("about:blank", "_blank");
    const { data, error } = await invoicesService.fetchCustomerView(id);
    const verifiedId = resolvePersistedInvoiceId(data);

    if (error || !data?.url || verifiedId !== id) {
      customerTab?.close();
      showToast(
        error || "Customer view could not verify this invoice ID",
        "error",
      );
      return;
    }

    if (!customerTab) {
      showToast("Allow pop-ups to open the customer invoice", "error");
      return;
    }
    customerTab.opener = null;
    customerTab.location.replace(data.url);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_no: invoice.invoice_no || "",
      date: invoice.date || new Date().toISOString().split("T")[0],
      customer_name: invoice.customer_name || "",
      customer_phone: Number(invoice.customer_phone) || 0,
      customer_email: invoice.customer_email || "",
      customer_address: invoice.customer_address || "",
      gst: Boolean(invoice.gst),
      po: Boolean(invoice.po),
      quotation: Boolean(invoice.quotation),
      gst_name: invoice.gst_name || "",
      gst_no: invoice.gst_no || "",
      gst_phone: invoice.gst_phone || "",
      gst_email: invoice.gst_email || "",
      gst_address: invoice.gst_address || "",
      products: invoice.products || [],
      delivered_by: invoice.delivered_by || "",
      delivery_date: invoice.delivery_date || "",
      paid_status: invoice.paid_status || "unpaid",
      payment_type: invoice.payment_type || "cash",
      aquakart_online_user: Boolean(invoice.aquakart_online_user),
      aquakart_invoice: Boolean(invoice.aquakart_invoice),
    });
    setShowModal(true);
  };

  const handleClone = (invoice: Invoice) => {
    const today = new Date().toISOString().split("T")[0];
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    setEditingInvoice(null);
    setFormData({
      ...initialFormData,
      invoice_no: `${invoice.invoice_no.split("|")[0]}|${suffix}`,
      date: today,
      customer_name: invoice.customer_name,
      customer_phone: Number(invoice.customer_phone) || 0,
      customer_email: invoice.customer_email,
      customer_address: invoice.customer_address,
      gst: invoice.gst,
      po: invoice.po,
      quotation: invoice.quotation,
      gst_name: invoice.gst_name || "",
      gst_no: invoice.gst_no || "",
      gst_phone: invoice.gst_phone || "",
      gst_email: invoice.gst_email || "",
      gst_address: invoice.gst_address || "",
      products: invoice.products,
      payment_type: invoice.payment_type,
      aquakart_online_user: invoice.aquakart_online_user,
      aquakart_invoice: invoice.aquakart_invoice,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      const { error } = await invoicesService.delete(deleteTarget.id);
      if (error) throw error;
      showToast("Invoice deleted successfully", "success");
      setDeleteTarget(null);
      fetchInvoices();
    } catch {
      showToast("Failed to delete invoice", "error");
    }
  };

  const handleProductSelect = (productName: string) => {
    const cleanedName = productName.trim();
    const selectedProduct = availableProducts.find(
      (product) => product.name?.toLowerCase() === cleanedName.toLowerCase(),
    );
    const selectedId = selectedProduct ? String(selectedProduct.id) : "";

    setProductForm((prev) => ({
      ...prev,
      productName: selectedProduct?.name || productName,
      productPrice: selectedProduct?.price ?? prev.productPrice,
      productId:
        selectedProduct && /^[a-f\d]{24}$/i.test(selectedId) ? selectedId : "",
      productSlug: selectedProduct?.slug || "",
      productLink: selectedProduct?.link || "",
    }));
  };

  const addProduct = () => {
    if (!productForm.productName || productForm.productPrice <= 0) return;
    if (editingProductIndex !== null) {
      const updated = [...formData.products];
      updated[editingProductIndex] = { ...productForm };
      setFormData({ ...formData, products: updated });
      setEditingProductIndex(null);
    } else {
      setFormData({
        ...formData,
        products: [...formData.products, { ...productForm }],
      });
    }
    setProductForm({ ...initialProductForm });
  };

  const editProduct = (index: number) => {
    const product = formData.products[index];
    setProductForm({
      productName: product.productName,
      productQuantity: product.productQuantity,
      productPrice: product.productPrice,
      productSerialNo: product.productSerialNo || "",
      productId: product.productId || "",
      productSlug: product.productSlug || "",
      productLink: product.productLink || "",
    });
    setEditingProductIndex(index);
  };

  const cancelEditProduct = () => {
    setProductForm({ ...initialProductForm });
    setEditingProductIndex(null);
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
    if (editingProductIndex === index) cancelEditProduct();
  };

  const exportToCsv = () => exportRows("invoices.csv", filteredInvoices, false);
  const exportToSalesCsv = () =>
    exportRows("sales_invoices.csv", filteredInvoices, true);

  const exportRows = (
    fileName: string,
    rowsSource: Invoice[],
    salesOnly: boolean,
  ) => {
    if (!rowsSource.length) {
      showToast("No invoices to export", "error");
      return;
    }
    const headers = salesOnly
      ? [
          "Invoice No",
          "Date",
          "Customer",
          "GST",
          "GST No",
          "GST Name",
          "Base Price",
          "GST (18%)",
          "Total Amount",
        ]
      : [
          "Invoice No",
          "Date",
          "Customer",
          "Phone",
          "Email",
          "Address",
          "GST",
          "PO",
          "Quotation",
          "Payment Type",
          "Delivery Date",
          "Delivered By",
          "Base Price",
          "GST (18%)",
          "Total Amount",
          "Status",
        ];

    const rows = rowsSource.map((invoice) => {
      const base = formatAmount(
        priceUtils.getBasePrice(Number(invoice.total_amount) || 0),
      );
      const gst = formatAmount(
        priceUtils.getGSTValue(Number(invoice.total_amount) || 0),
      );
      if (salesOnly) {
        return [
          invoice.invoice_no,
          formatDate(invoice.date),
          invoice.customer_name,
          invoice.gst ? "Yes" : "No",
          invoice.gst_no ?? "",
          invoice.gst_name ?? "",
          base,
          gst,
          formatAmount(Number(invoice.total_amount) || 0),
        ];
      }
      return [
        invoice.invoice_no,
        formatDate(invoice.date),
        invoice.customer_name,
        invoice.customer_phone,
        invoice.customer_email,
        invoice.customer_address,
        invoice.gst ? "Yes" : "No",
        invoice.po ? "Yes" : "No",
        invoice.quotation ? "Yes" : "No",
        invoice.payment_type,
        formatDate(invoice.delivery_date),
        invoice.delivered_by || "",
        base,
        gst,
        formatAmount(Number(invoice.total_amount) || 0),
        invoice.paid_status,
      ];
    });
    const escapeCsv = (value: string) =>
      `"${(value || "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        row.map((value) => escapeCsv(String(value ?? ""))).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    if (!filteredInvoices.length) {
      showToast("No invoices to export", "error");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = filteredInvoices
      .map(
        (invoice) =>
          `<tr><td>${invoice.invoice_no}</td><td>${formatDate(invoice.date)}</td><td>${invoice.customer_name}</td><td>${invoice.customer_phone}</td><td>${formatAmount(Number(invoice.total_amount) || 0)}</td><td>${invoice.paid_status}</td></tr>`,
      )
      .join("");
    win.document.write(
      `<html><head><title>Invoices</title><style>body{font-family:Arial;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px}th{background:#f8fafc;text-align:left}</style></head><body><h2>Invoices Export</h2><table><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 200);
  };

  const copySelectedLinks = async () => {
    if (!selectedInvoices.length) {
      showToast("Select at least one invoice", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        getInvoiceLinksText(selectedInvoices),
      );
      showToast(
        `${selectedInvoices.length} invoice link${selectedInvoices.length === 1 ? "" : "s"} copied`,
        "success",
      );
    } catch {
      showToast("Unable to copy invoice links", "error");
    }
  };

  const exportSelectedToExcel = async () => {
    if (!selectedInvoices.length) {
      showToast("Select at least one invoice", "error");
      return;
    }

    try {
      await downloadInvoicesExcel(selectedInvoices);
      showToast("Selected invoices exported to one Excel file", "success");
    } catch {
      showToast("Failed to create the Excel file", "error");
    }
  };

  const exportSelectedToPdf = () => {
    if (!selectedInvoices.length) {
      showToast("Select at least one invoice", "error");
      return;
    }

    try {
      downloadInvoicesPdf(selectedInvoices);
      showToast("Selected invoices combined into one PDF", "success");
    } catch {
      showToast("Failed to create the PDF file", "error");
    }
  };

  const importInvoicesFromAPI = async () => {
    setImporting(true);
    setImportStatus("Fetching invoices from API...");
    try {
      const response = await fetch(
        "https://api.aquakart.co.in/v1/crm/admin/all-invoices",
      );
      if (!response.ok) throw new Error("Failed to fetch invoices from API");
      const apiInvoices = await response.json();
      setImportStatus(`Found ${apiInvoices.length} invoices. Refreshing...`);
      await fetchInvoices();
      setImportStatus(
        `Import check complete. Found ${apiInvoices.length} invoices.`,
      );
      setTimeout(() => setImportStatus(""), 5000);
    } catch {
      setImportStatus("Error: Failed to import invoices");
    } finally {
      setImporting(false);
    }
  };

  // Each row wraps onto several lines so every field is visible at a glance:
  // grouped columns instead of single-line truncated cells.
  const invoiceTableColumns: AquaTableColumn<Invoice>[] = [
    {
      key: "invoice_no",
      header: "Invoice",
      wrap: true,
      className: "px-3 py-3",
      render: (invoice) => (
        <span className="flex flex-col gap-1">
          <span className="whitespace-nowrap font-bold text-neutral-950 dark:text-white">
            {invoice.invoice_no || "—"}
          </span>
          <span className="text-xs text-slate-500 dark:text-white/50">
            {formatDate(invoice.date)}
          </span>
          {(invoice.gst || invoice.po || invoice.quotation) && (
            <span className="flex flex-wrap gap-1">
              {invoice.gst && <LiquidBadge>GST</LiquidBadge>}
              {invoice.po && <LiquidBadge>PO</LiquidBadge>}
              {invoice.quotation && <LiquidBadge>QUO</LiquidBadge>}
            </span>
          )}
        </span>
      ),
      filterValue: (invoice) =>
        `${invoice.invoice_no} ${formatDate(invoice.date)} ${invoice.gst ? "gst" : ""} ${invoice.po ? "po" : ""}`,
      sortValue: (invoice) => parseInvoiceDate(invoice.date)?.getTime() ?? 0,
    },
    {
      key: "customer_name",
      header: "Customer",
      wrap: true,
      className: "px-3 py-3",
      headerClassName: "min-w-[10rem]",
      render: (invoice) => (
        <span className="flex flex-col gap-0.5 text-xs">
          <span className="text-sm font-bold text-neutral-950 dark:text-white">
            {invoice.customer_name || "—"}
          </span>
          {invoice.customer_phone && (
            <a
              href={`tel:${String(invoice.customer_phone).replace(/[^\d+]/g, "")}`}
              onClick={(event) => event.stopPropagation()}
              className="w-fit text-blue-600 hover:underline dark:text-blue-300"
            >
              {invoice.customer_phone}
            </a>
          )}
          {invoice.customer_email && (
            <span className="break-all text-slate-600 dark:text-white/60">
              {invoice.customer_email}
            </span>
          )}
          {invoice.customer_address && (
            <span
              className="line-clamp-2 text-slate-500 dark:text-white/50"
              title={invoice.customer_address}
            >
              {invoice.customer_address}
            </span>
          )}
          {invoice.gst && (invoice.gst_name || invoice.gst_no) && (
            <span className="mt-0.5 text-slate-600 dark:text-white/60">
              {invoice.gst_name && (
                <span className="font-semibold">{invoice.gst_name}</span>
              )}
              {invoice.gst_no && (
                <span className="block font-mono text-[11px]">
                  GSTIN {invoice.gst_no}
                </span>
              )}
            </span>
          )}
        </span>
      ),
      filterValue: (invoice) =>
        [
          invoice.customer_name,
          invoice.customer_phone,
          invoice.customer_email,
          invoice.customer_address,
          invoice.gst_name,
          invoice.gst_no,
        ].join(" "),
      sortValue: (invoice) => (invoice.customer_name || "").toLowerCase(),
    },
    {
      key: "products",
      header: "Items",
      wrap: true,
      className: "px-3 py-3",
      headerClassName: "min-w-[10rem]",
      // productPrice is the line value (PR #89): shown as-is, never × quantity.
      render: (invoice) =>
        invoice.products.length ? (
          <ul className="space-y-1 text-xs">
            {invoice.products.slice(0, ITEMS_SHOWN).map((product, index) => (
              <li
                key={`${product.productName}-${index}`}
                className="flex items-start justify-between gap-2"
              >
                <span className="min-w-0">
                  <span className="font-semibold text-neutral-950 dark:text-white">
                    {product.productQuantity > 1 && (
                      <span className="text-blue-600 dark:text-blue-300">
                        {product.productQuantity}×{" "}
                      </span>
                    )}
                    {product.productName}
                  </span>
                  {product.productSerialNo && (
                    <span className="block font-mono text-[11px] text-slate-500 dark:text-white/50">
                      S/N {product.productSerialNo}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-slate-600 dark:text-white/60">
                  {formatAmount(Number(product.productPrice) || 0)}
                </span>
              </li>
            ))}
            {invoice.products.length > ITEMS_SHOWN && (
              <li className="text-slate-500 dark:text-white/50">
                +{invoice.products.length - ITEMS_SHOWN} more item
                {invoice.products.length - ITEMS_SHOWN === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        ) : (
          <span className="text-xs text-slate-400">No items</span>
        ),
      filterValue: (invoice) =>
        invoice.products
          .map(
            (product) =>
              `${product.productName} ${product.productSerialNo || ""}`,
          )
          .join(" "),
      sortValue: (invoice) => invoice.products.length,
    },
    {
      key: "total_amount",
      header: "Amount",
      wrap: true,
      className: "px-3 py-3 text-right",
      render: (invoice) => {
        const total = Number(invoice.total_amount) || 0;
        return (
          <span className="flex flex-col items-end gap-0.5 text-xs">
            <span className="whitespace-nowrap text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatAmount(total)}
            </span>
            <span className="whitespace-nowrap tabular-nums text-slate-500 dark:text-white/50">
              {formatAmount(priceUtils.getBasePrice(total))} + GST{" "}
              {formatAmount(priceUtils.getGSTValue(total))}
            </span>
            <span className="capitalize text-slate-600 dark:text-white/60">
              {(invoice.payment_type || "—").replace(/_/g, " ")}
            </span>
          </span>
        );
      },
      filterValue: (invoice) =>
        `${invoice.total_amount} ${invoice.payment_type}`,
      sortValue: (invoice) => Number(invoice.total_amount) || 0,
    },
    {
      key: "status",
      header: "Status",
      wrap: true,
      className: "px-3 py-3",
      render: (invoice) => (
        <span className="flex flex-col items-start gap-1 text-[11px] text-slate-500 dark:text-white/50">
          <StatusBadge kind="paid" status={paidStatusOf(invoice)} />
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <StatusBadge kind="delivery" status={deliveryStatusOf(invoice)} />
            {(invoice.delivery_date || invoice.delivered_by) && (
              <span>
                {invoice.delivery_date ? formatDate(invoice.delivery_date) : ""}
                {invoice.delivery_date && invoice.delivered_by ? " · " : ""}
                {invoice.delivered_by || ""}
              </span>
            )}
          </span>
          <span className="flex flex-wrap gap-1">
            <InvoiceOpenedBadge invoice={invoice} />
            <InvoiceEnrichedBadge invoice={invoice} />
            {invoice.migrated && <MigrationBadge invoice={invoice} />}
          </span>
        </span>
      ),
      filterValue: (invoice) =>
        `${PAID_LABELS[paidStatusOf(invoice)]} ${DELIVERY_LABELS[deliveryStatusOf(invoice)]} ${ENRICHMENT_LABELS[enrichmentStatusOf(invoice)]} ${invoice.delivered_by || ""}`,
      sortValue: (invoice) => PAID_ORDER.indexOf(paidStatusOf(invoice)),
    },
  ];

  const invoiceTableActions: AquaTableAction<Invoice>[] = [
    {
      label: "Download invoice",
      icon: <Download className="h-4 w-4" />,
      onClick: handleInvoiceDownload,
    },
    {
      label: "Admin view",
      icon: <ShieldCheck className="h-4 w-4" />,
      onClick: openAdminView,
    },
    {
      label: "Customer view",
      icon: <UserRound className="h-4 w-4" />,
      onClick: openCustomerView,
    },
    {
      label: "Send WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      onClick: handleWhatsAppSend,
    },
    {
      label: "Send email",
      icon: <Mail className="h-4 w-4" />,
      onClick: handleEmailSend,
    },
    {
      label: "Clone",
      icon: <Copy className="h-4 w-4" />,
      onClick: handleClone,
    },
    { label: "Edit", icon: <Edit2 className="h-4 w-4" />, onClick: handleEdit },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  // Actions inline as an icon grid: no extra "Actions" row under every invoice.
  const tableColumns: AquaTableColumn<Invoice>[] = [
    ...invoiceTableColumns,
    {
      key: "actions",
      header: "Actions",
      className: "px-3 py-3",
      headerClassName: "w-[9.5rem]",
      render: (invoice) => (
        <span className="grid w-[8.75rem] grid-cols-4 gap-1">
          {invoiceTableActions.map((action) => (
            <LiquidIconButton
              key={action.label}
              type="button"
              title={action.label}
              aria-label={`${action.label} ${invoice.invoice_no}`}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick(invoice);
              }}
              className={`!h-8 !w-8 !min-h-0 ${action.label === "Delete" ? "text-rose-600 dark:text-rose-400" : ""}`}
            >
              {action.icon}
            </LiquidIconButton>
          ))}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <TabInnerContent
      title="Invoices"
      description="Manage customer invoices and billing"
    >
      <div className="space-y-3">
        {/* Control bar: search, export, create, then source, type and period filters. */}
        <LiquidPanel className="space-y-2 p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <LiquidInput
                type="search"
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="Search all invoices: name, phone, email, invoice no, product, amount…"
                aria-label="Search invoices"
                className="w-full"
                style={{ paddingLeft: "2.25rem" }}
              />
            </div>
            <ExportMenu
              disabled={importing}
              importing={importing}
              onPdf={exportToPdf}
              onExcel={exportToCsv}
              onSalesExcel={exportToSalesCsv}
              onImport={importInvoicesFromAPI}
            />
            <LiquidButton
              onClick={() => setShowModal(true)}
              variant="primary"
              className="shrink-0 whitespace-nowrap"
              aria-label="Create invoice"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Create Invoice</span>
              <span className="sm:hidden">New</span>
            </LiquidButton>
          </div>

          {invoiceSearch && (
            <p
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-slate-600 dark:text-white/60"
              role="status"
            >
              <span>
                <strong className="text-neutral-950 dark:text-white">
                  {searchedInvoices.length}
                </strong>{" "}
                match{searchedInvoices.length === 1 ? "" : "es"} across all
                invoices (filters ignored while searching)
              </span>
              <LiquidButton
                type="button"
                variant="ghost"
                onClick={() => setInvoiceSearch("")}
                className="!min-h-0 !px-1 !py-0 text-xs"
              >
                Clear search
              </LiquidButton>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Invoice source"
            >
              {[
                { value: "current", label: `Current (${currentInvoiceCount})` },
                {
                  value: "migrated",
                  label: `Migrated (${migratedInvoices.length})`,
                },
                { value: "all", label: `All (${invoices.length})` },
              ].map((option) => (
                <LiquidButton
                  key={option.value}
                  variant={
                    invoiceSourceFilter === option.value ? "primary" : "soft"
                  }
                  aria-pressed={invoiceSourceFilter === option.value}
                  className="!min-h-9 !px-3 !py-1 text-xs sm:text-sm"
                  onClick={() => {
                    const next = option.value as "current" | "migrated" | "all";
                    setInvoiceSourceFilter(next);
                    setSelectedInvoiceIds(new Set());
                    if (next === "migrated") {
                      setSelectedMonth("all");
                      setSelectedYear("all");
                    }
                  }}
                >
                  {option.label}
                </LiquidButton>
              ))}
            </div>
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Invoice type"
            >
              {invoiceTypeOptions.map((option) => (
                <LiquidButton
                  key={option.value}
                  variant={
                    invoiceTypeFilter === option.value ? "primary" : "soft"
                  }
                  aria-pressed={invoiceTypeFilter === option.value}
                  className="!min-h-9 !px-3 !py-1 text-xs sm:text-sm"
                  onClick={() =>
                    setInvoiceTypeFilter(option.value as InvoiceTypeFilter)
                  }
                >
                  {option.label.replace(" Invoices", "")}
                </LiquidButton>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-2xl">
            <LiquidDropdown
              label="Month"
              value={selectedMonth === "all" ? "all" : String(selectedMonth)}
              options={months}
              onChange={(value) =>
                setSelectedMonth(value === "all" ? "all" : Number(value))
              }
            />
            <LiquidDropdown
              label="Year"
              value={selectedYear === "all" ? "all" : String(selectedYear)}
              options={yearOptions}
              onChange={(value) =>
                setSelectedYear(value === "all" ? "all" : Number(value))
              }
            />
            <LiquidDropdown
              label="Customer opened"
              value={openedFilter}
              options={[
                { label: "All", value: "all" },
                { label: "Opened", value: "opened" },
                { label: "Not opened", value: "not-opened" },
              ]}
              onChange={setOpenedFilter}
              wrapperClassName="col-span-2 sm:col-span-1"
            />
          </div>
          {invoiceSourceFilter === "migrated" && (
            <p className="px-1 text-xs font-semibold text-slate-600 dark:text-white/60">
              {migratedReviewedInvoices}/{migratedInvoices.length} reviewed for
              invoice and product automations. Edit a migrated invoice and link
              each product to a current AquaKart product to enable automations.
            </p>
          )}
        </LiquidPanel>

        {importStatus && (
          <LiquidPanel className="p-3 text-sm font-bold text-neutral-950 dark:text-white">
            {importStatus}
          </LiquidPanel>
        )}

        <InvoiceBackfillPanel />

        {/* Summary: one stat strip (scrolls sideways on narrow screens) plus status chips. */}
        <LiquidPanel className="space-y-3 p-2 sm:p-3">
          <div className="-mx-1 grid snap-x auto-cols-[minmax(8.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto px-1 pb-1 xl:grid-flow-row xl:grid-cols-7 xl:overflow-visible xl:pb-0">
            <InvoiceStat label="Total value" value={formatAmount(totalValue)} />
            <InvoiceStat label="Invoices" value={String(totalInvoices)} />
            <InvoiceStat
              label="Average sale"
              value={formatAmount(averageSale)}
            />
            <InvoiceStat
              label="Profit"
              value={formatAmount(profitOnSales)}
              accent
            />
            <InvoiceStat
              label="Outstanding"
              hint="unpaid + partial"
              value={formatAmount(outstandingValue)}
              warn={outstandingValue > 0}
            />
            <InvoiceStat
              label="Customer opened"
              value={`${openedInvoices}/${totalInvoices}`}
            />
            <InvoiceStat
              label="Enriched"
              value={`${enrichedInvoices}/${totalInvoices}`}
              accent
            />
          </div>

          <div className="space-y-1.5 border-t border-slate-200/70 pt-2 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                Status · current filters · tap to filter
              </p>
              {statusFiltersActive && (
                <LiquidButton
                  type="button"
                  variant="ghost"
                  onClick={clearStatusFilters}
                  className="!min-h-0 !px-1 !py-0 text-xs"
                >
                  Clear filters
                </LiquidButton>
              )}
            </div>
            <StatusFilterRow
              label="Paid"
              order={PAID_ORDER}
              labels={PAID_LABELS}
              meta={paidMeta}
              buckets={statusSummary.paid}
              value={paidFilter}
              onChange={setPaidFilter}
            />
            <StatusFilterRow
              label="Delivery"
              order={DELIVERY_ORDER}
              labels={DELIVERY_LABELS}
              meta={deliveryMeta}
              buckets={statusSummary.delivery}
              value={deliveryFilter}
              onChange={setDeliveryFilter}
            />
            <StatusFilterRow
              label="Enriched"
              order={ENRICHMENT_ORDER}
              labels={ENRICHMENT_LABELS}
              meta={enrichmentMeta}
              buckets={statusSummary.enrichment}
              value={enrichmentChipValue}
              onChange={setEnrichmentChip}
            />
          </div>
        </LiquidPanel>

        {/* Bulk bar exists only in selection mode; checkboxes stay hidden otherwise. */}
        {selectMode && (
          <div className="sticky top-24 z-30">
            <LiquidPanel className="p-2 shadow-xl ring-1 ring-sky-400/40 sm:p-3">
              <div
                className="flex items-center gap-2"
                role="toolbar"
                aria-label="Bulk invoice actions"
              >
                <LiquidCheckbox
                  checked={allFilteredInvoicesSelected}
                  indeterminate={
                    selectedInvoices.length > 0 && !allFilteredInvoicesSelected
                  }
                  onChange={toggleAllFilteredInvoices}
                  ariaLabel="Select all invoices in the list"
                  wrapperClassName="shrink-0 px-1"
                />
                <p
                  className="min-w-0 flex-1 truncate text-sm font-black text-neutral-950 dark:text-white"
                  aria-live="polite"
                >
                  {selectedInvoices.length ? (
                    <>
                      {selectedInvoices.length} selected
                      <span className="hidden font-normal text-slate-500 dark:text-white/50 sm:inline">
                        {" "}
                        ·{" "}
                        {formatAmount(
                          selectedInvoices.reduce(
                            (sum, invoice) =>
                              sum + (Number(invoice.total_amount) || 0),
                            0,
                          ),
                        )}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-500 dark:text-white/60">
                      Tap invoices to select
                    </span>
                  )}
                </p>
                <LiquidButton
                  onClick={copySelectedLinks}
                  variant="soft"
                  disabled={!selectedInvoices.length}
                  aria-label="Copy links"
                  title="Copy links"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />{" "}
                  <span className="hidden sm:inline">Links</span>
                </LiquidButton>
                <LiquidButton
                  onClick={exportSelectedToExcel}
                  variant="soft"
                  disabled={!selectedInvoices.length}
                  aria-label="One Excel file"
                  title="One Excel file"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />{" "}
                  <span className="hidden sm:inline">Excel</span>
                </LiquidButton>
                <LiquidButton
                  onClick={exportSelectedToPdf}
                  variant="soft"
                  disabled={!selectedInvoices.length}
                  aria-label="One PDF file"
                  title="One PDF file"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />{" "}
                  <span className="hidden sm:inline">PDF</span>
                </LiquidButton>
                <LiquidButton
                  onClick={exitSelectMode}
                  variant="primary"
                  title="Done (Esc)"
                >
                  Done
                </LiquidButton>
              </div>
            </LiquidPanel>
          </div>
        )}

        {/* The grouped table needs ≥1024px; below that, cards (2 columns on iPad). */}
        <div className="hidden lg:block">
          <AquaGenericTable
            heading="Invoices"
            subHeading={`${searchedInvoices.length} result${searchedInvoices.length === 1 ? "" : "s"}`}
            columns={tableColumns}
            data={searchedInvoices}
            isLoading={loading}
            emptyMessage={
              invoiceSearch
                ? "No invoices match your search"
                : "No invoices found"
            }
            onRowClick={(row) => {
              if (selectMode) {
                toggleInvoiceSelection(row.id);
                return;
              }
              setViewingInvoice(row);
              setShowViewModal(true);
            }}
            getRowId={(invoice) => invoice.id}
            selectedRowIds={selectMode ? selectedInvoiceIds : undefined}
            onSelectionChange={
              selectMode
                ? (selectedIds) =>
                    setSelectedInvoiceIds(
                      new Set(
                        Array.from(selectedIds, (invoiceId) =>
                          String(invoiceId),
                        ),
                      ),
                    )
                : undefined
            }
            headerActions={
              !selectMode && searchedInvoices.length > 0 ? (
                <SelectModeButton onClick={() => setSelectMode(true)} />
              ) : undefined
            }
          />
        </div>

        {searchedInvoices.length > 0 && !selectMode && (
          <div className="flex items-center justify-between gap-2 px-1 lg:hidden">
            <span className="text-xs text-slate-500 dark:text-white/50">
              {searchedInvoices.length} invoice
              {searchedInvoices.length === 1 ? "" : "s"}
              <span className="hidden sm:inline">
                {" "}
                · long-press a card to select
              </span>
            </span>
            <SelectModeButton onClick={() => setSelectMode(true)} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
          {searchedInvoices.length === 0 ? (
            <LiquidPanel className="p-6 text-center text-sm text-slate-500 dark:text-white/50 md:col-span-2">
              {invoiceSearch
                ? "No invoices match your search"
                : "No invoices found"}
            </LiquidPanel>
          ) : (
            searchedInvoices.map((invoice) => (
              <InvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                onOpenAdmin={() => openAdminView(invoice)}
                onOpenCustomer={() => openCustomerView(invoice)}
                onView={() => {
                  setViewingInvoice(invoice);
                  setShowViewModal(true);
                }}
                onDownload={() => handleInvoiceDownload(invoice)}
                onSendWhatsApp={() => handleWhatsAppSend(invoice)}
                onSendEmail={() => handleEmailSend(invoice)}
                onEdit={() => handleEdit(invoice)}
                onDelete={() => setDeleteTarget(invoice)}
                selectMode={selectMode}
                selected={selectedInvoiceIds.has(invoice.id)}
                onToggleSelection={() => toggleInvoiceSelection(invoice.id)}
                onLongPress={() => {
                  setSelectMode(true);
                  setSelectedInvoiceIds((current) =>
                    new Set(current).add(invoice.id),
                  );
                }}
              />
            ))
          )}
        </div>

        {filteredInvoices.length === 0 && invoices.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/5">
              <FileText className="h-12 w-12 text-slate-400 dark:text-white/20" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-neutral-950 dark:text-white">
              No invoices found
            </h3>
            <p className="mx-auto max-w-xs text-black dark:text-white/60">
              Create a new invoice to get started.
            </p>
          </div>
        )}
      </div>

      <AquaInvoiceFormDialog
        showModal={showModal}
        onClose={() => setShowModal(false)}
        onClear={clearDraft}
        editingInvoice={editingInvoice}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        productForm={productForm}
        setProductForm={setProductForm}
        availableProducts={availableProducts}
        handleProductSelect={handleProductSelect}
        addProduct={addProduct}
        editingProductIndex={editingProductIndex}
        editProduct={editProduct}
        removeProduct={removeProduct}
        cancelEditProduct={cancelEditProduct}
        isDraftDirty={isDraftDirty}
        calculateTotal={calculateTotal}
        requestState={invoiceRequestState}
        requestError={invoiceRequestError}
        onDismissRequestError={() => {
          setInvoiceRequestState("idle");
          setInvoiceRequestError("");
        }}
      />
      <AquaInvoiceViewDialog
        showModal={showViewModal}
        viewingInvoice={viewingInvoice}
        setModal={setShowViewModal}
        onOpenAdmin={() => viewingInvoice && openAdminView(viewingInvoice)}
        onOpenCustomer={() =>
          viewingInvoice && openCustomerView(viewingInvoice)
        }
      />

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xl"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(event) => event.stopPropagation()}
              className="liquid-panel w-full max-w-md p-8"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
                <Trash2 className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-neutral-950 dark:text-white">
                Delete Invoice?
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-black dark:text-white/60">
                You are about to delete invoice{" "}
                <strong>{deleteTarget.invoice_no}</strong> for{" "}
                <strong>{deleteTarget.customer_name}</strong>. This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <LiquidButton
                  onClick={() => setDeleteTarget(null)}
                  variant="soft"
                  className="flex-1"
                >
                  Cancel
                </LiquidButton>
                <LiquidButton
                  onClick={handleDelete}
                  variant="danger"
                  className="flex-1"
                >
                  Delete
                </LiquidButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TabInnerContent>
  );
}

function InvoiceStat({
  label,
  value,
  hint,
  accent,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="snap-start rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
        {hint && (
          <span className="ml-1 font-normal normal-case tracking-normal">
            ({hint})
          </span>
        )}
      </p>
      <p
        className={`truncate text-lg font-black tabular-nums sm:text-xl ${
          accent
            ? "text-green-600 dark:text-green-400"
            : warn
              ? "text-amber-600 dark:text-amber-300"
              : "text-neutral-950 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type StatusBadgeProps =
  | { kind: "paid"; status: PaidStatus }
  | { kind: "delivery"; status: DeliveryStatus };

function StatusBadge(props: StatusBadgeProps) {
  const { icon: Icon, className } =
    props.kind === "paid" ? paidMeta[props.status] : deliveryMeta[props.status];
  const label =
    props.kind === "paid"
      ? PAID_LABELS[props.status]
      : DELIVERY_LABELS[props.status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

/** One row of status chips with count and amount; tapping filters, tapping again clears. */
function StatusFilterRow<S extends string>({
  label,
  order,
  labels,
  meta,
  buckets,
  value,
  onChange,
}: {
  label: string;
  order: S[];
  labels: Record<S, string>;
  meta: Record<S, StatusMeta>;
  buckets: Record<S, { count: number; amount: number }>;
  value: S | "all";
  onChange: (value: S | "all") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50 sm:w-16">
        {label}
      </span>
      {/* One scrollable row on phones/tablets; wraps on wide screens. */}
      <div
        className="-my-0.5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 lg:flex-wrap lg:overflow-visible"
        role="group"
        aria-label={`${label} filter`}
      >
        {order.map((status) => {
          const { icon: Icon, className } = meta[status];
          const active = value === status;
          return (
            <LiquidButton
              key={status}
              type="button"
              variant="ghost"
              aria-pressed={active}
              onClick={() => onChange(active ? "all" : status)}
              className={`!min-h-8 shrink-0 !gap-1 whitespace-nowrap !rounded-full !px-2.5 !py-0 text-xs font-bold ${className} ${
                active
                  ? "ring-2 ring-inset ring-blue-500"
                  : value !== "all"
                    ? "opacity-50 hover:opacity-100"
                    : ""
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {labels[status]}
              <span className="tabular-nums">{buckets[status].count}</span>
              {buckets[status].count > 0 && (
                <span className="font-normal tabular-nums opacity-80">
                  · {formatAmount(buckets[status].amount)}
                </span>
              )}
            </LiquidButton>
          );
        })}
      </div>
    </div>
  );
}

/** Export and import actions folded into one menu so the control bar stays one row. */
function ExportMenu({
  disabled,
  importing,
  onPdf,
  onExcel,
  onSalesExcel,
  onImport,
}: {
  disabled: boolean;
  importing: boolean;
  onPdf: () => void;
  onExcel: () => void;
  onSalesExcel: () => void;
  onImport: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      const menu = menuRef.current;
      if (!menu?.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menu.contains(event.target as Node)
      ) {
        menu.open = false;
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const run = (action: () => void) => () => {
    if (menuRef.current) menuRef.current.open = false;
    action();
  };
  const items: [string, typeof FileText, () => void][] = [
    ["PDF (filtered list)", FileText, onPdf],
    ["Excel (filtered list)", FileDown, onExcel],
    ["Sales Excel", FileDown, onSalesExcel],
    [importing ? "Importing..." : "Import from API", Download, onImport],
  ];
  return (
    <details ref={menuRef} className="relative shrink-0">
      <summary
        className="liquid-button liquid-button-soft flex cursor-pointer list-none items-center gap-1.5 whitespace-nowrap [&::-webkit-details-marker]:hidden"
        aria-label="Export and import"
      >
        <FileDown className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Export</span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-52 space-y-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-900">
        {items.map(([label, Icon, action]) => (
          <LiquidButton
            key={label}
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={run(action)}
            className="!min-h-11 w-full !justify-start !px-3 text-sm"
          >
            <Icon
              className="h-4 w-4 text-slate-500 dark:text-white/60"
              aria-hidden="true"
            />
            {label}
          </LiquidButton>
        ))}
      </div>
    </details>
  );
}

function SelectModeButton({ onClick }: { onClick: () => void }) {
  return (
    <LiquidButton
      type="button"
      variant="ghost"
      onClick={onClick}
      className="!min-h-9 !px-3 text-sm font-semibold"
    >
      <ListChecks className="h-4 w-4" aria-hidden="true" />
      Select
    </LiquidButton>
  );
}

function InvoiceMobileCard({
  invoice,
  onOpenAdmin,
  onOpenCustomer,
  onView,
  onDownload,
  onSendWhatsApp,
  onSendEmail,
  onEdit,
  onDelete,
  selectMode,
  selected,
  onToggleSelection,
  onLongPress,
}: {
  invoice: Invoice;
  onOpenAdmin: () => void;
  onOpenCustomer: () => void;
  onView: () => void;
  onDownload: () => void;
  onSendWhatsApp: () => void;
  onSendEmail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelection: () => void;
  onLongPress: () => void;
}) {
  // Long-press (touch or mouse) starts selection with this card picked; the
  // click that ends the press is swallowed so it doesn't toggle it straight back.
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStart.current = null;
  };
  useEffect(() => cancelPress, []);
  const isControl = (target: EventTarget) =>
    target instanceof Element &&
    Boolean(target.closest("button, a, input, label"));

  return (
    <LiquidPanel
      className={`p-3 ${selected ? "ring-2 ring-sky-400/80" : ""} ${selectMode ? "cursor-pointer" : ""}`}
    >
      <div
        role={selectMode ? "checkbox" : undefined}
        aria-checked={selectMode ? selected : undefined}
        aria-label={selectMode ? `Invoice ${invoice.invoice_no}` : undefined}
        tabIndex={selectMode ? 0 : undefined}
        className="select-none [-webkit-touch-callout:none]"
        onPointerDown={(event) => {
          if (selectMode || isControl(event.target)) return;
          longPressed.current = false;
          pressStart.current = { x: event.clientX, y: event.clientY };
          pressTimer.current = window.setTimeout(() => {
            longPressed.current = true;
            pressTimer.current = null;
            navigator.vibrate?.(15);
            onLongPress();
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(event) => {
          const start = pressStart.current;
          if (
            start &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
          )
            cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(event) => {
          if (longPressed.current || selectMode) event.preventDefault();
        }}
        onClick={(event) => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          if (selectMode && !isControl(event.target)) onToggleSelection();
        }}
        onKeyDown={(event) => {
          if (selectMode && (event.key === " " || event.key === "Enter")) {
            event.preventDefault();
            onToggleSelection();
          }
        }}
      >
        <div className="flex items-start gap-2.5">
          {selectMode && (
            <LiquidCheckbox
              checked={selected}
              onChange={onToggleSelection}
              wrapperClassName="mt-0.5 flex-shrink-0"
              ariaLabel={`Select invoice ${invoice.invoice_no}`}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-sm font-black text-neutral-950 dark:text-white">
                {invoice.invoice_no || "—"}
              </h3>
              <p className="shrink-0 text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatAmount(Number(invoice.total_amount) || 0)}
              </p>
            </div>
            <p className="flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-white/50">
              {formatDate(invoice.date)}
              {invoice.gst && <LiquidBadge>GST</LiquidBadge>}
              {invoice.po && <LiquidBadge>PO</LiquidBadge>}
              {invoice.quotation && <LiquidBadge>QUO</LiquidBadge>}
            </p>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate font-bold text-neutral-950 dark:text-white">
                {invoice.customer_name || "—"}
              </span>
              {invoice.customer_phone && (
                <a
                  href={`tel:${String(invoice.customer_phone).replace(/[^\d+]/g, "")}`}
                  className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-300"
                >
                  {invoice.customer_phone}
                </a>
              )}
            </p>
            {invoice.customer_email && (
              <p className="truncate text-xs text-slate-500 dark:text-white/50">
                {invoice.customer_email}
              </p>
            )}
            {invoice.products.length > 0 && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-700 dark:text-white/70">
                {invoice.products
                  .slice(0, ITEMS_SHOWN)
                  .map(
                    (product) =>
                      `${product.productQuantity > 1 ? `${product.productQuantity}× ` : ""}${product.productName}`,
                  )
                  .join(", ")}
                {invoice.products.length > ITEMS_SHOWN &&
                  ` +${invoice.products.length - ITEMS_SHOWN} more`}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <StatusBadge kind="paid" status={paidStatusOf(invoice)} />
          <StatusBadge kind="delivery" status={deliveryStatusOf(invoice)} />
          <InvoiceOpenedBadge invoice={invoice} />
          <InvoiceEnrichedBadge invoice={invoice} />
          {invoice.migrated && <MigrationBadge invoice={invoice} />}
        </div>
      </div>

      {/* Hidden while selecting so a tap can't edit or delete by accident. */}
      {!selectMode && (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          <LiquidIconButton onClick={onOpenAdmin} title="Open Admin View">
            <ShieldCheck className="h-4 w-4" />
          </LiquidIconButton>
          <LiquidIconButton onClick={onOpenCustomer} title="Open Customer View">
            <UserRound className="h-4 w-4" />
          </LiquidIconButton>
          <LiquidIconButton onClick={onView} title="View">
            <Eye className="h-4 w-4" />
          </LiquidIconButton>
          <LiquidIconButton onClick={onDownload} title="Download Invoice">
            <Download className="h-4 w-4 text-violet-500" />
          </LiquidIconButton>
          <LiquidIconButton onClick={onSendWhatsApp} title="Send WhatsApp">
            <MessageCircle className="h-4 w-4 text-green-500" />
          </LiquidIconButton>
          <LiquidIconButton onClick={onSendEmail} title="Send Email">
            <Mail className="h-4 w-4 text-sky-500" />
          </LiquidIconButton>
          <LiquidIconButton onClick={onEdit} title="Edit">
            <Edit2 className="h-4 w-4" />
          </LiquidIconButton>
          <LiquidIconButton
            onClick={onDelete}
            title="Delete"
            aria-label="Delete invoice"
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
          </LiquidIconButton>
        </div>
      )}
    </LiquidPanel>
  );
}

function MigrationBadge({ invoice }: { invoice: Invoice }) {
  if (!invoice.migrated) return null;

  return (
    <span
      title={
        invoice.migration_reviewed
          ? "Migrated invoice reviewed; automated reminders are enabled"
          : "Migrated invoice needs customer/product review before automations run"
      }
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        invoice.migration_reviewed
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300"
      }`}
    >
      <ShieldCheck className="h-3 w-3" />
      {invoice.migration_reviewed ? "Migrated · Reviewed" : "Migrated · Review"}
    </span>
  );
}

function InvoiceOpenedBadge({ invoice }: { invoice: Invoice }) {
  const opened = invoice.invoice_open_count > 0;
  const detail = opened
    ? `${invoice.invoice_open_count} open${invoice.invoice_open_count === 1 ? "" : "s"}${
        invoice.invoice_last_opened_at
          ? ` · Last ${formatDate(invoice.invoice_last_opened_at)}`
          : ""
      }`
    : "Customer has not opened this invoice";

  return (
    <span
      title={detail}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        opened
          ? "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300"
          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50"
      }`}
    >
      <Eye className="h-3 w-3" />
      {opened ? `Opened · ${invoice.invoice_open_count}` : "Not opened"}
    </span>
  );
}

function InvoiceEnrichedBadge({ invoice }: { invoice: Invoice }) {
  const enriched = invoice.invoice_login_linked;
  return (
    <span
      title={
        enriched
          ? "Invoice is linked to a verified customer account"
          : "Waiting for the customer to complete verified login"
      }
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        enriched
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
      }`}
    >
      <UserRound className="h-3 w-3" />
      {enriched ? "Enriched" : "Pending"}
    </span>
  );
}
