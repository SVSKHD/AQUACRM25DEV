import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsService } from "../../services/apiService";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast";
import { usePersistentFormDraft } from "../../hooks/usePersistentFormDraft";
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
  Search,
  Phone,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import NotifyOperations, { type WhatsAppTemplate } from "../../services/notify";
import { extractArrayPayload } from "../../utils/apiPayload";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidIconButton,
  LiquidInput,
} from "../ui/liquid";
import WhatsAppTemplateForm from "../modular/notifications/WhatsAppTemplateForm";
import {
  EMPTY_SELECTION,
  fillVariables,
  renderTemplate,
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

type RecipientType = "selected" | "high_value" | "all";

interface NotificationForm {
  title: string;
  selection: TemplateSelection;
  recipient_type: RecipientType;
  recipient_emails: string[];
  min_purchase_amount: number;
}

interface SendFailure {
  name: string;
  phone: string;
  error: string;
}

const SEND_CONCURRENCY = 3;

const RECIPIENT_TYPES = ["selected", "high_value", "all"] as const;

const emptyNotificationForm = (): NotificationForm => ({
  title: "",
  selection: EMPTY_SELECTION,
  recipient_type: "selected",
  recipient_emails: [],
  min_purchase_amount: 50000,
});

/** Restores drafts saved before the template picker (which had free-text `message`). */
const normalizeDraft = (
  draft: Partial<NotificationForm> | null | undefined,
): NotificationForm => {
  const base = emptyNotificationForm();
  if (!draft) return base;
  const selection = draft.selection;
  return {
    title: typeof draft.title === "string" ? draft.title : base.title,
    selection:
      selection && typeof selection.messageId === "string"
        ? {
            messageId: selection.messageId,
            variables: Array.isArray(selection.variables)
              ? selection.variables.map(String)
              : [],
          }
        : base.selection,
    recipient_type: RECIPIENT_TYPES.includes(
      draft.recipient_type as RecipientType,
    )
      ? (draft.recipient_type as RecipientType)
      : base.recipient_type,
    recipient_emails: Array.isArray(draft.recipient_emails)
      ? draft.recipient_emails
      : base.recipient_emails,
    min_purchase_amount:
      Number(draft.min_purchase_amount) || base.min_purchase_amount,
  };
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkFailures, setBulkFailures] = useState<SendFailure[]>([]);
  const { user } = useAuth();
  const { showToast } = useToast();

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

  const [formData, setFormData] = useState(emptyNotificationForm);
  const [bulkTemplate, setBulkTemplate] = useState<
    WhatsAppTemplate | undefined
  >();
  const notificationDraft = usePersistentFormDraft<NotificationForm>({
    key: "notifications:bulk-compose",
    value: formData,
    onRestore: (draft) => setFormData(normalizeDraft(draft)),
    enabled: showModal,
  });

  useEffect(() => {
    fetchNotifications();
    fetchCustomers();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await notificationsService.getAll();

    setNotifications(extractArrayPayload<Notification>(data));
    setLoading(false);
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(
        "https://api.aquakart.co.in/v1/crm/admin/all-invoices",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        },
      );

      const invoices = response.data;

      if (invoices && Array.isArray(invoices)) {
        const customerMap = new Map<string, Customer>();

        (invoices as Invoice[]).forEach((invoice) => {
          const phone = invoice.customerDetails?.phone
            ? String(invoice.customerDetails.phone)
            : "";
          const name = invoice.customerDetails?.name || "";
          const email = invoice.customerDetails?.email || phone;
          const totalAmount =
            invoice.products?.reduce(
              // productPrice is the line value (PR #89); never multiply by quantity.
              (sum: number, p: InvoiceProduct) => sum + (p.productPrice || 0),
              0,
            ) || 0;

          const key = email || phone || name;
          if (!key) return;

          if (customerMap.has(key)) {
            const existing = customerMap.get(key)!;
            existing.total_spent += totalAmount;
            if (!existing.customer_phone && phone) {
              existing.customer_phone = phone;
            }
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
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
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
    const validation = selectionError(formData.selection, bulkTemplate);
    if (validation) {
      showToast(validation, "error");
      return;
    }

    const recipientEmails = getRecipientEmails();

    if (recipientEmails.length === 0) {
      showToast("No recipients selected", "error");
      return;
    }

    const emailSet = new Set(recipientEmails);
    const recipientCustomers = customers.filter((c) =>
      emailSet.has(c.customer_email),
    );
    const whatsappTargets = recipientCustomers.filter((c) => c.customer_phone);

    if (whatsappTargets.length === 0) {
      showToast(
        "None of the selected customers have a WhatsApp number",
        "error",
      );
      return;
    }

    if (
      !window.confirm(
        `Send this WhatsApp template to ${whatsappTargets.length} customer${
          whatsappTargets.length === 1 ? "" : "s"
        }? This sends real messages.`,
      )
    ) {
      return;
    }

    setSending(true);
    setBulkFailures([]);

    const { messageId, variables } = formData.selection;
    const results = await runWithConcurrency(
      whatsappTargets,
      SEND_CONCURRENCY,
      (customer) =>
        NotifyOperations.sendTemplate(
          customer.customer_phone,
          messageId.trim(),
          fillVariables(variables, {
            name: customer.customer_name,
            phone: customer.customer_phone,
          }),
        ),
    );

    const failures: SendFailure[] = [];
    results.forEach((result, index) => {
      if (!result.ok) {
        failures.push({
          name: whatsappTargets[index].customer_name || "Customer",
          phone: whatsappTargets[index].customer_phone,
          error: result.error,
        });
      }
    });
    const sentCount = results.length - failures.length;
    const noPhoneCount = recipientCustomers.length - whatsappTargets.length;

    // Save notification record for what was actually delivered to the provider.
    let recordError: string | null = null;
    if (sentCount > 0) {
      const templateLabel = bulkTemplate?.name || `Template ${messageId}`;
      const notificationData = {
        user_id: user?.id,
        title: formData.title.trim() || `WhatsApp: ${templateLabel}`,
        message:
          renderTemplate(
            bulkTemplate,
            fillVariables(variables, { name: "{name}" }),
          ) || `${templateLabel} (${variables.join(", ") || "no variables"})`,
        recipient_type: formData.recipient_type,
        recipient_emails: recipientEmails,
        min_purchase_amount:
          formData.recipient_type === "high_value"
            ? formData.min_purchase_amount
            : null,
        sent_count: sentCount,
        status: "sent",
        sent_at: new Date().toISOString(),
      };
      const { error } = await notificationsService.create(notificationData);
      recordError = error ? String(error) : null;
    }

    setSending(false);

    let msg = `WhatsApp sent to ${sentCount} of ${whatsappTargets.length} customers.`;
    if (failures.length > 0) msg += ` ${failures.length} failed.`;
    if (noPhoneCount > 0) msg += ` ${noPhoneCount} had no phone number.`;
    showToast(
      msg,
      sentCount > 0 && failures.length === 0 ? "success" : "error",
    );
    if (recordError) {
      showToast(`Error saving notification record: ${recordError}`, "error");
    }
    if (sentCount > 0) fetchNotifications();

    if (failures.length > 0) {
      // Keep the form open so the failures can be reviewed.
      setBulkFailures(failures);
      return;
    }

    await notificationDraft.clearDraft();
    setFormData(emptyNotificationForm());
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      const { error } = await notificationsService.delete(id);

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

  const closeForm = () => {
    setShowModal(false);
    setBulkFailures([]);
  };

  const clearNotificationDraft = async () => {
    await notificationDraft.clearDraft();
    setFormData(emptyNotificationForm());
    setBulkFailures([]);
    showToast("Notification draft cleared", "success");
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
      singleSelection.messageId.trim(),
      fillVariables(singleSelection.variables, {
        name: selectedCustomerForMessage.customer_name,
        phone: selectedCustomerForMessage.customer_phone,
      }),
    );
    setSendingSingle(false);

    if (!result.ok) {
      // Keep the dialog open so the template can be fixed and retried.
      showToast(`WhatsApp not sent: ${result.error}`, "error");
      return;
    }
    showToast(
      `WhatsApp message sent to ${
        selectedCustomerForMessage.customer_name ||
        selectedCustomerForMessage.customer_phone
      }`,
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

  const recipientOptions: {
    type: RecipientType;
    label: string;
    icon: typeof Users;
  }[] = [
    { type: "selected", label: "Selected Customers", icon: Users },
    { type: "high_value", label: "High-Value", icon: DollarSign },
    { type: "all", label: "All Customers", icon: Bell },
  ];

  return (
    <div>
      <TabInnerContent
        title="Notifications"
        description="Send approved WhatsApp templates to your customers"
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
                <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-black dark:text-white/60">
                  Messages Sent
                </p>
                <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                  {notifications.filter((n) => n.status === "sent").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Data Table */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
              Customers
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <LiquidInput
                  type="text"
                  aria-label="Search customers"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, phone, email..."
                  className="!pl-10 text-sm"
                  wrapperClassName="w-64"
                />
              </div>
              <LiquidButton
                type="button"
                variant="primary"
                onClick={() => setShowModal(true)}
                className="text-sm"
              >
                <Plus className="w-4 h-4" />
                Bulk Message
              </LiquidButton>
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
                          <LiquidButton
                            type="button"
                            variant="soft"
                            onClick={() => openMessageDialog(customer)}
                            disabled={!customer.customer_phone}
                            className="!min-h-0 !px-3 !py-1.5 text-sm text-green-700 dark:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              customer.customer_phone
                                ? "Send WhatsApp message"
                                : "No phone number available"
                            }
                          >
                            <MessageSquare className="w-4 h-4" />
                            Send
                          </LiquidButton>
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
                    <LiquidIconButton
                      type="button"
                      aria-label="Previous page"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-white/60" />
                    </LiquidIconButton>
                    <span className="text-sm font-medium text-neutral-950 dark:text-white px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <LiquidIconButton
                      type="button"
                      aria-label="Next page"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 dark:text-white/60" />
                    </LiquidIconButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message History */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-neutral-950 dark:text-white mb-4">
            Message History
          </h3>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                No messages yet
              </h3>
              <p className="text-black dark:text-white/60">
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
                  className="bg-white/50 dark:bg-white/5 border border-gray-400 dark:border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-neutral-950 dark:text-white">
                          {notification.title}
                        </h4>
                        {notification.status === "sent" ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Sent
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-black text-xs font-medium rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-black dark:text-white/60 mb-3">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-white/40">
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
                    <LiquidIconButton
                      type="button"
                      aria-label="Delete notification"
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </LiquidIconButton>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Single Customer Message Dialog */}
        <AnimatePresence>
          {showMessageDialog && selectedCustomerForMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={closeMessageDialog}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
              >
                <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-1">
                  Send WhatsApp Message
                </h3>
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

                <div className="flex gap-3">
                  <LiquidButton
                    type="button"
                    variant="primary"
                    onClick={handleSendSingleMessage}
                    disabled={
                      sendingSingle || !singleSelection.messageId.trim()
                    }
                    className="flex-1"
                  >
                    <Send className="w-5 h-5" />
                    {sendingSingle ? "Sending..." : "Send WhatsApp"}
                  </LiquidButton>
                  <LiquidButton
                    type="button"
                    variant="soft"
                    onClick={closeMessageDialog}
                  >
                    Cancel
                  </LiquidButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Compose Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={closeForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
                  Compose Message
                </h3>
                <div className="mb-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                  Draft auto-saves locally. Closing keeps your work.
                </div>

                <div className="space-y-6">
                  <LiquidInput
                    type="text"
                    label="Message Title (for history)"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Special Offer, Important Update"
                  />

                  <WhatsAppTemplateForm
                    value={formData.selection}
                    onChange={(selection) =>
                      setFormData((current) => ({ ...current, selection }))
                    }
                    onTemplateChange={setBulkTemplate}
                  />

                  <div>
                    <p className="block text-sm font-medium text-black dark:text-white/60 mb-3">
                      Recipients
                    </p>
                    <div className="flex gap-3 mb-4">
                      {recipientOptions.map(({ type, label, icon: Icon }) => (
                        <LiquidButton
                          key={type}
                          type="button"
                          variant={
                            formData.recipient_type === type
                              ? "primary"
                              : "soft"
                          }
                          aria-pressed={formData.recipient_type === type}
                          onClick={() =>
                            setFormData({ ...formData, recipient_type: type })
                          }
                          className="flex-1 !flex-col !gap-1 !py-3"
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-medium">{label}</span>
                        </LiquidButton>
                      ))}
                    </div>

                    {formData.recipient_type === "high_value" && (
                      <div className="mb-4 p-4 bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/20 rounded-lg">
                        <LiquidInput
                          type="number"
                          label="Minimum Purchase Amount"
                          value={formData.min_purchase_amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              min_purchase_amount:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-black dark:text-white/60 mt-2">
                          {getHighValueCustomers().length} customers will
                          receive this message
                        </p>
                      </div>
                    )}

                    {formData.recipient_type === "selected" && (
                      <div className="max-h-64 overflow-y-auto border border-gray-400 dark:border-white/10 rounded-lg p-2 custom-scrollbar">
                        <div className="space-y-1">
                          {customers.map((customer) => (
                            <LiquidCheckbox
                              key={customer.customer_email}
                              checked={formData.recipient_emails.includes(
                                customer.customer_email,
                              )}
                              onChange={() =>
                                toggleCustomerSelection(customer.customer_email)
                              }
                              wrapperClassName="group flex w-full p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                              label={
                                <span className="flex w-full items-center justify-between gap-3">
                                  <span className="flex flex-col">
                                    <span className="text-sm font-medium text-neutral-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {customer.customer_name}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-white/40">
                                      {customer.customer_email}
                                    </span>
                                    {customer.customer_phone && (
                                      <span className="text-xs text-green-500 dark:text-green-400">
                                        WhatsApp: {customer.customer_phone}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-sm font-medium text-green-600">
                                    ₹{customer.total_spent.toLocaleString()}
                                  </span>
                                </span>
                              }
                            />
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

                  {bulkFailures.length > 0 && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
                    >
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-4 w-4" />
                        {bulkFailures.length} message
                        {bulkFailures.length === 1 ? "" : "s"} failed
                      </p>
                      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-700 dark:text-red-200 custom-scrollbar">
                        {bulkFailures.map((failure) => (
                          <li key={failure.phone}>
                            <span className="font-medium">
                              {failure.name} ({failure.phone})
                            </span>
                            : {failure.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-400 dark:border-white/10">
                    <LiquidButton
                      type="button"
                      variant="primary"
                      onClick={handleSend}
                      disabled={sending}
                      className="flex-1"
                    >
                      <Send className="w-5 h-5" />
                      {sending
                        ? "Sending..."
                        : `Send to ${getRecipientEmails().length} customers`}
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      variant="soft"
                      onClick={closeForm}
                    >
                      Close
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      variant="danger"
                      onClick={() => void clearNotificationDraft()}
                    >
                      Clear draft
                    </LiquidButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </TabInnerContent>
    </div>
  );
}
