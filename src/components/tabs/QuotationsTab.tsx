import { useEffect, useMemo, useState } from "react";
import { Edit2, Eye, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidPanel,
} from "../ui/liquid";
import {
  QuotationPayload,
  quotationsService,
} from "../../services/quotationsService";

type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Payment Pending"
  | "Paid"
  | "Converted";

type QuotationProduct = {
  _id?: string;
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
  _id: string;
  quotationNo: string;
  date?: string;
  validUntil?: string;
  customerDetails?: {
    name?: string;
    phone?: string | number;
    email?: string;
    address?: string;
  };
  gst?: boolean;
  gstDetails?: {
    gstName?: string;
    gstNo?: string;
    gstPhone?: string | number;
    gstEmail?: string;
    gstAddress?: string;
  };
  products?: QuotationProduct[];
  subTotal?: number;
  discount?: number;
  tax?: number;
  totalAmount?: number;
  status?: QuotationStatus;
  payment?: {
    status?: "Unpaid" | "Partial" | "Paid";
    amountPaid?: number;
    balanceAmount?: number;
    mode?: string;
  };
  notes?: string;
  terms?: string;
  createdAt?: string;
};

type QuotationFormState = {
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
  productName: "",
  productDescription: "",
  productSerialNo: "",
  productQuantity: 1,
  productPrice: 0,
  productDiscount: 0,
  productTax: 0,
};

const initialForm: QuotationFormState = {
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

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function getStatusClassName(status?: string) {
  if (status === "Accepted" || status === "Paid" || status === "Converted") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (status === "Sent" || status === "Payment Pending") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
  }
  if (status === "Rejected" || status === "Expired") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
}

function mapFormToPayload(form: QuotationFormState): QuotationPayload {
  return {
    validUntil: form.validUntil || undefined,
    customerDetails: {
      name: form.customerName,
      phone: form.customerPhone,
      email: form.customerEmail,
      address: form.customerAddress,
    },
    gst: form.gst,
    gstDetails: form.gst
      ? {
          gstName: form.gstName,
          gstNo: form.gstNo,
          gstPhone: form.gstPhone,
          gstEmail: form.gstEmail,
          gstAddress: form.gstAddress,
        }
      : undefined,
    products: form.products.map((product) => ({
      productName: product.productName,
      productDescription: product.productDescription,
      productSerialNo: product.productSerialNo,
      productQuantity: Number(product.productQuantity) || 1,
      productPrice: Number(product.productPrice) || 0,
      productDiscount: Number(product.productDiscount) || 0,
      productTax: Number(product.productTax) || 0,
    })),
    discount: Number(form.discount) || 0,
    tax: Number(form.tax) || 0,
    notes: form.notes,
    terms: form.terms,
    status: form.status,
  };
}

function mapQuotationToForm(quotation: Quotation): QuotationFormState {
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
    discount: Number(quotation.discount) || 0,
    tax: Number(quotation.tax) || 0,
    notes: quotation.notes || "",
    terms: quotation.terms || "",
    products: quotation.products?.length
      ? quotation.products.map((product) => ({
          productName: product.productName || "",
          productDescription: product.productDescription || "",
          productSerialNo: product.productSerialNo || "",
          productQuantity: Number(product.productQuantity) || 1,
          productPrice: Number(product.productPrice) || 0,
          productDiscount: Number(product.productDiscount) || 0,
          productTax: Number(product.productTax) || 0,
        }))
      : [{ ...emptyProduct }],
  };
}

export default function QuotationsTab() {
  const { showToast } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<QuotationFormState>(initialForm);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const totals = useMemo(() => {
    return quotations.reduce(
      (acc, quotation) => {
        acc.count += 1;
        acc.value += Number(quotation.totalAmount) || 0;
        if (quotation.status === "Draft") acc.drafts += 1;
        if (quotation.status === "Accepted") acc.accepted += 1;
        return acc;
      },
      { count: 0, value: 0, drafts: 0, accepted: 0 },
    );
  }, [quotations]);

  const lineTotal = useMemo(() => {
    return form.products.reduce((sum, product) => {
      const qty = Number(product.productQuantity) || 0;
      const price = Number(product.productPrice) || 0;
      const discount = Number(product.productDiscount) || 0;
      const tax = Number(product.productTax) || 0;
      return sum + Math.max(qty * price - discount, 0) + tax;
    }, 0);
  }, [form.products]);

  const grandTotal = Math.max(lineTotal - (Number(form.discount) || 0), 0) + (Number(form.tax) || 0);

  const fetchQuotations = async () => {
    setLoading(true);
    const response = await quotationsService.getAll({
      page: 1,
      limit: 100,
      search,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    setLoading(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    const payload = response.data as { data?: Quotation[] } | Quotation[] | undefined;
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    setQuotations(list);
  };

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
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, [key]: value } : product,
      ),
    }));
  };

  const addProduct = () => {
    setForm((current) => ({ ...current, products: [...current.products, { ...emptyProduct }] }));
  };

  const removeProduct = (index: number) => {
    setForm((current) => ({
      ...current,
      products:
        current.products.length === 1
          ? [{ ...emptyProduct }]
          : current.products.filter((_, productIndex) => productIndex !== index),
    }));
  };

  const saveQuotation = async () => {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      showToast("Customer name and phone are required", "error");
      return;
    }
    if (!form.products.some((product) => product.productName.trim())) {
      showToast("Add at least one product", "error");
      return;
    }

    setSaving(true);
    const payload = mapFormToPayload(form);
    const response = editingQuotation
      ? await quotationsService.update(editingQuotation._id, payload)
      : await quotationsService.create(payload);
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
    const confirmed = window.confirm(`Delete quotation ${quotation.quotationNo}?`);
    if (!confirmed) return;

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

  return (
    <div className="space-y-6">
      <TabInnerContent title="Quotations" description="Create, manage and track customer quotations">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <LiquidPanel>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Total Quotations</p>
            <p className="mt-2 text-2xl font-bold text-neutral-950 dark:text-white">{totals.count}</p>
          </LiquidPanel>
          <LiquidPanel>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Quotation Value</p>
            <p className="mt-2 text-2xl font-bold text-neutral-950 dark:text-white">{formatCurrency(totals.value)}</p>
          </LiquidPanel>
          <LiquidPanel>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Drafts</p>
            <p className="mt-2 text-2xl font-bold text-neutral-950 dark:text-white">{totals.drafts}</p>
          </LiquidPanel>
          <LiquidPanel>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/60">Accepted</p>
            <p className="mt-2 text-2xl font-bold text-neutral-950 dark:text-white">{totals.accepted}</p>
          </LiquidPanel>
        </div>

        <LiquidPanel className="mx-4 mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_220px]">
              <LiquidInput
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") fetchQuotations();
                }}
                placeholder="Search quotation, customer, GST..."
              />
              <LiquidDropdown
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <LiquidButton type="button" variant="soft" onClick={fetchQuotations} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </LiquidButton>
              <LiquidButton type="button" variant="soft" onClick={fetchQuotations}>
                <Search className="h-4 w-4" />
                Search
              </LiquidButton>
              <LiquidButton type="button" variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Quotation
              </LiquidButton>
            </div>
          </div>
        </LiquidPanel>

        <div className="glass-card mx-4 overflow-hidden rounded-3xl border border-white/20 p-0 shadow-xl dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-400 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">Quotation No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600 dark:text-white/60">Loading quotations...</td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600 dark:text-white/60">No quotations found. Create your first quotation.</td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr key={quotation._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-sm font-semibold text-neutral-950 dark:text-white">{quotation.quotationNo}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/70">
                        <div className="font-semibold text-neutral-950 dark:text-white">{quotation.customerDetails?.name || "—"}</div>
                        <div className="text-xs text-slate-500 dark:text-white/50">{quotation.customerDetails?.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/70">{formatDate(quotation.date || quotation.createdAt)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-white/70">{quotation.products?.length || 0}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-neutral-950 dark:text-white">{formatCurrency(quotation.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm">
                        <LiquidDropdown
                          value={quotation.status || "Draft"}
                          options={quotationStatusOptions}
                          onChange={(value) => changeStatus(quotation, value)}
                          className="min-w-[140px]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setViewingQuotation(quotation)} className="liquid-icon-button" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEdit(quotation)} className="liquid-icon-button" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => deleteQuotation(quotation)} className="liquid-icon-button text-rose-500" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </TabInnerContent>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="glass-card max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/20 p-5 shadow-2xl dark:border-white/10">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-neutral-950 dark:text-white">{editingQuotation ? "Edit Quotation" : "Create Quotation"}</h3>
                <p className="text-sm text-slate-600 dark:text-white/60">Quotation numbers are generated automatically by the backend.</p>
              </div>
              <button type="button" onClick={closeForm} className="liquid-icon-button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <LiquidInput label="Customer Name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
              <LiquidInput label="Phone" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
              <LiquidInput label="Email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} />
              <LiquidInput label="Valid Until" type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} />
              <LiquidInput wrapperClassName="md:col-span-2" label="Address" value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} />
            </div>

            <div className="mt-5 rounded-2xl border border-white/20 p-4 dark:border-white/10">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-white">
                <input type="checkbox" checked={form.gst} onChange={(event) => setForm({ ...form, gst: event.target.checked })} />
                Add GST details
              </label>
              {form.gst && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <LiquidInput label="GST Name" value={form.gstName} onChange={(event) => setForm({ ...form, gstName: event.target.value })} />
                  <LiquidInput label="GST Number" value={form.gstNo} onChange={(event) => setForm({ ...form, gstNo: event.target.value })} />
                  <LiquidInput label="GST Phone" value={form.gstPhone} onChange={(event) => setForm({ ...form, gstPhone: event.target.value })} />
                  <LiquidInput label="GST Email" value={form.gstEmail} onChange={(event) => setForm({ ...form, gstEmail: event.target.value })} />
                  <LiquidInput wrapperClassName="md:col-span-2" label="GST Address" value={form.gstAddress} onChange={(event) => setForm({ ...form, gstAddress: event.target.value })} />
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/20 p-4 dark:border-white/10">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-neutral-950 dark:text-white">Products</h4>
                <LiquidButton type="button" variant="soft" onClick={addProduct}>
                  <Plus className="h-4 w-4" />
                  Add Product
                </LiquidButton>
              </div>
              <div className="space-y-3">
                {form.products.map((product, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-white/20 p-3 dark:border-white/10 lg:grid-cols-[1.4fr_.55fr_.75fr_.75fr_.75fr_auto]">
                    <LiquidInput label="Product" value={product.productName} onChange={(event) => updateProduct(index, "productName", event.target.value)} />
                    <LiquidInput label="Qty" type="number" value={product.productQuantity} onChange={(event) => updateProduct(index, "productQuantity", Number(event.target.value))} />
                    <LiquidInput label="Price" type="number" value={product.productPrice} onChange={(event) => updateProduct(index, "productPrice", Number(event.target.value))} />
                    <LiquidInput label="Discount" type="number" value={product.productDiscount || 0} onChange={(event) => updateProduct(index, "productDiscount", Number(event.target.value))} />
                    <LiquidInput label="Tax" type="number" value={product.productTax || 0} onChange={(event) => updateProduct(index, "productTax", Number(event.target.value))} />
                    <div className="flex items-end">
                      <button type="button" onClick={() => removeProduct(index)} className="liquid-icon-button text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <LiquidInput label="Overall Discount" type="number" value={form.discount} onChange={(event) => setForm({ ...form, discount: Number(event.target.value) })} />
              <LiquidInput label="Overall Tax" type="number" value={form.tax} onChange={(event) => setForm({ ...form, tax: Number(event.target.value) })} />
              <LiquidDropdown label="Status" value={form.status} options={quotationStatusOptions} onChange={(value) => setForm({ ...form, status: value as QuotationStatus })} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <LiquidInput label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              <LiquidInput label="Terms" value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} />
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/20 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-600 dark:text-white/60">Grand Total</p>
                <p className="text-2xl font-bold text-neutral-950 dark:text-white">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="flex gap-2">
                <LiquidButton type="button" variant="ghost" onClick={closeForm}>Cancel</LiquidButton>
                <LiquidButton type="button" variant="primary" onClick={saveQuotation} disabled={saving}>
                  {saving ? "Saving..." : editingQuotation ? "Update Quotation" : "Create Quotation"}
                </LiquidButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="glass-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/20 p-5 shadow-2xl dark:border-white/10">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-neutral-950 dark:text-white">{viewingQuotation.quotationNo}</h3>
                <p className="text-sm text-slate-600 dark:text-white/60">{viewingQuotation.customerDetails?.name} • {viewingQuotation.customerDetails?.phone}</p>
              </div>
              <button type="button" onClick={() => setViewingQuotation(null)} className="liquid-icon-button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <LiquidPanel><p className="text-xs uppercase text-slate-500">Date</p><p className="font-bold text-neutral-950 dark:text-white">{formatDate(viewingQuotation.date)}</p></LiquidPanel>
              <LiquidPanel><p className="text-xs uppercase text-slate-500">Status</p><LiquidBadge className={getStatusClassName(viewingQuotation.status)}>{viewingQuotation.status || "Draft"}</LiquidBadge></LiquidPanel>
              <LiquidPanel><p className="text-xs uppercase text-slate-500">Total</p><p className="font-bold text-neutral-950 dark:text-white">{formatCurrency(viewingQuotation.totalAmount)}</p></LiquidPanel>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Product</th>
                    <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Qty</th>
                    <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Price</th>
                    <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {viewingQuotation.products?.map((product, index) => (
                    <tr key={product._id || index}>
                      <td className="px-4 py-3 text-sm text-neutral-950 dark:text-white">{product.productName}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-white/60">{product.productQuantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-white/60">{formatCurrency(product.productPrice)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-neutral-950 dark:text-white">{formatCurrency(product.productTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(viewingQuotation.notes || viewingQuotation.terms) && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <LiquidPanel><p className="text-xs uppercase text-slate-500">Notes</p><p className="mt-1 text-sm text-slate-700 dark:text-white/70">{viewingQuotation.notes || "—"}</p></LiquidPanel>
                <LiquidPanel><p className="text-xs uppercase text-slate-500">Terms</p><p className="mt-1 text-sm text-slate-700 dark:text-white/70">{viewingQuotation.terms || "—"}</p></LiquidPanel>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
