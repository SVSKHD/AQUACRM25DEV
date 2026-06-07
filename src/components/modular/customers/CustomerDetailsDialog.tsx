import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShoppingBag,
  Star,
  User,
  X,
} from "lucide-react";

export interface CustomerProfileRecord {
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

export interface CustomerOrderRecord {
  id: string;
  order_no?: string;
  date?: string;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  products?: any[];
}

export interface CustomerReviewRecord {
  id: string;
  productId?: string;
  productName?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
}

interface CustomerDetailsDialogProps {
  open: boolean;
  customer: CustomerProfileRecord | null;
  orders: CustomerOrderRecord[];
  reviews: CustomerReviewRecord[];
  loading?: boolean;
  onClose: () => void;
  onCopy: (text: string) => void;
  onSend: (phone: string) => void;
  initialTab?: "profile" | "orders" | "reviews";
}

type DialogTab = "profile" | "orders" | "reviews";

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const safeDate = (date?: string) => (date ? date.split("T")[0] : "-");

const getProductName = (product: any) =>
  product?.productName ||
  product?.name ||
  product?.title ||
  product?.product?.title ||
  product?.product_title ||
  "Product";

const getProductQuantity = (product: any) =>
  product?.productQuantity || product?.quantity || product?.qty || 1;

const getProductPrice = (product: any) =>
  Number(product?.productPrice || product?.price || product?.salePrice || 0);

const RatingStars = ({ rating = 0 }: { rating?: number }) => {
  const rounded = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="whitespace-nowrap text-amber-500">
      {"★".repeat(rounded)}
      <span className="text-slate-300 dark:text-white/20">
        {"★".repeat(5 - rounded)}
      </span>
    </span>
  );
};

const InfoTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string | number;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <p className="mt-2 break-words text-sm font-semibold text-neutral-950 dark:text-white">
      {value || "-"}
    </p>
  </div>
);

const CustomerDetailsDialog = ({
  open,
  customer,
  orders,
  reviews,
  loading,
  onClose,
  onCopy,
  onSend,
  initialTab = "profile",
}: CustomerDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState<DialogTab>(initialTab);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  if (!customer) return null;

  const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:h-auto sm:max-h-[88vh] sm:max-w-5xl sm:rounded-3xl"
          >
            <div className="border-b border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-3 text-white shadow-lg shadow-cyan-500/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                      Customer Profile
                    </p>
                    <h3 className="truncate text-lg font-bold text-neutral-950 dark:text-white sm:text-2xl">
                      {customer.company_name || customer.contact_name || "Customer"}
                    </h3>
                    <p className="truncate text-xs text-slate-500 dark:text-white/50 sm:text-sm">
                      {customer.email || customer.phone || "No contact details"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
                  aria-label="Close customer details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {([
                  ["profile", "Profile", User],
                  ["orders", `Orders (${orders.length})`, ShoppingBag],
                  ["reviews", `Reviews (${reviews.length})`, Star],
                ] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      activeTab === id
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "border border-slate-200 bg-white text-slate-600 hover:text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
              {loading && (
                <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                  Loading latest orders and reviews…
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoTile icon={ShoppingBag} label="Orders" value={orders.length} />
                    <InfoTile icon={Star} label="Reviews" value={reviews.length} />
                    <InfoTile icon={Package} label="Total Spent" value={formatINR(totalSpent)} />
                    <InfoTile icon={CheckCircle2} label="Status" value={customer.status || "-"} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoTile icon={User} label="Name" value={customer.contact_name || customer.company_name || "-"} />
                    <InfoTile icon={Phone} label="Phone" value={customer.phone || "-"} />
                    <InfoTile icon={Mail} label="Email" value={customer.email || "-"} />
                    <InfoTile icon={Calendar} label="Created" value={safeDate(customer.created_at)} />
                    <div className="sm:col-span-2">
                      <InfoTile icon={MapPin} label="Address" value={customer.address || "-"} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">
                      No orders found for this customer.
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
                              Order ID
                            </p>
                            <p className="mt-1 break-all text-sm font-bold text-neutral-950 dark:text-white">
                              {order.order_no || order.id}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                              {safeDate(order.date)} · {order.status || "Status not available"}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
                              {formatINR(order.total_amount || 0)}
                            </p>
                            {order.payment_status && (
                              <p className="text-xs text-slate-500 dark:text-white/50">
                                {order.payment_status}
                              </p>
                            )}
                          </div>
                        </div>

                        {Array.isArray(order.products) && order.products.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-black/10">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
                              Products
                            </p>
                            <div className="space-y-2">
                              {order.products.map((product, index) => (
                                <div
                                  key={`${order.id}-product-${index}`}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <span className="font-medium text-neutral-950 dark:text-white">
                                    {getProductName(product)} × {getProductQuantity(product)}
                                  </span>
                                  <span className="text-slate-500 dark:text-white/50">
                                    {formatINR(getProductPrice(product))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => onCopy(order.order_no || order.id)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-neutral-950 dark:border-white/10 dark:text-white/60 dark:hover:text-white"
                          >
                            <Copy className="mr-1 inline h-3.5 w-3.5" /> Copy Order ID
                          </button>
                          {customer.phone && (
                            <button
                              onClick={() => onSend(customer.phone!)}
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400"
                            >
                              <MessageCircle className="mr-1 inline h-3.5 w-3.5" /> WhatsApp Customer
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-white/40">
                      No reviews from this customer yet.
                    </div>
                  ) : (
                    reviews.map((review) => {
                      const isLong = (review.comment || "").length > 180;
                      const expanded = expandedReviews[review.id];
                      const comment = review.comment || "No review text provided.";
                      return (
                        <div
                          key={review.id}
                          className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-neutral-950 dark:text-white">
                                {review.productName || review.productId || "Product"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                                {safeDate(review.created_at)}
                              </p>
                            </div>
                            <RatingStars rating={review.rating} />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/65">
                            {isLong && !expanded ? `${comment.slice(0, 180)}...` : comment}
                          </p>
                          {isLong && (
                            <button
                              onClick={() =>
                                setExpandedReviews((previous) => ({
                                  ...previous,
                                  [review.id]: !expanded,
                                }))
                              }
                              className="mt-2 text-xs font-semibold text-sky-600 dark:text-sky-300"
                            >
                              {expanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomerDetailsDialog;
