import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Mail,
  MapPin,
  Package,
  Phone,
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
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
  LiquidInput,
  LiquidPanel,
} from "../ui/liquid";
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

const statusOptions = [
  { label: "All Status", value: "" },
  ...orderStatuses.map((status) => ({ label: labelize(status), value: status })),
];

const paymentOptions = [
  { label: "All Payments", value: "" },
  ...paymentStatuses.map((status) => ({ label: labelize(status), value: status })),
];

const orderStatusOptions = orderStatuses.map((status) => ({
  label: labelize(status),
  value: status,
}));

function formatCurrency(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function labelize(value?: string) {
  return (value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
        <div className="flex flex-wrap gap-2">
          {[
            { id: "today", label: "Today" },
            { id: "tomorrow", label: "Tomorrow" },
            { id: "all", label: "All" },
            { id: "date", label: "Date Wise" },
          ].map((tab) => (
            <LiquidButton
              key={tab.id}
              onClick={() => setView(tab.id as OrdersView)}
              variant={view === tab.id ? "primary" : "soft"}
            >
              {tab.label}
            </LiquidButton>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <LiquidInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fetchOrders();
              }}
              placeholder="Search order, customer, phone, product..."
              className="pl-10"
            />
          </div>

          {view === "date" && (
            <LiquidInput
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          )}

          <LiquidDropdown
            value={statusFilter}
            options={statusOptions}
            onChange={setStatusFilter}
            placeholder="All Status"
          />

          <LiquidDropdown
            value={paymentFilter}
            options={paymentOptions}
            onChange={setPaymentFilter}
            placeholder="All Payments"
          />
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
          <LiquidPanel className="p-4 text-right">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-neutral-950 dark:text-white">
              {formatCurrency(order.grandTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-white/50">
              {quantityTotal} qty • {order.products.length} item(s)
            </p>
          </LiquidPanel>

          <LiquidDropdown
            value={order.orderStatus || "processing"}
            options={orderStatusOptions}
            onChange={(nextStatus) =>
              onStatusChange(
                order,
                nextStatus as NonNullable<CRMOrderPayload["orderStatus"]>,
              )
            }
            placeholder="Order Status"
          />

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
            <LiquidButton
              onClick={() => onCreateInvoice(order)}
              disabled={creatingInvoiceId === order._id}
              variant="primary"
            >
              <FileText className="w-4 h-4" />
              {creatingInvoiceId === order._id ? "Creating..." : "Create Invoice"}
            </LiquidButton>
          )}

          <LiquidButton onClick={onView} variant="soft">
            <Eye className="w-4 h-4" />
            View Details
          </LiquidButton>
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
    <LiquidPanel className="mt-4 overflow-hidden">
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
    </LiquidPanel>
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-3 sm:p-6 backdrop-blur-xl"
      onMouseDown={onClose}
      role="presentation"
    >
      <motion.section
        initial={{ scale: 0.94, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 18 }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
        onMouseDown={(event) => event.stopPropagation()}
        className="liquid-panel flex h-[min(88vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border-white/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/70 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="order-details-title"
                  className="truncate text-xl font-black text-neutral-950 dark:text-white sm:text-2xl"
                >
                  {order.orderNumber}
                </h3>
                {invoiceReady && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                    <FileText className="h-3.5 w-3.5" />
                    Invoice Created
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
                {order.customer.name || "Customer"} • {order.customer.phone || "No phone"}
              </p>
            </div>
            <LiquidIconButton onClick={onClose} aria-label="Close order details">
              <X className="h-5 w-5" />
            </LiquidIconButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <LiquidPanel className="p-4">
                <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Customer Details
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoCard icon={User} label="Name" value={order.customer.name || "—"} />
                  <InfoCard icon={Phone} label="Phone" value={order.customer.phone || "—"} />
                  <InfoCard icon={Mail} label="Email" value={order.customer.email || "—"} />
                  <InfoCard icon={MapPin} label="City / Pincode" value={`${order.customer.city || "—"} ${order.customer.pincode || ""}`} />
                </div>
                <div className="mt-3">
                  <InfoCard icon={MapPin} label="Address" value={order.customer.address || "—"} />
                </div>
              </LiquidPanel>

              <LiquidPanel className="p-4">
                <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Ordered Products
                </h4>
                <ProductRows products={order.products} />
              </LiquidPanel>
            </div>

            <div className="space-y-4">
              <LiquidPanel className="p-4">
                <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Order Summary
                </h4>
                <div className="space-y-3">
                  <Detail label="Order Date" value={formatDate(order.orderDate)} />
                  <Detail label="Delivery Date" value={formatDate(order.deliveryDate)} />
                  <Detail label="Order Status" value={labelize(order.orderStatus)} />
                  <Detail label="Payment Status" value={labelize(order.paymentStatus)} />
                </div>
              </LiquidPanel>

              <LiquidPanel className="p-4">
                <div className="space-y-2">
                  <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
                  <SummaryRow label="Discount" value={formatCurrency(order.discount)} />
                  <SummaryRow label="Delivery" value={formatCurrency(order.deliveryCharge)} />
                  <div className="border-t border-slate-200/70 pt-3 dark:border-white/10">
                    <SummaryRow label="Grand Total" value={formatCurrency(order.grandTotal)} strong />
                  </div>
                </div>
              </LiquidPanel>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200/60 bg-white/70 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            {invoiceReady ? (
              <a
                href={order.invoiceUrl || `https://admin.aquakart.co.in/invoice/${order.invoiceId}`}
                target="_blank"
                rel="noreferrer"
                className="liquid-button liquid-button-primary flex-1"
              >
                <ExternalLink className="h-4 w-4" />
                Open Created Invoice
              </a>
            ) : (
              <LiquidButton
                onClick={() => onCreateInvoice(order)}
                disabled={creatingInvoiceId === order._id}
                variant="primary"
                className="flex-1"
              >
                <FileText className="h-4 w-4" />
                {creatingInvoiceId === order._id ? "Creating Invoice..." : "Create Invoice From Order"}
              </LiquidButton>
            )}
            <LiquidButton onClick={onClose} variant="soft" className="flex-1 sm:flex-none">
              Close
            </LiquidButton>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );

  return createPortal(modal, document.body);
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

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/50">
        <Icon className="h-3.5 w-3.5 text-blue-500" />
        {label}
      </div>
      <p className="break-words text-sm font-semibold text-neutral-950 dark:text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${strong ? "font-black text-neutral-950 dark:text-white" : "font-semibold text-slate-500 dark:text-white/60"}`}>
        {label}
      </span>
      <span className={`text-right ${strong ? "text-2xl font-black text-emerald-600 dark:text-emerald-300" : "font-bold text-neutral-950 dark:text-white"}`}>
        {value}
      </span>
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
