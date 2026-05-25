import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Edit2,
  Eye,
  Package,
  Plus,
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
  type CRMOrderProduct,
} from "../../services/crmOrdersService";

type OrdersView = "today" | "tomorrow" | "all" | "date";

type OrderFormState = {
  orderDate: string;
  deliveryDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerPincode: string;
  customerGstNumber: string;
  products: CRMOrderProduct[];
  discount: number;
  deliveryCharge: number;
  paymentStatus: CRMOrderPayload["paymentStatus"];
  orderStatus: CRMOrderPayload["orderStatus"];
  source: CRMOrderPayload["source"];
  notes: string;
};

const todayIso = () => new Date().toISOString().split("T")[0];

const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const createEmptyForm = (): OrderFormState => ({
  orderDate: todayIso(),
  deliveryDate: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerCity: "",
  customerPincode: "",
  customerGstNumber: "",
  products: [{ productName: "", quantity: 1, unitPrice: 0 }],
  discount: 0,
  deliveryCharge: 0,
  paymentStatus: "pending",
  orderStatus: "new",
  source: "crm",
  notes: "",
});

const orderStatuses: NonNullable<CRMOrderPayload["orderStatus"]>[] = [
  "new",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const paymentStatuses: NonNullable<CRMOrderPayload["paymentStatus"]>[] = [
  "pending",
  "partial",
  "paid",
  "refunded",
];

const sources: NonNullable<CRMOrderPayload["source"]>[] = [
  "crm",
  "telegram",
  "whatsapp",
  "website",
  "manual",
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
  new: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  confirmed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  packed:
    "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  out_for_delivery:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  delivered:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const paymentStyles: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  partial:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  refunded: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
};

const statusIcon = (status?: string) => {
  if (status === "delivered") return CheckCircle;
  if (status === "cancelled") return XCircle;
  if (status === "out_for_delivery") return Truck;
  return Clock;
};

export default function OrdersTab() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<CRMOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<OrdersView>("today");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CRMOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<CRMOrder | null>(null);
  const [formData, setFormData] = useState<OrderFormState>(createEmptyForm);

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
        acc.delivered += order.orderStatus === "delivered" ? 1 : 0;
        return acc;
      },
      { value: 0, pending: 0, delivered: 0 },
    );
  }, [orders]);

  const formSubtotal = useMemo(
    () =>
      formData.products.reduce(
        (sum, product) =>
          sum + Number(product.quantity || 0) * Number(product.unitPrice || 0),
        0,
      ),
    [formData.products],
  );

  const formGrandTotal =
    formSubtotal - Number(formData.discount || 0) + Number(formData.deliveryCharge || 0);

  const updateProduct = (
    index: number,
    key: keyof CRMOrderProduct,
    value: string | number,
  ) => {
    setFormData((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, [key]: value } : product,
      ),
    }));
  };

  const addProductRow = () => {
    setFormData((current) => ({
      ...current,
      products: [
        ...current.products,
        { productName: "", quantity: 1, unitPrice: 0 },
      ],
    }));
  };

  const removeProductRow = (index: number) => {
    setFormData((current) => ({
      ...current,
      products:
        current.products.length === 1
          ? current.products
          : current.products.filter((_, productIndex) => productIndex !== index),
    }));
  };

  const buildPayload = (): CRMOrderPayload => ({
    orderDate: formData.orderDate,
    deliveryDate: formData.deliveryDate || null,
    customer: {
      name: formData.customerName,
      phone: formData.customerPhone,
      email: formData.customerEmail,
      address: formData.customerAddress,
      city: formData.customerCity,
      pincode: formData.customerPincode,
      gstNumber: formData.customerGstNumber,
    },
    products: formData.products.map((product) => ({
      productId: product.productId || null,
      productName: product.productName,
      quantity: Number(product.quantity || 1),
      unitPrice: Number(product.unitPrice || 0),
    })),
    discount: Number(formData.discount || 0),
    deliveryCharge: Number(formData.deliveryCharge || 0),
    paymentStatus: formData.paymentStatus,
    orderStatus: formData.orderStatus,
    source: formData.source,
    notes: formData.notes,
  });

  const validateForm = () => {
    if (!formData.customerName.trim()) return "Customer name is required";
    if (!formData.customerPhone.trim()) return "Customer phone is required";
    if (!formData.customerAddress.trim()) return "Customer address is required";
    if (!formData.products.length) return "At least one product is required";
    const hasInvalidProduct = formData.products.some(
      (product) => !product.productName.trim() || Number(product.quantity) <= 0,
    );
    if (hasInvalidProduct) return "Product name and valid quantity are required";
    return "";
  };

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingOrder(null);
    setShowModal(false);
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setFormData(createEmptyForm());
    setShowModal(true);
  };

  const openEditModal = (order: CRMOrder) => {
    setEditingOrder(order);
    setFormData({
      orderDate: order.orderDate?.split("T")[0] || todayIso(),
      deliveryDate: order.deliveryDate?.split("T")[0] || "",
      customerName: order.customer?.name || "",
      customerPhone: order.customer?.phone || "",
      customerEmail: order.customer?.email || "",
      customerAddress: order.customer?.address || "",
      customerCity: order.customer?.city || "",
      customerPincode: order.customer?.pincode || "",
      customerGstNumber: order.customer?.gstNumber || "",
      products:
        order.products?.length > 0
          ? order.products.map((product) => ({
              productId: product.productId || null,
              productName: product.productName,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
            }))
          : [{ productName: "", quantity: 1, unitPrice: 0 }],
      discount: Number(order.discount || 0),
      deliveryCharge: Number(order.deliveryCharge || 0),
      paymentStatus: order.paymentStatus || "pending",
      orderStatus: order.orderStatus || "new",
      source: order.source || "crm",
      notes: order.notes || "",
    });
    setShowModal(true);
  };

  const openViewModal = (order: CRMOrder) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const response = editingOrder
        ? await crmOrdersService.update(editingOrder._id, payload)
        : await crmOrdersService.create(payload);

      if (response.error) throw new Error(response.error);

      showToast(
        editingOrder ? "Order updated successfully" : "Order created successfully",
        "success",
      );
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error("Failed to save CRM order", error);
      showToast("Failed to save order", "error");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <TabInnerContent
      title="CRM Orders"
      description="Day-wise CRM orders with customer details, products, quantity and payment tracking"
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "today", label: "Today", date: todayIso() },
              { id: "tomorrow", label: "Tomorrow", date: tomorrowIso() },
              { id: "all", label: "All", date: "" },
              { id: "date", label: "Date Wise", date: selectedDate },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as OrdersView)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === tab.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white/70 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-blue-50 dark:hover:bg-white/15"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fetchOrders();
              }}
              placeholder="Search order, customer, phone, product..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {view === "date" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
          <StatCard label="Delivered" value={totals.delivered.toString()} icon={CheckCircle} />
          <StatCard label="Pending Payment" value={totals.pending.toString()} icon={Clock} />
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
              Create an order or change your filters to see day-wise orders.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => {
              const StatusIcon = statusIcon(order.orderStatus);
              const quantityTotal = order.products.reduce(
                (sum, product) => sum + Number(product.quantity || 0),
                0,
              );

              return (
                <motion.div
                  key={order._id}
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
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusStyles[order.orderStatus || "new"]}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {labelize(order.orderStatus)}
                        </span>
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${paymentStyles[order.paymentStatus || "pending"]}`}
                        >
                          {labelize(order.paymentStatus)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <InfoLine icon={CalendarDays} label="Order" value={formatDate(order.orderDate)} />
                        <InfoLine icon={Truck} label="Delivery" value={formatDate(order.deliveryDate)} />
                        <InfoLine icon={User} label="Customer" value={order.customer?.name || "—"} />
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/50 uppercase">
                          <span className="col-span-6">Product</span>
                          <span className="col-span-2 text-right">Qty</span>
                          <span className="col-span-2 text-right">Rate</span>
                          <span className="col-span-2 text-right">Total</span>
                        </div>
                        {order.products.slice(0, 3).map((product, index) => (
                          <div
                            key={`${order._id}-${index}`}
                            className="grid grid-cols-12 gap-2 px-4 py-2 text-sm border-t border-slate-200 dark:border-white/10 text-black dark:text-white"
                          >
                            <span className="col-span-6 truncate">{product.productName}</span>
                            <span className="col-span-2 text-right">{product.quantity}</span>
                            <span className="col-span-2 text-right">{formatCurrency(product.unitPrice)}</span>
                            <span className="col-span-2 text-right font-semibold">
                              {formatCurrency(product.totalPrice || product.quantity * product.unitPrice)}
                            </span>
                          </div>
                        ))}
                        {order.products.length > 3 && (
                          <div className="px-4 py-2 text-xs text-slate-500 dark:text-white/50 border-t border-slate-200 dark:border-white/10">
                            +{order.products.length - 3} more products
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="xl:w-64 flex flex-col gap-3">
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 text-right">
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
                          handleQuickStatusUpdate(
                            order,
                            event.target.value as NonNullable<CRMOrderPayload["orderStatus"]>,
                          )
                        }
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-black dark:text-white outline-none"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {labelize(status)}
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openViewModal(order)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(order)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-semibold"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-neutral-950 dark:text-white">
                    {editingOrder ? "Edit CRM Order" : "Create CRM Order"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    Use order date for today/tomorrow/day-wise grouping.
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <section>
                  <h4 className="font-bold text-neutral-950 dark:text-white mb-3">
                    Customer Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextInput label="Name *" value={formData.customerName} onChange={(value) => setFormData({ ...formData, customerName: value })} />
                    <TextInput label="Phone *" value={formData.customerPhone} onChange={(value) => setFormData({ ...formData, customerPhone: value })} />
                    <TextInput label="Email" value={formData.customerEmail} onChange={(value) => setFormData({ ...formData, customerEmail: value })} />
                    <TextInput label="Address *" value={formData.customerAddress} onChange={(value) => setFormData({ ...formData, customerAddress: value })} className="md:col-span-3" />
                    <TextInput label="City" value={formData.customerCity} onChange={(value) => setFormData({ ...formData, customerCity: value })} />
                    <TextInput label="Pincode" value={formData.customerPincode} onChange={(value) => setFormData({ ...formData, customerPincode: value })} />
                    <TextInput label="GST Number" value={formData.customerGstNumber} onChange={(value) => setFormData({ ...formData, customerGstNumber: value })} />
                  </div>
                </section>

                <section>
                  <h4 className="font-bold text-neutral-950 dark:text-white mb-3">
                    Order Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <TextInput type="date" label="Order Date *" value={formData.orderDate} onChange={(value) => setFormData({ ...formData, orderDate: value })} />
                    <TextInput type="date" label="Delivery Date" value={formData.deliveryDate} onChange={(value) => setFormData({ ...formData, deliveryDate: value })} />
                    <SelectInput label="Order Status" value={formData.orderStatus || "new"} options={orderStatuses} onChange={(value) => setFormData({ ...formData, orderStatus: value as CRMOrderPayload["orderStatus"] })} />
                    <SelectInput label="Payment Status" value={formData.paymentStatus || "pending"} options={paymentStatuses} onChange={(value) => setFormData({ ...formData, paymentStatus: value as CRMOrderPayload["paymentStatus"] })} />
                    <SelectInput label="Source" value={formData.source || "crm"} options={sources} onChange={(value) => setFormData({ ...formData, source: value as CRMOrderPayload["source"] })} />
                    <TextInput label="Notes" value={formData.notes} onChange={(value) => setFormData({ ...formData, notes: value })} className="md:col-span-3" />
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-neutral-950 dark:text-white">
                      Products
                    </h4>
                    <button
                      type="button"
                      onClick={addProductRow}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.products.map((product, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                      >
                        <TextInput label="Product Name *" value={product.productName} onChange={(value) => updateProduct(index, "productName", value)} className="md:col-span-5" />
                        <TextInput type="number" label="Quantity *" value={String(product.quantity)} onChange={(value) => updateProduct(index, "quantity", Number(value || 1))} className="md:col-span-2" />
                        <TextInput type="number" label="Unit Price" value={String(product.unitPrice)} onChange={(value) => updateProduct(index, "unitPrice", Number(value || 0))} className="md:col-span-2" />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-2">
                            Total
                          </label>
                          <div className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 text-black dark:text-white font-bold">
                            {formatCurrency(product.quantity * product.unitPrice)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProductRow(index)}
                          className="md:col-span-1 self-end p-2 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <TextInput type="number" label="Discount" value={String(formData.discount)} onChange={(value) => setFormData({ ...formData, discount: Number(value || 0) })} />
                  <TextInput type="number" label="Delivery Charge" value={String(formData.deliveryCharge)} onChange={(value) => setFormData({ ...formData, deliveryCharge: Number(value || 0) })} />
                  <TotalBox label="Subtotal" value={formatCurrency(formSubtotal)} />
                  <TotalBox label="Grand Total" value={formatCurrency(formGrandTotal)} highlight />
                </section>

                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingOrder
                        ? "Update Order"
                        : "Create Order"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/10 text-black dark:text-white font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showViewModal && viewingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-neutral-950 dark:text-white">
                    {viewingOrder.orderNumber}
                  </h3>
                  <p className="text-slate-500 dark:text-white/50">
                    {viewingOrder.customer.name} • {viewingOrder.customer.phone}
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white self-start"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Detail label="Order Date" value={formatDate(viewingOrder.orderDate)} />
                <Detail label="Delivery Date" value={formatDate(viewingOrder.deliveryDate)} />
                <Detail label="Address" value={viewingOrder.customer.address} />
                <Detail label="City / Pincode" value={`${viewingOrder.customer.city || "—"} ${viewingOrder.customer.pincode || ""}`} />
                <Detail label="Order Status" value={labelize(viewingOrder.orderStatus)} />
                <Detail label="Payment Status" value={labelize(viewingOrder.paymentStatus)} />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden mb-6">
                {viewingOrder.products.map((product, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 border-slate-200 dark:border-white/10 text-sm text-black dark:text-white"
                  >
                    <span className="col-span-6 font-semibold">{product.productName}</span>
                    <span className="col-span-2 text-right">{product.quantity}</span>
                    <span className="col-span-2 text-right">{formatCurrency(product.unitPrice)}</span>
                    <span className="col-span-2 text-right font-bold">
                      {formatCurrency(product.totalPrice || product.quantity * product.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <TotalBox label="Subtotal" value={formatCurrency(viewingOrder.subtotal)} />
                <TotalBox label="Discount" value={formatCurrency(viewingOrder.discount)} />
                <TotalBox label="Delivery" value={formatCurrency(viewingOrder.deliveryCharge)} />
                <TotalBox label="Grand Total" value={formatCurrency(viewingOrder.grandTotal)} highlight />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TabInnerContent>
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

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelize(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function TotalBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        highlight
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
          : "bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10"
      }`}
    >
      <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase">
        {label}
      </p>
      <p className="text-xl font-bold text-neutral-950 dark:text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
      <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase mb-1">
        {label}
      </p>
      <p className="text-black dark:text-white font-semibold">{value || "—"}</p>
    </div>
  );
}
