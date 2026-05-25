import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Copy,
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
import NotifyOperations from "../../services/notify";
import priceUtils from "../../utils/priceUtils";
import { useToast } from "../Toast";
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
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
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
  { value: "po", label: "PO Invoices" },
];

const manualProducts: DbProduct[] = [
  { name: "Crompton 1 hp", price: 12000, id: "crompton-1-hp", sku: null },
  { name: "Kent Automatic Sandfilter", price: 15000, id: "kent-auto-sandfilter", sku: null },
  { name: "Crompton 0.5 hp", price: 8000, id: "crompton-0-5-hp", sku: null },
  { name: "Racold Heat pump", price: 12000, id: "racold-heat-pump", sku: null },
  { name: "Plumbing-services", price: 1000, id: "plumbing-services", sku: null },
];

const statusMeta = {
  paid: {
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  partial: {
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  },
  unpaid: {
    icon: XCircle,
    className: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  },
};

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

function normalizeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizePrice(value: any) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const cleaned = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(cleaned) ? cleaned : 0;
}

function mapInvoiceFromApi(inv: any): Invoice {
  const customer = inv.customerDetails ?? {};
  const gstDetails = inv.gstDetails ?? {};
  const transport = inv.transport ?? {};
  const productSources = [
    inv.products,
    inv.items,
    inv.invoice_items,
    inv.invoiceItems,
    inv.order_items,
    inv.orderItems,
  ];
  const rawProducts = productSources.find((item) => Array.isArray(item)) ?? [];

  const products: Product[] = rawProducts.map((p: any, index: number) => {
    const quantity =
      normalizeNumber(p.productQuantity ?? p.quantity ?? p.qty ?? p.count) || 1;
    let unitPrice =
      [
        p.productPrice,
        p.unit_price,
        p.unitPrice,
        p.price,
        p.mrp,
        p.rate,
        p.salePrice,
        p.selling_price,
      ]
        .map(normalizeNumber)
        .find((val) => val > 0) ?? 0;

    if (!unitPrice && p.total) unitPrice = normalizeNumber(p.total) / quantity || 0;
    if (!unitPrice && p.total_price) unitPrice = normalizeNumber(p.total_price) / quantity || 0;

    return {
      productName:
        p.productName ?? p.name ?? p.product_name ?? p.title ?? `Product ${index + 1}`,
      productQuantity: quantity,
      productPrice: unitPrice,
      productSerialNo: p.productSerialNo ?? p.serial_no ?? p.sku ?? "",
    };
  });

  const computedTotal = products.reduce((sum, product) => sum + product.productPrice, 0);

  return {
    id: inv.id ?? inv._id ?? inv.invoice_id ?? `inv-${Math.random().toString(36).slice(2, 10)}`,
    invoice_no: inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number ?? "",
    date: inv.date || inv.issue_date || inv.created_at || inv.createdAt || new Date().toISOString(),
    customer_name: customer.name ?? inv.customer_name ?? "",
    customer_phone: (customer.phone ?? inv.customer_phone ?? "").toString(),
    customer_email: customer.email ?? inv.customer_email ?? "",
    customer_address: customer.address ?? inv.customer_address ?? "",
    gst: Boolean(inv.gst),
    po: Boolean(inv.po),
    quotation: Boolean(inv.quotation),
    gst_name: gstDetails.gstName ?? inv.gst_name ?? null,
    gst_no: gstDetails.gstNo ?? inv.gst_no ?? null,
    gst_phone: gstDetails.gstPhone?.toString?.() ?? inv.gst_phone ?? null,
    gst_email: gstDetails.gstEmail ?? inv.gst_email ?? null,
    gst_address: gstDetails.gstAddress ?? inv.gst_address ?? null,
    products,
    delivered_by: transport.deliveredBy ?? inv.delivered_by ?? null,
    delivery_date: transport.deliveryDate ?? inv.delivery_date ?? null,
    paid_status: inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? "unpaid",
    payment_type: inv.payment_type ?? inv.paymentType ?? "cash",
    aquakart_online_user: Boolean(inv.aquakart_online_user ?? inv.aquakartOnlineUser),
    aquakart_invoice: Boolean(inv.aquakart_invoice ?? inv.aquakartInvoice),
    total_amount: Number(inv.total_amount ?? inv.total ?? computedTotal) || 0,
    created_at: inv.created_at ?? inv.createdAt ?? new Date().toISOString(),
  };
}

export default function InvoicesTab() {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | "all">(new Date().getFullYear());
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<InvoiceTypeFilter>("all");
  const [formData, setFormData] = useState({ ...initialFormData });
  const [productForm, setProductForm] = useState({ ...initialProductForm });
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

  const fetchInvoices = async ({ withLoading = true }: { withLoading?: boolean } = {}) => {
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
      setInvoices(rawInvoices.map(mapInvoiceFromApi));
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
            discountedPrice ?? p.price ?? p.selling_price ?? p.salePrice ?? p.mrp ?? 0,
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
      await Promise.all([fetchInvoices({ withLoading: false }), fetchProducts()]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const draft = localStorage.getItem("invoiceDraft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.formData) setFormData({ ...initialFormData, ...parsed.formData });
        if (parsed.productForm) setProductForm({ ...initialProductForm, ...parsed.productForm });
      } catch (error) {
        console.error("Failed to parse saved draft", error);
      }
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    localStorage.setItem("invoiceDraft", JSON.stringify({ formData, productForm }));
  }, [formData, productForm, draftHydrated]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const date = new Date(invoice.date);
      const monthOk = selectedMonth === "all" || date.getMonth() + 1 === selectedMonth;
      const yearOk = selectedYear === "all" || date.getFullYear() === selectedYear;
      const typeOk =
        invoiceTypeFilter === "all" ||
        (invoiceTypeFilter === "gst" && invoice.gst) ||
        (invoiceTypeFilter === "po" && invoice.po);
      return monthOk && yearOk && typeOk;
    });
  }, [invoices, selectedMonth, selectedYear, invoiceTypeFilter]);

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

  const totalValue = filteredInvoices.reduce((total, invoice) => total + invoice.total_amount, 0);
  const totalInvoices = filteredInvoices.length;
  const averageSale = totalInvoices > 0 ? totalValue / totalInvoices : 0;
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

  const buildInvoiceMessage = (row: Partial<Invoice>) => {
    const prefix = row.gst ? "GST Invoice No" : row.po ? "PO Invoice No" : "Invoice No";
    return (
      `Dear *${row.customer_name || "Customer"}*, welcome to the AquaKart family!\n\n` +
      `*${prefix}:* 🔴 *${row.invoice_no}*\n\n` +
      `Live link: https://admin.aquakart.co.in/invoice/${row.id}\n\n` +
      `🔴 *Please save our contact to access the invoice.*`
    );
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const total = calculateTotal(formData.products);
    const payload = buildApiPayload(formData, total);

    try {
      if (editingInvoice) {
        const { error } = await invoicesService.update(editingInvoice.id, payload);
        if (error) throw error;
        showToast("Invoice updated successfully", "success");
      } else {
        const { data, error } = await invoicesService.create(payload);
        if (error) throw error;
        showToast("Invoice created successfully", "success");
        const created = (data as any)?.data ?? data;
        const id = created?.id || created?._id;
        const invoice_no = created?.invoice_no || created?.invoiceNo || formData.invoice_no;
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
          ).catch(() => showToast("Invoice saved, but WhatsApp send failed.", "error"));
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
      await NotifyOperations.sendWhatsApp(invoice.customer_phone, buildInvoiceMessage(invoice));
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
      setFormData({ ...formData, products: [...formData.products, { ...productForm }] });
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
    setFormData({ ...formData, products: formData.products.filter((_, i) => i !== index) });
    if (editingProductIndex === index) cancelEditProduct();
  };

  const exportToCsv = () => exportRows("invoices.csv", filteredInvoices, false);
  const exportToSalesCsv = () => exportRows("sales_invoices.csv", filteredInvoices, true);

  const exportRows = (fileName: string, rowsSource: Invoice[], salesOnly: boolean) => {
    if (!rowsSource.length) {
      showToast("No invoices to export", "error");
      return;
    }
    const headers = salesOnly
      ? ["Invoice No", "Date", "Customer", "GST", "GST No", "GST Name", "Base Price", "GST (18%)", "Total Amount"]
      : ["Invoice No", "Date", "Customer", "Phone", "Email", "Address", "GST", "PO", "Quotation", "Payment Type", "Delivery Date", "Delivered By", "Base Price", "GST (18%)", "Total Amount", "Status"];

    const rows = rowsSource.map((invoice) => {
      const base = formatAmount(priceUtils.getBasePrice(Number(invoice.total_amount) || 0));
      const gst = formatAmount(priceUtils.getGSTValue(Number(invoice.total_amount) || 0));
      if (salesOnly) {
        return [invoice.invoice_no, formatDate(invoice.date), invoice.customer_name, invoice.gst ? "Yes" : "No", invoice.gst_no ?? "", invoice.gst_name ?? "", base, gst, formatAmount(Number(invoice.total_amount) || 0)];
      }
      return [invoice.invoice_no, formatDate(invoice.date), invoice.customer_name, invoice.customer_phone, invoice.customer_email, invoice.customer_address, invoice.gst ? "Yes" : "No", invoice.po ? "Yes" : "No", invoice.quotation ? "Yes" : "No", invoice.payment_type, formatDate(invoice.delivery_date), invoice.delivered_by || "", base, gst, formatAmount(Number(invoice.total_amount) || 0), invoice.paid_status];
    });
    const escapeCsv = (value: string) => `"${(value || "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map((value) => escapeCsv(String(value ?? ""))).join(","))].join("\n");
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
        (invoice) => `<tr><td>${invoice.invoice_no}</td><td>${formatDate(invoice.date)}</td><td>${invoice.customer_name}</td><td>${invoice.customer_phone}</td><td>${formatAmount(Number(invoice.total_amount) || 0)}</td><td>${invoice.paid_status}</td></tr>`,
      )
      .join("");
    win.document.write(`<html><head><title>Invoices</title><style>body{font-family:Arial;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px}th{background:#f8fafc;text-align:left}</style></head><body><h2>Invoices Export</h2><table><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 200);
  };

  const importInvoicesFromAPI = async () => {
    setImporting(true);
    setImportStatus("Fetching invoices from API...");
    try {
      const response = await fetch("https://api.aquakart.co.in/v1/crm/admin/all-invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices from API");
      const apiInvoices = await response.json();
      setImportStatus(`Found ${apiInvoices.length} invoices. Refreshing...`);
      await fetchInvoices();
      setImportStatus(`Import check complete. Found ${apiInvoices.length} invoices.`);
      setTimeout(() => setImportStatus(""), 5000);
    } catch {
      setImportStatus("Error: Failed to import invoices");
    } finally {
      setImporting(false);
    }
  };

  const invoiceTableColumns: AquaTableColumn<Invoice>[] = [
    { key: "invoice_no", header: "Invoice No", render: (invoice) => invoice.invoice_no || "—" },
    { key: "date", header: "Date", render: (invoice) => formatDate(invoice.date) },
    { key: "customer_name", header: "Customer" },
    { key: "customer_phone", header: "Phone" },
    { key: "customer_email", header: "Email", render: (invoice) => invoice.customer_email || "—" },
    { key: "customer_address", header: "Address", render: (invoice) => (invoice.customer_address || "—").slice(0, 40) },
    { key: "payment_type", header: "Payment Type", render: (invoice) => invoice.payment_type || "—" },
    { key: "delivery", header: "Delivery", render: (invoice) => `${formatDate(invoice.delivery_date)}${invoice.delivered_by ? ` · ${invoice.delivered_by}` : ""}` },
    { key: "total_amount", header: "Amount", className: "text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400", render: (invoice) => formatAmount(Number(invoice.total_amount) || 0) },
    { key: "paid_status", header: "Paid Status", render: (invoice) => <StatusBadge status={invoice.paid_status} /> },
  ];

  const invoiceTableActions: AquaTableAction<Invoice>[] = [
    { label: "Open", icon: <ExternalLink className="h-4 w-4" />, onClick: (row) => navigate(`/invoice/${row.id}`) },
    { label: "Send", icon: <Send className="h-4 w-4" />, onClick: handleSend },
    { label: "Clone", icon: <Copy className="h-4 w-4" />, onClick: handleClone },
    { label: "Edit", icon: <Edit2 className="h-4 w-4" />, onClick: handleEdit },
    { label: "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: (row) => setDeleteTarget(row) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <TabInnerContent title="Invoices" description="Manage customer invoices and billing">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <LiquidButton onClick={exportToPdf} disabled={importing} variant="soft">
              <FileText className="h-4 w-4" /> PDF
            </LiquidButton>
            <LiquidButton onClick={exportToCsv} disabled={importing} variant="soft">
              <FileDown className="h-4 w-4" /> Excel
            </LiquidButton>
            <LiquidButton onClick={exportToSalesCsv} disabled={importing} variant="soft">
              Sales Excel
            </LiquidButton>
            <LiquidButton onClick={importInvoicesFromAPI} disabled={importing} variant="soft">
              <Download className="h-4 w-4" /> {importing ? "Importing..." : "Import"}
            </LiquidButton>
            <LiquidButton onClick={() => setShowModal(true)} variant="primary" className="col-span-2 md:col-span-1">
              <Plus className="h-4 w-4" /> Create Invoice
            </LiquidButton>
          </div>
        </div>

        {importStatus && (
          <LiquidPanel className="p-4 text-sm font-bold text-neutral-950 dark:text-white">
            {importStatus}
          </LiquidPanel>
        )}

        <LiquidPanel className="p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {invoiceTypeOptions.map((option) => (
              <LiquidButton
                key={option.value}
                variant={invoiceTypeFilter === option.value ? "primary" : "soft"}
                onClick={() => setInvoiceTypeFilter(option.value as InvoiceTypeFilter)}
              >
                {option.label}
              </LiquidButton>
            ))}
          </div>
        </LiquidPanel>

        <LiquidPanel className="p-4 sm:p-6">
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
            <LiquidDropdown
              label="Month"
              value={selectedMonth === "all" ? "all" : String(selectedMonth)}
              options={months}
              onChange={(value) => setSelectedMonth(value === "all" ? "all" : Number(value))}
            />
            <LiquidDropdown
              label="Year"
              value={selectedYear === "all" ? "all" : String(selectedYear)}
              options={yearOptions}
              onChange={(value) => setSelectedYear(value === "all" ? "all" : Number(value))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InvoiceStat label="Total Value" value={formatAmount(totalValue)} />
            <InvoiceStat label="Total Invoices" value={String(totalInvoices)} />
            <InvoiceStat label="Average Sale" value={formatAmount(averageSale)} />
            <InvoiceStat label="Profit on Sales" value={formatAmount(profitOnSales)} accent />
          </div>
        </LiquidPanel>

        <div className="hidden md:block">
          <AquaGenericTable
            heading="Invoices"
            subHeading={`${filteredInvoices.length} result${filteredInvoices.length === 1 ? "" : "s"}`}
            columns={invoiceTableColumns}
            data={filteredInvoices}
            isLoading={loading}
            emptyMessage="No invoices found"
            onRowClick={(row) => {
              setViewingInvoice(row);
              setShowViewModal(true);
            }}
            actionsLabel="Actions"
            enableFilter
            actions={invoiceTableActions}
          />
        </div>

        <div className="space-y-4 md:hidden">
          {filteredInvoices.length === 0 ? (
            <LiquidPanel className="p-10 text-center text-slate-500 dark:text-white/50">
              No invoices found
            </LiquidPanel>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                onOpen={() => navigate(`/invoice/${invoice.id}`)}
                onView={() => {
                  setViewingInvoice(invoice);
                  setShowViewModal(true);
                }}
                onSend={() => handleSend(invoice)}
                onEdit={() => handleEdit(invoice)}
                onDelete={() => setDeleteTarget(invoice)}
              />
            ))
          )}
        </div>

        {filteredInvoices.length === 0 && invoices.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/5">
              <FileText className="h-12 w-12 text-slate-400 dark:text-white/20" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-neutral-950 dark:text-white">No invoices found</h3>
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
              <h3 className="mb-2 text-xl font-bold text-neutral-950 dark:text-white">Delete Invoice?</h3>
              <p className="mb-6 text-sm leading-relaxed text-black dark:text-white/60">
                You are about to delete invoice <strong>{deleteTarget.invoice_no}</strong> for <strong>{deleteTarget.customer_name}</strong>. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <LiquidButton onClick={() => setDeleteTarget(null)} variant="soft" className="flex-1">
                  Cancel
                </LiquidButton>
                <LiquidButton onClick={handleDelete} variant="danger" className="flex-1">
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

function InvoiceStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <LiquidPanel className="p-5">
      <p className="mb-1 text-sm font-bold text-black dark:text-white/60">{label}</p>
      <p className={`text-2xl font-black ${accent ? "text-green-600 dark:text-green-400" : "text-neutral-950 dark:text-white"}`}>
        {value}
      </p>
    </LiquidPanel>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status as keyof typeof statusMeta] || statusMeta.unpaid;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function InvoiceMobileCard({
  invoice,
  onOpen,
  onView,
  onSend,
  onEdit,
  onDelete,
}: {
  invoice: Invoice;
  onOpen: () => void;
  onView: () => void;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <LiquidPanel className="p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-neutral-950 dark:text-white">{invoice.invoice_no || "—"}</h3>
          <p className="text-xs text-black dark:text-white/60">{formatDate(invoice.date)}</p>
        </div>
        <StatusBadge status={invoice.paid_status} />
      </div>

      <div className="mb-4 space-y-1.5">
        <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">{invoice.customer_name}</p>
        <p className="text-xs text-black dark:text-white/60">{invoice.customer_phone}</p>
        <div className="flex flex-wrap gap-1">
          {invoice.gst && <LiquidBadge>GST</LiquidBadge>}
          {invoice.po && <LiquidBadge>PO</LiquidBadge>}
          {invoice.quotation && <LiquidBadge>QUO</LiquidBadge>}
        </div>
        <p className="pt-2 text-lg font-black text-emerald-600 dark:text-emerald-400">
          {formatAmount(Number(invoice.total_amount) || 0)}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <LiquidIconButton onClick={onOpen} title="Open Invoice"><ExternalLink className="h-4 w-4" /></LiquidIconButton>
        <LiquidIconButton onClick={onView} title="View"><Eye className="h-4 w-4" /></LiquidIconButton>
        <LiquidIconButton onClick={onSend} title="Send WhatsApp"><Send className="h-4 w-4 text-green-500" /></LiquidIconButton>
        <LiquidIconButton onClick={onEdit} title="Edit"><Edit2 className="h-4 w-4" /></LiquidIconButton>
        <LiquidIconButton onClick={onDelete} title="Delete"><Trash2 className="h-4 w-4 text-rose-500" /></LiquidIconButton>
      </div>
    </LiquidPanel>
  );
}
