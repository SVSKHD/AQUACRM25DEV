import { useEffect, useMemo, useState } from "react";
import { Edit2, Eye, FileText, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import AquaGenericTable, { AquaTableAction, AquaTableColumn } from "../modular/invoices/invoiceTable";
import { LiquidBadge, LiquidButton, LiquidDropdown, LiquidInput, LiquidPanel } from "../ui/liquid";
import { productsService } from "../../services/apiService";
import { QuotationPayload, quotationsService } from "../../services/quotationsService";

type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired" | "Payment Pending" | "Paid" | "Converted";

type DbProduct = {
  id: string | number;
  name: string;
  price: number;
  sku?: string | null;
  dpPrice?: number;
};

type QuotationProduct = {
  _id?: string;
  productId?: string;
  productName: string;
  productDescription?: string;
  productSerialNo?: string;
  productQuantity: number;
  productPrice: number;
  productDiscount?: number;
  productTax?: number;
  productTotal?: number;
};

type Quotation = {
  id: string;
  _id: string;
  quotationNo: string;
  date?: string;
  validUntil?: string;
  customerDetails?: { name?: string; phone?: string | number; email?: string; address?: string };
  gst?: boolean;
  gstDetails?: { gstName?: string; gstNo?: string; gstPhone?: string | number; gstEmail?: string; gstAddress?: string };
  products?: QuotationProduct[];
  subTotal?: number;
  discount?: number;
  tax?: number;
  totalAmount?: number;
  status?: QuotationStatus;
  payment?: { status?: "Unpaid" | "Partial" | "Paid"; amountPaid?: number; balanceAmount?: number; mode?: string };
  notes?: string;
  terms?: string;
  createdAt?: string;
};

type FormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  validUntil: string;
  gst: boolean;
  gstName: string;
  gstNo: string;
  gstPhone: string;
  gstEmail: string;
  gstAddress: string;
  status: QuotationStatus;
  discount: number;
  tax: number;
  notes: string;
  terms: string;
  products: QuotationProduct[];
};

const emptyProduct: QuotationProduct = {
  productId: "",
  productName: "",
  productDescription: "",
  productSerialNo: "",
  productQuantity: 1,
  productPrice: 0,
  productDiscount: 0,
  productTax: 0,
};

const initialForm: FormState = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  validUntil: "",
  gst: false,
  gstName: "",
  gstNo: "",
  gstPhone: "",
  gstEmail: "",
  gstAddress: "",
  status: "Draft",
  discount: 0,
  tax: 0,
  notes: "",
  terms: "Validity, installation and delivery are subject to final confirmation.",
  products: [{ ...emptyProduct }],
};

const manualProducts: DbProduct[] = [
  { name: "Crompton 1 hp", price: 12000, id: "crompton-1-hp", sku: null },
  { name: "Kent Automatic Sandfilter", price: 15000, id: "kent-auto-sandfilter", sku: null },
  { name: "Crompton 0.5 hp", price: 8000, id: "crompton-0-5-hp", sku: null },
  { name: "Racold Heat pump", price: 12000, id: "racold-heat-pump", sku: null },
  { name: "Plumbing-services", price: 1000, id: "plumbing-services", sku: null },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
  { value: "Expired", label: "Expired" },
  { value: "Payment Pending", label: "Payment Pending" },
  { value: "Paid", label: "Paid" },
  { value: "Converted", label: "Converted" },
];

const quotationStatusOptions = statusOptions.filter((option) => option.value !== "all");

function normalizeNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizePrice(value: unknown) {
  if (typeof value === "number") return value;
  if (value === undefined || value === null) return 0;
  const parsed = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

function statusClass(status?: string) {
  if (["Accepted", "Paid", "Converted"].includes(status || "")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (["Sent", "Payment Pending"].includes(status || "")) return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  if (["Rejected", "Expired"].includes(status || "")) return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
}

function normalizeQuotation(item: any): Quotation {
  return {
    ...item,
    id: item._id || item.id,
    _id: item._id || item.id,
    products: Array.isArray(item.products) ? item.products : [],
    totalAmount: normalizeNumber(item.totalAmount),
    subTotal: normalizeNumber(item.subTotal),
    discount: normalizeNumber(item.discount),
    tax: normalizeNumber(item.tax),
  };
}

function mapFormToPayload(form: FormState): QuotationPayload {
  return {
    validUntil: form.validUntil || undefined,
    customerDetails: {
      name: form.customerName.trim(),
      phone: form.customerPhone.trim(),
      email: form.customerEmail.trim(),
      address: form.customerAddress.trim(),
    },
    gst: form.gst,
    gstDetails: form.gst
      ? {
          gstName: form.gstName.trim(),
          gstNo: form.gstNo.trim(),
          gstPhone: form.gstPhone.trim(),
          gstEmail: form.gstEmail.trim(),
          gstAddress: form.gstAddress.trim(),
        }
      : undefined,
    products: form.products.map((product) => ({
      productId: product.productId || undefined,
      productName: product.productName.trim(),
      productDescription: product.productDescription?.trim(),
      productSerialNo: product.productSerialNo?.trim(),
      productQuantity: normalizeNumber(product.productQuantity) || 1,
      productPrice: normalizeNumber(product.productPrice),
      productDiscount: normalizeNumber(product.productDiscount),
      productTax: normalizeNumber(product.productTax),
    })),
    discount: normalizeNumber(form.discount),
    tax: normalizeNumber(form.tax),
    notes: form.notes.trim(),
    terms: form.terms.trim(),
    status: form.status,
  };
}

function mapQuotationToForm(quotation: Quotation): FormState {
  return {
    customerName: quotation.customerDetails?.name || "",
    customerPhone: String(quotation.customerDetails?.phone || ""),
    customerEmail: quotation.customerDetails?.email || "",
    customerAddress: quotation.customerDetails?.address || "",
    validUntil: quotation.validUntil ? quotation.validUntil.slice(0, 10) : "",
    gst: Boolean(quotation.gst),
    gstName: quotation.gstDetails?.gstName || "",
    gstNo: quotation.gstDetails?.gstNo || "",
    gstPhone: String(quotation.gstDetails?.gstPhone || ""),
    gstEmail: quotation.gstDetails?.gstEmail || "",
    gstAddress: quotation.gstDetails?.gstAddress || "",
    status: quotation.status || "Draft",
    discount: normalizeNumber(quotation.discount),
    tax: normalizeNumber(quotation.tax),
    notes: quotation.notes || "",
    terms: quotation.terms || "",
    products: quotation.products?.length
      ? quotation.products.map((product) => ({
          productId: product.productId || "",
          productName: product.productName || "",
          productDescription: product.productDescription || "",
          productSerialNo: product.productSerialNo || "",
          productQuantity: normalizeNumber(product.productQuantity) || 1,
          productPrice: normalizeNumber(product.productPrice),
          productDiscount: normalizeNumber(product.productDiscount),
          productTax: normalizeNumber(product.productTax),
        }))
      : [{ ...emptyProduct }],
  };
}

export default function QuotationsTab() {
  const { showToast } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [availableProducts, setAvailableProducts] = useState<DbProduct[]>(manualProducts);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const totals = useMemo(
    () =>
      quotations.reduce(
        (acc, quotation) => {
          acc.count += 1;
          acc.value += normalizeNumber(quotation.totalAmount);
          if (quotation.status === "Draft") acc.drafts += 1;
          if (quotation.status === "Accepted") acc.accepted += 1;
          return acc;
        },
        { count: 0, value: 0, drafts: 0, accepted: 0 },
      ),
    [quotations],
  );

  const productsTotal = useMemo(
    () =>
      form.products.reduce((sum, product) => {
        const qty = normalizeNumber(product.productQuantity);
        const price = normalizeNumber(product.productPrice);
        const discount = normalizeNumber(product.productDiscount);
        const tax = normalizeNumber(product.productTax);
        return sum + Math.max(qty * price - discount, 0) + tax;
      }, 0),
    [form.products],
  );

  const grandTotal = Math.max(productsTotal - normalizeNumber(form.discount), 0) + normalizeNumber(form.tax);

  const fetchProducts = async () => {
    const { data, error } = await productsService.getAll();
    if (error || !data) {
      setAvailableProducts(manualProducts);
      return;
    }

    const payload = data as any;
    const candidates = [payload?.data?.products, payload?.data?.data, payload?.data, payload?.products, payload];
    const rawProducts = candidates.find((item) => Array.isArray(item)) || [];
    const normalized: DbProduct[] = rawProducts
      .map((product: any, index: number) => {
        const discountedPrice = product.discountPriceStatus || product.discount_price_status ? product.discountPrice ?? product.discount_price : undefined;
        return {
          id: product.id ?? product._id ?? product.product_id ?? product.sku ?? `product-${index}`,
          name: product.name ?? product.title ?? product.product_name ?? product.productName ?? "",
          price: normalizePrice(discountedPrice ?? product.price ?? product.selling_price ?? product.salePrice ?? product.mrp ?? 0),
          dpPrice: normalizePrice(product.dpPrice ?? product.dp_price ?? 0),
          sku: product.sku ?? product.sku_code ?? product.skuCode ?? product.code ?? null,
        };
      })
      .filter((product: DbProduct) => product.name);
    setAvailableProducts([...normalized, ...manualProducts]);
  };

  const fetchQuotations = async () => {
    setLoading(true);
    const response = await quotationsService.getAll({ page: 1, limit: 100, search, status: statusFilter === "all" ? undefined : statusFilter });
    setLoading(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    const payload = response.data as { data?: any[] } | any[] | undefined;
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    setQuotations(list.map(normalizeQuotation));
  };

  useEffect(() => {
    fetchProducts();
    fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openCreate = () => {
    setEditingQuotation(null);
    setForm(initialForm);
    setIsFormOpen(true);
  };

  const openEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setForm(mapQuotationToForm(quotation));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingQuotation(null);
    setForm(initialForm);
  };

  const updateProduct = (index: number, key: keyof QuotationProduct, value: string | number) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => (productIndex === index ? { ...product, [key]: value } : product)),
    }));
  };

  const handleProductSelect = (index: number, productName: string) => {
    const cleanedName = productName.trim();
    const selectedProduct = availableProducts.find((product) => product.name?.toLowerCase() === cleanedName.toLowerCase());

    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index
          ? {
              ...product,
              productId: selectedProduct ? String(selectedProduct.id) : product.productId || "",
              productName: selectedProduct?.name || cleanedName,
              productPrice: selectedProduct?.price || product.productPrice || 0,
              productSerialNo: selectedProduct?.sku || product.productSerialNo || "",
            }
          : product,
      ),
    }));
  };

  const addProduct = () => {
    setForm((current) => ({ ...current, products: [...current.products, { ...emptyProduct }] }));
  };

  const removeProduct = (index: number) => {
    setForm((current) => ({
      ...current,
      products: current.products.length === 1 ? [{ ...emptyProduct }] : current.products.filter((_, productIndex) => productIndex !== index),
    }));
  };

  const saveQuotation = async () => {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      showToast("Customer name and phone are required", "error");
      return;
    }

    const validProducts = form.products.filter((product) => product.productName.trim());
    if (!validProducts.length) {
      showToast("Add at least one product", "error");
      return;
    }

    setSaving(true);
    const payload = mapFormToPayload({ ...form, products: validProducts });
    const response = editingQuotation ? await quotationsService.update(editingQuotation._id, payload) : await quotationsService.create(payload);
    setSaving(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast(editingQuotation ? "Quotation updated" : "Quotation created", "success");
    closeForm();
    fetchQuotations();
  };

  const deleteQuotation = async (quotation: Quotation) => {
    if (!window.confirm(`Delete quotation ${quotation.quotationNo}?`)) return;
    const response = await quotationsService.delete(quotation._id);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Quotation deleted", "success");
    fetchQuotations();
  };

  const changeStatus = async (quotation: Quotation, status: string) => {
    const response = await quotationsService.updateStatus(quotation._id, status);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Status updated", "success");
    fetchQuotations();
  };

  const columns: AquaTableColumn<Quotation>[] = [
    {
      key: "quotationNo",
      header: "Quotation",
      render: (quotation) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-950 dark:text-white">{quotation.quotationNo}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/50">{formatDate(quotation.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "customerDetails.name",
      header: "Customer",
      render: (quotation) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-950 dark:text-white">{quotation.customerDetails?.name || "—"}</p>
          <p className="truncate text-xs text-slate-500 dark:text-white/50">{quotation.customerDetails?.phone || "—"}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (quotation) => formatDate(quotation.date) },
    { key: "products", header: "Items", render: (quotation) => <span className="font-semibold">{quotation.products?.length || 0}</span> },
    {
      key: "totalAmount",
      header: "Total",
      className: "text-right",
      render: (quotation) => <span className="font-bold text-neutral-950 dark:text-white">{formatCurrency(quotation.totalAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (quotation) => (
        <LiquidDropdown value={quotation.status || "Draft"} options={quotationStatusOptions} onChange={(value) => changeStatus(quotation, value)} className="min-w-[150px]" />
      ),
    },
  ];

  const actions: AquaTableAction<Quotation>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: setViewingQuotation },
    { label: "Edit", icon: <Edit2 className="h-4 w-4" />, onClick: openEdit },
    { label: "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: deleteQuotation },
  ];

  return (
    <div className="space-y-6">
      <TabInnerContent title="Quotations" description="Create, manage and track customer quotations">
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LiquidPanel className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Total Quotations</p><p className="mt-3 text-3xl font-bold text-neutral-950 dark:text-white">{totals.count}</p></LiquidPanel>
            <LiquidPanel className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Quotation Value</p><p className="mt-3 text-3xl font-bold text-neutral-950 dark:text-white">{formatCurrency(totals.value)}</p></LiquidPanel>
            <LiquidPanel className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Drafts</p><p className="mt-3 text-3xl font-bold text-neutral-950 dark:text-white">{totals.drafts}</p></LiquidPanel>
            <LiquidPanel className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Accepted</p><p className="mt-3 text-3xl font-bold text-neutral-950 dark:text-white">{totals.accepted}</p></LiquidPanel>
          </div>

          <LiquidPanel className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
              <LiquidInput label="Search quotations" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") fetchQuotations(); }} placeholder="Search quotation, customer, phone, GST..." />
              <LiquidDropdown label="Status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <LiquidButton type="button" variant="soft" onClick={fetchQuotations} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</LiquidButton>
                <LiquidButton type="button" variant="soft" onClick={fetchQuotations}><Search className="h-4 w-4" />Search</LiquidButton>
                <LiquidButton type="button" variant="primary" onClick={openCreate}><Plus className="h-4 w-4" />New Quotation</LiquidButton>
              </div>
            </div>
          </LiquidPanel>

          <AquaGenericTable heading="Quotation Records" subHeading="Use actions to view, edit or delete a quotation. Change status directly from the table." columns={columns} data={quotations} isLoading={loading} emptyMessage="No quotations found. Create your first quotation." actionsLabel="Actions" actions={actions} />
        </div>
      </TabInnerContent>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="glass-card max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/20 p-0 shadow-2xl dark:border-white/10">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-blue-500/10 p-3 text-blue-600 dark:text-blue-300"><FileText className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-950 dark:text-white">{editingQuotation ? "Edit Quotation" : "Create Quotation"}</h3>
                    <p className="text-sm text-slate-600 dark:text-white/60">Choose products from the same product list used in invoices.</p>
                  </div>
                </div>
                <button type="button" onClick={closeForm} className="liquid-icon-button"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <LiquidPanel className="p-5">
                <div className="mb-4 flex items-center justify-between"><h4 className="text-lg font-bold text-neutral-950 dark:text-white">Customer Details</h4><LiquidBadge className={statusClass(form.status)}>{form.status}</LiquidBadge></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LiquidInput label="Customer Name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
                  <LiquidInput label="Phone" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
                  <LiquidInput label="Email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} />
                  <LiquidInput label="Valid Until" type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} />
                  <LiquidInput wrapperClassName="md:col-span-2" label="Address" value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} />
                </div>
              </LiquidPanel>

              <LiquidPanel className="p-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-white"><input type="checkbox" checked={form.gst} onChange={(event) => setForm({ ...form, gst: event.target.checked })} />Add GST Details</label>
                {form.gst && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <LiquidInput label="GST Name" value={form.gstName} onChange={(event) => setForm({ ...form, gstName: event.target.value })} />
                    <LiquidInput label="GST Number" value={form.gstNo} onChange={(event) => setForm({ ...form, gstNo: event.target.value })} />
                    <LiquidInput label="GST Phone" value={form.gstPhone} onChange={(event) => setForm({ ...form, gstPhone: event.target.value })} />
                    <LiquidInput label="GST Email" value={form.gstEmail} onChange={(event) => setForm({ ...form, gstEmail: event.target.value })} />
                    <LiquidInput wrapperClassName="md:col-span-2" label="GST Address" value={form.gstAddress} onChange={(event) => setForm({ ...form, gstAddress: event.target.value })} />
                  </div>
                )}
              </LiquidPanel>

              <LiquidPanel className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h4 className="text-lg font-bold text-neutral-950 dark:text-white">Products</h4><p className="text-sm text-slate-500 dark:text-white/60">Select from the same product dropdown used in invoices. Price and SKU auto-fill.</p></div>
                  <LiquidButton type="button" variant="soft" onClick={addProduct}><Plus className="h-4 w-4" />Add Product</LiquidButton>
                </div>
                <datalist id="quotation-products-list">
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.name}>{product.sku && `${product.sku} - `}{formatCurrency(product.price)}</option>
                  ))}
                </datalist>
                <div className="space-y-3">
                  {form.products.map((product, index) => (
                    <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5 xl:grid-cols-[1.5fr_.5fr_.7fr_.7fr_.7fr_.8fr_auto]">
                      <LiquidInput label="Product" list="quotation-products-list" value={product.productName} onChange={(event) => handleProductSelect(index, event.target.value)} placeholder="Select or type product" />
                      <LiquidInput label="Qty" type="number" value={product.productQuantity} onChange={(event) => updateProduct(index, "productQuantity", Number(event.target.value))} />
                      <LiquidInput label="Price" type="number" value={product.productPrice} onChange={(event) => updateProduct(index, "productPrice", Number(event.target.value))} />
                      <LiquidInput label="Discount" type="number" value={product.productDiscount || 0} onChange={(event) => updateProduct(index, "productDiscount", Number(event.target.value))} />
                      <LiquidInput label="Tax" type="number" value={product.productTax || 0} onChange={(event) => updateProduct(index, "productTax", Number(event.target.value))} />
                      <LiquidInput label="Serial/SKU" value={product.productSerialNo || ""} onChange={(event) => updateProduct(index, "productSerialNo", event.target.value)} />
                      <div className="flex items-end justify-end"><button type="button" onClick={() => removeProduct(index)} className="liquid-icon-button text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
                    </div>
                  ))}
                </div>
              </LiquidPanel>

              <LiquidPanel className="p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <LiquidInput label="Overall Discount" type="number" value={form.discount} onChange={(event) => setForm({ ...form, discount: Number(event.target.value) })} />
                  <LiquidInput label="Overall Tax" type="number" value={form.tax} onChange={(event) => setForm({ ...form, tax: Number(event.target.value) })} />
                  <LiquidDropdown label="Status" value={form.status} options={quotationStatusOptions} onChange={(value) => setForm({ ...form, status: value as QuotationStatus })} />
                  <LiquidInput wrapperClassName="md:col-span-3" label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                  <LiquidInput wrapperClassName="md:col-span-3" label="Terms" value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} />
                </div>
              </LiquidPanel>

              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:-mx-6 sm:-mb-6 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Grand Total</p><p className="text-3xl font-bold text-neutral-950 dark:text-white">{formatCurrency(grandTotal)}</p></div>
                  <div className="flex flex-wrap gap-2 sm:justify-end"><LiquidButton type="button" variant="ghost" onClick={closeForm}>Cancel</LiquidButton><LiquidButton type="button" variant="primary" onClick={saveQuotation} disabled={saving}>{saving ? "Saving..." : editingQuotation ? "Update Quotation" : "Create Quotation"}</LiquidButton></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="glass-card max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/20 p-0 shadow-2xl dark:border-white/10">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-xl font-bold text-neutral-950 dark:text-white">{viewingQuotation.quotationNo}</h3><p className="text-sm text-slate-600 dark:text-white/60">{viewingQuotation.customerDetails?.name || "Customer"} • {viewingQuotation.customerDetails?.phone || "No phone"}</p></div>
                <button type="button" onClick={() => setViewingQuotation(null)} className="liquid-icon-button"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Date</p><p className="mt-1 font-bold text-neutral-950 dark:text-white">{formatDate(viewingQuotation.date)}</p></LiquidPanel>
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Status</p><div className="mt-2"><LiquidBadge className={statusClass(viewingQuotation.status)}>{viewingQuotation.status || "Draft"}</LiquidBadge></div></LiquidPanel>
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Total</p><p className="mt-1 font-bold text-neutral-950 dark:text-white">{formatCurrency(viewingQuotation.totalAmount)}</p></LiquidPanel>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="min-w-full">
                  <thead className="bg-slate-100 dark:bg-white/5"><tr><th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Product</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Qty</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Price</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th></tr></thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {viewingQuotation.products?.map((product, index) => (
                      <tr key={product._id || index}><td className="px-4 py-3 text-sm font-semibold text-neutral-950 dark:text-white">{product.productName}</td><td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-white/60">{product.productQuantity}</td><td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-white/60">{formatCurrency(product.productPrice)}</td><td className="px-4 py-3 text-right text-sm font-bold text-neutral-950 dark:text-white">{formatCurrency(product.productTotal)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">GST</p><p className="mt-1 text-sm text-slate-700 dark:text-white/70">{viewingQuotation.gst ? `${viewingQuotation.gstDetails?.gstName || "GST Customer"} • ${viewingQuotation.gstDetails?.gstNo || "No GST No"}` : "No GST details"}</p></LiquidPanel>
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Validity</p><p className="mt-1 text-sm text-slate-700 dark:text-white/70">{formatDate(viewingQuotation.validUntil)}</p></LiquidPanel>
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Notes</p><p className="mt-1 text-sm text-slate-700 dark:text-white/70">{viewingQuotation.notes || "—"}</p></LiquidPanel>
                <LiquidPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">Terms</p><p className="mt-1 text-sm text-slate-700 dark:text-white/70">{viewingQuotation.terms || "—"}</p></LiquidPanel>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
