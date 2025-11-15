import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  Printer,
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

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      setInvoice(data);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-slate-600">The invoice you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-center">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Printer className="w-5 h-5" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none"
        >
          <div className="p-6 sm:p-8 md:p-12">
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img src="/aquakart.png" alt="Aquakart" className="w-12 h-12 sm:w-16 sm:h-16" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Aquakart</h1>
                  <p className="text-sm text-slate-600">Water Solutions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Invoice Number</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900">{invoice.invoice_no}</p>
                <p className="text-sm text-slate-600 mt-2">
                  {new Date(invoice.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Bill To</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">{invoice.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p className="text-slate-700">{invoice.customer_phone}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p className="text-slate-700">{invoice.customer_email}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p className="text-slate-700">{invoice.customer_address}</p>
                  </div>
                </div>
              </div>

              {invoice.gst && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">GST Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
                      <p className="font-medium text-slate-900">{invoice.gst_name}</p>
                    </div>
                    <p className="text-sm text-slate-700">GST No: {invoice.gst_no}</p>
                    {invoice.gst_phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                        <p className="text-slate-700">{invoice.gst_phone}</p>
                      </div>
                    )}
                    {invoice.gst_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                        <p className="text-slate-700">{invoice.gst_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Product</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.products.map((product, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{product.productName}</p>
                          {product.productSerialNo && (
                            <p className="text-xs text-slate-600">SN: {product.productSerialNo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">{product.productQuantity}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{product.productPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          ₹{(product.productQuantity * product.productPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-full md:w-64">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-900">₹{invoice.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="text-xl font-bold text-slate-900">₹{invoice.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-1">Payment Status</p>
                <p className="font-medium text-slate-900 capitalize">{invoice.paid_status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Payment Type</p>
                <p className="font-medium text-slate-900 capitalize">{invoice.payment_type}</p>
              </div>
              {invoice.delivered_by && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Delivered By</p>
                  <p className="font-medium text-slate-900">{invoice.delivered_by}</p>
                </div>
              )}
              {invoice.delivery_date && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Delivery Date</p>
                  <p className="font-medium text-slate-900">
                    {new Date(invoice.delivery_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
