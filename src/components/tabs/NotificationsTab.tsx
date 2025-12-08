import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  notificationsService,
  invoicesService,
} from "../../services/apiService";
import { useAuth } from "../../contexts/AuthContext";
import {
  Bell,
  Send,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Mail,
  Trash2,
  Plus,
  MessageSquare,
} from "lucide-react";

interface Customer {
  customer_email: string;
  customer_name: string;
  total_spent: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  recipient_type: "selected" | "high_value" | "all";
  recipient_emails: string[];
  min_purchase_amount: number | null;
  sent_count: number;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    recipient_type: "selected" as "selected" | "high_value" | "all",
    recipient_emails: [] as string[],
    min_purchase_amount: 50000,
  });

  useEffect(() => {
    fetchNotifications();
    fetchCustomers();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await notificationsService.getAll();

    if (!error && data) {
      setNotifications(data as any);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data: invoices, error } = await invoicesService.getAll();

    if (!error && invoices) {
      const customerMap = new Map<string, Customer>();

      invoices.forEach((invoice) => {
        const email = invoice.customer_email;
        if (customerMap.has(email)) {
          const existing = customerMap.get(email)!;
          existing.total_spent += invoice.total_amount || 0;
        } else {
          customerMap.set(email, {
            customer_email: email,
            customer_name: invoice.customer_name,
            total_spent: invoice.total_amount || 0,
          });
        }
      });

      setCustomers(
        Array.from(customerMap.values()).sort(
          (a, b) => b.total_spent - a.total_spent,
        ),
      );
    }
  };

  const getRecipientEmails = () => {
    if (formData.recipient_type === "all") {
      return customers.map((c) => c.customer_email);
    } else if (formData.recipient_type === "high_value") {
      return customers
        .filter((c) => c.total_spent >= formData.min_purchase_amount)
        .map((c) => c.customer_email);
    } else {
      return formData.recipient_emails;
    }
  };

  const handleSend = async () => {
    if (!formData.title || !formData.message) {
      alert("Please fill in all fields");
      return;
    }

    const recipientEmails = getRecipientEmails();

    if (recipientEmails.length === 0) {
      alert("No recipients selected");
      return;
    }

    setSending(true);

    const notificationData = {
      user_id: user?.id,
      title: formData.title,
      message: formData.message,
      recipient_type: formData.recipient_type,
      recipient_emails: recipientEmails,
      min_purchase_amount:
        formData.recipient_type === "high_value"
          ? formData.min_purchase_amount
          : null,
      sent_count: recipientEmails.length,
      status: "sent",
      sent_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("notifications")
      .insert([notificationData]);

    if (!error) {
      alert(`Message sent to ${recipientEmails.length} customers!`);
      fetchNotifications();
      resetForm();
    } else {
      alert("Error sending notification");
    }

    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (!error) {
        fetchNotifications();
      }
    }
  };

  const toggleCustomerSelection = (email: string) => {
    if (formData.recipient_emails.includes(email)) {
      setFormData({
        ...formData,
        recipient_emails: formData.recipient_emails.filter((e) => e !== email),
      });
    } else {
      setFormData({
        ...formData,
        recipient_emails: [...formData.recipient_emails, email],
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      recipient_type: "selected",
      recipient_emails: [],
      min_purchase_amount: 50000,
    });
    setShowModal(false);
  };

  const getHighValueCustomers = () => {
    return customers.filter(
      (c) => c.total_spent >= formData.min_purchase_amount,
    );
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-600 mt-1">Send messages to your customers</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Compose Message
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">
                {customers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">High-Value Customers</p>
              <p className="text-2xl font-bold text-slate-900">
                {customers.filter((c) => c.total_spent >= 50000).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Send className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Messages Sent</p>
              <p className="text-2xl font-bold text-slate-900">
                {notifications.filter((n) => n.status === "sent").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Message History
        </h3>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No messages yet
            </h3>
            <p className="text-slate-600">
              Send your first message to customers
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">
                        {notification.title}
                      </h4>
                      {notification.status === "sent" ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{notification.sent_count} recipients</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(
                            notification.created_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {notification.recipient_type === "high_value" &&
                        notification.min_purchase_amount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>
                              ₹
                              {notification.min_purchase_amount.toLocaleString()}
                              +
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Compose Message
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Special Offer, Important Update"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Write your message here..."
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Recipients
                  </label>
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() =>
                        setFormData({ ...formData, recipient_type: "selected" })
                      }
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        formData.recipient_type === "selected"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Users className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">
                        Selected Customers
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          recipient_type: "high_value",
                        })
                      }
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        formData.recipient_type === "high_value"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <DollarSign className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">High-Value</div>
                    </button>
                    <button
                      onClick={() =>
                        setFormData({ ...formData, recipient_type: "all" })
                      }
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        formData.recipient_type === "all"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Bell className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">All Customers</div>
                    </button>
                  </div>

                  {formData.recipient_type === "high_value" && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Minimum Purchase Amount
                      </label>
                      <input
                        type="number"
                        value={formData.min_purchase_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_purchase_amount: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-sm text-slate-600 mt-2">
                        {getHighValueCustomers().length} customers will receive
                        this message
                      </p>
                    </div>
                  )}

                  {formData.recipient_type === "selected" && (
                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-4">
                      <div className="space-y-2">
                        {customers.map((customer) => (
                          <label
                            key={customer.customer_email}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.recipient_emails.includes(
                                customer.customer_email,
                              )}
                              onChange={() =>
                                toggleCustomerSelection(customer.customer_email)
                              }
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">
                                {customer.customer_name}
                              </div>
                              <div className="text-sm text-slate-600">
                                {customer.customer_email}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              ₹{customer.total_spent.toLocaleString()}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.recipient_type === "all" && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-slate-700">
                        This message will be sent to all {customers.length}{" "}
                        customers
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    {sending
                      ? "Sending..."
                      : `Send to ${getRecipientEmails().length} customers`}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetForm}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
