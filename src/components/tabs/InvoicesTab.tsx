import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { invoicesService, productsService } from "../../services/apiService";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import priceUtils from "../../utils/priceUtils";
import NotifyOperations from "../../services/notify";
import {
  Plus,
  Edit2,
  Trash2,
  Send,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Download,
  Copy,
  FileText,
  FileDown,
} from "lucide-react";
import AquaGenericTable, {
  AquaTableAction,
  AquaTableColumn,
} from "../modular/invoices/invoiceTable";
import AquaInvoiceFormDialog from "../modular/invoices/invoiceDialog";
import AquaInvoiceViewDialog from "../modular/invoices/invoiceView";
import {
  Invoice,
  InvoiceTypeFilter,
  Product,
  DbProduct,
} from "../modular/invoices/invoice.types";

export default function InvoicesTab() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>("");
  const { user } = useAuth();

  const initialFormData = {
    invoice_no: "",
    date: new Date().toISOString().split("T")[0],
    customer_name: "",
    customer_phone: "",
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

  const [formData, setFormData] = useState({
    ...initialFormData,
  });

  const [productForm, setProductForm] = useState({
    ...initialProductForm,
  });

  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(
    null,
  );

  useKeyboardShortcut(
    "Escape",
    () => {
      setShowModal(false);
      setShowViewModal(false);
    },
    showModal || showViewModal,
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchInvoices({ withLoading: false }),
        fetchProducts(),
      ]);
      setLoading(false);
    };

    loadData();
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
      } catch (err) {
        console.error("Failed to parse saved draft", err);
      }
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const payload = JSON.stringify({ formData, productForm });
    localStorage.setItem("invoiceDraft", payload);
  }, [formData, productForm, draftHydrated]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, selectedMonth, selectedYear, invoiceTypeFilter]);

  const filterInvoices = () => {
    const filtered = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      const monthMatch =
        selectedMonth === "all"
          ? true
          : invoiceDate.getMonth() + 1 === selectedMonth;
      const yearMatch =
        selectedYear === "all"
          ? true
          : invoiceDate.getFullYear() === selectedYear;

      if (!(monthMatch && yearMatch)) return false;

      if (invoiceTypeFilter === "gst") {
        return invoice.gst === true;
      } else if (invoiceTypeFilter === "po") {
        return invoice.po === true;
      }
      return true;
    });

    setFilteredInvoices(filtered);
  };

  const fetchInvoices = async ({
    withLoading = true,
  }: { withLoading?: boolean } = {}) => {
    if (withLoading) setLoading(true);
    try {
      const { data, error } = await invoicesService.getAll();
      if (!error) {
        const rawInvoices = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];

        setInvoices(rawInvoices.map(mapInvoiceFromApi));
      } else {
        setInvoices([]);
      }
    } finally {
      if (withLoading) setLoading(false);
    }
  };

  const importInvoicesFromAPI = async () => {
    if (!user?.id) {
      setImportStatus("Error: User not authenticated");
      return;
    }

    setImporting(true);
    setImportStatus("Fetching invoices from API...");

    try {
      const response = await fetch(
        "https://api.aquakart.co.in/v1/crm/admin/all-invoices",
      );

      if (!response.ok) {
        throw new Error("Failed to fetch invoices from API");
      }

      const apiInvoices = await response.json();
      setImportStatus(`Found ${apiInvoices.length} invoices. Importing...`);

      let successCount = 0;
      let errorCount = 0;

      for (const apiInvoice of apiInvoices) {
        try {
          const products = apiInvoice.products.map((p: any) => ({
            productName: p.productName,
            productQuantity: p.productQuantity,
            productPrice: p.productPrice,
            productSerialNo: p.productSerialNo || "",
          }));

          const total = products.reduce(
            (sum: number, p: any) => sum + p.productPrice * p.productQuantity,
            0,
          );

          const invoiceData = {
            user_id: user.id,
            invoice_no: apiInvoice.invoiceNo,
            date: apiInvoice.date,
            customer_name: apiInvoice.customerDetails.name,
            customer_phone: apiInvoice.customerDetails.phone.toString(),
            customer_email: apiInvoice.customerDetails.email,
            customer_address: apiInvoice.customerDetails.address,
            gst: apiInvoice.gst || false,
            po: apiInvoice.po || false,
            quotation: apiInvoice.quotation || false,
            gst_name: apiInvoice.gstDetails?.gstName || "",
            gst_no: apiInvoice.gstDetails?.gstNo || "",
            gst_phone: apiInvoice.gstDetails?.gstPhone?.toString() || "",
            gst_email: apiInvoice.gstDetails?.gstEmail || "",
            gst_address: apiInvoice.gstDetails?.gstAddress || "",
            products: products,
            delivered_by: apiInvoice.transport?.deliveredBy || "",
            delivery_date: apiInvoice.transport?.deliveryDate || null,
            paid_status: apiInvoice.paidStatus || "unpaid",
            payment_type: apiInvoice.paymentType || "cash",
            aquakart_online_user: apiInvoice.aquakartOnlineUser || false,
            aquakart_invoice: apiInvoice.aquakartInvoice || false,
            total_amount: total,
          };

          const { error } = await invoicesService.upsert(invoiceData);

          if (error) {
            console.error(
              `Error importing invoice ${apiInvoice.invoiceNo}:`,
              error,
            );
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(
            `Error processing invoice ${apiInvoice.invoiceNo}:`,
            err,
          );
          errorCount++;
        }
      }

      setImportStatus(
        `Import complete! Success: ${successCount}, Errors: ${errorCount}`,
      );

      await fetchInvoices();

      setTimeout(() => {
        setImportStatus("");
      }, 5000);
    } catch (error) {
      console.error("Import error:", error);
      setImportStatus("Error: Failed to import invoices");
    } finally {
      setImporting(false);
    }
  };

  const calculateTotal = (products: Product[]) =>
    products.reduce(
      (sum, product) => sum + product.productPrice * product.productQuantity,
      0,
    );

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
    user_id: user?.id,
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const total = calculateTotal(formData.products);

    const invoiceData = buildApiPayload(formData, total);

    try {
      if (editingInvoice) {
        const { error } = await invoicesService.update(
          editingInvoice.id,
          invoiceData,
        );

        if (error) throw error;

        showToast("Invoice updated successfully", "success");
        fetchInvoices();
        resetForm();
      } else {
        const { error } = await invoicesService.create(invoiceData);

        if (error) throw error;

        showToast("Invoice created successfully", "success");
        fetchInvoices();
        resetForm();
      }
    } catch (error) {
      showToast("Failed to save invoice", "error");
    }
  };

  const handleSend = async (row: any) => {
    const { gst, po, customer_name, customer_phone, invoice_no, id } = row;

    let message = "";

    if (gst) {
      message =
        `Dear *${customer_name}*, thank you for your business with AquaKart.\n\n` +
        `*GST Invoice No:* 🔴 *${invoice_no}*\n\n` +
        `Live link: https://admin.aquakart.co.in/invoice/${id}\n\n` +
        `🔴 *Please save our contact to access the invoice.*`;
    } else if (po) {
      message =
        `Dear *${customer_name}*, we have received your Purchase Order.\n\n` +
        `*PO Invoice No:* 🔴 *${invoice_no}*\n\n` +
        `Live link: https://admin.aquakart.co.in/invoice/${id}\n\n` +
        `🔴 *Please save our contact to access the invoice.*`;
    } else {
      message =
        `Dear *${customer_name}*, welcome to the AquaKart family!\n\n` +
        `*Invoice No:* 🔴 *${invoice_no}*\n\n` +
        `Live link: https://admin.aquakart.co.in/invoice/${id}\n\n` +
        `🔴 *Please save our contact to access the invoice.*`;
    }

    try {
      await NotifyOperations.sendWhatsApp(Number(customer_phone), message);
      showToast(`Message sent to ${customer_phone}`, "success");
    } catch (err) {
      showToast("Failed to send message", "error");
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await invoicesService.delete(id);
      if (error) throw error;
      showToast("Invoice deleted successfully", "success");
      fetchInvoices();
    } catch (error) {
      showToast("Failed to delete invoice", "error");
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_no: invoice.invoice_no || "",
      date: invoice.date || new Date().toISOString().split("T")[0],
      customer_name: invoice.customer_name || "",
      customer_phone: invoice.customer_phone || "",
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
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const newInvoiceNo = `${invoice.invoice_no.split("|")[0]}|${randomSuffix}`;

    setEditingInvoice(null);
    setFormData({
      invoice_no: newInvoiceNo,
      date: today,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
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
      delivered_by: "",
      delivery_date: "",
      paid_status: "unpaid",
      payment_type: invoice.payment_type,
      aquakart_online_user: invoice.aquakart_online_user,
      aquakart_invoice: invoice.aquakart_invoice,
    });
    setShowModal(true);
  };

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const confirmDeleteTarget = async () => {
    if (!deleteTarget?.id) return;
    await handleDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  const fetchProducts = async () => {
    const { data, error } = await productsService.getAll();

    if (error || !data) {
      setAvailableProducts([]);
      return;
    }
    const additonProducts = [
      { name: "Crompton 1 hp", price: 12000, id: "crompton-1-hp", sku: null },
      {
        name: "Crompton 0.5 hp",
        price: 8000,
        id: "crompton-0-5-hp",
        sku: null,
      },
      {
        name: "Plumbing-services",
        price: 1000,
        id: "plumbing-services",
        sku: null,
      },
    ];
    const responsePayload = data as any;
    const normalizePrice = (value: any) => {
      if (value === undefined || value === null) return 0;
      if (typeof value === "number") return value;
      const cleaned = parseFloat(String(value).replace(/[^\d.]/g, ""));
      return Number.isFinite(cleaned) ? cleaned : 0;
    };

    const productListCandidates = [
      responsePayload?.data?.products,
      responsePayload?.data?.data,
      responsePayload?.data,
      responsePayload?.products,
      responsePayload,
    ];

    const rawProducts =
      productListCandidates.find((item) => Array.isArray(item)) || [];

    const normalizedProducts: DbProduct[] = rawProducts
      .map((p: any, idx: number) => {
        const discountedPrice =
          p.discountPriceStatus || p.discount_price_status
            ? (p.discountPrice ?? p.discount_price)
            : undefined;
        const price = normalizePrice(
          discountedPrice ??
            p.price ??
            p.selling_price ??
            p.salePrice ??
            p.mrp ??
            p.unit_price ??
            0,
        );

        return {
          id: p.id ?? p._id ?? p.product_id ?? p.sku ?? `product-${idx}`,
          name: p.name ?? p.title ?? p.product_name ?? p.productName ?? "",
          price,
          sku: p.sku ?? p.sku_code ?? p.skuCode ?? p.code ?? null,
        };
      })
      .filter((p: DbProduct) => p.name);
    const finalProducts = [...normalizedProducts, ...additonProducts];

    setAvailableProducts(finalProducts);
  };

  const handleProductSelect = (productName: string) => {
    const cleanedName = productName.trim();
    const selectedProduct = availableProducts.find(
      (p) => p.name?.toLowerCase() === cleanedName.toLowerCase(),
    );

    if (selectedProduct) {
      setProductForm((prev) => ({
        ...prev,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
      }));
    } else {
      setProductForm((prev) => ({
        ...prev,
        productName: cleanedName,
        productPrice: 0,
      }));
    }
  };

  const addProduct = () => {
    if (productForm.productName && productForm.productPrice > 0) {
      if (editingProductIndex !== null) {
        const updatedProducts = [...formData.products];
        updatedProducts[editingProductIndex] = { ...productForm };
        setFormData({
          ...formData,
          products: updatedProducts,
        });
        setEditingProductIndex(null);
      } else {
        setFormData({
          ...formData,
          products: [...formData.products, { ...productForm }],
        });
      }
      setProductForm({
        productName: "",
        productQuantity: 1,
        productPrice: 0,
        productSerialNo: "",
      });
    }
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

  const isDraftDirty = useMemo(() => {
    const hasCustomerDetails =
      formData.invoice_no ||
      formData.customer_name ||
      formData.customer_phone ||
      formData.customer_email ||
      formData.customer_address;

    const hasGstDetails =
      formData.gst ||
      formData.gst_name ||
      formData.gst_no ||
      formData.gst_phone ||
      formData.gst_email ||
      formData.gst_address;

    const hasMeta =
      formData.delivered_by ||
      formData.delivery_date ||
      formData.paid_status !== initialFormData.paid_status ||
      formData.payment_type !== initialFormData.payment_type;

    const hasProducts = formData.products.length > 0;

    const hasProductDraft =
      productForm.productName ||
      productForm.productPrice > 0 ||
      productForm.productSerialNo;

    return Boolean(
      hasCustomerDetails ||
      hasGstDetails ||
      hasMeta ||
      hasProducts ||
      hasProductDraft,
    );
  }, [formData, productForm]);

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
    if (editingProductIndex === index) {
      cancelEditProduct();
    }
  };

  const clearDraft = () => {
    setEditingProductIndex(null);
    setProductForm({ ...initialProductForm });
    setFormData({ ...initialFormData });
    setEditingInvoice(null);
    localStorage.removeItem("invoiceDraft");
  };

  const resetForm = () => {
    clearDraft();
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const statusStyles = {
    paid: {
      badge:
        "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300",
      cell: "bg-emerald-50/60 dark:bg-emerald-500/5",
      row: "border-l-4 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-white/5",
    },
    partial: {
      badge:
        "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300",
      cell: "bg-amber-50/60 dark:bg-amber-500/5",
      row: "border-l-4 border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-white/5",
    },
    unpaid: {
      badge: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300",
      cell: "bg-rose-50/60 dark:bg-rose-500/5",
      row: "border-l-4 border-rose-200 dark:border-rose-500/30 bg-rose-50/30 dark:bg-white/5",
    },
  };

  const statusIcons = {
    paid: CheckCircle,
    partial: Clock,
    unpaid: XCircle,
  };

  const fallbackId = () => `inv-${Math.random().toString(36).slice(2, 10)}`;

  const getStatusMeta = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] ?? CheckCircle;
    const style = statusStyles[status as keyof typeof statusStyles] ?? {
      badge: "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70",
      cell: "bg-slate-50 dark:bg-white/5",
      row: "border-l-4 border-gray-400 dark:border-white/10 bg-slate-50/30 dark:bg-white/5",
    };
    return {
      Icon,
      badgeClass: style.badge,
      cellClass: style.cell,
      rowClass: style.row,
    };
  };

  const mapInvoiceFromApi = (inv: any): Invoice => {
    const normalizeNumber = (value: any) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const extractProducts = (): Product[] => {
      const productSources = [
        inv.products,
        inv.items,
        inv.invoice_items,
        inv.invoiceItems,
        inv.order_items,
        inv.orderItems,
      ];

      const rawProducts =
        productSources.find((item) => Array.isArray(item)) ?? [];

      return rawProducts.map((p: any, idx: number) => {
        const quantity =
          normalizeNumber(
            p.productQuantity ??
              p.quantity ??
              p.qty ??
              p.count ??
              p.order_quantity,
          ) || 1;

        const unitPriceCandidates = [
          p.productPrice,
          p.unit_price,
          p.unitPrice,
          p.unitprice,
          p.price,
          p.mrp,
          p.rate,
          p.salePrice,
          p.selling_price,
        ];

        let unitPrice =
          unitPriceCandidates
            .map((val) => normalizeNumber(val))
            .find((val) => val > 0) ?? 0;

        if (!unitPrice && p.total) {
          unitPrice = normalizeNumber(p.total) / quantity || 0;
        }
        if (!unitPrice && p.total_price) {
          unitPrice = normalizeNumber(p.total_price) / quantity || 0;
        }

        return {
          productName:
            p.productName ??
            p.name ??
            p.product_name ??
            p.title ??
            p.productTitle ??
            `Product ${idx + 1}`,
          productQuantity: quantity,
          productPrice: unitPrice,
          productSerialNo:
            p.productSerialNo ??
            p.serial_no ??
            p.serial ??
            p.sku ??
            p.serialNumber ??
            "",
        };
      });
    };

    const customer = inv.customerDetails ?? {};
    const gstDetails = inv.gstDetails ?? {};
    const transport = inv.transport ?? {};
    const paidStatus =
      inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? "unpaid";
    const paymentType = inv.payment_type ?? inv.paymentType ?? "cash";

    const products = extractProducts();

    const computedTotal = products.reduce(
      (sum, p) => sum + p.productPrice * p.productQuantity,
      0,
    );

    return {
      id: inv.id ?? inv._id ?? inv.invoice_id ?? fallbackId(),
      invoice_no: inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number ?? "",
      date:
        inv.date ||
        inv.issue_date ||
        inv.created_at ||
        inv.createdAt ||
        new Date().toISOString(),
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
      paid_status: paidStatus,
      payment_type: paymentType,
      aquakart_online_user: Boolean(
        inv.aquakart_online_user ?? inv.aquakartOnlineUser,
      ),
      aquakart_invoice: Boolean(inv.aquakart_invoice ?? inv.aquakartInvoice),
      total_amount: Number(inv.total_amount ?? inv.total ?? computedTotal) || 0,
      created_at: inv.created_at ?? inv.createdAt ?? new Date().toISOString(),
    };
  };

  const totalValue = Array.isArray(filteredInvoices)
    ? filteredInvoices.reduce(
        (total, inv) => total + (Number(inv.total_amount) || 0),
        0,
      )
    : 0;
  const totalInvoices = Array.isArray(filteredInvoices)
    ? filteredInvoices.length
    : 0;
  const averageSale = totalInvoices > 0 ? totalValue / totalInvoices : 0;
  const months = [
    { value: "all", label: "All Months" },
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  const selectedYearLabel = selectedYear === "all" ? "All Years" : selectedYear;
  const selectedMonthLabel =
    selectedMonth === "all"
      ? "All Months"
      : months.find((m) => m.value === selectedMonth)?.label || "";

  const formatAmount = (value: number) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(value)
      : "₹0";

  const formatCount = (value: number) =>
    Number.isFinite(value) ? `${value}` : "0";

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "—";

  const invoiceTableColumns: AquaTableColumn<Invoice>[] = [
    {
      key: "invoice_no",
      header: "Invoice No",
      render: (invoice) =>
        invoice.invoice_no ||
        (invoice as any).invoiceNo ||
        (invoice as any).invoice_number ||
        "—",
    },
    {
      key: "date",
      header: "Date",
      render: (invoice) => formatDate(invoice.date),
    },
    { key: "customer_name", header: "Customer" },
    { key: "customer_phone", header: "Phone" },
    {
      key: "customer_email",
      header: "Email",
      render: (invoice) => invoice.customer_email || "—",
    },
    {
      key: "customer_address",
      header: "Address",
      render: (invoice) => (invoice.customer_address || "—").slice(0, 40),
    },
    {
      key: "tags",
      header: "GST/PO/Quotation",
      render: (invoice) => (
        <div className="flex flex-wrap gap-1">
          {invoice.gst && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              GST
            </span>
          )}
          {invoice.po && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              PO
            </span>
          )}
          {invoice.quotation && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              QUO
            </span>
          )}
          {!invoice.gst && !invoice.po && !invoice.quotation && (
            <span className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-gray-400 dark:border-white/10">
              None
            </span>
          )}
        </div>
      ),
    },
    {
      key: "payment_type",
      header: "Payment Type",
      render: (invoice) => invoice.payment_type || "—",
    },
    {
      key: "delivery",
      header: "Delivery",
      render: (invoice) => (
        <span>
          {formatDate(invoice.delivery_date)}
          {invoice.delivered_by ? ` · ${invoice.delivered_by}` : ""}
        </span>
      ),
    },
    {
      key: "total_amount",
      header: "Amount",
      className:
        "text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400",
      render: (invoice) => formatAmount(Number(invoice.total_amount) || 0),
    },
  ];

  const invoiceTableActions: AquaTableAction<Invoice>[] = [
    {
      label: "Open",
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: (row) => navigate(`/invoice/${row.id}`),
    },
    {
      label: "Send",
      icon: <Send className="w-4 h-4" />,
      onClick: (row) => handleSend(row),
    },
    {
      label: "Clone",
      icon: <Copy className="w-4 h-4" />,
      onClick: handleClone,
    },
    {
      label: "Edit",
      icon: <Edit2 className="w-4 h-4" />,
      onClick: handleEdit,
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const exportToCsv = () => {
    if (!filteredInvoices.length) {
      showToast("No invoices to export", "error");
      return;
    }

    const headers = [
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
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_no,
      formatDate(inv.date),
      inv.customer_name,
      inv.customer_phone,
      inv.customer_email,
      inv.customer_address,
      inv.gst ? "Yes" : "No",
      inv.po ? "Yes" : "No",
      inv.quotation ? "Yes" : "No",
      inv.payment_type,
      formatDate(inv.delivery_date),
      inv.delivered_by,
      formatAmount(priceUtils.getBasePrice(Number(inv.total_amount) || 0)),
      formatAmount(priceUtils.getGSTValue(Number(inv.total_amount) || 0)),
      formatAmount(Number(inv.total_amount) || 0),
      inv.paid_status,
    ]);

    const escapeCsv = (value: string) =>
      `"${(value || "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map((v) => escapeCsv(String(v ?? ""))).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToSalesCsv = () => {
    if (!filteredInvoices.length) {
      showToast("No invoices to export", "error");
      return;
    }
    const headers = [
      "Invoice No",
      "Date",
      "Customer",
      "GST",
      "GST No",
      "GST Name",
      "Base Price",
      "GST (18%)",
      "Total Amount",
    ];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_no,
      formatDate(inv.date),
      inv.customer_name,
      inv.gst ? "Yes" : "No",
      inv.gst_no ?? "",
      inv.gst_name ?? "",
      formatAmount(priceUtils.getBasePrice(Number(inv.total_amount) || 0)),
      formatAmount(priceUtils.getGSTValue(Number(inv.total_amount) || 0)),
      formatAmount(Number(inv.total_amount) || 0),
    ]);
    const escapeCsv = (value: string) =>
      `"${(value || "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map((v) => escapeCsv(String(v ?? ""))).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales_invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    if (!filteredInvoices.length) {
      showToast("No invoices to export", "error");
      return;
    }

    const win = window.open("", "_blank");
    if (!win) {
      showToast("Unable to open print window", "error");
      return;
    }

    const rows = filteredInvoices
      .map(
        (inv) => `
        <tr>
          <td>${inv.invoice_no}</td>
          <td>${formatDate(inv.date)}</td>
          <td>${inv.customer_name}</td>
          <td>${inv.customer_phone}</td>
          <td>${inv.customer_email}</td>
          <td>${(inv.customer_address || "").slice(0, 50)}</td>
          <td>${formatAmount(Number(inv.total_amount) || 0)}</td>
          <td>${inv.paid_status}</td>
        </tr>
      `,
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Invoices</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Invoices Export</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 200);
  };

  const currentYear = new Date().getFullYear();
  const invoiceYears = invoices
    .map((invoice) => new Date(invoice.date).getFullYear())
    .filter((year) => !Number.isNaN(year));
  const yearsSet = new Set<number>(invoiceYears);
  for (let i = 0; i < 5; i++) {
    yearsSet.add(currentYear - i);
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const yearOptions = [...years, "All Years"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-950 dark:text-white">
            Invoices
          </h2>
          <p className="text-black dark:text-white/60 mt-1">
            Manage customer invoices and billing
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToPdf}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            Export PDF
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToCsv}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            Export Excel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToSalesCsv}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export To Sales Excell
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={importInvoicesFromAPI}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {importing ? "Importing..." : "Import from API"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </motion.button>
        </div>
      </div>

      {importStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-4 p-4 rounded-lg ${
            importStatus.includes("Error")
              ? "bg-red-50 text-red-700 border border-red-200"
              : importStatus.includes("complete")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {importStatus}
        </motion.div>
      )}

      <div className="glass-invoice-tabs shadow-xl rounded-xl mb-6 overflow-hidden">
        <div className="border-b border-gray-400 dark:border-white/10">
          <nav className="flex">
            <button
              onClick={() => setInvoiceTypeFilter("all")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                invoiceTypeFilter === "all"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-white/5"
                  : "text-black dark:text-white/60 hover:text-neutral-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10"
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setInvoiceTypeFilter("gst")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                invoiceTypeFilter === "gst"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-white/5"
                  : "text-black dark:text-white/60 hover:text-neutral-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10"
              }`}
            >
              GST Invoices
            </button>
            <button
              onClick={() => setInvoiceTypeFilter("po")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                invoiceTypeFilter === "po"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-white/5"
                  : "text-black dark:text-white/60 hover:text-neutral-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10"
              }`}
            >
              PO Invoices
            </button>
          </nav>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
              Month
            </label>
            <select
              value={selectedMonth === "all" ? "all" : selectedMonth.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedMonth(value === "all" ? "all" : parseInt(value, 10));
              }}
              className="glass-input w-full"
            >
              <option value="all">All Months</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
              Year
            </label>
            <select
              value={selectedYear === "all" ? "all" : selectedYear.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedYear(value === "all" ? "all" : parseInt(value, 10));
              }}
              className="glass-input w-full"
            >
              {yearOptions.map((year) => {
                const value =
                  typeof year === "number" ? year.toString() : "all";
                const label = typeof year === "number" ? year : "All Years";
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-6">
            <p className="text-sm font-medium text-black dark:text-white/60 mb-1">
              Total Value
            </p>
            <p className="text-2xl font-bold text-neutral-950 dark:text-white">
              {formatAmount(totalValue)}
            </p>
          </div>
          <div className="glass-card p-6">
            <p className="text-sm font-medium text-black dark:text-white/60 mb-1">
              Total Invoices
            </p>
            <p className="text-2xl font-bold text-neutral-950 dark:text-white">
              {formatCount(totalInvoices)}
            </p>
          </div>
          <div className="glass-card p-6">
            <p className="text-sm font-medium text-black dark:text-white/60 mb-1">
              Average Sale
            </p>
            <p className="text-2xl font-bold text-neutral-950 dark:text-white">
              {formatAmount(averageSale)}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:block mb-6">
        <AquaGenericTable
          heading="Invoices"
          subHeading={`${filteredInvoices.length} result${filteredInvoices.length === 1 ? "" : "s"}`}
          columns={invoiceTableColumns}
          data={filteredInvoices}
          isLoading={loading}
          emptyMessage={`No invoices found for ${selectedMonthLabel} ${selectedYearLabel}`}
          onRowClick={(row) => handleView(row)}
          actionsLabel="Actions"
          enableFilter={true}
          actions={invoiceTableActions}
        />
      </div>

      <div className="md:hidden space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border-white/20 dark:border-white/10">
            <p className="text-slate-500 dark:text-white/40 font-medium">
              No invoices found for{" "}
              <span className="text-neutral-950 dark:text-white">
                {months.find((m) => m.value === selectedMonth)?.label}{" "}
                {selectedYearLabel}
              </span>
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const { Icon: StatusIcon, badgeClass } = getStatusMeta(
              invoice.paid_status,
            );
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-neutral-950 dark:text-white">
                      {invoice.invoice_no ||
                        (invoice as any).invoiceNo ||
                        (invoice as any).invoice_number ||
                        "—"}
                    </h3>
                    <p className="text-sm text-black dark:text-white/60">
                      {formatDate(invoice.date)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                      badgeClass
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {invoice.paid_status}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white/60">
                      Customer
                    </span>
                    <span className="font-medium text-neutral-950 dark:text-white">
                      {invoice.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white/60">Phone</span>
                    <span className="text-neutral-950 dark:text-white font-medium">
                      {invoice.customer_phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white/60">Email</span>
                    <span className="text-neutral-950 dark:text-white text-right whitespace-pre-wrap break-words font-medium">
                      {invoice.customer_email || "—"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-black dark:text-white/60">
                      Address
                    </span>
                    <span className="text-neutral-950 dark:text-white text-right whitespace-pre-wrap break-words font-medium max-w-[60%]">
                      {invoice.customer_address || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white/60">
                      Payment
                    </span>
                    <span className="text-neutral-950 dark:text-white capitalize font-medium">
                      {invoice.payment_type || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white/60">
                      Delivery
                    </span>
                    <span className="text-neutral-950 dark:text-white text-right font-medium">
                      {formatDate(invoice.delivery_date)}
                      {invoice.delivered_by ? ` · ${invoice.delivered_by}` : ""}
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-black dark:text-white/60">Flags</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {invoice.gst && (
                        <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          GST
                        </span>
                      )}
                      {invoice.po && (
                        <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          PO
                        </span>
                      )}
                      {invoice.quotation && (
                        <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          QUO
                        </span>
                      )}
                      {!invoice.gst && !invoice.po && !invoice.quotation && (
                        <span className="px-2 py-1 text-[10px] rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-gray-400 dark:border-white/10">
                          No Flags
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-black dark:text-white/60">
                      Total Amount
                    </span>
                    <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      {formatAmount(Number(invoice.total_amount) || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-400 dark:border-white/10">
                  <button
                    onClick={() => navigate(`/invoice/${invoice.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <button
                    onClick={() => handleView(invoice)}
                    className="p-2.5 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    title="View Detailed"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleClone(invoice)}
                    className="p-2.5 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    title="Clone Invoice"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(invoice)}
                    className="p-2.5 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    title="Edit Invoice"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(invoice)}
                    className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {filteredInvoices.length === 0 && invoices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-slate-400 dark:text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
            No invoices found
          </h3>
          <p className="text-black dark:text-white/60 max-w-xs mx-auto">
            Try adjusting your search filters or create a new invoice to get
            started.
          </p>
        </motion.div>
      )}

      <AquaInvoiceFormDialog
        showModal={showModal}
        onClose={closeModal}
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
            className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-md w-full p-8 shadow-2xl border-white/20 dark:border-white/5"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
                Delete Invoice?
              </h3>
              <p className="text-sm text-black dark:text-white/60 mb-6 leading-relaxed">
                You are about to delete invoice{" "}
                <span className="font-bold text-neutral-950 dark:text-white">
                  #{deleteTarget.invoice_no}
                </span>{" "}
                for{" "}
                <span className="font-bold text-neutral-950 dark:text-white">
                  {deleteTarget.customer_name}
                </span>
                . This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTarget}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm shadow-lg shadow-rose-600/20"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
