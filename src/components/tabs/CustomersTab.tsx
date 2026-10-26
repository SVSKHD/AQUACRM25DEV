import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Mail,
  Link2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { usePersistentFormDraft } from "../../hooks/usePersistentFormDraft";
import { customerProfilesService } from "../../services/customerProfilesService";
import type { CustomerSource } from "../../services/customerProfilesService";
import { PAID_LABELS, paidStatusOf } from "../../utils/invoiceStatus";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidIconButton,
  LiquidInput,
  LiquidSelect,
  LiquidTextarea,
} from "../ui/liquid";

export type CustomerSourceTab = "online" | "offline";
type SourceTab = CustomerSourceTab;
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
  invoiceLoginLinked: boolean;
  invoiceProfileEnrichedAt: string;
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

const ROLE_LABELS: Record<string, string> = {
  "1": "Admin",
  "2": "Customer",
  "3": "Staff",
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const text = (...values: any[]) =>
  values
    .find(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    )
    ?.toString() || "";

const money = (...values: any[]) =>
  Number(values.find((value) => Number(value) > 0) || 0);

const safeDate = (value?: string) =>
  value ? String(value).split("T")[0] : "-";

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

/** Full one-line address: street (or line1/line2), city, state, PIN. */
const addressText = (address: any) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  const street = text(
    address.street,
    address.address,
    [address.line1, address.line2].filter(Boolean).join(", "),
  );
  return [
    street,
    address.city,
    address.state,
    text(address.postalCode, address.pincode),
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

const profileAddressText = (raw: any) => {
  const selected = raw?.selectedAddress || raw?.customer?.selectedAddress;
  const firstAddress = Array.isArray(raw?.addresses) ? raw.addresses[0] : null;
  return text(
    addressText(selected),
    addressText(firstAddress),
    raw?.address,
    raw?.customerDetails?.address,
  );
};

const getOrderId = (order: any) =>
  text(
    order.order_no,
    order.orderNumber,
    order.orderId,
    order.invoice_no,
    order.id,
    order._id,
  );
const getInvoiceId = (invoice: any) =>
  text(
    invoice.invoiceNo,
    invoice.invoice_no,
    invoice.invoiceNumber,
    invoice.id,
    invoice._id,
  );
const getReviewId = (review: any) =>
  text(
    review.id,
    review._id,
    review.reviewId,
    review.invoiceId,
    review.invoice_id,
  );
const getProductName = (item: any) =>
  text(
    item.productName,
    item.name,
    item.title,
    item.product?.title,
    item.productId?.title,
    "Product",
  );
const getQuantity = (item: any) =>
  Number(item.productQuantity || item.quantity || item.qty || 1);
const getPrice = (item: any) =>
  Number(item.productPrice || item.price || item.salePrice || 0);

const normalizeProfile = (
  raw: any,
  fallbackSource: SourceTab,
): CustomerProfile => {
  const customer = raw.customer || raw;
  const source =
    (raw.source || raw.customerSource || fallbackSource) === "offline"
      ? "offline"
      : "online";
  const firstName = text(customer.firstName, raw.firstName);
  const lastName = text(customer.lastName, raw.lastName);
  const email = text(customer.email, raw.email, raw.customerDetails?.email);
  const phone = text(customer.phone, raw.phone, raw.customerDetails?.phone);
  const orders = getArray(raw, "orders", "aquaOrders", "ecomOrders");
  const invoices = getArray(raw, "invoices", "invoiceHistory", "aquaInvoices");
  const reviews = getArray(raw, "reviews", "productReviews");
  const addresses = getArray(raw, "addresses");
  const id = text(
    raw.id,
    raw._id,
    customer._id,
    raw.userId,
    raw.customerId,
    raw.key,
    phone,
    email,
  );
  const name = text(
    raw.name,
    [firstName, lastName].filter(Boolean).join(" "),
    raw.customerDetails?.name,
    email,
    phone,
  );

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
    ismobileLoginConfirmation: Boolean(
      customer.ismobileLoginConfirmation ?? raw.ismobileLoginConfirmation,
    ),
    gstDetails: customer.gstDetails || raw.gstDetails || {},
    selectedAddress: customer.selectedAddress || raw.selectedAddress || null,
    createdAt: text(
      customer.createdAt,
      raw.created_at,
      raw.createdAt,
      raw.date,
    ),
    totalSpent: money(
      raw.totalSpent,
      raw.total_revenue,
      raw.total_amount,
      raw.stats?.totalSpent,
    ),
    ordersCount: Number(
      raw.ordersCount ?? raw.stats?.ordersCount ?? orders.length ?? 0,
    ),
    invoicesCount: Number(
      raw.invoicesCount ?? raw.stats?.invoicesCount ?? invoices.length ?? 0,
    ),
    reviewsCount: Number(
      raw.reviewsCount ?? raw.stats?.reviewsCount ?? reviews.length ?? 0,
    ),
    invoiceLoginLinked: Boolean(
      customer.firebaseUid ||
      customer.isGoogleLogin ||
      customer.invoiceProfileEnrichedAt ||
      raw.invoiceLoginLinked,
    ),
    invoiceProfileEnrichedAt: text(
      customer.invoiceProfileEnrichedAt,
      raw.invoiceProfileEnrichedAt,
    ),
    addresses,
    orders,
    invoices,
    reviews,
    raw,
  };
};

const normalizeDetail = (
  raw: any,
  current: CustomerProfile,
): CustomerProfile => {
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

type CustomersTabProps = {
  activeSource: CustomerSourceTab;
};

export default function CustomersTab({ activeSource }: CustomersTabProps) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerProfile | null>(null);
  const [dialogTab, setDialogTab] = useState<DialogTab>("profile");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<CustomerProfile | null>(null);
  const [userForm, setUserForm] = useState<UserCrudForm>(emptyUserForm);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const userDraft = usePersistentFormDraft({
    key: `customers:${activeSource}:${editingCustomer?.id || editingCustomer?.key || "create"}`,
    value: userForm,
    onRestore: setUserForm,
    enabled: showUserForm,
  });
  const addressDraft = usePersistentFormDraft({
    key: `customer-address:${selectedCustomer?.id || selectedCustomer?.key || "none"}:${editingAddressId || "create"}`,
    value: addressForm,
    onRestore: setAddressForm,
    enabled: Boolean(selectedCustomer && dialogTab === "addresses"),
  });
  const reviewDraft = usePersistentFormDraft({
    key: `customer-review:${selectedCustomer?.id || selectedCustomer?.key || "none"}:${editingReviewId || "create"}`,
    value: reviewForm,
    onRestore: setReviewForm,
    enabled: Boolean(selectedCustomer && dialogTab === "reviews"),
  });

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
    const response: any = await customerProfilesService.list({
      source: source as CustomerSource,
      search: debouncedSearch,
    });
    if (response.error) {
      setCustomers([]);
      showToast(response.error || "Failed to load customers", "error");
      setLoading(false);
      return;
    }
    setCustomers(
      unwrapArray(response.data).map((item) => normalizeProfile(item, source)),
    );
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
      [
        customer.name,
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone,
        customer.address,
        customer.key,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, debouncedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / pageSize),
  );
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstResult = filteredCustomers.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const lastResult = Math.min(currentPage * pageSize, filteredCustomers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSource, debouncedSearch, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openDetails = async (
    customer: CustomerProfile,
    tab: DialogTab = "profile",
  ) => {
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
    setCustomers((prev) =>
      prev.map((item) => (item.id === customer.id ? detail : item)),
    );
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
      lastName:
        customer.lastName || customer.name.split(" ").slice(1).join(" "),
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
        address:
          userForm.address ||
          [userForm.street, userForm.city, userForm.state, userForm.postalCode]
            .filter(Boolean)
            .join(", "),
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
        ? await customerProfilesService.updateOnline(
            editingCustomer.id,
            payload,
          )
        : await customerProfilesService.updateOffline(
            editingCustomer.key,
            payload,
          )
      : activeSource === "online"
        ? await customerProfilesService.createOnline(payload)
        : await customerProfilesService.createOffline(payload);

    if (response.error) {
      showToast(response.error || "Failed to save customer", "error");
      return;
    }
    showToast(
      editingCustomer ? "Customer updated" : "Customer created",
      "success",
    );
    setShowUserForm(false);
    await userDraft.clearDraft();
    setEditingCustomer(null);
    setUserForm(emptyUserForm);
    await loadCustomers(activeSource);
  };

  const deleteProfile = async (customer: CustomerProfile) => {
    const message =
      customer.source === "offline"
        ? "Delete this offline customer and matching invoices?"
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
    if (!selectedCustomer || selectedCustomer.source !== "online") return;
    const response: any = editingAddressId
      ? await customerProfilesService.updateOnlineAddress(
          selectedCustomer.id,
          editingAddressId,
          addressForm,
        )
      : await customerProfilesService.createOnlineAddress(
          selectedCustomer.id,
          addressForm,
        );
    if (response.error) {
      showToast(response.error || "Failed to save address", "error");
      return;
    }
    showToast(
      editingAddressId ? "Address updated" : "Address added",
      "success",
    );
    await addressDraft.clearDraft();
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
      postalCode: text(
        address.postalCode,
        address.pincode,
        address.pinCode,
        address.zip,
      ),
      makeSelected: false,
    });
  };

  const deleteAddress = async (address: any) => {
    if (!selectedCustomer || !confirm("Delete this address?")) return;
    const response: any = await customerProfilesService.deleteOnlineAddress(
      selectedCustomer.id,
      text(address.id, address._id),
    );
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
        ? await customerProfilesService.updateOnlineReview(
            selectedCustomer.id,
            editingReviewId,
            payload,
          )
        : await customerProfilesService.updateOfflineReview(
            selectedCustomer.key,
            editingReviewId,
            payload,
          )
      : selectedCustomer.source === "online"
        ? await customerProfilesService.createOnlineReview(
            selectedCustomer.id,
            payload,
          )
        : await customerProfilesService.createOfflineReview(
            selectedCustomer.key,
            payload,
          );
    if (response.error) {
      showToast(response.error || "Failed to save review", "error");
      return;
    }
    showToast(editingReviewId ? "Review updated" : "Review added", "success");
    await reviewDraft.clearDraft();
    setReviewForm(emptyReviewForm);
    setEditingReviewId(null);
    await refreshSelected();
  };

  const editReview = (review: any) => {
    setEditingReviewId(getReviewId(review));
    setReviewForm({
      productId: text(review.productId, review.product_id, review.product?._id),
      invoiceId: text(
        review.invoiceId,
        review.invoice_id,
        review.id,
        review._id,
      ),
      rating: Number(review.rating || 5),
      comment: text(review.comment, review.text, review.review),
      name: text(review.name, selectedCustomer?.name),
    });
  };

  const deleteReview = async (review: any) => {
    if (!selectedCustomer || !confirm("Delete this review?")) return;
    const reviewId = getReviewId(review);
    const response: any =
      selectedCustomer.source === "online"
        ? await customerProfilesService.deleteOnlineReview(
            selectedCustomer.id,
            reviewId,
          )
        : await customerProfilesService.deleteOfflineReview(
            selectedCustomer.key,
            reviewId,
          );
    if (response.error) {
      showToast(response.error || "Failed to delete review", "error");
      return;
    }
    showToast("Review deleted", "success");
    await refreshSelected();
  };

  const clearUserDraft = async () => {
    await userDraft.clearDraft();
    setUserForm(emptyUserForm);
    showToast("Customer draft cleared", "success");
  };

  const clearAddressDraft = async () => {
    await addressDraft.clearDraft();
    setAddressForm(emptyAddressForm);
    setEditingAddressId(null);
    showToast("Address draft cleared", "success");
  };

  const clearReviewDraft = async () => {
    await reviewDraft.clearDraft();
    setReviewForm(emptyReviewForm);
    setEditingReviewId(null);
    showToast("Review draft cleared", "success");
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    showToast("Copied", "success");
  };

  const sendWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <TabInnerContent
      title="Customers"
      description="Online ecommerce users and offline invoice customers"
    >
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <LiquidInput
              type="search"
              aria-label="Search customers"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, phone, email, address..."
              className="pl-10"
            />
          </div>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => loadCustomers(activeSource)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </LiquidButton>
        </div>
        <LiquidButton type="button" variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add{" "}
          {activeSource === "online" ? "Online User" : "Offline Customer"}
        </LiquidButton>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
              {activeSource === "online"
                ? "Online Customers"
                : "Offline Customers"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50">
              Customer records and invoice activity
            </p>
          </div>
          <span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
            {filteredCustomers.length.toLocaleString("en-IN")} records
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading
            customers...
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
                  <th className="px-4 py-3">Invoice Login</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={`${customer.source}-${customer.key || customer.id}`}
                    className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-2.5 text-white">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-950 dark:text-white">
                            {customer.name || "Customer"}
                          </p>
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            {customer.source} ·{" "}
                            {customer.source === "online"
                              ? ROLE_LABELS[customer.role] ||
                                `role ${customer.role}`
                              : "invoice"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/70">
                      {customer.phone ? (
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => copy(customer.phone)}
                        >
                          {customer.phone} <Copy className="h-3 w-3" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/70">
                      {customer.email || "-"}
                    </td>
                    <td
                      className="max-w-[260px] truncate px-4 py-4 text-sm text-slate-700 dark:text-white/70"
                      title={customer.address}
                    >
                      {customer.address || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <InvoiceLoginBadge
                        linked={customer.invoiceLoginLinked}
                        enrichedAt={customer.invoiceProfileEnrichedAt}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <button
                          onClick={() => openDetails(customer, "orders")}
                          className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300"
                        >
                          {customer.ordersCount} Orders
                        </button>
                        <button
                          onClick={() => openDetails(customer, "invoices")}
                          className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-300"
                        >
                          {customer.invoicesCount} Invoices
                        </button>
                        <button
                          onClick={() => openDetails(customer, "reviews")}
                          className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-600 dark:text-amber-300"
                        >
                          {customer.reviewsCount} Reviews
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <LiquidIconButton
                          type="button"
                          onClick={() => openDetails(customer)}
                          title="View details"
                          aria-label={`View ${customer.name || "customer"}`}
                          className="text-sky-500"
                        >
                          <Eye className="h-4 w-4" />
                        </LiquidIconButton>
                        {customer.phone && (
                          <LiquidIconButton
                            type="button"
                            onClick={() => sendWhatsApp(customer.phone)}
                            title="WhatsApp"
                            aria-label={`WhatsApp ${customer.name || "customer"}`}
                            className="text-emerald-500"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </LiquidIconButton>
                        )}
                        <LiquidIconButton
                          type="button"
                          onClick={() => openEdit(customer)}
                          title="Edit"
                          aria-label={`Edit ${customer.name || "customer"}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </LiquidIconButton>
                        <LiquidIconButton
                          type="button"
                          onClick={() => deleteProfile(customer)}
                          title="Delete"
                          aria-label={`Delete ${customer.name || "customer"}`}
                          className="text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </LiquidIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredCustomers.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-white/50">
              Showing {firstResult}–{lastResult} of{" "}
              {filteredCustomers.length.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                Rows
              </span>
              <LiquidSelect
                aria-label="Rows per page"
                value={String(pageSize)}
                onChange={(event) => setPageSize(Number(event.target.value))}
                wrapperClassName="w-20"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </LiquidSelect>
              <LiquidIconButton
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </LiquidIconButton>
              <span className="min-w-20 text-center text-xs font-bold text-neutral-950 dark:text-white">
                {currentPage} / {totalPages}
              </span>
              <LiquidIconButton
                type="button"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                className="disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </LiquidIconButton>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUserForm && (
          <UserFormModal
            source={editingCustomer?.source || activeSource}
            editing={!!editingCustomer}
            form={userForm}
            setForm={setUserForm}
            onClose={() => setShowUserForm(false)}
            onClear={() => void clearUserDraft()}
            onSubmit={saveUser}
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
            onClearAddress={() => void clearAddressDraft()}
            onEditAddress={editAddress}
            onDeleteAddress={deleteAddress}
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            editingReviewId={editingReviewId}
            setEditingReviewId={setEditingReviewId}
            onSaveReview={saveReview}
            onClearReview={() => void clearReviewDraft()}
            onEditReview={editReview}
            onDeleteReview={deleteReview}
          />
        )}
      </AnimatePresence>
    </TabInnerContent>
  );
}

function UserFormModal({
  source,
  editing,
  form,
  setForm,
  onClose,
  onClear,
  onSubmit,
}: {
  source: SourceTab;
  editing: boolean;
  form: UserCrudForm;
  setForm: (form: UserCrudForm) => void;
  onClose: () => void;
  onClear: () => void;
  onSubmit: (event?: FormEvent) => void;
}) {
  const online = source === "online";
  const set = (patch: Partial<UserCrudForm>) => setForm({ ...form, ...patch });
  return (
    <ResizableFloatingSidebar
      open
      onClose={onClose}
      title={
        editing
          ? "Edit customer"
          : online
            ? "New online user"
            : "New offline customer"
      }
      subtitle={
        online
          ? "Ecommerce account details"
          : "Customer details used on invoices"
      }
      widthStorageKey="aquacrm:customer-editor-width"
      initialWidth={620}
      minWidth={460}
      maxWidth={960}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
          Draft auto-saves locally. Closing keeps your work.
        </div>
        {online ? (
          <>
            <FormSection title="Basic details">
              <LiquidInput
                label="First name"
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
              />
              <LiquidInput
                label="Last name"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
              />
              <LiquidInput
                label="Phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
              <LiquidInput
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
              />
              <LiquidInput
                label="Alternative email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={form.alternativeEmail}
                onChange={(e) => set({ alternativeEmail: e.target.value })}
              />
              <LiquidInput
                label="Date of birth"
                type="date"
                autoComplete="bday"
                value={form.dob}
                onChange={(e) => set({ dob: e.target.value })}
              />
            </FormSection>
            <FormSection title="Account">
              <LiquidSelect
                label="Role"
                value={form.role}
                onChange={(e) => set({ role: e.target.value })}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </LiquidSelect>
              <div className="grid grid-cols-1 gap-2 self-end sm:grid-cols-2">
                <LiquidCheckbox
                  label="Email verified"
                  checked={form.isEmailVerfied}
                  onChange={(e) => set({ isEmailVerfied: e.target.checked })}
                />
                <LiquidCheckbox
                  label="Mobile verified"
                  checked={form.ismobileLoginConfirmation}
                  onChange={(e) =>
                    set({ ismobileLoginConfirmation: e.target.checked })
                  }
                />
              </div>
            </FormSection>
            <FormSection title="Selected address">
              <LiquidInput
                label="Street"
                autoComplete="street-address"
                wrapperClassName="sm:col-span-2"
                value={form.street}
                onChange={(e) => set({ street: e.target.value })}
              />
              <LiquidInput
                label="City"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => set({ city: e.target.value })}
              />
              <LiquidInput
                label="State"
                autoComplete="address-level1"
                value={form.state}
                onChange={(e) => set({ state: e.target.value })}
              />
              <LiquidInput
                label="PIN code"
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.postalCode}
                onChange={(e) => set({ postalCode: e.target.value })}
              />
            </FormSection>
            <FormSection title="GST details" hint="Optional">
              <LiquidInput
                label="GSTIN"
                autoComplete="off"
                value={form.gstNo}
                onChange={(e) => set({ gstNo: e.target.value.toUpperCase() })}
              />
              <LiquidInput
                label="GST phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={form.gstPhone}
                onChange={(e) => set({ gstPhone: e.target.value })}
              />
              <LiquidInput
                label="GST email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={form.gstEmail}
                onChange={(e) => set({ gstEmail: e.target.value })}
              />
              <LiquidInput
                label="GST address"
                autoComplete="off"
                value={form.gstAddres}
                onChange={(e) => set({ gstAddres: e.target.value })}
              />
            </FormSection>
          </>
        ) : (
          <FormSection title="Customer details">
            <LiquidInput
              label="Name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
            <LiquidInput
              label="Phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
            <LiquidInput
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              wrapperClassName="sm:col-span-2"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
            />
            <LiquidTextarea
              label="Address used on invoices"
              autoComplete="street-address"
              rows={3}
              wrapperClassName="sm:col-span-2"
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </FormSection>
        )}
        <div className="sticky bottom-0 z-20 -mx-5 mt-4 flex justify-end gap-2 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
          <LiquidButton type="button" onClick={onClose} variant="soft">
            Close
          </LiquidButton>
          <LiquidButton type="button" onClick={onClear} variant="danger">
            Clear draft
          </LiquidButton>
          <LiquidButton type="submit" variant="primary">
            {editing ? "Save changes" : "Create customer"}
          </LiquidButton>
        </div>
      </form>
    </ResizableFloatingSidebar>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-baseline gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/50">
        {title}
        {hint && (
          <span className="font-semibold normal-case tracking-normal text-slate-400 dark:text-white/40">
            {hint}
          </span>
        )}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function CustomerDetailModal(props: any) {
  const {
    customer,
    activeTab,
    setActiveTab,
    loading,
    onClose,
    onWhatsApp,
    onEditProfile,
  } = props;
  const online = customer.source === "online";
  const tabs: [DialogTab, string, number | null, typeof User][] = [
    ["profile", "Profile", null, User],
    ["addresses", "Addresses", customer.addresses.length, MapPin],
    ["orders", "Orders", customer.orders.length, ShoppingBag],
    ["invoices", "Invoices", customer.invoices.length, Package],
    ["reviews", "Reviews", customer.reviews.length, Star],
  ];
  const stats = [
    [customer.orders.length || customer.ordersCount, "orders"],
    [customer.invoices.length || customer.invoicesCount, "invoices"],
    [customer.reviews.length || customer.reviewsCount, "reviews"],
  ] as const;

  return (
    <ResizableFloatingSidebar
      open
      onClose={onClose}
      title={customer.name || "Customer profile"}
      subtitle={`${online ? "Online user" : "Offline customer"} · ${customer.email || customer.phone || "No contact details"}`}
      widthStorageKey="aquacrm:customer-details-width"
      initialWidth={680}
      minWidth={480}
      maxWidth={1100}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-sm font-black text-white"
          aria-hidden="true"
        >
          {initialsOf(customer.name || customer.email || "")}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={online ? "sky" : "slate"}>
              {online ? "Online" : "Offline"}
            </Chip>
            {online && (
              <Chip tone="slate">
                {ROLE_LABELS[customer.role] || `Role ${customer.role}`}
              </Chip>
            )}
            {online && (
              <Chip tone={customer.isEmailVerfied ? "emerald" : "slate"}>
                {customer.isEmailVerfied ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <XCircle className="h-3 w-3" aria-hidden="true" />
                )}
                Email {customer.isEmailVerfied ? "verified" : "unverified"}
              </Chip>
            )}
            {customer.createdAt && (
              <span className="text-[11px] text-slate-500 dark:text-white/50">
                Since {safeDate(customer.createdAt)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-white/60">
            {stats.map(([count, label], index) => (
              <span key={label}>
                {index > 0 && " · "}
                <strong className="text-neutral-950 dark:text-white">
                  {count}
                </strong>{" "}
                {label}
              </span>
            ))}
            {customer.totalSpent > 0 && (
              <>
                {" · "}
                <strong className="text-emerald-600 dark:text-emerald-300">
                  {formatINR(customer.totalSpent)}
                </strong>{" "}
                spent
              </>
            )}
          </p>
        </div>
      </div>

      <div
        className="sticky -top-5 z-10 -mx-5 mb-4 flex gap-1 overflow-x-auto border-b border-white/10 bg-slate-950/95 px-5 py-2 backdrop-blur-2xl"
        role="tablist"
        aria-label="Customer sections"
      >
        {tabs.map(([id, label, count, Icon]) => {
          const active = activeTab === id;
          return (
            <LiquidButton
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              variant={active ? "primary" : "ghost"}
              onClick={() => setActiveTab(id)}
              className="min-h-9 shrink-0 gap-1.5 px-3 text-sm"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              {count !== null && (
                <span
                  className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/25" : "bg-slate-200/70 dark:bg-white/10"}`}
                >
                  {count}
                </span>
              )}
            </LiquidButton>
          );
        })}
      </div>

      {loading && (
        <p
          className="mb-3 flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-200"
          role="status"
        >
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
          Loading the full profile…
        </p>
      )}
      <div role="tabpanel">
        {activeTab === "profile" && <ProfileTab {...props} />}
        {activeTab === "addresses" && <AddressesTab {...props} />}
        {activeTab === "orders" && (
          <RecordCards
            records={customer.orders}
            empty="No ecommerce orders yet."
            type="order"
            onCopy={props.onCopy}
          />
        )}
        {activeTab === "invoices" && (
          <RecordCards
            records={customer.invoices}
            empty="No invoices yet."
            type="invoice"
            onCopy={props.onCopy}
          />
        )}
        {activeTab === "reviews" && <ReviewsTab {...props} />}
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
        {customer.phone && (
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => onWhatsApp(customer.phone)}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </LiquidButton>
        )}
        <LiquidButton
          type="button"
          variant="primary"
          onClick={onEditProfile}
          className="flex-1"
        >
          <Edit2 className="h-4 w-4" aria-hidden="true" /> Edit profile
        </LiquidButton>
      </div>
    </ResizableFloatingSidebar>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "sky" | "slate" | "emerald";
  children: ReactNode;
}) {
  const tones = {
    sky: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
    slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
    emerald:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: typeof User;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03] ${className}`}
    >
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/50">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}
      </h4>
      <dl className="divide-y divide-slate-100 dark:divide-white/5">
        {children}
      </dl>
    </section>
  );
}

function DetailRow({
  label,
  value,
  actions,
}: {
  label: string;
  value?: ReactNode;
  actions?: ReactNode;
}) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="flex min-h-10 items-center gap-3 py-1.5">
      <dt className="w-20 shrink-0 text-xs font-semibold text-slate-500 dark:text-white/50 sm:w-28">
        {label}
      </dt>
      <dd
        className={`min-w-0 flex-1 break-words text-sm ${empty ? "text-slate-400 dark:text-white/30" : "font-semibold text-neutral-950 dark:text-white"}`}
      >
        {empty ? "Not set" : value}
      </dd>
      {!empty && actions && (
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      )}
    </div>
  );
}

const rowActionClass =
  "!h-8 !w-8 !rounded-lg text-slate-500 hover:text-sky-600 dark:text-white/50 dark:hover:text-sky-300";

function RowAction({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={`liquid-icon-button ${rowActionClass}`}
    >
      {children}
    </a>
  ) : (
    <LiquidIconButton
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={rowActionClass}
    >
      {children}
    </LiquidIconButton>
  );
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-white/50">
      <XCircle className="h-4 w-4" aria-hidden="true" /> No
    </span>
  );
}

function ProfileTab({ customer, onCopy, onWhatsApp, onDeleteProfile }: any) {
  const online = customer.source === "online";
  const gst = customer.gstDetails || {};
  const phoneDigits = String(customer.phone || "").replace(/[^\d+]/g, "");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DetailSection title="Contact" icon={Phone}>
          <DetailRow
            label="Phone"
            value={customer.phone}
            actions={
              <>
                <RowAction label="Call" href={`tel:${phoneDigits}`}>
                  <Phone className="h-4 w-4" />
                </RowAction>
                <RowAction
                  label="WhatsApp"
                  onClick={() => onWhatsApp(customer.phone)}
                >
                  <MessageCircle className="h-4 w-4" />
                </RowAction>
                <RowAction
                  label="Copy phone"
                  onClick={() => onCopy(customer.phone)}
                >
                  <Copy className="h-4 w-4" />
                </RowAction>
              </>
            }
          />
          <DetailRow
            label="Email"
            value={customer.email}
            actions={
              <>
                <RowAction label="Send email" href={`mailto:${customer.email}`}>
                  <Mail className="h-4 w-4" />
                </RowAction>
                <RowAction
                  label="Copy email"
                  onClick={() => onCopy(customer.email)}
                >
                  <Copy className="h-4 w-4" />
                </RowAction>
              </>
            }
          />
          {online && (
            <DetailRow
              label="Alt. email"
              value={customer.alternativeEmail}
              actions={
                <RowAction
                  label="Copy alternative email"
                  onClick={() => onCopy(customer.alternativeEmail)}
                >
                  <Copy className="h-4 w-4" />
                </RowAction>
              }
            />
          )}
        </DetailSection>

        {online ? (
          <DetailSection title="Account" icon={ShieldCheck}>
            <DetailRow
              label="Name"
              value={[customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(" ")}
            />
            <DetailRow
              label="Role"
              value={ROLE_LABELS[customer.role] || customer.role}
            />
            <DetailRow
              label="Email verified"
              value={<YesNo value={customer.isEmailVerfied} />}
            />
            <DetailRow
              label="Mobile verified"
              value={<YesNo value={customer.ismobileLoginConfirmation} />}
            />
            <DetailRow
              label="Date of birth"
              value={customer.dob ? safeDate(customer.dob) : ""}
            />
            <DetailRow
              label="Invoice login"
              value={
                <InvoiceLoginBadge
                  linked={customer.invoiceLoginLinked}
                  enrichedAt={customer.invoiceProfileEnrichedAt}
                />
              }
            />
            <DetailRow
              label="Profile enriched"
              value={
                customer.invoiceProfileEnrichedAt
                  ? safeDate(customer.invoiceProfileEnrichedAt)
                  : ""
              }
            />
          </DetailSection>
        ) : (
          <DetailSection title="Invoice customer" icon={Package}>
            <DetailRow label="Matched by" value={customer.key} />
            <DetailRow
              label="Invoices"
              value={String(customer.invoices.length || customer.invoicesCount)}
            />
            <DetailRow
              label="Total spent"
              value={
                customer.totalSpent > 0 ? formatINR(customer.totalSpent) : ""
              }
            />
            <DetailRow
              label="Invoice login"
              value={
                <InvoiceLoginBadge
                  linked={customer.invoiceLoginLinked}
                  enrichedAt={customer.invoiceProfileEnrichedAt}
                />
              }
            />
            <DetailRow
              label="Profile enriched"
              value={
                customer.invoiceProfileEnrichedAt
                  ? safeDate(customer.invoiceProfileEnrichedAt)
                  : ""
              }
            />
          </DetailSection>
        )}

        <DetailSection
          title={online ? "Selected address" : "Invoice address"}
          icon={MapPin}
        >
          <DetailRow
            label="Address"
            value={customer.address}
            actions={
              <RowAction
                label="Copy address"
                onClick={() => onCopy(customer.address)}
              >
                <Copy className="h-4 w-4" />
              </RowAction>
            }
          />
        </DetailSection>

        <DetailSection title="GST details" icon={Building2}>
          <DetailRow
            label="GSTIN"
            value={
              gst.gstNo ? <span className="font-mono">{gst.gstNo}</span> : ""
            }
            actions={
              <RowAction label="Copy GSTIN" onClick={() => onCopy(gst.gstNo)}>
                <Copy className="h-4 w-4" />
              </RowAction>
            }
          />
          <DetailRow label="GST phone" value={gst.gstPhone} />
          <DetailRow label="GST email" value={gst.gstEmail} />
          <DetailRow
            label="GST address"
            value={gst.gstAddres || gst.gstAddress}
          />
        </DetailSection>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-400/20 dark:bg-rose-500/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200">
            Delete customer
          </h4>
          <p className="text-xs text-rose-700/80 dark:text-rose-200/70">
            {online
              ? "Removes this ecommerce user account. This can't be undone."
              : "Removes this offline customer and their matching invoices. This can't be undone."}
          </p>
        </div>
        <LiquidButton
          type="button"
          variant="danger"
          onClick={onDeleteProfile}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </LiquidButton>
      </section>
    </div>
  );
}

function InvoiceLoginBadge({
  linked,
  enrichedAt,
}: {
  linked: boolean;
  enrichedAt?: string;
}) {
  return (
    <span
      title={
        enrichedAt ? `Profile enriched ${safeDate(enrichedAt)}` : undefined
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        linked
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-slate-500/10 text-slate-600 dark:text-white/50"
      }`}
    >
      <Link2 className="h-3.5 w-3.5" />
      {linked ? "Linked & enriched" : "Not linked"}
    </span>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">
      {children}
    </div>
  );
}

function AddressesTab({
  customer,
  addressForm,
  setAddressForm,
  editingAddressId,
  setEditingAddressId,
  onSaveAddress,
  onClearAddress,
  onEditAddress,
  onDeleteAddress,
}: any) {
  const online = customer.source === "online";
  const selectedText = addressText(customer.selectedAddress);
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
      <div className="space-y-2">
        {!online && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            An offline customer's address comes from their invoice profile. Use{" "}
            <strong>Edit profile</strong> to change it.
          </p>
        )}
        {customer.addresses.length === 0 ? (
          <EmptyState>No saved addresses.</EmptyState>
        ) : (
          customer.addresses.map((address: any, index: number) => {
            const value = addressText(address);
            const isSelected = Boolean(selectedText) && value === selectedText;
            const id = text(address.id, address._id, index);
            return (
              <div
                key={id}
                className={`flex items-start gap-3 rounded-2xl border bg-white/70 p-3 dark:bg-white/[0.03] ${
                  editingAddressId &&
                  editingAddressId === text(address.id, address._id)
                    ? "border-sky-400 ring-2 ring-sky-400/30"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-neutral-950 dark:text-white">
                    Address {index + 1}
                    {isSelected && <Chip tone="emerald">Selected</Chip>}
                  </p>
                  <p className="mt-0.5 break-words text-sm text-slate-600 dark:text-white/65">
                    {value || "—"}
                  </p>
                </div>
                {online && (
                  <div className="flex shrink-0 gap-0.5">
                    <RowAction
                      label={`Edit address ${index + 1}`}
                      onClick={() => onEditAddress(address)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      label={`Delete address ${index + 1}`}
                      onClick={() => onDeleteAddress(address)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </RowAction>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {online && (
        <form
          onSubmit={onSaveAddress}
          className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-black text-neutral-950 dark:text-white">
              {editingAddressId ? "Edit address" : "Add address"}
            </legend>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
              Draft auto-saves locally.
            </p>
            <LiquidInput
              label="Street"
              required
              autoComplete="street-address"
              value={addressForm.street}
              onChange={(e) =>
                setAddressForm({ ...addressForm, street: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <LiquidInput
                label="City"
                autoComplete="address-level2"
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, city: e.target.value })
                }
              />
              <LiquidInput
                label="PIN code"
                inputMode="numeric"
                autoComplete="postal-code"
                value={addressForm.postalCode}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, postalCode: e.target.value })
                }
              />
            </div>
            <LiquidInput
              label="State"
              autoComplete="address-level1"
              value={addressForm.state}
              onChange={(e) =>
                setAddressForm({ ...addressForm, state: e.target.value })
              }
            />
            <LiquidCheckbox
              label="Use as selected address"
              checked={addressForm.makeSelected}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  makeSelected: e.target.checked,
                })
              }
            />
            <div className="flex flex-wrap gap-2">
              <LiquidButton type="submit" variant="primary" className="flex-1">
                {editingAddressId ? "Update address" : "Save address"}
              </LiquidButton>
              {editingAddressId && (
                <LiquidButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressForm(emptyAddressForm);
                  }}
                >
                  Cancel edit
                </LiquidButton>
              )}
              <LiquidButton
                type="button"
                variant="soft"
                onClick={onClearAddress}
              >
                Clear draft
              </LiquidButton>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}

function RecordCards({ records, empty, type, onCopy }: any) {
  if (!records.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="space-y-2">
      {records.map((record: any, index: number) => {
        const id = type === "order" ? getOrderId(record) : getInvoiceId(record);
        const total = money(
          record.total_amount,
          record.totalAmount,
          record.grandTotal,
        );
        const products = getArray(record, "products", "items", "orderItems");
        const rawStatus = text(
          record.paidStatus,
          record.paid_status,
          record.payment_status,
          record.status,
          record.orderStatus,
        );
        const paid =
          type === "invoice" ? paidStatusOf({ paid_status: rawStatus }) : null;
        return (
          <article
            key={text(record.id, record._id, id, index)}
            className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="truncate font-mono text-sm font-bold text-neutral-950 dark:text-white"
                    title={id}
                  >
                    {id || "—"}
                  </span>
                  {id && (
                    <RowAction
                      label={`Copy ${type} ID`}
                      onClick={() => onCopy(id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </RowAction>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                  {safeDate(
                    text(record.date, record.createdAt, record.created_at),
                  )}
                  {paid ? (
                    <Chip tone={paid === "paid" ? "emerald" : "slate"}>
                      {PAID_LABELS[paid]}
                    </Chip>
                  ) : (
                    rawStatus && (
                      <Chip tone="slate">{rawStatus.replace(/_/g, " ")}</Chip>
                    )
                  )}
                </p>
              </div>
              <p className="shrink-0 text-base font-black tabular-nums text-emerald-600 dark:text-emerald-300">
                {formatINR(total)}
              </p>
            </div>
            {products.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs dark:border-white/5">
                {products.map((product: any, productIndex: number) => (
                  <li key={productIndex} className="flex justify-between gap-3">
                    <span className="min-w-0 text-neutral-950 dark:text-white">
                      {getQuantity(product) > 1 && (
                        <span className="font-bold text-sky-600 dark:text-sky-300">
                          {getQuantity(product)}×{" "}
                        </span>
                      )}
                      {getProductName(product)}
                    </span>
                    {/* productPrice is already the line value — never multiply by quantity. */}
                    <span className="shrink-0 tabular-nums text-slate-500 dark:text-white/50">
                      {formatINR(getPrice(product))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className="shrink-0 text-amber-500"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {"★".repeat(value)}
      <span className="text-slate-300 dark:text-white/20">
        {"★".repeat(5 - value)}
      </span>
    </span>
  );
}

function ReviewsTab({
  customer,
  reviewForm,
  setReviewForm,
  editingReviewId,
  setEditingReviewId,
  onSaveReview,
  onClearReview,
  onEditReview,
  onDeleteReview,
}: any) {
  const offline = customer.source === "offline";
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
      <div className="space-y-2">
        {customer.reviews.length === 0 ? (
          <EmptyState>No reviews yet.</EmptyState>
        ) : (
          customer.reviews.map((review: any, index: number) => (
            <article
              key={text(getReviewId(review), index)}
              className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">
                    {text(
                      review.productName,
                      review.productTitle,
                      review.product?.title,
                      review.productId,
                      "Product",
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {safeDate(
                      text(review.created_at, review.createdAt, review.date),
                    )}
                  </p>
                </div>
                <Stars rating={Number(review.rating || 0)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
                {text(
                  review.comment,
                  review.text,
                  review.review,
                  "No review text.",
                )}
              </p>
              <div className="mt-2 flex justify-end gap-0.5">
                <RowAction
                  label="Edit review"
                  onClick={() => onEditReview(review)}
                >
                  <Edit2 className="h-4 w-4" />
                </RowAction>
                <RowAction
                  label="Delete review"
                  onClick={() => onDeleteReview(review)}
                >
                  <Trash2 className="h-4 w-4" />
                </RowAction>
              </div>
            </article>
          ))
        )}
      </div>
      <form
        onSubmit={onSaveReview}
        className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
      >
        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-black text-neutral-950 dark:text-white">
            {editingReviewId ? "Edit review" : "Add review"}
          </legend>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            Draft auto-saves locally.
          </p>
          <LiquidInput
            label={offline ? "Invoice ID" : "Product ID"}
            required={!offline}
            autoComplete="off"
            value={offline ? reviewForm.invoiceId : reviewForm.productId}
            onChange={(e) =>
              setReviewForm(
                offline
                  ? { ...reviewForm, invoiceId: e.target.value }
                  : { ...reviewForm, productId: e.target.value },
              )
            }
          />
          <LiquidInput
            label="Reviewer name"
            autoComplete="off"
            value={reviewForm.name}
            onChange={(e) =>
              setReviewForm({ ...reviewForm, name: e.target.value })
            }
          />
          <LiquidSelect
            label="Rating"
            value={String(reviewForm.rating)}
            onChange={(e) =>
              setReviewForm({ ...reviewForm, rating: Number(e.target.value) })
            }
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {"★".repeat(rating)} {rating} star{rating === 1 ? "" : "s"}
              </option>
            ))}
          </LiquidSelect>
          <LiquidTextarea
            label="Review"
            required
            rows={4}
            value={reviewForm.comment}
            onChange={(e) =>
              setReviewForm({ ...reviewForm, comment: e.target.value })
            }
          />
          <div className="flex flex-wrap gap-2">
            <LiquidButton type="submit" variant="primary" className="flex-1">
              {editingReviewId ? "Update review" : "Save review"}
            </LiquidButton>
            {editingReviewId && (
              <LiquidButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingReviewId(null);
                  setReviewForm(emptyReviewForm);
                }}
              >
                Cancel edit
              </LiquidButton>
            )}
            <LiquidButton type="button" variant="soft" onClick={onClearReview}>
              Clear draft
            </LiquidButton>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
