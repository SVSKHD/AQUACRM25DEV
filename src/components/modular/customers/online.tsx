import { useState } from "react";
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
  ShoppingBag,
  Star,
} from "lucide-react";

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
  total_amount?: number;
  status?: string;
  payment_status?: string;
  products?: {
    productName: string;
    productQuantity: number;
    productPrice: number;
  }[];
}

interface ReviewRecord {
  id: string;
  productId?: string;
  productName?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

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
  active:
    "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
  inactive: "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70",
};

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

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

  const toggleExpand = (customer: Customer) => {
    const next = expandedId === customer.id ? null : customer.id;
    setExpandedId(next);
    if (next && onExpand) onExpand(customer.id);
  };

  return (
    <motion.div
      key="online"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="overflow-x-auto"
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
            <th className="py-3 px-4 font-medium w-8"></th>
            <th className="py-3 px-4 font-medium">Name</th>
            <th className="py-3 px-4 font-medium">Phone</th>
            <th className="py-3 px-4 font-medium">Email</th>
            <th className="py-3 px-4 font-medium">Address</th>
            <th className="py-3 px-4 font-medium">Orders</th>
            <th className="py-3 px-4 font-medium">Reviews</th>
            <th className="py-3 px-4 font-medium">Created</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium text-right">Actions</th>
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
              stats?.totalSpent ??
              orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const isExpanded = expandedId === customer.id;
            return (
              <>
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="border-b border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-2">
                    <button
                      onClick={() => toggleExpand(customer)}
                      className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg text-white">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-950 dark:text-white text-sm">
                          {customer.company_name ||
                            customer.contact_name ||
                            "-"}
                        </p>
                        {customer.contact_name &&
                          customer.contact_name !== customer.company_name && (
                            <p className="text-xs text-slate-500 dark:text-white/60">
                              {customer.contact_name}
                            </p>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                    {customer.phone ? (
                      <div
                        className="flex items-center gap-2 group cursor-pointer"
                        onClick={() => onCopy(customer.phone!)}
                        title="Copy"
                      >
                        <span>{customer.phone}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                    {customer.email || "-"}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-black dark:text-white/80 max-w-[200px] truncate"
                    title={customer.address || ""}
                  >
                    {customer.address || "-"}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="text-xs">
                      <span className="block font-medium text-emerald-600 dark:text-emerald-400">
                        {orderCount}
                      </span>
                      {totalSpent > 0 && (
                        <span className="text-slate-500 dark:text-white/50">
                          {formatINR(totalSpent)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {reviewCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {customer.created_at?.split("T")[0] || "-"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[customer.status] || statusColors.inactive
                      }`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {customer.phone && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onSend(customer.phone!)}
                          title="Send WhatsApp"
                          className="p-2 text-green-600 bg-green-50 dark:bg-green-500/10 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                      {customer.email && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEmail(customer.email)}
                          title="Send Email"
                          className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEdit(customer)}
                        title="Edit"
                        className="p-2 text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(customer.id)}
                        title="Delete"
                        className="p-2 text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.tr
                      key={`${customer.id}-detail`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]"
                    >
                      <td colSpan={10} className="px-4 py-4">
                        {detailLoading && (
                          <div className="text-xs text-slate-500 dark:text-white/40 mb-3">
                            Loading orders and reviews…
                          </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-neutral-950 dark:text-white">
                              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              Orders ({orders.length})
                            </div>
                            {orders.length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-white/40">
                                No orders found for this customer.
                              </p>
                            ) : (
                              <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {orders.map((o) => (
                                  <div
                                    key={o.id}
                                    className="flex items-center justify-between text-xs bg-white dark:bg-white/5 rounded-lg px-3 py-2 border border-slate-100 dark:border-white/5"
                                  >
                                    <div>
                                      <span className="font-medium text-neutral-950 dark:text-white">
                                        {o.order_no || o.id}
                                      </span>
                                      <span className="text-slate-500 dark:text-white/50 ml-2">
                                        {o.date?.split("T")[0] || ""}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        {formatINR(o.total_amount || 0)}
                                      </span>
                                      {o.status && (
                                        <span className="ml-2 text-slate-500 dark:text-white/50">
                                          {o.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-neutral-950 dark:text-white">
                              <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              Reviews ({reviews.length})
                            </div>
                            {reviews.length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-white/40">
                                No reviews from this customer yet.
                              </p>
                            ) : (
                              <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {reviews.map((r) => (
                                  <div
                                    key={r.id}
                                    className="text-xs bg-white dark:bg-white/5 rounded-lg px-3 py-2 border border-slate-100 dark:border-white/5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-neutral-950 dark:text-white">
                                        {r.productName ||
                                          r.productId ||
                                          "Product"}
                                      </span>
                                      {typeof r.rating === "number" && (
                                        <span className="text-amber-500">
                                          {"★".repeat(Math.round(r.rating))}
                                          <span className="text-slate-300">
                                            {"★".repeat(
                                              Math.max(
                                                0,
                                                5 - Math.round(r.rating),
                                              ),
                                            )}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                    {r.comment && (
                                      <p className="text-slate-600 dark:text-white/60 mt-1">
                                        {r.comment}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </>
            );
          })}
          {filteredCustomers.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center py-8 text-slate-500">
                No online customers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
};

export default AquaOnlineCustomer;
