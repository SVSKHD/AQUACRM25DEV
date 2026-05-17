import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Mail,
  User,
  Copy,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";

interface AquaInvoiceRow {
  id: string;
  invoice_no?: string;
  date?: string;
  customer_name?: string;
  customer_phone?: number | string;
  customer_email?: string;
  customer_address?: string;
  gst?: boolean;
  po?: boolean;
  gst_no?: string | null;
  products?: {
    productName: string;
    productQuantity: number;
    productPrice: number;
  }[];
  total_amount?: number;
  paid_status?: string;
  payment_type?: string;
}

interface AquaOfflineCustomerProps {
  invoices: AquaInvoiceRow[];
  onSend: (phone: string) => void;
  onEmail: (email: string) => void;
  onConvert: (invoice: AquaInvoiceRow) => void;
  onCopy: (text: string) => void;
}

const paidStatusColors: Record<string, string> = {
  paid: "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
  partial:
    "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300",
  unpaid: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300",
};

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const AquaOfflineCustomer = ({
  invoices,
  onSend,
  onEmail,
  onConvert,
  onCopy,
}: AquaOfflineCustomerProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <motion.div
      key="offline"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="overflow-x-auto"
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
            <th className="py-3 px-2 font-medium w-8"></th>
            <th className="py-3 px-4 font-medium">Invoice</th>
            <th className="py-3 px-4 font-medium">Customer</th>
            <th className="py-3 px-4 font-medium">Phone</th>
            <th className="py-3 px-4 font-medium">Email</th>
            <th className="py-3 px-4 font-medium">Address</th>
            <th className="py-3 px-4 font-medium">Total</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => {
            const isExpanded = expandedId === invoice.id;
            const phoneStr = String(invoice.customer_phone || "");
            return (
              <>
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="border-b border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-2">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : invoice.id)
                      }
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
                      <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg text-white">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-950 dark:text-white text-sm">
                          {invoice.invoice_no || invoice.id}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/60">
                          {invoice.date?.split("T")[0] || ""}
                          {invoice.gst && (
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                              GST
                            </span>
                          )}
                          {invoice.po && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              PO
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-neutral-950 dark:text-white">
                        {invoice.customer_name || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                    {phoneStr ? (
                      <div
                        className="flex items-center gap-2 group cursor-pointer"
                        onClick={() => onCopy(phoneStr)}
                        title="Copy"
                      >
                        <span>{phoneStr}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                    {invoice.customer_email || "-"}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-black dark:text-white/80 max-w-[200px] truncate"
                    title={invoice.customer_address || ""}
                  >
                    {invoice.customer_address || "-"}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatINR(invoice.total_amount || 0)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        paidStatusColors[invoice.paid_status || "unpaid"] ||
                        paidStatusColors.unpaid
                      }`}
                    >
                      {invoice.paid_status || "unpaid"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {phoneStr && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onSend(phoneStr)}
                          title="Send WhatsApp"
                          className="p-2 text-green-600 bg-green-50 dark:bg-green-500/10 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                      {invoice.customer_email && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEmail(invoice.customer_email!)}
                          title="Send Email"
                          className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onConvert(invoice)}
                        title="Convert customer to online user"
                        className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg transition-all"
                      >
                        Convert
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.tr
                      key={`${invoice.id}-detail`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]"
                    >
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/40 font-semibold mb-2">
                              Products
                            </p>
                            {invoice.products && invoice.products.length > 0 ? (
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {invoice.products.map((p, i) => (
                                  <div
                                    key={i}
                                    className="text-xs bg-white dark:bg-white/5 rounded-lg px-3 py-2 border border-slate-100 dark:border-white/5 flex justify-between"
                                  >
                                    <span className="text-neutral-950 dark:text-white">
                                      {p.productName} × {p.productQuantity}
                                    </span>
                                    <span className="text-slate-500 dark:text-white/60">
                                      {formatINR(p.productPrice)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-white/40">
                                No products on this invoice.
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/40 font-semibold mb-2">
                              Payment
                            </p>
                            <p className="text-xs text-black dark:text-white/70">
                              Type: {invoice.payment_type || "-"}
                            </p>
                            <p className="text-xs text-black dark:text-white/70">
                              Status: {invoice.paid_status || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/40 font-semibold mb-2">
                              GST / PO
                            </p>
                            <p className="text-xs text-black dark:text-white/70">
                              GST:{" "}
                              {invoice.gst ? invoice.gst_no || "yes" : "no"}
                            </p>
                            <p className="text-xs text-black dark:text-white/70">
                              PO: {invoice.po ? "yes" : "no"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </>
            );
          })}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-8 text-slate-500">
                No aquainvoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
};

export default AquaOfflineCustomer;
