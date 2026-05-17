import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  customersService,
  authService,
  invoicesService,
} from "../../services/apiService";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { Search, Calendar, X } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import AquaOnlineCustomer from "../modular/customers/online";
import AquaOfflineCustomer from "../modular/customers/offline";

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  total_revenue: number;
  created_at: string;
}

interface OrderRecord {
  id: string;
  order_no?: string;
  date?: string;
  customer_phone?: string | number;
  customer_email?: string;
  user_id?: string;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  products?: any[];
}

interface ReviewRecord {
  id: string;
  user_id?: string;
  userEmail?: string;
  user_phone?: string | number;
  productId?: string;
  productName?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

interface AquaInvoiceRow {
  id: string;
  invoice_no?: string;
  date?: string;
  customer_name?: string;
  customer_phone?: number | string;
  customer_email?: string;
  customer_address?: string;
  gst?: boolean;
  po?: boolean;
  gst_no?: string | null;
  products?: {
    productName: string;
    productQuantity: number;
    productPrice: number;
  }[];
  total_amount?: number;
  paid_status?: string;
  payment_type?: string;
  created_at?: string;
}

type TabType = "online" | "offline";

type CustomerDetail = {
  orders: OrderRecord[];
  reviews: ReviewRecord[];
  stats?: {
    ordersCount?: number;
    reviewsCount?: number;
    totalSpent?: number;
    orderStatusBreakdown?: Record<string, number>;
  };
  loading?: boolean;
  error?: string;
};

export default function CustomersTab() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("online");
  const [onlineCustomers, setOnlineCustomers] = useState<Customer[]>([]);
  const [customerDetails, setCustomerDetails] = useState<
    Record<string, CustomerDetail>
  >({});
  const [aquaInvoices, setAquaInvoices] = useState<AquaInvoiceRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedInvoiceForConvert, setSelectedInvoiceForConvert] =
    useState<AquaInvoiceRow | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    total_revenue: 0,
  });

  const [convertFormData, setConvertFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });

  useKeyboardShortcut(
    "Escape",
    () => {
      if (showConvertModal) {
        setShowConvertModal(false);
        setSelectedInvoiceForConvert(null);
      } else if (showModal) {
        resetForm();
      }
    },
    showModal || showConvertModal,
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchOnlineCustomers(), fetchAquaInvoices()]);
      setLoading(false);
    };
    load();
  }, []);

  const unwrap = (resp: any): any[] => {
    const data = resp?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.customers)) return data.customers;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const normalizeCustomer = (raw: any): Customer => {
    const id = String(raw.id || raw._id || "");
    const firstName = raw.firstName || raw.first_name || "";
    const lastName = raw.lastName || raw.last_name || "";
    const fullName =
      raw.name ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      raw.contact_name ||
      "";
    return {
      id,
      company_name: raw.company_name || raw.companyName || fullName || "",
      contact_name: fullName || raw.contact_name || "",
      email: raw.email || raw.alternativeEmail || "",
      phone: raw.phone != null ? String(raw.phone) : raw.mobile || null,
      address:
        raw.address ||
        (Array.isArray(raw.addresses) && raw.addresses[0]?.line1) ||
        null,
      status: raw.status || (raw.isEmailVerfied ? "active" : "inactive"),
      total_revenue: Number(raw.total_revenue || raw.totalSpent || 0),
      created_at: raw.created_at || raw.createdAt || "",
    };
  };

  const fetchOnlineCustomers = async () => {
    const resp = await customersService.getAll({ limit: 200 });
    if (resp.error) {
      setOnlineCustomers([]);
      return;
    }
    setOnlineCustomers(unwrap(resp).map(normalizeCustomer));
  };

  const fetchAquaInvoices = async () => {
    const resp = await invoicesService.getAll();
    if ((resp as any).error) {
      setAquaInvoices([]);
      return;
    }
    setAquaInvoices(unwrap(resp));
  };

  const fetchCustomerDetail = async (customerId: string) => {
    if (customerDetails[customerId]?.orders) return;
    setCustomerDetails((prev) => ({
      ...prev,
      [customerId]: { orders: [], reviews: [], loading: true },
    }));
    const resp: any = await customersService.getById(customerId);
    if (resp.error) {
      setCustomerDetails((prev) => ({
        ...prev,
        [customerId]: {
          orders: [],
          reviews: [],
          loading: false,
          error: String(resp.error),
        },
      }));
      return;
    }
    const body = resp.data?.data ?? resp.data ?? {};
    const rawOrders: any[] = Array.isArray(body.orders) ? body.orders : [];
    const rawReviews: any[] = Array.isArray(body.reviews) ? body.reviews : [];
    const orders: OrderRecord[] = rawOrders.map((o) => ({
      id: String(o.id || o._id || ""),
      order_no:
        o.order_no || o.orderNumber || o.orderId || o.invoice_no || undefined,
      date: o.date || o.createdAt || o.created_at,
      total_amount: Number(o.total_amount ?? o.totalAmount ?? 0),
      status: o.status || o.orderStatus,
      payment_status: o.payment_status || o.paymentStatus,
      products: o.products || o.items,
    }));
    const reviews: ReviewRecord[] = rawReviews.map((r) => ({
      id: String(r.id || r._id || r.reviewId || ""),
      productId: String(r.productId || r.product || r.product_id || ""),
      productName: r.productName || r.productTitle || r.product?.title,
      rating: typeof r.rating === "number" ? r.rating : Number(r.rating || 0),
      comment: r.comment || r.text,
      created_at: r.created_at || r.createdAt,
    }));
    setCustomerDetails((prev) => ({
      ...prev,
      [customerId]: {
        orders,
        reviews,
        stats: body.stats || {
          ordersCount: orders.length,
          reviewsCount: reviews.length,
          totalSpent: orders.reduce((s, o) => s + (o.total_amount || 0), 0),
        },
        loading: false,
      },
    }));
  };

  const ordersFor = (customer: Customer): OrderRecord[] =>
    customerDetails[customer.id]?.orders || [];
  const reviewsFor = (customer: Customer): ReviewRecord[] =>
    customerDetails[customer.id]?.reviews || [];
  const statsFor = (customer: Customer) => customerDetails[customer.id]?.stats;
  const isDetailLoading = (customer: Customer) =>
    !!customerDetails[customer.id]?.loading;

  const filteredOnlineCustomers = useMemo(() => {
    return onlineCustomers.filter((c) => {
      const s = searchQuery.toLowerCase();
      const matchesSearch =
        !s ||
        `${c.company_name || ""}${c.contact_name || ""}`
          .toLowerCase()
          .includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        String(c.phone || "")
          .toLowerCase()
          .includes(s);
      const matchesDate =
        (!startDate || (c.created_at && c.created_at >= startDate)) &&
        (!endDate || (c.created_at && c.created_at <= endDate));
      return matchesSearch && matchesDate;
    });
  }, [onlineCustomers, searchQuery, startDate, endDate]);

  const filteredAquaInvoices = useMemo(() => {
    return aquaInvoices.filter((inv) => {
      const s = searchQuery.toLowerCase();
      const matchesSearch =
        !s ||
        (inv.customer_name || "").toLowerCase().includes(s) ||
        (inv.customer_email || "").toLowerCase().includes(s) ||
        String(inv.customer_phone || "")
          .toLowerCase()
          .includes(s) ||
        (inv.invoice_no || "").toLowerCase().includes(s);
      const matchesDate =
        (!startDate || (inv.date && inv.date >= startDate)) &&
        (!endDate || (inv.date && inv.date <= endDate));
      return matchesSearch && matchesDate;
    });
  }, [aquaInvoices, searchQuery, startDate, endDate]);

  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  };

  const handleSend = (phone: string) => {
    // Basic implementation for WA or generic "Send"
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  // ... (Keep existing handlers: handleSubmit, handleDelete, handleEdit, resetForm, openConvertModal, handleConvertToOnline, statusColors)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      if (editingCustomer) {
        const { error } = await customersService.update(
          editingCustomer.id,
          formData,
        );

        if (error) throw error;

        showToast("Customer updated successfully", "success");
        fetchOnlineCustomers();
        resetForm();
      } else {
        const { error }: any = await customersService.create(formData);

        if (error) throw error;

        showToast("Customer created successfully", "success");
        fetchOnlineCustomers();
        resetForm();
      }
    } catch (error) {
      showToast("Failed to save customer", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        const { error } = await customersService.delete(id);

        if (error) throw error;

        showToast("Customer deleted successfully", "success");
        fetchOnlineCustomers();
      } catch (error) {
        showToast("Failed to delete customer", "error");
      }
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name,
      contact_name: customer.contact_name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      status: customer.status,
      total_revenue: customer.total_revenue,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      status: "active",
      total_revenue: 0,
    });
    setEditingCustomer(null);
    setShowModal(false);
  };

  const openConvertModal = (invoice: AquaInvoiceRow) => {
    setSelectedInvoiceForConvert(invoice);
    setConvertFormData({
      company_name: invoice.customer_name || "",
      contact_name: invoice.customer_name || "",
      email: invoice.customer_email || "",
      phone: String(invoice.customer_phone || ""),
      address: invoice.customer_address || "",
      password: "",
    });
    setShowConvertModal(true);
  };

  const handleConvertToOnline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      const { data: authData, error: authError } = await authService.register(
        convertFormData.email,
        convertFormData.password,
        convertFormData.contact_name,
      );

      if (authError) throw new Error(authError);

      if (authData && "user" in (authData as any) && (authData as any).user) {
        const { error: customerError }: any = await customersService.create({
          company_name: convertFormData.company_name,
          contact_name: convertFormData.contact_name,
          email: convertFormData.email,
          phone: convertFormData.phone,
          address: convertFormData.address,
          status: "active",
          total_revenue: selectedInvoiceForConvert?.total_amount || 0,
        });

        if (customerError) throw new Error(customerError);

        showToast("Customer successfully converted to online user!", "success");
        fetchOnlineCustomers();
        setShowConvertModal(false);
        setSelectedInvoiceForConvert(null);
      }
    } catch (error: any) {
      showToast(error?.message || "Failed to convert customer", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <TabInnerContent
        title="Customers"
        description="Manage your customer relationships"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold sr-only">Filters</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs w-full sm:w-auto outline-none"
                />
              </div>
              <span className="text-slate-400">-</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs w-full sm:w-auto outline-none"
                />
              </div>
            </div>
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={resetFilters}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none py-2 px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/20 text-sm"
          >
            Add Customer
          </motion.button>
        </div>

        <div className="glass shadow-xl rounded-xl p-6 mb-6">
          <div className="flex gap-4 border-b border-gray-400 dark:border-white/10 mb-6">
            <button
              onClick={() => setActiveTab("online")}
              className={`pb-3 px-4 font-medium transition-colors relative ${
                activeTab === "online"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-black dark:text-white/60 hover:text-neutral-950 dark:hover:text-white"
              }`}
            >
              Online Users ({filteredOnlineCustomers.length})
              {activeTab === "online" && (
                <motion.div
                  layoutId="customerTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("offline")}
              className={`pb-3 px-4 font-medium transition-colors relative ${
                activeTab === "offline"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-black dark:text-white/60 hover:text-neutral-950 dark:hover:text-white"
              }`}
            >
              Offline Invoices ({filteredAquaInvoices.length})
              {activeTab === "offline" && (
                <motion.div
                  layoutId="customerTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "online" && (
              <AquaOnlineCustomer
                filteredCustomers={filteredOnlineCustomers}
                ordersFor={ordersFor}
                reviewsFor={reviewsFor}
                statsFor={statsFor}
                isDetailLoading={isDetailLoading}
                onExpand={fetchCustomerDetail}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSend={handleSend}
                onEmail={handleEmail}
                onCopy={copyToClipboard}
              />
            )}

            {activeTab === "offline" && (
              <AquaOfflineCustomer
                invoices={filteredAquaInvoices}
                onSend={handleSend}
                onEmail={handleEmail}
                onConvert={openConvertModal}
                onCopy={copyToClipboard}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={resetForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-400 dark:border-white/10"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            company_name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Total Revenue
                      </label>
                      <input
                        type="number"
                        value={formData.total_revenue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_revenue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/20"
                    >
                      {editingCustomer ? "Update Customer" : "Add Customer"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white/70 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showConvertModal && selectedInvoiceForConvert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowConvertModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-400 dark:border-white/10"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-2">
                  Convert to Online Customer
                </h3>
                <p className="text-black dark:text-white/60 mb-6">
                  Create an online account for{" "}
                  {selectedInvoiceForConvert.customer_name}
                </p>

                <form onSubmit={handleConvertToOnline} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={convertFormData.company_name}
                        onChange={(e) =>
                          setConvertFormData({
                            ...convertFormData,
                            company_name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={convertFormData.contact_name}
                        onChange={(e) =>
                          setConvertFormData({
                            ...convertFormData,
                            contact_name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={convertFormData.email}
                        onChange={(e) =>
                          setConvertFormData({
                            ...convertFormData,
                            email: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={convertFormData.phone}
                        onChange={(e) =>
                          setConvertFormData({
                            ...convertFormData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={convertFormData.password}
                        onChange={(e) =>
                          setConvertFormData({
                            ...convertFormData,
                            password: e.target.value,
                          })
                        }
                        required
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Address
                    </label>
                    <textarea
                      value={convertFormData.address}
                      onChange={(e) =>
                        setConvertFormData({
                          ...convertFormData,
                          address: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-neutral-950 mb-2">
                      Invoice Summary:
                    </h4>
                    <ul className="text-sm text-black space-y-1">
                      <li>
                        Invoice No:{" "}
                        {selectedInvoiceForConvert.invoice_no || "-"}
                      </li>
                      <li>
                        Total Amount: ₹
                        {(
                          selectedInvoiceForConvert.total_amount || 0
                        ).toLocaleString()}
                      </li>
                      <li>
                        Products:{" "}
                        {selectedInvoiceForConvert.products?.length || 0}
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
                    >
                      Convert to Online User
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowConvertModal(false)}
                      className="flex-1 py-3 bg-slate-100 text-black rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </TabInnerContent>
    </div>
  );
}
