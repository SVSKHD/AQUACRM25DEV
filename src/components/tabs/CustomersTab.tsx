import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Edit2,
  Eye,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { customerProfilesService } from "../../services/customerProfilesService";
import type { CustomerSource } from "../../services/customerProfilesService";

type SourceTab = "online" | "offline";
type DialogTab = "profile" | "addresses" | "orders" | "invoices" | "reviews";

type CustomerProfile = {
  id: string;
  key: string;
  source: SourceTab;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  alternativeEmail: string;
  phone: string;
  address: string;
  dob: string;
  role: string;
  isEmailVerfied: boolean;
  ismobileLoginConfirmation: boolean;
  gstDetails: any;
  selectedAddress: any;
  createdAt: string;
  totalSpent: number;
  ordersCount: number;
  invoicesCount: number;
  reviewsCount: number;
  addresses: any[];
  orders: any[];
  invoices: any[];
  reviews: any[];
  raw: any;
};

type UserCrudForm = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  alternativeEmail: string;
  phone: string;
  dob: string;
  role: string;
  isEmailVerfied: boolean;
  ismobileLoginConfirmation: boolean;
  address: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  gstNo: string;
  gstEmail: string;
  gstPhone: string;
  gstAddres: string;
};

type AddressForm = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  makeSelected: boolean;
};

type ReviewForm = {
  productId: string;
  invoiceId: string;
  rating: number;
  comment: string;
  name: string;
};

const emptyUserForm: UserCrudForm = {
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  alternativeEmail: "",
  phone: "",
  dob: "",
  role: "2",
  isEmailVerfied: false,
  ismobileLoginConfirmation: false,
  address: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  gstNo: "",
  gstEmail: "",
  gstPhone: "",
  gstAddres: "",
};

const emptyAddressForm: AddressForm = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  makeSelected: false,
};

const emptyReviewForm: ReviewForm = {
  productId: "",
  invoiceId: "",
  rating: 5,
  comment: "",
  name: "",
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white";

const text = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "")?.toString() || "";

const money = (...values: any[]) => Number(values.find((value) => Number(value) > 0) || 0);

const safeDate = (value?: string) => (value ? String(value).split("T")[0] : "-");

const formatINR = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const getArray = (raw: any, ...keys: string[]) => {
  for (const key of keys) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
};

const unwrapArray = (payload: any): any[] => {
  const body = payload?.data ?? payload ?? {};
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.customers)) return body.customers;
  if (Array.isArray(body.profiles)) return body.profiles;
  if (Array.isArray(body.items)) return body.items;
  return [];
};

const unwrapObject = (payload: any): any => {
  const body = payload?.data ?? payload ?? {};
  return body.data || body.profile || body.customer || body.user || body;
};

const addressText = (address: any) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return text(
    address.street,
    address.address,
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.city, address.state, address.postalCode || address.pincode].filter(Boolean).join(", "),
  );
};

const profileAddressText = (raw: any) => {
  const selected = raw?.selectedAddress || raw?.customer?.selectedAddress;
  const firstAddress = Array.isArray(raw?.addresses) ? raw.addresses[0] : null;
  return text(addressText(selected), addressText(firstAddress), raw?.address, raw?.customerDetails?.address);
};

const getOrderId = (order: any) => text(order.order_no, order.orderNumber, order.orderId, order.invoice_no, order.id, order._id);
const getInvoiceId = (invoice: any) => text(invoice.invoiceNo, invoice.invoice_no, invoice.invoiceNumber, invoice.id, invoice._id);
const getReviewId = (review: any) => text(review.id, review._id, review.reviewId, review.invoiceId, review.invoice_id);
const getProductName = (item: any) => text(item.productName, item.name, item.title, item.product?.title, item.productId?.title, "Product");
const getQuantity = (item: any) => Number(item.productQuantity || item.quantity || item.qty || 1);
const getPrice = (item: any) => Number(item.productPrice || item.price || item.salePrice || 0);

const normalizeProfile = (raw: any, fallbackSource: SourceTab): CustomerProfile => {
  const customer = raw.customer || raw;
  const source = (raw.source || raw.customerSource || fallbackSource) === "offline" ? "offline" : "online";
  const firstName = text(customer.firstName, raw.firstName);
  const lastName = text(customer.lastName, raw.lastName);
  const email = text(customer.email, raw.email, raw.customerDetails?.email);
  const phone = text(customer.phone, raw.phone, raw.customerDetails?.phone);
  const orders = getArray(raw, "orders", "aquaOrders", "ecomOrders");
  const invoices = getArray(raw, "invoices", "invoiceHistory", "aquaInvoices");
  const reviews = getArray(raw, "reviews", "productReviews");
  const addresses = getArray(raw, "addresses");
  const id = text(raw.id, raw._id, customer._id, raw.userId, raw.customerId, raw.key, phone, email);
  const name = text(raw.name, [firstName, lastName].filter(Boolean).join(" "), raw.customerDetails?.name, email, phone);

  return {
    id,
    key: text(raw.key, source === "offline" ? phone || email || id : id),
    source,
    name,
    firstName,
    lastName,
    email,
    alternativeEmail: text(customer.alternativeEmail, raw.alternativeEmail),
    phone,
    address: profileAddressText(raw),
    dob: text(customer.dob, raw.dob),
    role: text(customer.role, raw.role, "2"),
    isEmailVerfied: Boolean(customer.isEmailVerfied ?? raw.isEmailVerfied),
    ismobileLoginConfirmation: Boolean(customer.ismobileLoginConfirmation ?? raw.ismobileLoginConfirmation),
    gstDetails: customer.gstDetails || raw.gstDetails || {},
    selectedAddress: customer.selectedAddress || raw.selectedAddress || null,
    createdAt: text(customer.createdAt, raw.created_at, raw.createdAt, raw.date),
    totalSpent: money(raw.totalSpent, raw.total_revenue, raw.total_amount, raw.stats?.totalSpent),
    ordersCount: Number(raw.ordersCount ?? raw.stats?.ordersCount ?? orders.length ?? 0),
    invoicesCount: Number(raw.invoicesCount ?? raw.stats?.invoicesCount ?? invoices.length ?? 0),
    reviewsCount: Number(raw.reviewsCount ?? raw.stats?.reviewsCount ?? reviews.length ?? 0),
    addresses,
    orders,
    invoices,
    reviews,
    raw,
  };
};

const normalizeDetail = (raw: any, current: CustomerProfile): CustomerProfile => {
  const base = normalizeProfile({ ...current.raw, ...raw }, current.source);
  return {
    ...current,
    ...base,
    id: current.id || base.id,
    key: current.key || base.key,
    source: current.source,
    addresses: getArray(raw, "addresses") || current.addresses,
    orders: getArray(raw, "orders", "aquaOrders", "ecomOrders"),
    invoices: getArray(raw, "invoices", "invoiceHistory", "aquaInvoices"),
    reviews: getArray(raw, "reviews", "productReviews"),
    raw: { ...current.raw, ...raw },
  };
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/45">{label}</span>
    {children}
  </label>
);

const CheckField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
    {label}
  </label>
);

export default function CustomersTab() {
  const { showToast } = useToast();
  const [activeSource, setActiveSource] = useState<SourceTab>("online");
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [dialogTab, setDialogTab] = useState<DialogTab>("profile");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [userForm, setUserForm] = useState<UserCrudForm>(emptyUserForm);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  useKeyboardShortcut(
    "Escape",
    () => {
      setShowUserForm(false);
      setSelectedCustomer(null);
    },
    showUserForm || !!selectedCustomer,
  );

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const loadCustomers = async (source: SourceTab = activeSource) => {
    setLoading(true);
    const response: any = await customerProfilesService.list({ source: source as CustomerSource, search: debouncedSearch });
    if (response.error) {
      setCustomers([]);
      showToast(response.error || "Failed to load customers", "error");
      setLoading(false);
      return;
    }
    setCustomers(unwrapArray(response.data).map((item) => normalizeProfile(item, source)));
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers(activeSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource, debouncedSearch]);

  const filteredCustomers = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.firstName, customer.lastName, customer.email, customer.phone, customer.address, customer.key]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, debouncedSearch]);

  const openDetails = async (customer: CustomerProfile, tab: DialogTab = "profile") => {
    setSelectedCustomer(customer);
    setDialogTab(tab);
    setDetailLoading(true);
    const response: any =
      customer.source === "online"
        ? await customerProfilesService.getOnline(customer.id)
        : await customerProfilesService.getOffline(customer.key);
    if (response.error) {
      showToast(response.error || "Failed to load profile", "error");
      setDetailLoading(false);
      return;
    }
    const detail = normalizeDetail(unwrapObject(response.data), customer);
    setSelectedCustomer(detail);
    setCustomers((prev) => prev.map((item) => (item.id === customer.id ? detail : item)));
    setDetailLoading(false);
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setUserForm(emptyUserForm);
    setShowUserForm(true);
  };

  const openEdit = (customer: CustomerProfile) => {
    const selectedAddress = customer.selectedAddress || {};
    const gst = customer.gstDetails || {};
    setEditingCustomer(customer);
    setUserForm({
      name: customer.name,
      firstName: customer.firstName || customer.name.split(" ")[0] || "",
      lastName: customer.lastName || customer.name.split(" ").slice(1).join(" "),
      email: customer.email,
      alternativeEmail: customer.alternativeEmail,
      phone: customer.phone,
      dob: safeDate(customer.dob) === "-" ? "" : safeDate(customer.dob),
      role: customer.role || "2",
      isEmailVerfied: customer.isEmailVerfied,
      ismobileLoginConfirmation: customer.ismobileLoginConfirmation,
      address: customer.address,
      street: text(selectedAddress.street, customer.address),
      city: text(selectedAddress.city),
      state: text(selectedAddress.state),
      postalCode: text(selectedAddress.postalCode),
      gstNo: text(gst.gstNo),
      gstEmail: text(gst.gstEmail),
      gstPhone: text(gst.gstPhone),
      gstAddres: text(gst.gstAddres),
    });
    setShowUserForm(true);
  };

  const buildUserPayload = () => {
    if ((editingCustomer?.source || activeSource) === "offline") {
      return {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone,
        address: userForm.address || [userForm.street, userForm.city, userForm.state, userForm.postalCode].filter(Boolean).join(", "),
      };
    }

    return {
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      email: userForm.email,
      phone: userForm.phone,
      alternativeEmail: userForm.alternativeEmail,
      dob: userForm.dob,
      role: userForm.role,
      isEmailVerfied: userForm.isEmailVerfied,
      ismobileLoginConfirmation: userForm.ismobileLoginConfirmation,
      selectedAddress: {
        street: userForm.street || userForm.address,
        city: userForm.city,
        state: userForm.state,
        postalCode: userForm.postalCode,
      },
      gstDetails: {
        gstNo: userForm.gstNo,
        gstEmail: userForm.gstEmail,
        gstPhone: userForm.gstPhone,
        gstAddres: userForm.gstAddres,
      },
    };
  };

  const saveUser = async (event?: FormEvent) => {
    event?.preventDefault();
    const payload = buildUserPayload();
    const response: any = editingCustomer
      ? editingCustomer.source === "online"
        ? await customerProfilesService.updateOnline(editingCustomer.id, payload)
        : await customerProfilesService.updateOffline(editingCustomer.key, payload)
      : activeSource === "online"
        ? await customerProfilesService.createOnline(payload)
        : await customerProfilesService.createOffline(payload);

    if (response.error) {
      showToast(response.error || "Failed to save customer", "error");
      return;
    }
    showToast(editingCustomer ? "Customer updated" : "Customer created", "success");
    setShowUserForm(false);
    await loadCustomers(activeSource);
  };

  const deleteProfile = async (customer: CustomerProfile) => {
    const message = customer.source === "offline" ? "Delete this offline customer and matching invoices?" : "Delete this online ecommerce user?";
    if (!confirm(message)) return;
    const response: any = customer.source === "online" ? await customerProfilesService.deleteOnline(customer.id) : await customerProfilesService.deleteOffline(customer.key);
    if (response.error) {
      showToast(response.error || "Failed to delete customer", "error");
      return;
    }
    showToast("Customer deleted", "success");
    setSelectedCustomer(null);
    await loadCustomers(activeSource);
  };

  const refreshSelected = async () => {
    if (selectedCustomer) await openDetails(selectedCustomer, dialogTab);
  };

  const saveAddress = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!selectedCustomer || selectedCustomer.source !== "online") return;
    const response: any = editingAddressId
      ? await customerProfilesService.updateOnlineAddress(selectedCustomer.id, editingAddressId, addressForm)
      : await customerProfilesService.createOnlineAddress(selectedCustomer.id, addressForm);
    if (response.error) {
      showToast(response.error || "Failed to save address", "error");
      return;
    }
    showToast(editingAddressId ? "Address updated" : "Address added", "success");
    setAddressForm(emptyAddressForm);
    setEditingAddressId(null);
    await refreshSelected();
  };

  const editAddress = (address: any) => {
    setEditingAddressId(text(address.id, address._id));
    setAddressForm({
      street: text(address.street, address.address, address.line1),
      city: text(address.city),
      state: text(address.state),
      postalCode: text(address.postalCode, address.pincode, address.pinCode, address.zip),
      makeSelected: false,
    });
  };

  const deleteAddress = async (address: any) => {
    if (!selectedCustomer || !confirm("Delete this address?")) return;
    const response: any = await customerProfilesService.deleteOnlineAddress(selectedCustomer.id, text(address.id, address._id));
    if (response.error) {
      showToast(response.error || "Failed to delete address", "error");
      return;
    }
    showToast("Address deleted", "success");
    await refreshSelected();
  };

  const saveReview = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!selectedCustomer) return;
    const payload = { ...reviewForm, rating: Number(reviewForm.rating) };
    const response: any = editingReviewId
      ? selectedCustomer.source === "online"
        ? await customerProfilesService.updateOnlineReview(selectedCustomer.id, editingReviewId, payload)
        : await customerProfilesService.updateOfflineReview(selectedCustomer.key, editingReviewId, payload)
      : selectedCustomer.source === "online"
        ? await customerProfilesService.createOnlineReview(selectedCustomer.id, payload)
        : await customerProfilesService.createOfflineReview(selectedCustomer.key, payload);
    if (response.error) {
      showToast(response.error || "Failed to save review", "error");
      return;
    }
    showToast(editingReviewId ? "Review updated" : "Review added", "success");
    setReviewForm(emptyReviewForm);
    setEditingReviewId(null);
    await refreshSelected();
  };

  const editReview = (review: any) => {
    setEditingReviewId(getReviewId(review));
    setReviewForm({
      productId: text(review.productId, review.product_id, review.product?._id),
      invoiceId: text(review.invoiceId, review.invoice_id, review.id, review._id),
      rating: Number(review.rating || 5),
      comment: text(review.comment, review.text, review.review),
      name: text(review.name, selectedCustomer?.name),
    });
  };

  const deleteReview = async (review: any) => {
    if (!selectedCustomer || !confirm("Delete this review?")) return;
    const reviewId = getReviewId(review);
    const response: any = selectedCustomer.source === "online" ? await customerProfilesService.deleteOnlineReview(selectedCustomer.id, reviewId) : await customerProfilesService.deleteOfflineReview(selectedCustomer.key, reviewId);
    if (response.error) {
      showToast(response.error || "Failed to delete review", "error");
      return;
    }
    showToast("Review deleted", "success");
    await refreshSelected();
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    showToast("Copied", "success");
  };

  const sendWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <TabInnerContent title="Customers" description="Online ecommerce users and offline invoice customers">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search name, phone, email, address..." className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white" />
          </div>
          <button onClick={() => loadCustomers(activeSource)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:text-neutral-950 dark:border-white/10 dark:text-white/70 dark:hover:text-white">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400">
          <Plus className="h-4 w-4" /> Add {activeSource === "online" ? "Online User" : "Offline Customer"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 dark:border-white/10">
          {(["online", "offline"] as SourceTab[]).map((source) => (
            <button key={source} onClick={() => setActiveSource(source)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${activeSource === source ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "border border-slate-200 bg-white text-slate-600 hover:text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"}`}>
              {source === "online" ? "Online Ecommerce Users" : "Offline Invoice Customers"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-white/40">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={`${customer.source}-${customer.key || customer.id}`} className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.04]">
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-2.5 text-white"><User className="h-4 w-4" /></div><div><p className="font-bold text-neutral-950 dark:text-white">{customer.name || "Customer"}</p><p className="text-xs font-semibold uppercase text-slate-400">{customer.source} · {customer.source === "online" ? `role ${customer.role}` : "invoice"}</p></div></div></td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/70">{customer.phone ? <button className="inline-flex items-center gap-1" onClick={() => copy(customer.phone)}>{customer.phone} <Copy className="h-3 w-3" /></button> : "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/70">{customer.email || "-"}</td>
                    <td className="max-w-[260px] truncate px-4 py-4 text-sm text-slate-700 dark:text-white/70" title={customer.address}>{customer.address || "-"}</td>
                    <td className="px-4 py-4"><div className="flex flex-wrap gap-2 text-xs font-bold"><button onClick={() => openDetails(customer, "orders")} className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300">{customer.ordersCount} Orders</button><button onClick={() => openDetails(customer, "invoices")} className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-300">{customer.invoicesCount} Invoices</button><button onClick={() => openDetails(customer, "reviews")} className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-600 dark:text-amber-300">{customer.reviewsCount} Reviews</button></div></td>
                    <td className="px-4 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => openDetails(customer)} title="View details" className="rounded-xl bg-sky-50 p-2 text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10"><Eye className="h-4 w-4" /></button>{customer.phone && <button onClick={() => sendWhatsApp(customer.phone)} title="WhatsApp" className="rounded-xl bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10"><MessageCircle className="h-4 w-4" /></button>}<button onClick={() => openEdit(customer)} title="Edit" className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-white/70"><Edit2 className="h-4 w-4" /></button><button onClick={() => deleteProfile(customer)} title="Delete" className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">No customers found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUserForm && <UserFormModal source={editingCustomer?.source || activeSource} editing={!!editingCustomer} form={userForm} setForm={setUserForm} onClose={() => setShowUserForm(false)} onSubmit={saveUser} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            activeTab={dialogTab}
            setActiveTab={setDialogTab}
            loading={detailLoading}
            onClose={() => setSelectedCustomer(null)}
            onCopy={copy}
            onWhatsApp={sendWhatsApp}
            onEditProfile={() => openEdit(selectedCustomer)}
            onDeleteProfile={() => deleteProfile(selectedCustomer)}
            addressForm={addressForm}
            setAddressForm={setAddressForm}
            editingAddressId={editingAddressId}
            setEditingAddressId={setEditingAddressId}
            onSaveAddress={saveAddress}
            onEditAddress={editAddress}
            onDeleteAddress={deleteAddress}
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            editingReviewId={editingReviewId}
            setEditingReviewId={setEditingReviewId}
            onSaveReview={saveReview}
            onEditReview={editReview}
            onDeleteReview={deleteReview}
          />
        )}
      </AnimatePresence>
    </TabInnerContent>
  );
}

function UserFormModal({ source, editing, form, setForm, onClose, onSubmit }: { source: SourceTab; editing: boolean; form: UserCrudForm; setForm: (form: UserCrudForm) => void; onClose: () => void; onSubmit: (event?: FormEvent) => void }) {
  const online = source === "online";
  return (
    <motion.div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:rounded-3xl" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <div><p className="text-xs font-bold uppercase tracking-wide text-sky-500">{source} customer</p><h3 className="text-xl font-black text-neutral-950 dark:text-white">{editing ? "Edit Customer" : "Create Customer"}</h3></div>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500 dark:border-white/10 dark:text-white/60"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="custom-scrollbar grid grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          {online ? (
            <>
              <Field label="First Name"><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} /></Field>
              <Field label="Last Name"><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></Field>
              <Field label="Alternative Email"><input type="email" value={form.alternativeEmail} onChange={(e) => setForm({ ...form, alternativeEmail: e.target.value })} className={inputClass} /></Field>
              <Field label="DOB"><input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={inputClass} /></Field>
              <Field label="Role"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}><option value="2">Customer</option><option value="1">Admin</option><option value="3">Staff</option></select></Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><CheckField label="Email verified" checked={form.isEmailVerfied} onChange={(checked) => setForm({ ...form, isEmailVerfied: checked })} /><CheckField label="Mobile verified" checked={form.ismobileLoginConfirmation} onChange={(checked) => setForm({ ...form, ismobileLoginConfirmation: checked })} /></div>
              <div className="sm:col-span-2"><p className="mb-2 text-xs font-black uppercase tracking-wide text-sky-500">Selected Address</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Street"><input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={inputClass} /></Field><Field label="City"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} /></Field><Field label="State"><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} /></Field><Field label="Postal Code"><input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={inputClass} /></Field></div></div>
              <div className="sm:col-span-2"><p className="mb-2 text-xs font-black uppercase tracking-wide text-sky-500">GST Details</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="GST No"><input value={form.gstNo} onChange={(e) => setForm({ ...form, gstNo: e.target.value })} className={inputClass} /></Field><Field label="GST Email"><input type="email" value={form.gstEmail} onChange={(e) => setForm({ ...form, gstEmail: e.target.value })} className={inputClass} /></Field><Field label="GST Phone"><input value={form.gstPhone} onChange={(e) => setForm({ ...form, gstPhone: e.target.value })} className={inputClass} /></Field><Field label="GST Address"><input value={form.gstAddres} onChange={(e) => setForm({ ...form, gstAddres: e.target.value })} className={inputClass} /></Field></div></div>
            </>
          ) : (
            <>
              <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></Field>
              <div className="sm:col-span-2"><Field label="Invoice Customer Address"><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputClass} min-h-24`} /></Field></div>
            </>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-white/70">Cancel</button><button type="submit" className="rounded-2xl bg-sky-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/20">Save Customer</button></div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function CustomerDetailModal(props: any) {
  const { customer, activeTab, setActiveTab, loading, onClose } = props;
  const tabs: [DialogTab, string, typeof User][] = [
    ["profile", "Profile", User],
    ["addresses", `Addresses (${customer.addresses.length})`, MapPin],
    ["orders", `Orders (${customer.orders.length})`, ShoppingBag],
    ["invoices", `Invoices (${customer.invoices.length})`, Package],
    ["reviews", `Reviews (${customer.reviews.length})`, Star],
  ];

  return (
    <motion.div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:h-[88vh] sm:rounded-3xl" initial={{ y: 24, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-3 text-white"><User className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-sky-500">{customer.source} Customer Profile</p><h3 className="truncate text-xl font-black text-neutral-950 dark:text-white sm:text-2xl">{customer.name || "Customer"}</h3><p className="truncate text-xs text-slate-500 dark:text-white/50">{customer.email || customer.phone || "No contact details"}</p></div></div><button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60"><X className="h-5 w-5" /></button></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${activeTab === id ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "border border-slate-200 bg-white text-slate-600 hover:text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"}`}><Icon className="h-4 w-4" /> {label}</button>)}</div></div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">Loading complete profile...</div>}
          {activeTab === "profile" && <ProfileTab {...props} />}
          {activeTab === "addresses" && <AddressesTab {...props} />}
          {activeTab === "orders" && <RecordCards records={customer.orders} empty="No ecommerce orders found." type="order" onCopy={props.onCopy} onWhatsApp={() => customer.phone && props.onWhatsApp(customer.phone)} />}
          {activeTab === "invoices" && <RecordCards records={customer.invoices} empty="No invoices found." type="invoice" onCopy={props.onCopy} onWhatsApp={() => customer.phone && props.onWhatsApp(customer.phone)} />}
          {activeTab === "reviews" && <ReviewsTab {...props} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileTab({ customer, onCopy, onWhatsApp, onEditProfile, onDeleteProfile }: any) {
  const tiles = [
    [User, "First Name", customer.firstName],
    [User, "Last Name", customer.lastName],
    [Mail, "Email", customer.email],
    [MessageCircle, "Phone", customer.phone],
    [Mail, "Alt Email", customer.alternativeEmail],
    [User, "Role", customer.role],
    [Star, "Email Verified", customer.isEmailVerfied ? "Yes" : "No"],
    [ShoppingBag, "Orders", customer.orders.length],
    [Package, "Invoices", customer.invoices.length],
    [Star, "Reviews", customer.reviews.length],
  ];
  return <div className="space-y-5"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{tiles.map(([Icon, label, value]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40"><Icon className="h-4 w-4" />{label}</div><p className="mt-2 break-words text-sm font-bold text-neutral-950 dark:text-white">{value || "-"}</p></div>)}</div><div className="grid grid-cols-1 gap-3 lg:grid-cols-2"><InfoCard title="Selected Address" value={customer.address || "No address saved"} /><InfoCard title="GST Details" value={[customer.gstDetails?.gstNo, customer.gstDetails?.gstEmail, customer.gstDetails?.gstPhone, customer.gstDetails?.gstAddres].filter(Boolean).join(" · ") || "No GST details"} /></div><div className="flex flex-wrap gap-2"><button onClick={onEditProfile} className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white"><Edit2 className="mr-1 inline h-4 w-4" /> Edit Profile</button>{customer.phone && <button onClick={() => onWhatsApp(customer.phone)} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white"><MessageCircle className="mr-1 inline h-4 w-4" /> WhatsApp</button>}{customer.email && <button onClick={() => onCopy(customer.email)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-white/70"><Copy className="mr-1 inline h-4 w-4" /> Copy Email</button>}<button onClick={onDeleteProfile} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-bold text-white"><Trash2 className="mr-1 inline h-4 w-4" /> Delete</button></div></div>;
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">{title}</p><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/70">{value}</p></div>;
}

function AddressesTab({ customer, addressForm, setAddressForm, editingAddressId, setEditingAddressId, onSaveAddress, onEditAddress, onDeleteAddress }: any) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]"><div className="space-y-3">{customer.source === "offline" && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Offline customer address is controlled by the invoice customer profile. Use Edit Profile.</div>}{customer.addresses.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">No saved addresses.</div> : customer.addresses.map((address: any, index: number) => <div key={text(address.id, address._id, index)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-neutral-950 dark:text-white">Address {index + 1}</p><p className="mt-1 text-sm text-slate-600 dark:text-white/65">{addressText(address)}</p></div>{customer.source === "online" && <div className="flex gap-2"><button onClick={() => onEditAddress(address)} className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-white/5 dark:text-white/70"><Edit2 className="h-4 w-4" /></button><button onClick={() => onDeleteAddress(address)} className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div>}</div></div>)}</div>{customer.source === "online" && <form onSubmit={onSaveAddress} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><h4 className="mb-3 font-black text-neutral-950 dark:text-white">{editingAddressId ? "Edit Address" : "Add Address"}</h4><div className="space-y-3"><Field label="Street"><input required value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} className={inputClass} /></Field><div className="grid grid-cols-2 gap-3"><Field label="City"><input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className={inputClass} /></Field><Field label="Postal Code"><input value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} className={inputClass} /></Field></div><Field label="State"><input value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} className={inputClass} /></Field><CheckField label="Make selected address" checked={addressForm.makeSelected} onChange={(checked) => setAddressForm({ ...addressForm, makeSelected: checked })} /><div className="flex gap-2"><button type="submit" className="flex-1 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white">Save Address</button>{editingAddressId && <button type="button" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddressForm); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10">Clear</button>}</div></div></form>}</div>;
}

function RecordCards({ records, empty, type, onCopy, onWhatsApp }: any) {
  return <div className="space-y-3">{records.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">{empty}</div> : records.map((record: any, index: number) => { const id = type === "order" ? getOrderId(record) : getInvoiceId(record); const total = money(record.total_amount, record.totalAmount, record.grandTotal); const products = getArray(record, "products", "items", "orderItems"); return <div key={text(record.id, record._id, id, index)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">{type === "order" ? "Order ID" : "Invoice ID"}</p><p className="mt-1 break-all text-sm font-black text-neutral-950 dark:text-white">{id || "-"}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/50">{safeDate(text(record.date, record.createdAt, record.created_at))} · {text(record.status, record.orderStatus, record.paid_status, "status pending")}</p></div><p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{formatINR(total)}</p></div>{products.length > 0 && <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Products</p><div className="space-y-2">{products.map((product: any, productIndex: number) => <div key={productIndex} className="flex justify-between gap-3 text-xs"><span className="font-semibold text-neutral-950 dark:text-white">{getProductName(product)} × {getQuantity(product)}</span><span className="text-slate-500 dark:text-white/50">{formatINR(getPrice(product))}</span></div>)}</div></div>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onCopy(id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-white/60"><Copy className="mr-1 inline h-3.5 w-3.5" /> Copy ID</button><button onClick={onWhatsApp} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white"><MessageCircle className="mr-1 inline h-3.5 w-3.5" /> WhatsApp Customer</button></div></div>; })}</div>;
}

function ReviewsTab({ customer, reviewForm, setReviewForm, editingReviewId, setEditingReviewId, onSaveReview, onEditReview, onDeleteReview }: any) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]"><div className="space-y-3">{customer.reviews.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">No reviews found.</div> : customer.reviews.map((review: any, index: number) => <div key={text(getReviewId(review), index)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-neutral-950 dark:text-white">{text(review.productName, review.productTitle, review.product?.title, review.productId, "Product")}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/50">{safeDate(text(review.created_at, review.createdAt, review.date))}</p></div><span className="text-amber-500">{"★".repeat(Math.max(0, Math.min(5, Number(review.rating || 0))))}</span></div><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/65">{text(review.comment, review.text, review.review, "No review text.")}</p><div className="mt-3 flex gap-2"><button onClick={() => onEditReview(review)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-white/70"><Edit2 className="mr-1 inline h-3.5 w-3.5" /> Edit</button><button onClick={() => onDeleteReview(review)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 dark:bg-rose-500/10"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete</button></div></div>)}</div><form onSubmit={onSaveReview} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><h4 className="mb-3 font-black text-neutral-950 dark:text-white">{editingReviewId ? "Edit Review" : "Add Review"}</h4><div className="space-y-3"><Field label={customer.source === "offline" ? "Invoice ID" : "Product ID"}><input required={customer.source === "online"} value={customer.source === "offline" ? reviewForm.invoiceId : reviewForm.productId} onChange={(e) => customer.source === "offline" ? setReviewForm({ ...reviewForm, invoiceId: e.target.value }) : setReviewForm({ ...reviewForm, productId: e.target.value })} className={inputClass} /></Field><Field label="Reviewer Name"><input value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} className={inputClass} /></Field><Field label="Rating"><select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} className={inputClass}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} Star</option>)}</select></Field><Field label="Review"><textarea required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className={`${inputClass} min-h-28`} /></Field><div className="flex gap-2"><button type="submit" className="flex-1 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white">Save Review</button>{editingReviewId && <button type="button" onClick={() => { setEditingReviewId(null); setReviewForm(emptyReviewForm); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10">Clear</button>}</div></div></form></div>;
}
