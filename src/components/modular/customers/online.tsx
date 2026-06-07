import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Edit2,
  Mail,
  Trash2,
  Building2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Eye,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import CustomerDetailsDialog, {
  CustomerOrderRecord,
  CustomerProfileRecord,
  CustomerReviewRecord,
} from "./CustomerDetailsDialog";

interface Customer extends CustomerProfileRecord {}
interface OrderRecord extends CustomerOrderRecord {}
interface ReviewRecord extends CustomerReviewRecord {}

interface CustomerStats {
  ordersCount?: number;
  reviewsCount?: number;
  totalSpent?: number;
  orderStatusBreakdown?: Record<string, number>;
}

interface AquaOnlineCustomerProps {
  filteredCustomers: Customer[];
  ordersFor: (customer: Customer) => OrderRecord[];
  reviewsFor: (customer: Customer) => ReviewRecord[];
  statsFor?: (customer: Customer) => CustomerStats | undefined;
  isDetailLoading?: (customer: Customer) => boolean;
  onExpand?: (customerId: string) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onSend: (phone: string) => void;
  onEmail: (email: string) => void;
  onCopy: (text: string) => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
  inactive: "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70",
};

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const dateOnly = (date?: string) => date?.split("T")[0] || "-";

const AquaOnlineCustomer = ({
  filteredCustomers,
  ordersFor,
  reviewsFor,
  statsFor,
  isDetailLoading,
  onExpand,
  onEdit,
  onDelete,
  onSend,
  onEmail,
  onCopy,
}: AquaOnlineCustomerProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogTab, setDialogTab] = useState<"profile" | "orders" | "reviews">("profile");

  const toggleExpand = (customer: Customer) => {
    const next = expandedId === customer.id ? null : customer.id;
    setExpandedId(next);
    if (next && onExpand) onExpand(customer.id);
  };

  const openDetails = (customer: Customer, tab: "profile" | "orders" | "reviews" = "profile") => {
    setSelectedCustomer(customer);
    setDialogTab(tab);
    if (onExpand) onExpand(customer.id);
  };

  const selectedOrders = selectedCustomer ? ordersFor(selectedCustomer) : [];
  const selectedReviews = selectedCustomer ? reviewsFor(selectedCustomer) : [];

  return (
    <motion.div
      key="online"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="overflow-x-auto"
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            <th className="w-8 px-4 py-3 font-medium"></th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Orders</th>
            <th className="px-4 py-3 font-medium">Reviews</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((customer, index) => {
            const orders = ordersFor(customer);
            const reviews = reviewsFor(customer);
            const stats = statsFor?.(customer);
            const detailLoading = isDetailLoading?.(customer);
            const orderCount = stats?.ordersCount ?? orders.length;
            const reviewCount = stats?.reviewsCount ?? reviews.length;
            const totalSpent =
              stats?.totalSpent ?? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
            const latestOrder = orders[0];
            const latestReview = reviews[0];
            const isExpanded = expandedId === customer.id;

            return (
              <Fragment key={customer.id}>
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="border-b border-gray-100 transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <td className="px-2 py-3">
                    <button
                      onClick={() => toggleExpand(customer)}
                      className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={isExpanded ? "Collapse customer activity" : "Expand customer activity"}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 p-2 text-white">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                          {customer.company_name || customer.contact_name || "-"}
                        </p>
                        {customer.contact_name && customer.contact_name !== customer.company_name && (
                          <p className="text-xs text-slate-500 dark:text-white/60">{customer.contact_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white/80">
                    {customer.phone ? (
                      <button
                        className="group flex items-center gap-2 text-left"
                        onClick={() => onCopy(customer.phone!)}
                        title="Copy phone"
                      >
                        <span>{customer.phone}</span>
                        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white/80">{customer.email || "-"}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-black dark:text-white/80" title={customer.address || ""}>
                    {customer.address || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => openDetails(customer, "orders")} className="text-left text-xs">
                      <span className="block font-semibold text-emerald-600 dark:text-emerald-400">{orderCount}</span>
                      {totalSpent > 0 && <span className="text-slate-500 dark:text-white/50">{formatINR(totalSpent)}</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => openDetails(customer, "reviews")} className="font-semibold text-amber-600 dark:text-amber-400">
                      {reviewCount}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dateOnly(customer.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[customer.status] || statusColors.inactive}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openDetails(customer)}
                        title="View complete details"
                        className="rounded-lg bg-sky-50 p-2 text-sky-600 transition-colors hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20"
                      >
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      {customer.phone && (
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSend(customer.phone!)}
                          title="Send WhatsApp"
                          className="rounded-lg bg-green-50 p-2 text-green-600 transition-colors hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      )}
                      {customer.email && (
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onEmail(customer.email)}
                          title="Send Email"
                          className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"
                        >
                          <Mail className="h-4 w-4" />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onEdit(customer)}
                        title="Edit"
                        className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onDelete(customer.id)}
                        title="Delete"
                        className="rounded-lg bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.tr
                      key={`${customer.id}-detail`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="border-b border-gray-100 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.02]"
                    >
                      <td colSpan={10} className="px-4 py-4">
                        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-white">
                                <Sparkles className="h-4 w-4 text-sky-500" />
                                Customer Activity
                              </div>
                              <p className="mt-1 text-xs text-slate-500 dark:text-white/45">
                                Compact preview only. Open the dialog for complete order and review details.
                              </p>
                            </div>
                            <button
                              onClick={() => openDetails(customer)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
                            >
                              <Eye className="h-4 w-4" /> View Details
                            </button>
                          </div>

                          {detailLoading && (
                            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                              Loading orders and reviews…
                            </div>
                          )}

                          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <button
                              onClick={() => openDetails(customer, "orders")}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-400/40 dark:hover:bg-white/[0.05]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-white">
                                  <ShoppingBag className="h-4 w-4 text-emerald-500" /> Orders
                                </div>
                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                                  {orderCount}
                                </span>
                              </div>
                              <p className="mt-3 text-xs text-slate-500 dark:text-white/50">
                                {latestOrder
                                  ? `Latest: ${latestOrder.order_no || latestOrder.id} · ${formatINR(latestOrder.total_amount || 0)} · ${latestOrder.status || "status pending"}`
                                  : "No orders found for this customer."}
                              </p>
                            </button>

                            <button
                              onClick={() => openDetails(customer, "reviews")}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-400/40 dark:hover:bg-white/[0.05]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-white">
                                  <Star className="h-4 w-4 text-amber-500" /> Reviews
                                </div>
                                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-300">
                                  {reviewCount}
                                </span>
                              </div>
                              <p className="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-white/50">
                                {latestReview
                                  ? `${latestReview.productName || latestReview.productId || "Product"}: ${latestReview.comment || "Review available"}`
                                  : "No reviews from this customer yet."}
                              </p>
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => openDetails(customer, "orders")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-neutral-950 dark:border-white/10 dark:text-white/60 dark:hover:text-white"
                            >
                              View Orders
                            </button>
                            <button
                              onClick={() => openDetails(customer, "reviews")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-neutral-950 dark:border-white/10 dark:text-white/60 dark:hover:text-white"
                            >
                              View Reviews
                            </button>
                            {customer.phone && (
                              <button
                                onClick={() => onSend(customer.phone!)}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400"
                              >
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
          {filteredCustomers.length === 0 && (
            <tr>
              <td colSpan={10} className="py-8 text-center text-slate-500">
                No online customers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <CustomerDetailsDialog
        key={`${selectedCustomer?.id || "customer"}-${dialogTab}`}
        open={!!selectedCustomer}
        customer={selectedCustomer}
        orders={selectedOrders}
        reviews={selectedReviews}
        loading={selectedCustomer ? isDetailLoading?.(selectedCustomer) : false}
        onClose={() => setSelectedCustomer(null)}
        onCopy={onCopy}
        onSend={onSend}
        initialTab={dialogTab}
      />
    </motion.div>
  );
};

export default AquaOnlineCustomer;
