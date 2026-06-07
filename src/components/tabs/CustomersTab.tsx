import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Copy,
  Edit2,
  Eye,
  Home,
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
import { customerProfilesService, CustomerSource } from "../../services/customerProfilesService";

type SourceTab = "online" | "offline";
type DialogTab = "profile" | "addresses" | "orders" | "invoices" | "reviews";

type CustomerProfile = {
  id: string;
  key: string;
  source: SourceTab;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
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

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
};

type AddressForm = {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

type ReviewForm = {
  id: string;
  productId: string;
  productName: string;
  invoiceId: string;
  rating: number;
  comment: string;
};

const emptyProfileForm: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
};

const emptyAddressForm: AddressForm = {
  label: "Home",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

const emptyReviewForm: ReviewForm = {
  id: "",
  productId: "",
  productName: "",
  invoiceId: "",
  rating: 5,
  comment: "",
};

const formatINR = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const safeDate = (value?: string) => (value ? String(value).split("T")[0] : "-");

const text = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "")?.toString() || "";

const money = (...values: any[]) => Number(values.find((value) => Number(value) > 0) || 0);

const unwrapArray = (payload: any): any[] => {
  const body = payload?.data ?? payload ?? {};
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.customers)) return body.customers;
  if (Array.isArray(body.profiles)) return body.profiles;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.online)) return body.online;
  if (Array.isArray(body.offline)) return body.offline;
  return [];
};

const unwrapObject = (payload: any): any => {
  const body = payload?.data ?? payload ?? {};
  return body.data || body.profile || body.customer || body.user || body;
};

const getAddressText = (raw: any) => {
  const selected = raw?.selectedAddress || raw?.defaultAddress;
  const firstAddress = Array.isArray(raw?.addresses) ? raw.addresses[0] : null;
  const address = selected || firstAddress || raw?.address || raw?.customerDetails?.address || raw;
  if (typeof address === "string") return address;
  return text(
    address?.fullAddress,
    address?.address,
    [address?.line1, address?.line2, address?.city, address?.state, address?.pincode]
      .filter(Boolean)
      .join(", "),
    raw?.customer_address,
  );
};

const getArray = (raw: any, ...keys: string[]) => {
  for (const key of keys) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
};

const normalizeProfile = (raw: any, fallbackSource: SourceTab): CustomerProfile => {
  const source = (raw.source || raw.customerSource || fallbackSource) === "offline" ? "offline" : "online";
  const id = text(raw.id, raw._id, raw.userId, raw.customerId, raw.key, raw.phone, raw.email);
  const phone = text(raw.phone, raw.mobile, raw.customer_phone, raw.customerDetails?.phone);
  const email = text(raw.email, raw.alternativeEmail, raw.customer_email, raw.customerDetails?.email);
  const name = text(
    raw.name,
    raw.company_name,
    raw.companyName,
    raw.contact_name,
    raw.customer_name,
    raw.customerDetails?.name,
    [raw.firstName, raw.lastName].filter(Boolean).join(" "),
    email,
    phone,
  );
  const orders = getArray(raw, "orders", "aquaOrders", "ecomOrders");
  const invoices = getArray(raw, "invoices", "invoiceHistory", "aquaInvoices");
  const reviews = getArray(raw, "reviews", "productReviews");
  const addresses = getArray(raw, "addresses");

  return {
    id,
    key: text(raw.key, source === "offline" ? phone || email || id : id),
    source,
    name,
    email,
    phone,
    address: getAddressText(raw),
    status: text(raw.status, raw.isEmailVerfied ? "active" : "inactive", "active"),
    createdAt: text(raw.created_at, raw.createdAt, raw.date),
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

const getOrderId = (order: any) => text(order.order_no, order.orderNumber, order.orderId, order.invoice_no, order.id, order._id);
const getInvoiceId = (invoice: any) => text(invoice.invoice_no, invoice.invoiceNumber, invoice.id, invoice._id);
const getReviewId = (review: any) => text(review.id, review._id, review.reviewId, review.invoiceId, review.invoice_id);
const getProductName = (item: any) => text(item.productName, item.name, item.title, item.product?.title, item.product_title, "Product");
const getQuantity = (item: any) => Number(item.productQuantity || item.quantity || item.qty || 1);
const getPrice = (item: any) => Number(item.productPrice || item.price || item.salePrice || 0);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/45">{label}</span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white";

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
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CustomerProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  useKeyboardShortcut(
    "Escape",
    () => {
      setShowProfileForm(false);
      setSelectedCustomer(null);
    },
    showProfileForm || !!selectedCustomer,
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
      [customer.name, customer.email, customer.phone, customer.address, customer.key]
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
    setEditingProfile(null);
    setProfileForm(emptyProfileForm);
    setShowProfileForm(true);
  };

  const openEdit = (customer: CustomerProfile) => {
    setEditingProfile(customer);
    setProfileForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status || "active",
    });
    setShowProfileForm(true);
  };

  const profilePayload = () => ({
    name: profileForm.name,
    company_name: profileForm.name,
    contact_name: profileForm.name,
    email: profileForm.email,
    phone: profileForm.phone,
    address: profileForm.address,
    status: profileForm.status,
    customerDetails: {
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      address: profileForm.address,
    },
  });

  const saveProfile = async (event?: FormEvent) => {
    event?.preventDefault();
    const payload = profilePayload();
    const response: any = editingProfile
      ? editingProfile.source === "online"
        ? await customerProfilesService.updateOnline(editingProfile.id, payload)
        : await customerProfilesService.updateOffline(editingProfile.key, payload)
      : activeSource === "online"
        ? await customerProfilesService.createOnline(payload)
        : await customerProfilesService.createOffline(payload);

    if (response.error) {
      showToast(response.error || "Failed to save customer", "error");
      return;
    }
    showToast(editingProfile ? "Customer updated" : "Customer created", "success");
    setShowProfileForm(false);
    await loadCustomers(activeSource);
  };

  const deleteProfile = async (customer: CustomerProfile) => {
    const message =
      customer.source === "offline"
        ? "Delete this offline customer and matching invoice customer records?"
        : "Delete this online ecommerce user?";
    if (!confirm(message)) return;
    const response: any =
      customer.source === "online"
        ? await customerProfilesService.deleteOnline(customer.id)
        : await customerProfilesService.deleteOffline(customer.key);
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
    if (!selectedCustomer) return;
    if (selectedCustomer.source === "offline") {
      setProfileForm({
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        address: [addressForm.line1, addressForm.line2, addressForm.city, addressForm.state, addressForm.pincode]
          .filter(Boolean)
          .join(", "),
        status: selectedCustomer.status,
      });
      showToast("Offline addresses are saved by editing the customer profile address", "error");
      return;
    }
    const payload = {
      ...addressForm,
      address: [addressForm.line1, addressForm.line2, addressForm.city, addressForm.state, addressForm.pincode]
        .filter(Boolean)
        .join(", "),
    };
    const response: any = editingAddressId
      ? await customerProfilesService.updateOnlineAddress(selectedCustomer.id, editingAddressId, payload)
      : await customerProfilesService.createOnlineAddress(selectedCustomer.id, payload);
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
      label: text(address.label, address.type, "Home"),
      name: text(address.name, selectedCustomer?.name),
      phone: text(address.phone, selectedCustomer?.phone),
      line1: text(address.line1, address.addressLine1, address.address),
      line2: text(address.line2, address.addressLine2),
      city: text(address.city),
      state: text(address.state),
      pincode: text(address.pincode, address.pinCode, address.zip),
      country: text(address.country, "India"),
      isDefault: Boolean(address.isDefault || address.default || address.selected),
    });
  };

  const deleteAddress = async (address: any) => {
    if (!selectedCustomer || !confirm("Delete this address?")) return;
    const addressId = text(address.id, address._id);
    const response: any = await customerProfilesService.deleteOnlineAddress(selectedCustomer.id, addressId);
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
    const payload = {
      productId: reviewForm.productId,
      productName: reviewForm.productName,
      invoiceId: reviewForm.invoiceId,
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment,
    };
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
      id: getReviewId(review),
      productId: text(review.productId, review.product_id, review.product?._id),
      productName: text(review.productName, review.productTitle, review.product?.title),
      invoiceId: text(review.invoiceId, review.invoice_id, review.id, review._id),
      rating: Number(review.rating || 5),
      comment: text(review.comment, review.text, review.review),
    });
  };

  const deleteReview = async (review: any) => {
    if (!selectedCustomer || !confirm("Delete this review?")) return;
    const reviewId = getReviewId(review);
    const response: any =
      selectedCustomer.source === "online"
        ? await customerProfilesService.deleteOnlineReview(selectedCustomer.id, reviewId)
        : await customerProfilesService.deleteOfflineReview(selectedCustomer.key, reviewId);
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
    <TabInnerContent title="Customers" description="Unified online ecommerce users and offline invoice customers">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, phone, email, address..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <button
            onClick={() => loadCustomers(activeSource)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:text-neutral-950 dark:border-white/10 dark:text-white/70 dark:hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" /> Add {activeSource === "online" ? "Online User" : "Offline Customer"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 dark:border-white/10">
          {(["online", "offline"] as SourceTab[]).map((source) => (
            <button
              key={source}
              onClick={() => setActiveSource(source)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                activeSource === source
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
              }`}
            >
              {source === "online" ? "Online Ecommerce Users" : "Offline Invoice Customers"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading customers...
          </div>
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
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={`${customer.source}-${customer.key || customer.id}`} className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.04]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-2.5 text-white">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-950 dark:text-white">{customer.name || "Customer"}</p>
                          <p className="text-xs font-semibold uppercase text-slate-400">{customer.source}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/70">
                      {customer.phone ? (
                        <button className="inline-flex items-center gap-1" onClick={() => copy(customer.phone)}>
                          {customer.phone} <Copy className="h-3 w-3" />
                        </button>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/70">{customer.email || "-"}</td>
                    <td className="max-w-[240px] truncate px-4 py-4 text-sm text-slate-700 dark:text-white/70" title={customer.address}>{customer.address || "-"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <button onClick={() => openDetails(customer, "orders")} className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300">{customer.ordersCount} Orders</button>
                        <button onClick={() => openDetails(customer, "invoices")} className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-300">{customer.invoicesCount} Invoices</button>
                        <button onClick={() => openDetails(customer, "reviews")} className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-600 dark:text-amber-300">{customer.reviewsCount} Reviews</button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{safeDate(customer.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetails(customer)} title="View details" className="rounded-xl bg-sky-50 p-2 text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20"><Eye className="h-4 w-4" /></button>
                        {customer.phone && <button onClick={() => sendWhatsApp(customer.phone)} title="WhatsApp" className="rounded-xl bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"><MessageCircle className="h-4 w-4" /></button>}
                        {customer.email && <button onClick={() => (window.location.href = `mailto:${customer.email}`)} title="Email" className="rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"><Mail className="h-4 w-4" /></button>}
                        <button onClick={() => openEdit(customer)} title="Edit" className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => deleteProfile(customer)} title="Delete" className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showProfileForm && (
          <ProfileFormModal
            source={editingProfile?.source || activeSource}
            editing={!!editingProfile}
            form={profileForm}
            setForm={setProfileForm}
            onClose={() => setShowProfileForm(false)}
            onSubmit={saveProfile}
          />
        )}
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

function ProfileFormModal({
  source,
  editing,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  source: SourceTab;
  editing: boolean;
  form: ProfileForm;
  setForm: (form: ProfileForm) => void;
  onClose: () => void;
  onSubmit: (event?: FormEvent) => void;
}) {
  return (
    <motion.div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-2xl rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:rounded-3xl" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-500">{source} customer</p>
            <h3 className="text-xl font-black text-neutral-950 dark:text-white">{editing ? "Edit Customer" : "Create Customer"}</h3>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500 dark:border-white/10 dark:text-white/60"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputClass} min-h-24`} /></Field></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-white/70">Cancel</button>
            <button type="submit" className="rounded-2xl bg-sky-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/20">Save Customer</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function CustomerDetailModal(props: {
  customer: CustomerProfile;
  activeTab: DialogTab;
  setActiveTab: (tab: DialogTab) => void;
  loading: boolean;
  onClose: () => void;
  onCopy: (value: string) => void;
  onWhatsApp: (phone: string) => void;
  onEditProfile: () => void;
  onDeleteProfile: () => void;
  addressForm: AddressForm;
  setAddressForm: (form: AddressForm) => void;
  editingAddressId: string | null;
  setEditingAddressId: (id: string | null) => void;
  onSaveAddress: (event?: FormEvent) => void;
  onEditAddress: (address: any) => void;
  onDeleteAddress: (address: any) => void;
  reviewForm: ReviewForm;
  setReviewForm: (form: ReviewForm) => void;
  editingReviewId: string | null;
  setEditingReviewId: (id: string | null) => void;
  onSaveReview: (event?: FormEvent) => void;
  onEditReview: (review: any) => void;
  onDeleteReview: (review: any) => void;
}) {
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
        <div className="border-b border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-3 text-white"><User className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-500">{customer.source} Customer Profile</p>
                <h3 className="truncate text-xl font-black text-neutral-950 dark:text-white sm:text-2xl">{customer.name || "Customer"}</h3>
                <p className="truncate text-xs text-slate-500 dark:text-white/50">{customer.email || customer.phone || "No contact details"}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${activeTab === id ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "border border-slate-200 bg-white text-slate-600 hover:text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">Loading complete profile...</div>}
          {activeTab === "profile" && <ProfileTab {...props} />}
          {activeTab === "addresses" && <AddressesTab {...props} />}
          {activeTab === "orders" && <RecordCards title="Orders" records={customer.orders} empty="No ecommerce orders found." type="order" onCopy={props.onCopy} onWhatsApp={() => customer.phone && props.onWhatsApp(customer.phone)} />}
          {activeTab === "invoices" && <RecordCards title="Invoices" records={customer.invoices} empty="No invoices found." type="invoice" onCopy={props.onCopy} onWhatsApp={() => customer.phone && props.onWhatsApp(customer.phone)} />}
          {activeTab === "reviews" && <ReviewsTab {...props} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileTab({ customer, onCopy, onWhatsApp, onEditProfile, onDeleteProfile }: any) {
  const tiles = [
    [ShoppingBag, "Orders", customer.orders.length],
    [Package, "Invoices", customer.invoices.length],
    [Star, "Reviews", customer.reviews.length],
    [Calendar, "Created", safeDate(customer.createdAt)],
    [User, "Name", customer.name],
    [Mail, "Email", customer.email],
    [MessageCircle, "Phone", customer.phone],
    [Home, "Total Spent", formatINR(customer.totalSpent)],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([Icon, label, value]: any) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40"><Icon className="h-4 w-4" />{label}</div>
            <p className="mt-2 break-words text-sm font-bold text-neutral-950 dark:text-white">{value || "-"}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/70"><MapPin className="mt-0.5 h-4 w-4" />{customer.address || "No address saved"}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onEditProfile} className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white"><Edit2 className="mr-1 inline h-4 w-4" /> Edit Profile</button>
        {customer.phone && <button onClick={() => onWhatsApp(customer.phone)} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white"><MessageCircle className="mr-1 inline h-4 w-4" /> WhatsApp</button>}
        {customer.email && <button onClick={() => onCopy(customer.email)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-white/70"><Copy className="mr-1 inline h-4 w-4" /> Copy Email</button>}
        <button onClick={onDeleteProfile} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-bold text-white"><Trash2 className="mr-1 inline h-4 w-4" /> Delete</button>
      </div>
    </div>
  );
}

function AddressesTab({ customer, addressForm, setAddressForm, editingAddressId, setEditingAddressId, onSaveAddress, onEditAddress, onDeleteAddress }: any) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {customer.source === "offline" && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Offline customer address is controlled by the invoice customer profile. Use Edit Profile for offline address changes.</div>}
        {customer.addresses.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">No saved addresses.</div> : customer.addresses.map((address: any, index: number) => (
          <div key={text(address.id, address._id, index)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-neutral-950 dark:text-white">{text(address.label, address.type, `Address ${index + 1}`)}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-white/65">{getAddressText(address)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-white/40">{text(address.name)} {text(address.phone) && `· ${text(address.phone)}`}</p>
              </div>
              {customer.source === "online" && <div className="flex gap-2"><button onClick={() => onEditAddress(address)} className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-white/5 dark:text-white/70"><Edit2 className="h-4 w-4" /></button><button onClick={() => onDeleteAddress(address)} className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div>}
            </div>
          </div>
        ))}
      </div>
      {customer.source === "online" && <form onSubmit={onSaveAddress} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h4 className="mb-3 font-black text-neutral-950 dark:text-white">{editingAddressId ? "Edit Address" : "Add Address"}</h4>
        <div className="space-y-3">
          <Field label="Label"><input value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} className={inputClass} /></Field>
          <Field label="Line 1"><input required value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} className={inputClass} /></Field>
          <Field label="Line 2"><input value={addressForm.line2} onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="City"><input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className={inputClass} /></Field><Field label="Pincode"><input value={addressForm.pincode} onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })} className={inputClass} /></Field></div>
          <Field label="State"><input value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} className={inputClass} /></Field>
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white">Save Address</button>{editingAddressId && <button type="button" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddressForm); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10">Clear</button>}</div>
        </div>
      </form>}
    </div>
  );
}

function RecordCards({ records, empty, type, onCopy, onWhatsApp }: any) {
  return <div className="space-y-3">{records.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">{empty}</div> : records.map((record: any, index: number) => {
    const id = type === "order" ? getOrderId(record) : getInvoiceId(record);
    const total = money(record.total_amount, record.totalAmount, record.grandTotal);
    const products = getArray(record, "products", "items", "orderItems");
    return <div key={text(record.id, record._id, id, index)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">{type === "order" ? "Order ID" : "Invoice ID"}</p><p className="mt-1 break-all text-sm font-black text-neutral-950 dark:text-white">{id || "-"}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/50">{safeDate(text(record.date, record.createdAt, record.created_at))} · {text(record.status, record.orderStatus, record.paid_status, "status pending")}</p></div><p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{formatINR(total)}</p></div>
      {products.length > 0 && <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Products</p><div className="space-y-2">{products.map((product: any, productIndex: number) => <div key={productIndex} className="flex justify-between gap-3 text-xs"><span className="font-semibold text-neutral-950 dark:text-white">{getProductName(product)} × {getQuantity(product)}</span><span className="text-slate-500 dark:text-white/50">{formatINR(getPrice(product))}</span></div>)}</div></div>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onCopy(id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-white/60"><Copy className="mr-1 inline h-3.5 w-3.5" /> Copy ID</button><button onClick={onWhatsApp} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white"><MessageCircle className="mr-1 inline h-3.5 w-3.5" /> WhatsApp Customer</button></div>
    </div>;
  })}</div>;
}

function ReviewsTab({ customer, reviewForm, setReviewForm, editingReviewId, setEditingReviewId, onSaveReview, onEditReview, onDeleteReview }: any) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]"><div className="space-y-3">{customer.reviews.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">No reviews found.</div> : customer.reviews.map((review: any, index: number) => <div key={text(getReviewId(review), index)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-neutral-950 dark:text-white">{text(review.productName, review.productTitle, review.product?.title, review.productId, "Product")}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/50">{safeDate(text(review.created_at, review.createdAt, review.date))}</p></div><span className="text-amber-500">{"★".repeat(Math.max(0, Math.min(5, Number(review.rating || 0))))}</span></div><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/65">{text(review.comment, review.text, review.review, "No review text.")}</p><div className="mt-3 flex gap-2"><button onClick={() => onEditReview(review)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-white/70"><Edit2 className="mr-1 inline h-3.5 w-3.5" /> Edit</button><button onClick={() => onDeleteReview(review)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 dark:bg-rose-500/10"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete</button></div></div>)}</div><form onSubmit={onSaveReview} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"><h4 className="mb-3 font-black text-neutral-950 dark:text-white">{editingReviewId ? "Edit Review" : "Add Review"}</h4><div className="space-y-3"><Field label={customer.source === "offline" ? "Invoice ID" : "Product ID"}><input required={customer.source === "online"} value={customer.source === "offline" ? reviewForm.invoiceId : reviewForm.productId} onChange={(e) => customer.source === "offline" ? setReviewForm({ ...reviewForm, invoiceId: e.target.value }) : setReviewForm({ ...reviewForm, productId: e.target.value })} className={inputClass} /></Field><Field label="Product Name"><input value={reviewForm.productName} onChange={(e) => setReviewForm({ ...reviewForm, productName: e.target.value })} className={inputClass} /></Field><Field label="Rating"><select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} className={inputClass}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} Star</option>)}</select></Field><Field label="Review"><textarea required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className={`${inputClass} min-h-28`} /></Field><div className="flex gap-2"><button type="submit" className="flex-1 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white">Save Review</button>{editingReviewId && <button type="button" onClick={() => { setEditingReviewId(null); setReviewForm(emptyReviewForm); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10">Clear</button>}</div></div></form></div>;
}
