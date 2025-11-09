import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Send,
} from 'lucide-react';

interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  gst: boolean;
  po: boolean;
  quotation: boolean;
  gst_name: string | null;
  gst_no: string | null;
  gst_phone: string | null;
  gst_email: string | null;
  gst_address: string | null;
  products: Product[];
  delivered_by: string | null;
  delivery_date: string | null;
  paid_status: string;
  payment_type: string;
  aquakart_online_user: boolean;
  aquakart_invoice: boolean;
  total_amount: number;
  created_at: string;
}

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    invoice_no: '',
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    gst: false,
    po: false,
    quotation: false,
    gst_name: '',
    gst_no: '',
    gst_phone: '',
    gst_email: '',
    gst_address: '',
    products: [] as Product[],
    delivered_by: '',
    delivery_date: '',
    paid_status: 'unpaid',
    payment_type: 'cash',
    aquakart_online_user: false,
    aquakart_invoice: false,
  });

  const [productForm, setProductForm] = useState({
    productName: '',
    productQuantity: 1,
    productPrice: 0,
    productSerialNo: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
    setLoading(false);
  };

  const calculateTotal = (products: Product[]) => {
    return products.reduce((sum, product) => sum + product.productPrice * product.productQuantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const total = calculateTotal(formData.products);

    const invoiceData = {
      ...formData,
      total_amount: total,
      user_id: user?.id,
    };

    if (editingInvoice) {
      const { error } = await supabase
        .from('invoices')
        .update({ ...invoiceData, updated_at: new Date().toISOString() })
        .eq('id', editingInvoice.id);

      if (!error) {
        fetchInvoices();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('invoices').insert([invoiceData]);

      if (!error) {
        fetchInvoices();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const { error } = await supabase.from('invoices').delete().eq('id', id);

      if (!error) {
        fetchInvoices();
      }
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_no: invoice.invoice_no,
      date: invoice.date,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email,
      customer_address: invoice.customer_address,
      gst: invoice.gst,
      po: invoice.po,
      quotation: invoice.quotation,
      gst_name: invoice.gst_name || '',
      gst_no: invoice.gst_no || '',
      gst_phone: invoice.gst_phone || '',
      gst_email: invoice.gst_email || '',
      gst_address: invoice.gst_address || '',
      products: invoice.products,
      delivered_by: invoice.delivered_by || '',
      delivery_date: invoice.delivery_date || '',
      paid_status: invoice.paid_status,
      payment_type: invoice.payment_type,
      aquakart_online_user: invoice.aquakart_online_user,
      aquakart_invoice: invoice.aquakart_invoice,
    });
    setShowModal(true);
  };

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const addProduct = () => {
    if (productForm.productName && productForm.productPrice > 0) {
      setFormData({
        ...formData,
        products: [...formData.products, { ...productForm }],
      });
      setProductForm({
        productName: '',
        productQuantity: 1,
        productPrice: 0,
        productSerialNo: '',
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
      invoice_no: '',
      date: new Date().toISOString().split('T')[0],
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      customer_address: '',
      gst: false,
      po: false,
      quotation: false,
      gst_name: '',
      gst_no: '',
      gst_phone: '',
      gst_email: '',
      gst_address: '',
      products: [],
      delivered_by: '',
      delivery_date: '',
      paid_status: 'unpaid',
      payment_type: 'cash',
      aquakart_online_user: false,
      aquakart_invoice: false,
    });
    setEditingInvoice(null);
    setShowModal(false);
  };

  const statusColors = {
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    unpaid: 'bg-red-100 text-red-800',
  };

  const statusIcons = {
    paid: CheckCircle,
    partial: Clock,
    unpaid: XCircle,
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
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
          <p className="text-slate-600 mt-1">Manage customer invoices and billing</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Create Invoice
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {invoices.map((invoice, index) => {
            const StatusIcon = statusIcons[invoice.paid_status as keyof typeof statusIcons];
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-3 rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-slate-900">{invoice.invoice_no}</h3>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                            statusColors[invoice.paid_status as keyof typeof statusColors]
                          }`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {invoice.paid_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-4 h-4" />
                          <span>{invoice.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          <span>{invoice.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(invoice.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                          <DollarSign className="w-4 h-4" />
                          <span>₹{invoice.total_amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Package className="w-4 h-4" />
                        <span>{invoice.products.length} product(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleView(invoice)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => alert('Invoice sent to ' + invoice.customer_email)}
                      className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEdit(invoice)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {invoices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
          <p className="text-slate-600">Create your first invoice to get started</p>
        </motion.div>
      )}

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
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={formData.invoice_no}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_name: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_phone: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_email: e.target.value })
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
                          setFormData({ ...formData, customer_address: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Products</h4>
                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={productForm.productName}
                      onChange={(e) =>
                        setProductForm({ ...productForm, productName: e.target.value })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
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
                    <input
                      type="text"
                      placeholder="Serial No (optional)"
                      value={productForm.productSerialNo}
                      onChange={(e) =>
                        setProductForm({ ...productForm, productSerialNo: e.target.value })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={addProduct}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>

                  {formData.products.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.products.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.productName}</p>
                            <p className="text-xs text-slate-600">
                              Qty: {product.productQuantity} × ₹{product.productPrice} = ₹
                              {product.productQuantity * product.productPrice}
                              {product.productSerialNo && ` | SN: ${product.productSerialNo}`}
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
                          Total: ₹{calculateTotal(formData.products).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={formData.paid_status}
                      onChange={(e) => setFormData({ ...formData, paid_status: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Type
                    </label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
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
                    {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
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
        {showViewModal && viewingInvoice && (
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
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8"
            >
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Invoice Details</h2>
                <p className="text-lg font-semibold text-blue-600">{viewingInvoice.invoice_no}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Date</p>
                    <p className="font-medium">
                      {new Date(viewingInvoice.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                        statusColors[viewingInvoice.paid_status as keyof typeof statusColors]
                      }`}
                    >
                      {viewingInvoice.paid_status}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Name</p>
                      <p className="font-medium">{viewingInvoice.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Phone</p>
                      <p className="font-medium">{viewingInvoice.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Email</p>
                      <p className="font-medium">{viewingInvoice.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Address</p>
                      <p className="font-medium">{viewingInvoice.customer_address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Products</h4>
                  <div className="space-y-2">
                    {viewingInvoice.products.map((product, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            {product.productSerialNo && (
                              <p className="text-xs text-slate-600">SN: {product.productSerialNo}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ₹{(product.productPrice * product.productQuantity).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-600">
                              {product.productQuantity} × ₹{product.productPrice}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-lg">Total Amount</p>
                        <p className="font-bold text-2xl">
                          ₹{viewingInvoice.total_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Type</p>
                    <p className="font-medium capitalize">{viewingInvoice.payment_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Status</p>
                    <p className="font-medium capitalize">{viewingInvoice.paid_status}</p>
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
    </div>
  );
}
