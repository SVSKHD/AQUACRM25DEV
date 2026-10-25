import ResponsiveDialog from "../ui/ResponsiveDialog";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsService } from "../../services/apiService";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast";
import {
  Bell,
  Send,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  MessageSquare,
  Search,
  Phone,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import NotifyOperations, { type WhatsAppTemplate } from "../../services/notify";
import WhatsAppTemplateForm from "../modular/notifications/WhatsAppTemplateForm";
import {
  EMPTY_SELECTION,
  fillVariables,
  selectionError,
  type TemplateSelection,
} from "../modular/notifications/templateUtils";

interface Customer {
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  total_spent: number;
}

interface InvoiceProduct {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo: string;
}

interface Invoice {
  _id: string;
  invoiceNo: string;
  date: string;
  customerDetails: {
    name: string;
    phone: number | null;
    email: string;
    address: string;
  };
  products: InvoiceProduct[];
  paidStatus: string;
  paymentType: string;
}

/** System notifications from GET /v1/crm/notifications (orders, invoices, payments, …). */
interface CrmNotification {
  _id: string;
  type: string;
  entityType: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "critical";
  readBy: { adminId: string }[];
  createdAt: string;
}

interface SendFailure {
  name: string;
  phone: string;
  error: string;
}

interface BulkResult {
  sent: number;
  failures: SendFailure[];
  skipped: number;
}

const SEND_CONCURRENCY = 3;

const SEVERITY_STYLES: Record<CrmNotification["severity"], string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  success:
    "bg-green-100 text-green-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

/** Runs `worker` over `items` with at most `limit` in flight. */
const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]);
      }
    },
  );
  await Promise.all(runners);
  return results;
};

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsError, setNotificationsError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersError, setCustomersError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const adminId = String(
    (user as { _id?: string; id?: string } | null)?._id || user?.id || "",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] =
    useState<Customer | null>(null);
  const [singleSelection, setSingleSelection] =
    useState<TemplateSelection>(EMPTY_SELECTION);
  const [singleTemplate, setSingleTemplate] = useState<
    WhatsAppTemplate | undefined
  >();
  const [sendingSingle, setSendingSingle] = useState(false);
  const customersPerPage = 10;

  const [formData, setFormData] = useState({
    selection: EMPTY_SELECTION,
    recipient_type: "selected" as "selected" | "high_value" | "all",
    recipient_emails: [] as string[],
    min_purchase_amount: 50000,
  });
  const [bulkTemplate, setBulkTemplate] = useState<
    WhatsAppTemplate | undefined
  >();

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await notificationsService.getAll();
    const payload = data as
      { data?: CrmNotification[]; unreadCount?: number } | undefined;
    if (error || !payload) {
      setNotificationsError(error || "Failed to load notifications");
    } else {
      setNotificationsError("");
      setNotifications(Array.isArray(payload.data) ? payload.data : []);
      setUnreadCount(Number(payload.unreadCount) || 0);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    const { data, error } = await api.get<{ data?: Invoice[] } | Invoice[]>(
      "/admin/all-invoices",
    );
    // The endpoint answers { status, data: invoices }.
    const invoices = Array.isArray(data) ? data : data?.data;
    if (error || !Array.isArray(invoices)) {
      setCustomersError(error || "Failed to load customers");
      return;
    }
    setCustomersError("");

    const customerMap = new Map<string, Customer>();
    invoices.forEach((invoice) => {
      const phone = invoice.customerDetails?.phone
        ? String(invoice.customerDetails.phone)
        : "";
      const name = invoice.customerDetails?.name || "";
      const email = invoice.customerDetails?.email || phone;
      const totalAmount =
        invoice.products?.reduce(
          (sum: number, p: InvoiceProduct) =>
            sum + (p.productPrice || 0) * (p.productQuantity || 1),
          0,
        ) || 0;

      const key = email || phone || name;
      if (!key) return;

      const existing = customerMap.get(key);
      if (existing) {
        existing.total_spent += totalAmount;
        if (!existing.customer_phone && phone) existing.customer_phone = phone;
        if (!existing.customer_name && name) existing.customer_name = name;
      } else {
        customerMap.set(key, {
          customer_email: email,
          customer_name: name,
          customer_phone: phone,
          total_spent: totalAmount,
        });
      }
    });

    setCustomers(
      Array.from(customerMap.values()).sort(
        (a, b) => b.total_spent - a.total_spent,
      ),
    );
  }, []);

  useEffect(() => {
    Promise.all([fetchNotifications(), fetchCustomers()]).finally(() =>
      setLoading(false),
    );
  }, [fetchNotifications, fetchCustomers]);

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

  const recipientCustomers = () => {
    const emails = new Set(getRecipientEmails());
    return customers.filter((c) => emails.has(c.customer_email));
  };

  const handleSend = async () => {
    const validation = selectionError(formData.selection, bulkTemplate);
    if (validation) {
      showToast(validation, "error");
      return;
    }

    const recipients = recipientCustomers();
    const targets = recipients.filter((c) => c.customer_phone);
    if (targets.length === 0) {
      showToast(
        "None of the selected customers have a WhatsApp number",
        "error",
      );
      return;
    }
    if (
      !window.confirm(
        `Send this WhatsApp template to ${targets.length} customer${targets.length === 1 ? "" : "s"}? This sends real messages.`,
      )
    ) {
      return;
    }

    setSending(true);
    setBulkResult(null);
    const results = await runWithConcurrency(
      targets,
      SEND_CONCURRENCY,
      (customer) =>
        NotifyOperations.sendTemplate(
          customer.customer_phone,
          formData.selection.messageId,
          fillVariables(formData.selection.variables, {
            name: customer.customer_name,
            phone: customer.customer_phone,
          }),
        ),
    );
    setSending(false);

    const failures: SendFailure[] = [];
    results.forEach((result, index) => {
      if (!result.ok) {
        failures.push({
          name: targets[index].customer_name || "Customer",
          phone: targets[index].customer_phone,
          error: result.error,
        });
      }
    });
    const sent = results.length - failures.length;
    const skipped = recipients.length - targets.length;

    let msg = `WhatsApp sent to ${sent} of ${targets.length} customers.`;
    if (skipped > 0) msg += ` ${skipped} had no phone number.`;
    showToast(
      failures.length ? `${msg} ${failures.length} failed.` : msg,
      sent > 0 ? "success" : "error",
    );

    if (failures.length) {
      // Keep the dialog open so the failures can be reviewed.
      setBulkResult({ sent, failures, skipped });
    } else {
      resetForm();
    }
  };

  const markRead = async (notification: CrmNotification) => {
    const { error } = await notificationsService.markAsRead(notification._id);
    if (error) {
      showToast(error, "error");
      return;
    }
    setNotifications((current) =>
      current.map((item) =>
        item._id === notification._id
          ? { ...item, readBy: [...(item.readBy || []), { adminId }] }
          : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    const { error } = await notificationsService.markAllAsRead();
    if (error) {
      showToast(error, "error");
      return;
    }
    fetchNotifications();
  };

  const isUnread = (notification: CrmNotification) =>
    !(notification.readBy || []).some(
      (entry) => String(entry.adminId) === adminId,
    );

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
      selection: EMPTY_SELECTION,
      recipient_type: "selected",
      recipient_emails: [],
      min_purchase_amount: 50000,
    });
    setBulkResult(null);
    setShowModal(false);
  };

  const getHighValueCustomers = () => {
    return customers.filter(
      (c) => c.total_spent >= formData.min_purchase_amount,
    );
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_phone.includes(searchQuery) ||
      c.customer_email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * customersPerPage,
    currentPage * customersPerPage,
  );

  const openMessageDialog = (customer: Customer) => {
    setSelectedCustomerForMessage(customer);
    setSingleSelection(EMPTY_SELECTION);
    setShowMessageDialog(true);
  };

  const closeMessageDialog = () => {
    setShowMessageDialog(false);
    setSelectedCustomerForMessage(null);
    setSingleSelection(EMPTY_SELECTION);
  };

  const handleSendSingleMessage = async () => {
    if (!selectedCustomerForMessage) return;
    if (!selectedCustomerForMessage.customer_phone) {
      showToast("This customer has no phone number for WhatsApp.", "error");
      return;
    }
    const validation = selectionError(singleSelection, singleTemplate);
    if (validation) {
      showToast(validation, "error");
      return;
    }

    setSendingSingle(true);
    const result = await NotifyOperations.sendTemplate(
      selectedCustomerForMessage.customer_phone,
      singleSelection.messageId,
      fillVariables(singleSelection.variables, {
        name: selectedCustomerForMessage.customer_name,
        phone: selectedCustomerForMessage.customer_phone,
      }),
    );
    setSendingSingle(false);

    if (!result.ok) {
      // Keep the dialog open so the message can be fixed and retried.
      showToast(`WhatsApp not sent: ${result.error}`, "error");
      return;
    }
    showToast(
      `WhatsApp message sent to ${selectedCustomerForMessage.customer_name || selectedCustomerForMessage.customer_phone}`,
      "success",
    );
    closeMessageDialog();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const bulkTargets = recipientCustomers().filter(
    (c) => c.customer_phone,
  ).length;

  return (
    <div>
      <TabInnerContent
        title="Notifications"
        description="Send WhatsApp templates to your customers and follow CRM activity"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-black dark:text-white/60">
                  Total Customers
                </p>
                <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                  {customers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 dark:bg-emerald-500/20 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-black dark:text-white/60">
                  High-Value Customers
                </p>
                <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                  {customers.filter((c) => c.total_spent >= 50000).length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 dark:bg-purple-500/20 p-3 rounded-lg">
                <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-black dark:text-white/60">
                  Unread Notifications
                </p>
                <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                  {unreadCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {customersError && (
          <p
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            Couldn't load customers: {customersError}
          </p>
        )}

        {/* Customers Data Table */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
              Customers
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, phone, email..."
                  className="pl-10 pr-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-white/5 text-black dark:text-white text-sm w-64"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Bulk Message
              </motion.button>
            </div>
          </div>

          {paginatedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                No customers found
              </h3>
              <p className="text-black dark:text-white/60">
                {searchQuery
                  ? "Try a different search term"
                  : "Customer data will appear here"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map((customer, index) => (
                      <motion.tr
                        key={customer.customer_email || customer.customer_phone}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
                              {customer.customer_name
                                ? customer.customer_name.charAt(0).toUpperCase()
                                : "?"}
                            </div>
                            <span className="text-sm font-medium text-neutral-950 dark:text-white">
                              {customer.customer_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {customer.customer_phone ? (
                              <>
                                <Phone className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-sm text-black dark:text-white/70">
                                  {customer.customer_phone}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400 dark:text-white/30">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-black dark:text-white/70">
                            {customer.customer_email &&
                            customer.customer_email !== customer.customer_phone
                              ? customer.customer_email
                              : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-green-600 dark:text-emerald-400">
                            ₹{customer.total_spent.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openMessageDialog(customer)}
                            disabled={!customer.customer_phone}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              customer.customer_phone
                                ? "Send WhatsApp message"
                                : "No phone number available"
                            }
                          >
                            <MessageSquare className="w-4 h-4" />
                            Send
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <p className="text-sm text-slate-500 dark:text-white/40">
                    Showing {(currentPage - 1) * customersPerPage + 1}–
                    {Math.min(
                      currentPage * customersPerPage,
                      filteredCustomers.length,
                    )}{" "}
                    of {filteredCustomers.length} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-white/60" />
                    </motion.button>
                    <span className="text-sm font-medium text-neutral-950 dark:text-white px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 dark:text-white/60" />
                    </motion.button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* CRM Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
              CRM Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchNotifications}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            </div>
          </div>

          {notificationsError ? (
            <p
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
              role="alert"
            >
              Couldn't load notifications: {notificationsError}
            </p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-black dark:text-white/60">
                New orders, invoices, payments and reminders will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => {
                const unread = isUnread(notification);
                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 10) * 0.03 }}
                    className={`rounded-lg border p-4 ${
                      unread
                        ? "border-blue-300 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/5"
                        : "border-gray-200 bg-white/50 dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {unread && (
                            <span
                              className="h-2 w-2 rounded-full bg-blue-600"
                              aria-label="Unread"
                            />
                          )}
                          <h4 className="font-semibold text-neutral-950 dark:text-white">
                            {notification.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${SEVERITY_STYLES[notification.severity] || SEVERITY_STYLES.info}`}
                          >
                            {notification.entityType}
                          </span>
                        </div>
                        <p className="text-sm text-black dark:text-white/60 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/40">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(notification.createdAt).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        </div>
                      </div>
                      {unread && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => markRead(notification)}
                          className="inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-white/10 text-slate-700 dark:text-white/80 rounded-lg hover:bg-slate-100 dark:hover:bg-white/20 transition-colors text-xs font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark read
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Single Customer Message Dialog */}
        <AnimatePresence>
          {showMessageDialog && selectedCustomerForMessage && (
            <ResponsiveDialog
              open
              title="Send WhatsApp Message"
              onClose={closeMessageDialog}
              busy={sendingSingle}
              size="md"
              footer={
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSendSingleMessage}
                    disabled={sendingSingle || !singleSelection.messageId}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    {sendingSingle ? "Sending..." : "Send WhatsApp"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={closeMessageDialog}
                    disabled={sendingSingle}
                    className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancel
                  </motion.button>
                </>
              }
            >
              <div className="flex items-center gap-3 mb-6 mt-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-medium">
                  {selectedCustomerForMessage.customer_name
                    ? selectedCustomerForMessage.customer_name
                        .charAt(0)
                        .toUpperCase()
                    : "?"}
                </div>
                <div>
                  <p className="font-medium text-neutral-950 dark:text-white">
                    {selectedCustomerForMessage.customer_name || "Unknown"}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedCustomerForMessage.customer_phone}
                  </p>
                </div>
                <div className="ml-auto text-sm font-semibold text-green-600 dark:text-emerald-400">
                  ₹{selectedCustomerForMessage.total_spent.toLocaleString()}
                </div>
              </div>
              <div className="mb-6">
                <WhatsAppTemplateForm
                  value={singleSelection}
                  onChange={setSingleSelection}
                  previewName={selectedCustomerForMessage.customer_name}
                  onTemplateChange={setSingleTemplate}
                />
              </div>
            </ResponsiveDialog>
          )}
        </AnimatePresence>

        {/* Bulk Compose Modal */}
        <AnimatePresence>
          {showModal && (
            <ResponsiveDialog
              open
              title="Bulk WhatsApp Message"
              onClose={resetForm}
              busy={sending}
              size="lg"
              footer={
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSend}
                    disabled={
                      sending ||
                      bulkTargets === 0 ||
                      !formData.selection.messageId
                    }
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    {sending
                      ? "Sending..."
                      : `Send to ${bulkTargets} customer${bulkTargets === 1 ? "" : "s"} on WhatsApp`}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetForm}
                    disabled={sending}
                    className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
                  >
                    {bulkResult ? "Close" : "Cancel"}
                  </motion.button>
                </>
              }
            >
              <WhatsAppTemplateForm
                value={formData.selection}
                onChange={(selection) =>
                  setFormData((current) => ({ ...current, selection }))
                }
                previewName={customers[0]?.customer_name}
                onTemplateChange={setBulkTemplate}
              />

              <div>
                <label className="block text-sm font-medium text-black dark:text-white/60 mb-3">
                  Recipients
                </label>
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        recipient_type: "selected",
                      })
                    }
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      formData.recipient_type === "selected"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-400 dark:border-white/10 bg-white dark:bg-white/5 text-black dark:text-white/60 hover:border-slate-300 dark:hover:border-white/20"
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
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-400 dark:border-white/10 bg-white dark:bg-white/5 text-black dark:text-white/60 hover:border-slate-300 dark:hover:border-white/20"
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
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-400 dark:border-white/10 bg-white dark:bg-white/5 text-black dark:text-white/60 hover:border-slate-300 dark:hover:border-white/20"
                    }`}
                  >
                    <Bell className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">All Customers</div>
                  </button>
                </div>

                {formData.recipient_type === "high_value" && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/20 rounded-lg">
                    <label className="block text-sm font-medium text-black dark:text-white/60 mb-2">
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
                      className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-white/5 text-black dark:text-white"
                    />
                    <p className="text-sm text-black dark:text-white/60 mt-2">
                      {getHighValueCustomers().length} customers will receive
                      this message
                    </p>
                  </div>
                )}

                {formData.recipient_type === "selected" && (
                  <div className="max-h-64 overflow-y-auto border border-gray-400 dark:border-white/10 rounded-lg p-2 custom-scrollbar">
                    <div className="space-y-1">
                      {customers.map((customer) => (
                        <label
                          key={customer.customer_email}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={formData.recipient_emails.includes(
                              customer.customer_email,
                            )}
                            onChange={() =>
                              toggleCustomerSelection(customer.customer_email)
                            }
                            disabled={!customer.customer_phone}
                            className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-white dark:bg-white/5"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-neutral-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {customer.customer_name || "—"}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-white/40">
                              {customer.customer_email}
                            </span>
                            {customer.customer_phone ? (
                              <span className="text-xs text-green-500 dark:text-green-400">
                                WhatsApp: {customer.customer_phone}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No phone number
                              </span>
                            )}
                          </div>
                          <div className="ml-auto text-sm font-medium text-green-600">
                            ₹{customer.total_spent.toLocaleString()}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.recipient_type === "all" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                    <p className="text-sm text-black dark:text-white/60">
                      This message will be sent to all {customers.length}{" "}
                      customers
                    </p>
                  </div>
                )}
              </div>

              {bulkResult && bulkResult.failures.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    Sent {bulkResult.sent}, failed {bulkResult.failures.length}
                    {bulkResult.skipped > 0 &&
                      `, skipped ${bulkResult.skipped} without a phone number`}
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm custom-scrollbar">
                    {bulkResult.failures.map((failure, index) => (
                      <li
                        key={`${failure.phone}-${index}`}
                        className="text-red-700 dark:text-red-300"
                      >
                        <span className="font-medium">{failure.name}</span> (
                        {failure.phone}): {failure.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ResponsiveDialog>
          )}
        </AnimatePresence>
      </TabInnerContent>
    </div>
  );
}
