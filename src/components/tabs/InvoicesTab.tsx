import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle,
  Clock,
  Copy,
  PackageCheck,
  ListChecks,
  PackageX,
  Search,
  Truck,
  UserCheck,
  UserX,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { invoicesService, productsService } from "../../services/apiService";
import { API_BASE_URL } from "../../config/api";
import NotifyOperations from "../../services/notify";
import priceUtils from "../../utils/priceUtils";
import {
  downloadInvoicesExcel,
  downloadInvoicesPdf,
  getInvoiceLink,
  getInvoiceLinksText,
} from "../../utils/invoiceBulkExports";
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
import { useToast } from "../Toast";
import { useAuth } from "../../contexts/AuthContext";
import { downloadCustomerInvoicePdf } from "../../vendor/storefrontInvoice/customerInvoicePdf";
import { isAdminUser } from "../../utils/permissions";
import TabInnerContent from "../Layout/tabInnerlayout";
import AquaGenericTable, {
  AquaTableAction,
  AquaTableColumn,
} from "../modular/invoices/invoiceTable";
import AquaInvoiceFormDialog from "../modular/invoices/invoiceDialog";
import AquaInvoiceViewDialog from "../modular/invoices/invoiceView";
import {
  DbProduct,
  Invoice,
  InvoiceTypeFilter,
  Product,
} from "../modular/invoices/invoice.types";
import { mapInvoiceFromApi } from "../modular/invoices/mapInvoice";
import {
  LiquidBadge,
  LiquidButton,
  LiquidIconButton,
  LiquidPanel,
  LiquidSelect,
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
  { value: "all", label: "All Invoices", shortLabel: "All" },
  { value: "gst", label: "GST Invoices", shortLabel: "GST" },
  { value: "po", label: "PO Invoices", shortLabel: "PO" },
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

const paidMeta: Record<
  PaidStatus,
  { icon: typeof CheckCircle; className: string }
> = {
  paid: { icon: CheckCircle, className: TONES.good },
  partial: { icon: Clock, className: TONES.warn },
  unpaid: { icon: XCircle, className: TONES.bad },
};

const deliveryMeta: Record<
  DeliveryStatus,
  { icon: typeof CheckCircle; className: string }
> = {
  delivered: { icon: PackageCheck, className: TONES.good },
  scheduled: { icon: CalendarClock, className: TONES.info },
  assigned: { icon: Truck, className: TONES.warn },
  pending: { icon: PackageX, className: TONES.muted },
};

const enrichmentMeta: Record<
  EnrichmentStatus,
  { icon: typeof CheckCircle; className: string }
> = {
  enriched: { icon: UserCheck, className: TONES.good },
  "not-enriched": { icon: UserX, className: TONES.muted },
};

/** Line items listed per row before collapsing into "+N more". */
const ITEMS_SHOWN = 3;

const PAID_ORDER: PaidStatus[] = ["paid", "partial", "unpaid"];
const DELIVERY_ORDER: DeliveryStatus[] = [
  "delivered",
  "scheduled",
  "assigned",
  "pending",
];
const ENRICHMENT_ORDER: EnrichmentStatus[] = ["enriched", "not-enriched"];

/** Digits only, without the +91 / leading-0 prefixes, so any phone format matches. */
const phoneDigits = (value: unknown) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^(?:91(?=\d{10}$)|0(?=\d{10}$))/, "");

/**
 * Builds the invoice search across name, phone, email and invoice number, or
 * null for an empty query. Every word must match somewhere ("ravi 9876").
 */
function invoiceSearchMatcher(
  query: string,
): ((invoice: Invoice) => boolean) | null {
  const trimmed = query.trim().toLowerCase();
  // A query of only phone characters ("+91 98765 43210") is one number, not several words.
  const terms = /^[\d\s+()-]+$/.test(trimmed)
    ? [trimmed]
    : trimmed.split(/\s+/).filter(Boolean);
  if (!terms.length) return null;
  return (invoice) => {
    const text = [
      invoice.customer_name,
      invoice.customer_email,
      invoice.invoice_no,
      invoice.gst_name,
      invoice.gst_email,
    ]
      .join(" ")
      .toLowerCase();
    const phones = [
      phoneDigits(invoice.customer_phone),
      phoneDigits(invoice.gst_phone),
    ];
    return terms.every((term) => {
      if (text.includes(term)) return true;
      const digits = phoneDigits(term);
      return (
        digits.length >= 3 && phones.some((phone) => phone.includes(digits))
      );
    });
  };
}

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
  return value ? new Date(value).toLocaleDateString("en-IN") : "—";
}

function normalizePrice(value: any) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const cleaned = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(cleaned) ? cleaned : 0;
}

export default function InvoicesTab() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [availableProducts, setAvailableProducts] = useState<DbProduct[]>([]);
  // Unmapped API data for the customer PDF, which runs the storefront's own normalizer.
  const rawInvoicesRef = useRef(new Map<string, unknown>());
  const cataloguePayloadRef = useRef<unknown>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(
    new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number | "all">(
    new Date().getFullYear(),
  );
  const [invoiceTypeFilter, setInvoiceTypeFilter] =
    useState<InvoiceTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidStatus | "all">("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | "all">(
    "all",
  );
  const [enrichmentFilter, setEnrichmentFilter] = useState<
    EnrichmentStatus | "all"
  >("all");
  const [formData, setFormData] = useState({ ...initialFormData });
  const [productForm, setProductForm] = useState({ ...initialProductForm });
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(
    null,
  );
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(
    new Set(),
  );
  // Checkboxes and the bulk bar appear only while selecting (Select button or long-press).
  const [selectMode, setSelectMode] = useState(false);

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
      const mapped = rawInvoices.map(mapInvoiceFromApi);
      rawInvoicesRef.current = new Map(
        mapped.map((invoice: Invoice, index: number) => [
          invoice.id,
          rawInvoices[index],
        ]),
      );
      setInvoices(mapped);
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
    cataloguePayloadRef.current = payload;
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

  const searchActive = searchQuery.trim().length > 0;

  // Period and type narrow the set the status summary counts. A search covers
  // every month and year, so customers are found regardless of the period.
  const periodInvoices = useMemo(() => {
    const matches = invoiceSearchMatcher(searchQuery);
    return invoices.filter((invoice) => {
      if (matches && !matches(invoice)) return false;
      const date = new Date(invoice.date);
      const monthOk =
        Boolean(matches) ||
        selectedMonth === "all" ||
        date.getMonth() + 1 === selectedMonth;
      const yearOk =
        Boolean(matches) ||
        selectedYear === "all" ||
        date.getFullYear() === selectedYear;
      const typeOk =
        invoiceTypeFilter === "all" ||
        (invoiceTypeFilter === "gst" && invoice.gst) ||
        (invoiceTypeFilter === "po" && invoice.po);
      return monthOk && yearOk && typeOk;
    });
  }, [invoices, selectedMonth, selectedYear, invoiceTypeFilter, searchQuery]);

  const filteredInvoices = useMemo(
    () =>
      periodInvoices.filter(
        (invoice) =>
          (paidFilter === "all" || paidStatusOf(invoice) === paidFilter) &&
          (deliveryFilter === "all" ||
            deliveryStatusOf(invoice) === deliveryFilter) &&
          (enrichmentFilter === "all" ||
            enrichmentStatusOf(invoice) === enrichmentFilter),
      ),
    [periodInvoices, paidFilter, deliveryFilter, enrichmentFilter],
  );

  const statusSummary = useMemo(() => {
    const blank = () => ({ count: 0, amount: 0 });
    const paid = Object.fromEntries(
      PAID_ORDER.map((key) => [key, blank()]),
    ) as Record<PaidStatus, { count: number; amount: number }>;
    const delivery = Object.fromEntries(
      DELIVERY_ORDER.map((key) => [key, blank()]),
    ) as Record<DeliveryStatus, { count: number; amount: number }>;
    const enrichment = Object.fromEntries(
      ENRICHMENT_ORDER.map((key) => [key, blank()]),
    ) as Record<EnrichmentStatus, { count: number; amount: number }>;
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

  const statusFiltersActive =
    paidFilter !== "all" ||
    deliveryFilter !== "all" ||
    enrichmentFilter !== "all";
  const clearStatusFilters = () => {
    setPaidFilter("all");
    setDeliveryFilter("all");
    setEnrichmentFilter("all");
  };

  const selectedInvoices = useMemo(
    () => invoices.filter((invoice) => selectedInvoiceIds.has(invoice.id)),
    [invoices, selectedInvoiceIds],
  );

  const allFilteredInvoicesSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((invoice) => selectedInvoiceIds.has(invoice.id));

  const toggleAllFilteredInvoices = () => {
    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      filteredInvoices.forEach((invoice) => {
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

  // Esc leaves selection mode, unless a dialog is open (it handles Esc itself).
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
      const year = new Date(invoice.date).getFullYear();
      if (!Number.isNaN(year)) set.add(year);
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

  const openInvoiceLink = (invoiceId: string) => {
    if (!invoiceId) {
      showToast("This invoice has no id yet.", "error");
      return;
    }
    window.open(getInvoiceLink(invoiceId), "_blank", "noopener,noreferrer");
  };

  const buildInvoiceMessage = (row: Partial<Invoice>) => {
    const prefix = row.gst
      ? "GST Invoice No"
      : row.po
        ? "PO Invoice No"
        : "Invoice No";
    return (
      `Dear *${row.customer_name || "Customer"}*, welcome to the AquaKart family!\n\n` +
      `*${prefix}:* 🔴 *${row.invoice_no}*\n\n` +
      `Live link: ${getInvoiceLink(String(row.id))}\n\n` +
      `🔴 *Please save our contact to access the invoice.*`
    );
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const total = calculateTotal(formData.products);
    const payload = buildApiPayload(formData, total);

    try {
      if (editingInvoice) {
        const { error } = await invoicesService.update(
          editingInvoice.id,
          payload,
        );
        if (error) throw error;
        showToast("Invoice updated successfully", "success");
      } else {
        const { data, error } = await invoicesService.create(payload);
        if (error) throw error;
        showToast("Invoice created successfully", "success");
        const created = (data as any)?.data ?? data;
        const id = created?.id || created?._id;
        const invoice_no =
          created?.invoice_no || created?.invoiceNo || formData.invoice_no;
        const phone = Number(formData.customer_phone);
        if (id && phone) {
          NotifyOperations.sendWhatsApp(
            phone,
            buildInvoiceMessage({
              gst: formData.gst,
              po: formData.po,
              customer_name: formData.customer_name,
              invoice_no,
              id,
            }),
          ).catch(() =>
            showToast("Invoice saved, but WhatsApp send failed.", "error"),
          );
        }
      }
      await fetchInvoices();
      resetForm();
    } catch (error) {
      showToast("Failed to save invoice", "error");
    }
  };

  const handleSend = async (invoice: Invoice) => {
    try {
      await NotifyOperations.sendWhatsApp(
        invoice.customer_phone,
        buildInvoiceMessage(invoice),
      );
      showToast(`Message sent to ${invoice.customer_phone}`, "success");
    } catch {
      showToast("Failed to send message", "error");
    }
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
    setProductForm((prev) => ({
      ...prev,
      productName: selectedProduct?.name || cleanedName,
      productPrice: selectedProduct?.price || 0,
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
          "Paid Status",
          "Delivery Status",
          "Enriched",
          "Link Opens",
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
        PAID_LABELS[paidStatusOf(invoice)],
        DELIVERY_LABELS[deliveryStatusOf(invoice)],
        ENRICHMENT_LABELS[enrichmentStatusOf(invoice)],
        invoice.open_count,
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
          `<tr><td>${invoice.invoice_no}</td><td>${formatDate(invoice.date)}</td><td>${invoice.customer_name}</td><td>${invoice.customer_phone}</td><td>${formatAmount(Number(invoice.total_amount) || 0)}</td><td>${PAID_LABELS[paidStatusOf(invoice)]}</td><td>${DELIVERY_LABELS[deliveryStatusOf(invoice)]}</td><td>${ENRICHMENT_LABELS[enrichmentStatusOf(invoice)]}</td></tr>`,
      )
      .join("");
    win.document.write(
      `<html><head><title>Invoices</title><style>body{font-family:Arial;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px}th{background:#f8fafc;text-align:left}</style></head><body><h2>Invoices Export</h2><table><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Paid</th><th>Delivery</th><th>Enriched</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
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

  // Admin-only: the same PDF the customer downloads from aquakart.co.in/invoice/:id.
  const downloadInvoicePdf = async (invoice: Invoice) => {
    if (downloadingId) return;
    setDownloadingId(invoice.id);
    try {
      let raw = rawInvoicesRef.current.get(invoice.id);
      if (!raw) {
        const { data, error } = await invoicesService.fetchById(invoice.id);
        if (error || !data)
          throw new Error(String(error || "Invoice not found"));
        raw = data;
      }
      const result = await downloadCustomerInvoicePdf(
        raw,
        cataloguePayloadRef.current,
      );
      showToast(
        result.mode === "viewer"
          ? "Invoice PDF opened"
          : `Downloaded ${result.fileName}`,
        "success",
      );
    } catch {
      showToast("Failed to create the invoice PDF", "error");
    } finally {
      setDownloadingId(null);
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
      const response = await fetch(`${API_BASE_URL}/admin/all-invoices`);
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
  // grouped columns instead of nine truncated single-line cells.
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
      sortValue: (invoice) => new Date(invoice.date).getTime() || 0,
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
                  {formatAmount(product.productPrice)}
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
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <StatusBadge
              kind="enrichment"
              status={enrichmentStatusOf(invoice)}
            />
            <span
              title={
                invoice.last_opened_at
                  ? `Last opened ${new Date(invoice.last_opened_at).toLocaleString("en-IN")}`
                  : undefined
              }
            >
              {invoice.open_count
                ? `opened ${invoice.open_count}×`
                : "never opened"}
            </span>
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
      label: "Open",
      icon: <ExternalLink className="h-4 w-4" />,
      onClick: (row) => openInvoiceLink(String(row.id)),
    },
    ...(isAdmin
      ? [
          {
            label: "Download PDF",
            icon: <Download className="h-4 w-4" />,
            onClick: downloadInvoicePdf,
          },
        ]
      : []),
    { label: "Send", icon: <Send className="h-4 w-4" />, onClick: handleSend },
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

  // Actions inline as icon buttons: no extra "Actions" row under every invoice.
  const tableColumns: AquaTableColumn<Invoice>[] = [
    ...invoiceTableColumns,
    {
      key: "actions",
      header: "Actions",
      className: "px-3 py-3",
      headerClassName: "w-[7.75rem]",
      render: (invoice) => (
        <span className="grid w-[6.5rem] grid-cols-3 gap-1">
          {invoiceTableActions.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              aria-label={`${action.label} ${invoice.invoice_no}`}
              disabled={
                action.label === "Download PDF" && downloadingId === invoice.id
              }
              onClick={(event) => {
                event.stopPropagation();
                action.onClick(invoice);
              }}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10 ${
                action.label === "Delete"
                  ? "hover:text-rose-600 dark:hover:text-rose-400"
                  : ""
              }`}
            >
              {action.icon}
            </button>
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
        {/* Control bar: search, create, export, type and period in one compact panel. */}
        <LiquidPanel className="space-y-2 p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                Search all invoices by name, phone or email
              </span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, phone, email or invoice no."
                className="liquid-field w-full"
                style={{ paddingLeft: "2.25rem" }}
                autoComplete="off"
              />
            </label>
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

          {searchActive && (
            <p
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-slate-600 dark:text-white/60"
              role="status"
            >
              <span>
                <strong className="text-neutral-950 dark:text-white">
                  {periodInvoices.length}
                </strong>{" "}
                match
                {periodInvoices.length === 1 ? "" : "es"} across all months and
                years
                {periodInvoices.length > 0 &&
                  ` · ${formatAmount(periodInvoices.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0))}`}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-300"
              >
                Clear
              </button>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex shrink-0 rounded-xl bg-slate-100 p-0.5 dark:bg-white/5"
              role="group"
              aria-label="Invoice type"
            >
              {invoiceTypeOptions.map((option) => {
                const active = invoiceTypeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setInvoiceTypeFilter(option.value as InvoiceTypeFilter)
                    }
                    className={`min-h-9 rounded-lg px-2.5 text-xs font-bold transition-colors sm:px-3 sm:text-sm ${
                      active
                        ? "bg-white text-blue-700 shadow dark:bg-white/15 dark:text-white"
                        : "text-slate-600 hover:text-black dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    {option.shortLabel}
                  </button>
                );
              })}
            </div>
            <div
              className={`flex min-w-[12rem] flex-1 gap-2 sm:flex-none ${searchActive ? "opacity-50" : ""}`}
              title={
                searchActive
                  ? "Month and year are ignored while searching"
                  : undefined
              }
            >
              <LiquidSelect
                aria-label="Month"
                className="liquid-select-compact"
                value={selectedMonth === "all" ? "all" : String(selectedMonth)}
                onChange={(event) =>
                  setSelectedMonth(
                    event.target.value === "all"
                      ? "all"
                      : Number(event.target.value),
                  )
                }
                wrapperClassName="min-w-0 flex-1 sm:w-36 sm:flex-none"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.value === "all"
                      ? "All months"
                      : month.label.slice(0, 3)}
                  </option>
                ))}
              </LiquidSelect>
              <LiquidSelect
                aria-label="Year"
                className="liquid-select-compact"
                value={selectedYear === "all" ? "all" : String(selectedYear)}
                onChange={(event) =>
                  setSelectedYear(
                    event.target.value === "all"
                      ? "all"
                      : Number(event.target.value),
                  )
                }
                wrapperClassName="w-24 shrink-0 sm:w-28"
              >
                {yearOptions.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </LiquidSelect>
            </div>
            {searchActive && (
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Month/year ignored while searching
              </span>
            )}
          </div>
        </LiquidPanel>

        {importStatus && (
          <LiquidPanel className="p-3 text-sm font-bold text-neutral-950 dark:text-white">
            {importStatus}
          </LiquidPanel>
        )}

        {/* Summary: one stat strip (scrolls sideways on phones) plus status chips. */}
        <LiquidPanel className="space-y-3 p-2 sm:p-3">
          <div className="-mx-1 grid snap-x auto-cols-[minmax(8.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto px-1 pb-1 lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible lg:pb-0">
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
          </div>

          <div className="space-y-1.5 border-t border-slate-200/70 pt-2 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                {searchActive
                  ? "Status · search results"
                  : "Status · this period"}{" "}
                · tap to filter
              </p>
              {statusFiltersActive && (
                <button
                  type="button"
                  onClick={clearStatusFilters}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300"
                >
                  Clear filters
                </button>
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
              value={enrichmentFilter}
              onChange={setEnrichmentFilter}
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
                <label
                  className="flex min-h-9 shrink-0 items-center gap-2 px-1"
                  title="Select every invoice in the current list"
                >
                  <input
                    type="checkbox"
                    checked={allFilteredInvoicesSelected}
                    ref={(input) => {
                      if (input)
                        input.indeterminate =
                          selectedInvoices.length > 0 &&
                          !allFilteredInvoicesSelected;
                    }}
                    onChange={toggleAllFilteredInvoices}
                    className="h-4 w-4 rounded border-slate-300 accent-sky-500"
                    aria-label="Select all invoices in the list"
                  />
                </label>
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

        <div className="hidden lg:block">
          <AquaGenericTable
            heading="Invoices"
            subHeading={`${filteredInvoices.length} result${filteredInvoices.length === 1 ? "" : "s"}`}
            columns={tableColumns}
            data={filteredInvoices}
            isLoading={loading}
            emptyMessage={
              searchActive
                ? `No invoices match "${searchQuery.trim()}"`
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
              !selectMode && filteredInvoices.length > 0 ? (
                <SelectModeButton onClick={() => setSelectMode(true)} />
              ) : undefined
            }
          />
        </div>

        {filteredInvoices.length > 0 && !selectMode && (
          <div className="flex items-center justify-between gap-2 px-1 lg:hidden">
            <span className="text-xs text-slate-500 dark:text-white/50">
              {filteredInvoices.length} invoice
              {filteredInvoices.length === 1 ? "" : "s"}
              <span className="hidden sm:inline">
                {" "}
                · long-press a card to select
              </span>
            </span>
            <SelectModeButton onClick={() => setSelectMode(true)} />
          </div>
        )}

        {/* Cards on phones and tablets (2 columns on iPad); the wide table needs ≥1024px. */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
          {filteredInvoices.length === 0 ? (
            <LiquidPanel className="p-6 text-center text-sm text-slate-500 dark:text-white/50 md:col-span-2">
              {searchActive
                ? `No invoices match "${searchQuery.trim()}"`
                : "No invoices found"}
            </LiquidPanel>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                onOpen={() => openInvoiceLink(String(invoice.id))}
                onView={() => {
                  setViewingInvoice(invoice);
                  setShowViewModal(true);
                }}
                onSend={() => handleSend(invoice)}
                onDownload={
                  isAdmin ? () => downloadInvoicePdf(invoice) : undefined
                }
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
      />
      <AquaInvoiceViewDialog
        showModal={showViewModal}
        viewingInvoice={viewingInvoice}
        setModal={setShowViewModal}
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

/** Export and import actions folded into one menu to keep the control bar to a single row. */
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
      <div className="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-900">
        {items.map(([label, Icon, action]) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={run(action)}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-neutral-950 hover:bg-slate-100 disabled:opacity-50 dark:text-white dark:hover:bg-white/10"
          >
            <Icon
              className="h-4 w-4 text-slate-500 dark:text-white/60"
              aria-hidden="true"
            />
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}

type StatusBadgeProps =
  | { kind: "paid"; status: PaidStatus }
  | { kind: "delivery"; status: DeliveryStatus }
  | { kind: "enrichment"; status: EnrichmentStatus };

function StatusBadge(props: StatusBadgeProps) {
  const { icon: Icon, className } =
    props.kind === "paid"
      ? paidMeta[props.status]
      : props.kind === "delivery"
        ? deliveryMeta[props.status]
        : enrichmentMeta[props.status];
  const label =
    props.kind === "paid"
      ? PAID_LABELS[props.status]
      : props.kind === "delivery"
        ? DELIVERY_LABELS[props.status]
        : ENRICHMENT_LABELS[props.status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

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
  meta: Record<S, { icon: typeof CheckCircle; className: string }>;
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
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "all" : status)}
              className={`inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-bold transition ${className} ${
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectModeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-white/10"
    >
      <ListChecks className="h-4 w-4" aria-hidden="true" />
      Select
    </button>
  );
}

const LONG_PRESS_MS = 450;

function InvoiceMobileCard({
  invoice,
  onOpen,
  onView,
  onSend,
  onDownload,
  onEdit,
  onDelete,
  selectMode,
  selected,
  onToggleSelection,
  onLongPress,
}: {
  invoice: Invoice;
  onOpen: () => void;
  onView: () => void;
  onSend: () => void;
  onDownload?: () => void;
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
      className={`p-3 transition-shadow ${selected ? "ring-2 ring-sky-400/80" : ""} ${selectMode ? "cursor-pointer" : ""}`}
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
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelection}
              tabIndex={-1}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-slate-300 accent-sky-500"
              aria-hidden="true"
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
          <StatusBadge kind="enrichment" status={enrichmentStatusOf(invoice)} />
        </div>
      </div>

      {/* Hidden while selecting so a tap can't edit or delete by accident. */}
      {!selectMode && (
        <div
          className={`mt-2.5 grid gap-1.5 ${onDownload ? "grid-cols-6" : "grid-cols-5"}`}
        >
          <LiquidIconButton
            onClick={onOpen}
            title="Open Invoice"
            aria-label="Open invoice"
          >
            <ExternalLink className="h-4 w-4" />
          </LiquidIconButton>
          {onDownload && (
            <LiquidIconButton
              onClick={onDownload}
              title="Download PDF"
              aria-label="Download invoice PDF"
            >
              <Download className="h-4 w-4" />
            </LiquidIconButton>
          )}
          <LiquidIconButton
            onClick={onView}
            title="View"
            aria-label="View invoice"
          >
            <Eye className="h-4 w-4" />
          </LiquidIconButton>
          <LiquidIconButton
            onClick={onSend}
            title="Send WhatsApp"
            aria-label="Send on WhatsApp"
          >
            <Send className="h-4 w-4 text-green-500" />
          </LiquidIconButton>
          <LiquidIconButton
            onClick={onEdit}
            title="Edit"
            aria-label="Edit invoice"
          >
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
