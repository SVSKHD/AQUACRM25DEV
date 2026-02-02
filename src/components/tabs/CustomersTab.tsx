import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { customersService, authService } from "../../services/apiService";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import {
  Edit2,
  Trash2,
  Mail,
  Building2,
  User,
  ArrowRight,
  Search,
  Calendar,
  X,
} from "lucide-react";
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

interface OfflineCustomer {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_count: number;
  total_spent: number;
  products: string[];
  last_order_date: string;
}

type TabType = "online" | "offline";

const DUMMY_ONLINE_CUSTOMERS: Customer[] = [
  {
    id: "1",
    company_name: "Tech Solutions Ltd",
    contact_name: "John Doe",
    email: "john@techsolutions.com",
    phone: "+91 98765 43210",
    address: "123 Tech Park, Bangalore",
    status: "active",
    total_revenue: 150000,
    created_at: "2024-01-01",
  },
  {
    id: "2",
    company_name: "Creative Studio",
    contact_name: "Jane Smith",
    email: "jane@creative.com",
    phone: "+91 87654 32109",
    address: "45 Design Ave, Mumbai",
    status: "active",
    total_revenue: 75000,
    created_at: "2024-01-05",
  },
  {
    id: "3",
    company_name: "Global Retails",
    contact_name: "Robert Brown",
    email: "robert@globalretails.com",
    phone: "+91 76543 21098",
    address: "789 Market St, Delhi",
    status: "inactive",
    total_revenue: 0,
    created_at: "2024-01-10",
  },
];

const DUMMY_OFFLINE_CUSTOMERS: OfflineCustomer[] = [
  {
    customer_name: "Local Shop A",
    customer_email: "shopA@local.com",
    customer_phone: "+91 99887 76655",
    customer_address: "12 Bazaar Rd, Chennai",
    invoice_count: 5,
    total_spent: 25000,
    products: ["Water Purifier", "Filter"],
    last_order_date: "2024-01-15",
  },
  {
    customer_name: "Walk-in Customer",
    customer_email: "walkin@example.com",
    customer_phone: "+91 88776 65544",
    customer_address: "Hyderabad",
    invoice_count: 1,
    total_spent: 5000,
    products: ["Service Kit"],
    last_order_date: "2024-01-20",
  },
];

export default function CustomersTab() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("online");
  const [onlineCustomers, setOnlineCustomers] = useState<Customer[]>(
    DUMMY_ONLINE_CUSTOMERS,
  );
  const [offlineCustomers, setOfflineCustomers] = useState<OfflineCustomer[]>(
    DUMMY_OFFLINE_CUSTOMERS,
  );
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false); // Set to false to show dummy data immediately
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedOfflineCustomer, setSelectedOfflineCustomer] =
    useState<OfflineCustomer | null>(null);

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
        setSelectedOfflineCustomer(null);
      } else if (showModal) {
        resetForm();
      }
    },
    showModal || showConvertModal,
  );

  useEffect(() => {
    // Keep fetch logic but merge with dummy data or just rely on dummy data for now as per request?
    // User asked to "add dummy data", usually implies for UI testing/design.
    // I will keep the fetch calls but initialize state with dummy data and let fetch override if successful.
    // Actually, to ensure dummy data is visible as requested, I'll comment out the fetch calls or append.
    // Let's try to fetch and if empty use dummy, or just use dummy for this specific task request.
    // "add an dummy data ... name, phone no copiable and email and address"
    // I will append dummy data to fetched data or just set it.
    fetchOnlineCustomers();
    fetchOfflineCustomers();
  }, []);

  const fetchOnlineCustomers = async () => {
    const { data, error } = await customersService.getAll();

    if (!error && data) {
      const customersList = Array.isArray(data)
        ? data
        : (data as any).data || [];
      // Merging dummy data for demo purposes
      setOnlineCustomers([...DUMMY_ONLINE_CUSTOMERS, ...customersList]);
    } else {
      setOnlineCustomers(DUMMY_ONLINE_CUSTOMERS);
    }
    setLoading(false);
  };

  const fetchOfflineCustomers = async () => {
    const { data, error } = await customersService.getOfflineCustomers();

    if (!error && data) {
      const offlineList = Array.isArray(data) ? data : (data as any).data || [];
      // Merging dummy data for demo purposes
      const merged = [...DUMMY_OFFLINE_CUSTOMERS, ...offlineList].map((c) => ({
        ...c,
        last_order_date:
          c.last_order_date || new Date().toISOString().split("T")[0], // Fallback for existing data
      }));
      setOfflineCustomers(merged);
    } else {
      setOfflineCustomers(DUMMY_OFFLINE_CUSTOMERS);
    }
  };

  // Filtering Logic
  const filterCustomers = <T extends Customer | OfflineCustomer>(
    customers: T[],
    isOnline: boolean,
  ) => {
    return customers.filter((customer) => {
      const searchLower = searchQuery.toLowerCase();
      const name = isOnline
        ? (customer as Customer).company_name +
          (customer as Customer).contact_name
        : (customer as OfflineCustomer).customer_name;
      const email = isOnline
        ? (customer as Customer).email
        : (customer as OfflineCustomer).customer_email;
      const phone = isOnline
        ? (customer as Customer).phone
        : (customer as OfflineCustomer).customer_phone;
      const date = isOnline
        ? (customer as Customer).created_at
        : (customer as OfflineCustomer).last_order_date;

      const matchesSearch =
        name.toLowerCase().includes(searchLower) ||
        email?.toLowerCase().includes(searchLower) ||
        phone?.toLowerCase().includes(searchLower);

      const matchesDate =
        (!startDate || (date && date >= startDate)) &&
        (!endDate || (date && date <= endDate));

      return matchesSearch && matchesDate;
    });
  };

  const filteredOnlineCustomers = filterCustomers(
    onlineCustomers,
    true,
  ) as Customer[];
  const filteredOfflineCustomers = filterCustomers(
    offlineCustomers,
    false,
  ) as OfflineCustomer[];

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

  const openConvertModal = (customer: OfflineCustomer) => {
    setSelectedOfflineCustomer(customer);
    setConvertFormData({
      company_name: customer.customer_name,
      contact_name: customer.customer_name,
      email: customer.customer_email,
      phone: customer.customer_phone,
      address: customer.customer_address,
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
          total_revenue: selectedOfflineCustomer?.total_spent || 0,
        });

        if (customerError) throw new Error(customerError);

        showToast("Customer successfully converted to online user!", "success");
        fetchOnlineCustomers();
        fetchOfflineCustomers();
        setShowConvertModal(false);
        setSelectedOfflineCustomer(null);
      }
    } catch (error: any) {
      showToast(error?.message || "Failed to convert customer", "error");
    }
  };

  const statusColors = {
    active:
      "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
    inactive: "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70",
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
              Offline Users ({filteredOfflineCustomers.length})
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
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSend={handleSend}
                onEmail={handleEmail}
                onCopy={copyToClipboard}
              />
            )}

            {activeTab === "offline" && (
              <AquaOfflineCustomer
                filteredCustomers={filteredOfflineCustomers}
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
          {showConvertModal && selectedOfflineCustomer && (
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
                  {selectedOfflineCustomer.customer_name}
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
                      Customer Summary:
                    </h4>
                    <ul className="text-sm text-black space-y-1">
                      <li>
                        Total Invoices: {selectedOfflineCustomer.invoice_count}
                      </li>
                      <li>
                        Total Spent: ₹
                        {selectedOfflineCustomer.total_spent.toLocaleString()}
                      </li>
                      <li>
                        Products: {selectedOfflineCustomer.products.length}
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
