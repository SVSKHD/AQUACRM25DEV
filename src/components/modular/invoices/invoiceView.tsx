import { AnimatePresence, motion } from "framer-motion";
import { Invoice } from "./invoice.types";
import priceUtils from "../../../utils/priceUtils";
import dateUtils from "../../../utils/dateUtils";

interface AquaInvoiceViewDialogProps {
  showModal: boolean;
  viewingInvoice: Invoice | null;
  setModal: (value: boolean) => void;
}

const formatAmount = (value: number) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value)
    : "₹0";

const statusMeta: Record<string, string> = {
  paid: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300",
  partial:
    "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300",
  unpaid: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300",
};

const AquaInvoiceViewDialog = ({
  showModal,
  viewingInvoice,
  setModal,
}: AquaInvoiceViewDialogProps) => {
  if (!viewingInvoice) return null;

  const badgeClass =
    statusMeta[viewingInvoice.paid_status as keyof typeof statusMeta] ||
    "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70";

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4 sm:p-6"
          onClick={() => setModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border-white/20 dark:border-white/5"
          >
            {/* Sticky Header */}
            <div className="px-8 py-6 border-b border-gray-400 dark:border-white/10 flex-shrink-0 text-center">
              <span className="inline-flex px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
                Invoice Details
              </span>
              <h2 className="text-3xl font-bold text-neutral-950 dark:text-white tracking-tight">
                {viewingInvoice.invoice_no}
              </h2>
              <p className="text-sm text-black dark:text-white/60">
                Issued on {dateUtils.formatDate(viewingInvoice.date)}
              </p>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
                      Date
                    </p>
                    <p className="font-semibold text-neutral-950 dark:text-white">
                      {dateUtils.formatDate(viewingInvoice.date)}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
                      Payment Status
                    </p>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${badgeClass}`}
                    >
                      {viewingInvoice.paid_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-400 dark:border-white/10 pt-6">
                  <h4 className="font-semibold text-neutral-950 dark:text-white mb-4">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40 mb-1">
                        Name
                      </p>
                      <p className="font-semibold text-neutral-950 dark:text-white">
                        {viewingInvoice.customer_name}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40 mb-1">
                        Phone
                      </p>
                      <p className="font-semibold text-neutral-950 dark:text-white">
                        {viewingInvoice.customer_phone}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40 mb-1">
                        Email
                      </p>
                      <p className="font-semibold text-neutral-950 dark:text-white break-words">
                        {viewingInvoice.customer_email || "N/A"}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40 mb-1">
                        Address
                      </p>
                      <p className="font-semibold text-neutral-950 dark:text-white break-words">
                        {viewingInvoice.customer_address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-400 dark:border-white/10 pt-6">
                  <h4 className="font-semibold text-neutral-950 dark:text-white mb-4">
                    Products
                  </h4>
                  <div className="space-y-3">
                    {viewingInvoice.products.map((product, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-bold text-neutral-950 dark:text-white">
                              {product.productName}
                            </p>
                            <p className="text-sm text-black dark:text-white/60 mt-1">
                              Quantity:{" "}
                              <span className="font-medium text-neutral-950 dark:text-white">
                                {product.productQuantity}
                              </span>
                            </p>
                            {product.productSerialNo && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 bg-blue-500/10 inline-block px-2 py-0.5 rounded-md">
                                SN: {product.productSerialNo}
                              </p>
                            )}
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <p className="text-xs text-slate-500 dark:text-white/40">
                              Item Total
                            </p>
                            <p className="font-bold text-neutral-950 dark:text-white text-lg">
                              {formatAmount(
                                product.productPrice * product.productQuantity,
                              )}
                            </p>
                            <div className="text-[10px] text-slate-400 dark:text-white/30 flex gap-2">
                              <span>
                                Base:{" "}
                                {formatAmount(
                                  priceUtils.getBasePrice(product.productPrice),
                                )}
                              </span>
                              <span>
                                GST:{" "}
                                {formatAmount(
                                  priceUtils.getGSTValue(product.productPrice),
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 text-white p-6 rounded-2xl shadow-xl shadow-blue-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">
                            Grand Total
                          </p>
                          <p className="text-3xl font-bold tracking-tight">
                            {formatAmount(
                              Number(viewingInvoice.total_amount) || 0,
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-100 text-xs font-medium uppercase mb-1">
                            Currency
                          </p>
                          <p className="text-xl font-bold">INR</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-400 dark:border-white/10 pt-6">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40 mb-1">
                      Payment Method
                    </p>
                    <p className="font-bold text-neutral-950 dark:text-white capitalize">
                      {viewingInvoice.payment_type || "N/A"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40 mb-1">
                      Reference
                    </p>
                    <p className="font-bold text-neutral-950 dark:text-white capitalize">
                      {viewingInvoice.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-8 py-6 border-t border-gray-400 dark:border-white/10 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setModal(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all font-bold shadow-xl"
              >
                Close Invoice
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AquaInvoiceViewDialog;
