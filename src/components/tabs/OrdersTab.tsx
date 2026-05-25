import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Package,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import {
  crmOrdersService,
  type CRMOrder,
  type CRMOrderPayload,
} from "../../services/crmOrdersService";

type OrdersView = "today" | "tomorrow" | "all" | "date";

const todayIso = () => new Date().toISOString().split("T")[0];
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const orderStatuses: NonNullable<CRMOrderPayload["orderStatus"]>[] = [
  "pending",
  "processing",
  "shipped",
  "completed",
  "delivered",
  "cancelled",
];

const paymentStatuses: NonNullable<CRMOrderPayload["paymentStatus"]>[] = [
  "pending",
  "processing",
  "paid",
  "failed",
];

const formatCurrency = (value?: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const labelize = (value?: string) =>
  (value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  shipped: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const paymentStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const statusIcon = (status?: string) => {
  if (status === "delivered" || status === "completed") return CheckCircle;
  if (status === "cancelled") return XCircle;
  if (status === "shipped") return Truck;
  return Clock;
};

export default function OrdersTab() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<CRMOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<OrdersView>("today");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<CRMOrder | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        orderStatus: statusFilter,
        paymentStatus: paymentFilter,
        limit: 100,
      };

      const response =
        view === "today"
          ? await crmOrdersService.getToday(params)
          : view === "tomorrow"
            ? await crmOrdersService.getTomorrow(params)
            : view === "date"
              ? await crmOrdersService.getAll({ ...params, date: selectedDate })
              : await crmOrdersService.getAll(params);

      if (response.error) throw new Error(response.error);
      setOrders(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch CRM orders", error);
      showToast("Failed to fetch CRM orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDate, statusFilter, paymentFilter]);

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.value += Number(order.grandTotal || 0);
        acc.pending += order.paymentStatus === "pending" ? 1 : 0;
        acc.invoiced += order.invoiceCreated || order.invoiceId ? 1 : 0;
        acc.delivered += order.orderStatus === "delivered" || order.orderStatus === "completed" ? 1 : 0;
        return acc;
      },
      { value: 0, pending: 0, delivered: 0, invoiced: 0 },
    );
  }, [orders]);

  const handleQuickStatusUpdate = async (
    order: CRMOrder,
    orderStatus: NonNullable<CRMOrderPayload["orderStatus"]>,
  ) => {
    try {
      const response = await crmOrdersService.updateStatus(order._id, {
        orderStatus,
        paymentStatus: order.paymentStatus,
      });
      if (response.error) throw new Error(response.error);
      showToast("Order status updated", "success");
      fetchOrders();
    } catch (error) {
      console.error("Failed to update order status", error);
      showToast("Failed to update order status", "error");
    }
  };

  const handleCreateInvoice = async (order: CRMOrder) => {
    if (order.invoiceUrl) {
      window.open(order.invoiceUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setCreatingInvoiceId(order._id);
    try {
      const response = await crmOrdersService.createInvoice(order._id);
      if (response.error) throw new Error(response.error);
      const invoiceUrl = response.data?.invoiceUrl;
      showToast(
        response.data?.alreadyCreated
          ? "Invoice already created for this order"
          : "Invoice created successfully",
        "success",
      );
      await fetchOrders();
      if (invoiceUrl) window.open(invoiceUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to create invoice from order", error);
      showToast("Failed to create invoice from order", "error");
    } finally {
      setCreatingInvoiceId(null);
    }
  };

  return (
    <TabInnerContent
      title="CRM Orders"
      description="Manage ecommerce orders, create invoices and open product purchase links"
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "today", label: "Today" },
              { id: "tomorrow", label: "Tomorrow" },
              { id: "all", label: "All" },
              { id: "date", label: "Date Wise" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as OrdersView)}
                className={`liquid-button ${view === tab.id ? "liquid-button-primary" : "liquid-button-soft"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fetchOrders();
              }}
              placeholder="Search order, customer, phone, product..."
              className="liquid-field pl-10"
            />
          </div>

          {view === "date" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="liquid-field"
            />
          )}

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="liquid-select"
          >
            <option value="">All Status</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="liquid-select"
          >
            <option value="">All Payments</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Orders" value={orders.length.toString()} icon={ShoppingCart} />
          <StatCard label="Value" value={formatCurrency(totals.value)} icon={Package} />
          <StatCard label="Invoiced" value={totals.invoiced.toString()} icon={FileText} />
          <StatCard label="Delivered" value={totals.delivered.toString()} icon={CheckCircle} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
              No CRM orders found
            </h3>
            <p className="text-slate-600 dark:text-white/60">
              Change filters or search to find ecommerce orders.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                creatingInvoiceId={creatingInvoiceId}
                onView={() => setViewingOrder(order)}
                onStatusChange={handleQuickStatusUpdate}
                onCreateInvoice={handleCreateInvoice}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewingOrder && (
          <OrderDetailsModal
            order={viewingOrder}
            onClose={() => setViewingOrder(null)}
            onCreateInvoice={handleCreateInvoice}
            creatingInvoiceId={creatingInvoiceId}
          />
        )}
      </AnimatePresence>
    </TabInnerContent>
  );
}

function OrderCard({
  order,
  creatingInvoiceId,
  onView,
  onStatusChange,
  onCreateInvoice,
}: {
  order: CRMOrder;
  creatingInvoiceId: string | null;
  onView: () => void;
  onStatusChange: (
    order: CRMOrder,
    orderStatus: NonNullable<CRMOrderPayload["orderStatus"]>,
  ) => void;
  onCreateInvoice: (order: CRMOrder) => void;
}) {
  const StatusIcon = statusIcon(order.orderStatus);
  const quantityTotal = order.products.reduce(
    (sum, product) => sum + Number(product.quantity || 0),
    0,
  );
  const invoiceReady = Boolean(order.invoiceId || order.invoiceCreated || order.invoiceUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 hover:shadow-2xl transition-all"
    >
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
              {order.orderNumber}
            </h3>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusStyles[order.orderStatus || "processing"] || statusStyles.processing}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {labelize(order.orderStatus)}
            </span>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${paymentStyles[order.paymentStatus || "pending"] || paymentStyles.pending}`}>
              {labelize(order.paymentStatus)}
            </span>
            {invoiceReady && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                <FileText className="w-3.5 h-3.5" />
                Invoice Created
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <InfoLine icon={CalendarDays} label="Order" value={formatDate(order.orderDate)} />
            <InfoLine icon={Truck} label="Delivery" value={formatDate(order.deliveryDate)} />
            <InfoLine icon={User} label="Customer" value={order.customer?.name || "—"} />
          </div>

          <ProductRows products={order.products} compact />
        </div>

        <div className="xl:w-72 flex flex-col gap-3">
          <div className="liquid-panel p-4 text-right">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-neutral-950 dark:text-white">
              {formatCurrency(order.grandTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-white/50">
              {quantityTotal} qty • {order.products.length} item(s)
            </p>
          </div>

          <select
            value={order.orderStatus}
            onChange={(event) =>
              onStatusChange(
                order,
                event.target.value as NonNullable<CRMOrderPayload["orderStatus"]>,
              )
            }
            className="liquid-select"
          >
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>

          {invoiceReady ? (
            <a
              href={order.invoiceUrl || `https://admin.aquakart.co.in/invoice/${order.invoiceId}`}
              target="_blank"
              rel="noreferrer"
              className="liquid-button liquid-button-primary"
            >
              <ExternalLink className="w-4 h-4" />
              Open Invoice
            </a>
          ) : (
            <button
              onClick={() => onCreateInvoice(order)}
              disabled={creatingInvoiceId === order._id}
              className="liquid-button liquid-button-primary disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              {creatingInvoiceId === order._id ? "Creating..." : "Create Invoice"}
            </button>
          )}

          <button onClick={onView} className="liquid-button liquid-button-soft">
            <Eye className="w-4 h-4" />
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProductRows({
  products,
  compact = false,
}: {
  products: CRMOrder["products"];
  compact?: boolean;
}) {
  const visibleProducts = compact ? products.slice(0, 3) : products;

  return (
    <div className="mt-4 rounded-2xl liquid-panel overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/50 uppercase">
        <span className="col-span-6">Product</span>
        <span className="col-span-2 text-right">Qty</span>
        <span className="col-span-2 text-right">Rate</span>
        <span className="col-span-2 text-right">Total</span>
      </div>
      {visibleProducts.map((product, index) => (
        <div
          key={`${product.productId || product.productName}-${index}`}
          className="grid grid-cols-12 gap-2 px-4 py-2 text-sm border-t border-slate-200/70 dark:border-white/10 text-black dark:text-white"
        >
          <span className="col-span-6 min-w-0 flex items-center gap-2">
            <span className="truncate">{product.productName}</span>
            {product.productLink && (
              <a
                href={product.productLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-blue-600 dark:text-cyan-300 hover:underline"
                title="Open product page"
              >
                <Link2 className="w-3.5 h-3.5" />
              </a>
            )}
          </span>
          <span className="col-span-2 text-right">{product.quantity}</span>
          <span className="col-span-2 text-right">{formatCurrency(product.unitPrice)}</span>
          <span className="col-span-2 text-right font-semibold">
            {formatCurrency(product.totalPrice || product.quantity * product.unitPrice)}
          </span>
        </div>
      ))}
      {compact && products.length > 3 && (
        <div className="px-4 py-2 text-xs text-slate-500 dark:text-white/50 border-t border-slate-200/70 dark:border-white/10">
          +{products.length - 3} more products
        </div>
      )}
    </div>
  );
}

function OrderDetailsModal({
  order,
  onClose,
  onCreateInvoice,
  creatingInvoiceId,
}: {
  order: CRMOrder;
  onClose: () => void;
  onCreateInvoice: (order: CRMOrder) => void;
  creatingInvoiceId: string | null;
}) {
  const invoiceReady = Boolean(order.invoiceId || order.invoiceCreated || order.invoiceUrl);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="liquid-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-bold text-neutral-950 dark:text-white">
              {order.orderNumber}
            </h3>
            <p className="text-slate-500 dark:text-white/50">
              {order.customer.name} • {order.customer.phone}
            </p>
          </div>
          <button onClick={onClose} className="liquid-icon-button self-start">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Detail label="Order Date" value={formatDate(order.orderDate)} />
          <Detail label="Delivery Date" value={formatDate(order.deliveryDate)} />
          <Detail label="Address" value={order.customer.address} />
          <Detail label="City / Pincode" value={`${order.customer.city || "—"} ${order.customer.pincode || ""}`} />
          <Detail label="Order Status" value={labelize(order.orderStatus)} />
          <Detail label="Payment Status" value={labelize(order.paymentStatus)} />
        </div>

        <ProductRows products={order.products} />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6">
          <TotalBox label="Subtotal" value={formatCurrency(order.subtotal)} />
          <TotalBox label="Discount" value={formatCurrency(order.discount)} />
          <TotalBox label="Delivery" value={formatCurrency(order.deliveryCharge)} />
          <TotalBox label="Grand Total" value={formatCurrency(order.grandTotal)} highlight />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {invoiceReady ? (
            <a
              href={order.invoiceUrl || `https://admin.aquakart.co.in/invoice/${order.invoiceId}`}
              target="_blank"
              rel="noreferrer"
              className="liquid-button liquid-button-primary flex-1"
            >
              <ExternalLink className="w-4 h-4" />
              Open Created Invoice
            </a>
          ) : (
            <button
              onClick={() => onCreateInvoice(order)}
              disabled={creatingInvoiceId === order._id}
              className="liquid-button liquid-button-primary flex-1 disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              {creatingInvoiceId === order._id ? "Creating Invoice..." : "Create Invoice From Order"}
            </button>
          )}
          <button onClick={onClose} className="liquid-button liquid-button-soft flex-1">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-950 dark:text-white">{value}</p>
        </div>
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-600 dark:text-white/60">
      <Icon className="w-4 h-4 text-blue-500" />
      <span className="font-semibold">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function TotalBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" : "bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10"}`}>
      <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase">{label}</p>
      <p className="text-xl font-bold text-neutral-950 dark:text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
      <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase mb-1">{label}</p>
      <p className="text-black dark:text-white font-semibold">{value || "—"}</p>
    </div>
  );
}
