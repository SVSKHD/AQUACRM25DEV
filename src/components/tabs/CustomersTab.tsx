import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { customersService, authService } from "../../services/apiService";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import {
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building2,
  MapPin,
  DollarSign,
  Package,
  User,
  ArrowRight,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";

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
}

type TabType = "online" | "offline";

export default function CustomersTab() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("online");
  const [onlineCustomers, setOnlineCustomers] = useState<Customer[]>([]);
  const [offlineCustomers, setOfflineCustomers] = useState<OfflineCustomer[]>(
    [],
  );
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedOfflineCustomer, setSelectedOfflineCustomer] =
    useState<OfflineCustomer | null>(null);

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
    fetchOnlineCustomers();
    fetchOfflineCustomers();
  }, []);

  const fetchOnlineCustomers = async () => {
    const { data, error } = await customersService.getAll();

    if (!error && data) {
      const customersList = Array.isArray(data)
        ? data
        : (data as any).data || [];
      setOnlineCustomers(customersList);
    }
    setLoading(false);
  };

  const fetchOfflineCustomers = async () => {
    const { data, error } = await customersService.getOfflineCustomers();

    if (!error && data) {
      const offlineList = Array.isArray(data) ? data : (data as any).data || [];
      setOfflineCustomers(offlineList);
    }
  };
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
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex-1 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/20"
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
              Online Users ({onlineCustomers.length})
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
              Offline Users ({offlineCustomers.length})
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
              <motion.div
                key="online"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {onlineCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-950 dark:text-white">
                            {customer.company_name}
                          </h3>
                          <p className="text-sm text-black dark:text-white/60">
                            {customer.contact_name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[
                            customer.status as keyof typeof statusColors
                          ]
                        }`}
                      >
                        {customer.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                        <DollarSign className="w-4 h-4" />
                        <span>₹{customer.total_revenue.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(customer)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-black dark:text-white rounded-lg transition-colors text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(customer.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                {onlineCustomers.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-950 mb-2">
                      No online customers yet
                    </h3>
                    <p className="text-black">
                      Add customers or convert offline users
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "offline" && (
              <motion.div
                key="offline"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {offlineCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.customer_email || customer.customer_phone}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-950 dark:text-white">
                            {customer.customer_name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-white/40">
                            {customer.invoice_count} invoices
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">
                          {customer.customer_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                        <Phone className="w-4 h-4" />
                        <span>{customer.customer_phone}</span>
                      </div>
                      {customer.customer_address && (
                        <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">
                            {customer.customer_address}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                        <DollarSign className="w-4 h-4" />
                        <span>₹{customer.total_spent.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-400 dark:border-white/10">
                        <div className="flex items-center gap-2 text-xs text-black dark:text-white/60 mb-2">
                          <Package className="w-3 h-3" />
                          <span className="font-medium">
                            Products purchased:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {customer.products.slice(0, 3).map((product, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs rounded"
                            >
                              {product}
                            </span>
                          ))}
                          {customer.products.length > 3 && (
                            <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-black dark:text-white/60 text-xs rounded">
                              +{customer.products.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openConvertModal(customer)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      Convert to Online
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}
                {offlineCustomers.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-950 mb-2">
                      No offline customers
                    </h3>
                    <p className="text-black">
                      Create invoices to see offline customers
                    </p>
                  </div>
                )}
              </motion.div>
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
