import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ordersService } from "../../services/apiService";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import AquaOrderDeletePromptDialog from "../modular/orders/orderDeletePromptDialog";
import {
  Plus,
  Edit2,
  Trash2,
  ShoppingCart,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Send,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  AlertCircle,
} from "lucide-react";

interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
}

interface Order {
  id: string;
  order_no: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  products: Product[];
  total_amount: number;
  status: string;
  payment_status: string;
  payment_type: string;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
}

type PaymentFilter = "all" | "pending" | "cod" | "paid";

type DeleteDialog = {
  open:boolean;
  close:boolean;
  orderId:string;
  title:string;
}

export default function OrdersTab() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [totalOrderCount, setTotalOrderCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("pending");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>()
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    order_no: "",
    date: new Date().toISOString().split("T")[0],
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    products: [] as Product[],
    orderStatus: "pending",
    payment_status: "unpaid",
    payment_type: "cash",
    delivery_date: "",
    notes: "",
  });

  const [productForm, setProductForm] = useState({
    productName: "",
    productQuantity: 1,
    productPrice: 0,
  });

  useKeyboardShortcut(
    "Escape",
    () => {
      if (showViewModal) {
        setShowViewModal(false);
        setViewingOrder(null);
      } else if (showModal) {
        resetForm();
      }
    },
    showModal || showViewModal,
  );

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, paymentFilter]);

  const filterOrders = () => {
    let filtered = orders;

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }
    if (paymentFilter === "pending") {
      filtered = filtered.filter((order) => order.payment_status === "unpaid");
    } else if (paymentFilter === "cod") {
      filtered = filtered.filter((order) => order.payment_type === "cash");
    } else if (paymentFilter === "paid") {
      filtered = filtered.filter((order) => order.payment_status === "paid");
    }
    setFilteredOrders(filtered);
  };

  const mapOrderFromApi = (o: any): Order => {
    const userInfo = o.user || {};
    const shipping = o.shippingAddress || o.billingAddress || userInfo.selectedAddress || userInfo.addresses?.[0] || {};
    const fullAddress = [shipping.street, shipping.city, shipping.state, shipping.postalCode]
      .filter(Boolean)
      .join(", ");

    const items = Array.isArray(o.items)
      ? o.items.map((item: any) => ({
          productName: item.name || item.productId?.title || "Item",
          productQuantity: Number(item.quantity || item.qty || item.count || 1),
          productPrice: Number(item.price || item.productId?.price || 0),
        }))
      : [];

    const paymentStatus = (o.paymentStatus || o.payment_status || "pending").toString().toLowerCase();

    return {
      id: o._id || o.id || o.orderId || "",
      order_no: o.orderId || o.order_no || o.orderNumber || "",
      date: o.createdAt || o.date || new Date().toISOString(),
      customer_name: userInfo.name || userInfo.fullName || userInfo.email || userInfo.phone || "Customer",
      customer_phone: (userInfo.phone || userInfo.mobile || "")?.toString?.() || "",
      customer_email: userInfo.email || "",
      customer_address: fullAddress || "—",
      products: items,
      total_amount: Number(o.totalAmount || o.total || 0),
      status: (o.orderStatus || o.status || "pending").toString().toLowerCase(),
      payment_status: paymentStatus,
      payment_type: o.paymentMethod || o.payment_type || "cash",
      delivery_date: o.estimatedDelivery || o.delivery_date || null,
      notes: o.notes || "",
      created_at: o.createdAt || o.date || new Date().toISOString(),
    };
  };

  const fetchOrders = async () => {
    const { data, error } = (await ordersService.getAll()) as { data?: { orders?: any[]; count?: number } | null; error: any };
    if (!error && data) {
      console.log("Fetched Orders:", data);
      const mapped = data?.data?.map(mapOrderFromApi);
      
      setOrders(mapped);
      setTotalOrderCount(data.count ?? mapped.length);
    }
    setLoading(false);
  };

  const calculateTotal = (products: Product[]) => {
    return products.reduce(
      (sum, product) => sum + product.productPrice * product.productQuantity,
      0,
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const total = calculateTotal(formData.products);

    const orderData = {
      ...formData,
      total_amount: total,
      user_id: user?.id,
    };

    try {
      if (editingOrder) {
        const { error } = await ordersService.update(
          editingOrder.id,
          orderData,
        );

        if (error) throw error;

        showToast("Order updated successfully", "success");
        fetchOrders();
        resetForm();
      } else {
        const { error } = await ordersService.create(orderData);

        if (error) throw error;

        showToast("Order created successfully", "success");
        fetchOrders();
        resetForm();
      }
    } catch (error) {
      showToast("Failed to save order", "error");
    }
  };

  const handleDeleteDialog = (id: string) => {
    setDeleteDialog({open:true, close:false, orderId:id, title:`Are you sure you want to delete this order bearing order Id ${id}?`})
  };
  
  const handleDeleteConfirm =async() => {
       try {
        const { error } = await ordersService.delete(deleteDialog?.orderId || "");

        if (error) throw error;

        showToast("Order deleted successfully", "success");
        fetchOrders();
        setDeleteDialog({open:false, close:true, orderId:""})
      } catch (error) {
        showToast("Failed to delete order", "error");
      }
  }

  const handleNoClick = () => {
    setDeleteDialog({open:false, close:true, orderId:"", title:""})
  }

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      order_no: order.order_no,
      date: order.date,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      customer_address: order.customer_address,
      products: order.products,
      orderStatus: order.status,
      payment_status: order.payment_status,
      payment_type: order.payment_type,
      delivery_date: order.delivery_date || "",
      notes: order.notes || "",
    });
    setShowModal(true);
  };

  const handleView = (order: Order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const addProduct = () => {
    if (productForm.productName && productForm.productPrice > 0) {
      setFormData({
        ...formData,
        products: [...formData.products, { ...productForm }],
      });
      setProductForm({
        productName: "",
        productQuantity: 1,
        productPrice: 0,
      });
    }
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      order_no: "",
      date: new Date().toISOString().split("T")[0],
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_address: "",
      products: [],
      status: "pending",
      payment_status: "unpaid",
      payment_type: "cash",
      delivery_date: "",
      notes: "",
    });
    setProductForm({
      productName: "",
      productQuantity: 1,
      productPrice: 0,
    });
    setEditingOrder(null);
    setShowModal(false);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    pending: Clock,
    processing: AlertCircle,
    shipped: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
  };

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "—";

  const formatCurrency = (value: number) =>
    `₹${(Number(value) || 0).toLocaleString()}`;

  const orderTableColumns: AquaTableColumn<Order>[] = [
    { key: "order_no", header: "Order Id" },
    {
      key: "date",
      header: "Date",
      render: (row) => formatDate(row.date),
    },
    { key: "customer_name", header: "Customer" },
    { key: "customer_phone", header: "Phone" },
    {
      key: "payment_type",
      header: "Payment",
      render: (row) =>
        `${row.payment_type || "—"} / ${row.payment_status || "pending"}`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="capitalize">
          {row.status}
        </span>
      ),
    },
    {
      key: "total_amount",
      header: "Amount",
      className: "text-right font-semibold text-green-600 whitespace-nowrap",
      render: (row) => formatCurrency(row.total_amount),
    },
  ];

  const totalValue = filteredOrders.reduce(
    (sum, order) => sum + order.total_amount,
    0,
  );
  const totalOrders = filteredOrders.length;
  const displayedOrderCount = totalOrderCount || totalOrders;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-600 mt-1">
            Manage customer orders and tracking
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Create Order</span>
        </motion.button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl mb-6">
        <div className="border-b border-slate-200">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-slate-600 uppercase">
              Payment Status
            </p>
          </div>
          <nav className="flex overflow-x-auto scrollbar-hide border-b border-slate-200 relative">
            {[
              { id: "pending", label: "Pending" },
              { id: "cod", label: "COD" },
              { id: "paid", label: "Paid" },
              { id: "all", label: "All" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setPaymentFilter(filter.id as PaymentFilter)}
                className={`flex-shrink-0 py-3 px-4 text-sm font-medium transition-all duration-300 relative ${
                  paymentFilter === filter.id
                    ? "text-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                {paymentFilter === filter.id && (
                  <motion.div
                    layoutId="paymentFilterUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-600"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
        <div>
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-slate-600 uppercase">
              Order Status
            </p>
          </div>
          <nav className="flex overflow-x-auto scrollbar-hide relative">
            {[
              "all",
              "pending",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
            ].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-shrink-0 py-3 px-4 text-sm font-medium transition-all duration-300 relative ${
                  statusFilter === status
                    ? "text-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {statusFilter === status && (
                  <motion.div
                    layoutId="statusFilterUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-600"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-slate-900">
              ₹{totalValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900">{displayedOrderCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
       

        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No orders found
            </h3>
            <p className="text-slate-600">
              {statusFilter === "all"
                ? "Create your first order to get started"
                : `No ${statusFilter} orders`}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const StatusIcon =
              statusIcons[order.status as keyof typeof statusIcons];
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-3">
                      <ShoppingCart className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">
                          {order.order_no}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {new Date(order.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="ml-7 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4" />
                        <span>{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{order.customer_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                            statusColors[
                              order.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-bold text-green-600">
                      ₹{order.total_amount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="capitalize">{order.payment_type}</span>
                      <span className="text-xs">•</span>
                      <span
                        className={`capitalize ${order.payment_status === "paid" ? "text-green-600 font-medium" : "text-orange-600 font-medium"}`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 mt-3">
                  <p className="text-sm text-slate-600 mb-2">
                    {order.products.length} item
                    {order.products.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleView(order)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                      <button
                      onClick={() => handleEdit(order)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-green-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Package className="w-4 h-4" />
                      <span>Create Invoice</span>
                    </button>
                     <button
                      onClick={() => handleEdit(order)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                    <button
                      onClick={() => handleEdit(order)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDialog(order.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingOrder ? "Edit Order" : "Create New Order"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Order Number
                    </label>
                    <input
                      type="text"
                      value={formData.order_no}
                      onChange={(e) =>
                        setFormData({ ...formData, order_no: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Customer Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_phone: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_email: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.customer_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_address: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Products
                  </h4>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={productForm.productName}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          productName: e.target.value,
                        })
                      }
                      className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={productForm.productQuantity}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          productQuantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={productForm.productPrice}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          productPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium mb-3"
                  >
                    Add Product
                  </button>

                  {formData.products.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.products.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {product.productName}
                            </p>
                            <p className="text-xs text-slate-600">
                              Qty: {product.productQuantity} × ₹
                              {product.productPrice} = ₹
                              {product.productQuantity * product.productPrice}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-bold text-slate-900">
                          Total: ₹
                          {calculateTotal(formData.products).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.orderStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, orderStatus: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_status: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
                  >
                    {editingOrder ? "Update Order" : "Create Order"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
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
        {showViewModal && viewingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                  Order Details
                </h2>
                <p className="text-lg font-semibold text-blue-600">
                  {viewingOrder.order_no}
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Date</p>
                    <p className="font-medium">
                      {new Date(viewingOrder.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                        statusColors[
                          viewingOrder.status as keyof typeof statusColors
                        ]
                      }`}
                    >
                      {viewingOrder.status}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Name</p>
                      <p className="font-medium">
                        {viewingOrder.customer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Phone</p>
                      <p className="font-medium">
                        {viewingOrder.customer_phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Email</p>
                      <p className="font-medium">
                        {viewingOrder.customer_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Address</p>
                      <p className="font-medium">
                        {viewingOrder.customer_address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Products
                  </h4>
                  <div className="space-y-2">
                    {viewingOrder.products.map((product, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{product.productName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ₹
                              {(
                                product.productPrice * product.productQuantity
                              ).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-600">
                              {product.productQuantity} × ₹
                              {product.productPrice}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-lg">Total Amount</p>
                        <p className="font-bold text-2xl">
                          ₹{viewingOrder.total_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Payment Status
                    </p>
                    <p className="font-medium capitalize">
                      {viewingOrder.payment_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Type</p>
                    <p className="font-medium capitalize">
                      {viewingOrder.payment_type}
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowViewModal(false)}
                className="w-full mt-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    
    <AquaOrderDeletePromptDialog
      open={deleteDialog?.open}
      title={deleteDialog?.title || ""}
      message={deleteDialog?.message || ""}
      yesClick={()=>handleDeleteConfirm()}
      noClick={handleNoClick}
    />
    
    </div>
  );
}
