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
  paid: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  unpaid: "bg-rose-100 text-rose-800",
};

const AquaInvoiceViewDialog = ({
  showModal,
  viewingInvoice,
  setModal,
}: AquaInvoiceViewDialogProps) => {
  if (!viewingInvoice) return null;

  const badgeClass =
    statusMeta[viewingInvoice.paid_status as keyof typeof statusMeta] ||
    "bg-slate-100 text-slate-700";

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border border-slate-100"
          >
            <div className="flex flex-col items-center gap-2 mb-8">
              <span className="inline-flex px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase rounded-full bg-slate-100 text-slate-600">
                Invoice
              </span>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                {viewingInvoice.invoice_no}
              </h2>
              <p className="text-sm text-slate-600">
                Issued on {dateUtils.formatDate(viewingInvoice.date)}
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </p>
                  <p className="font-medium text-slate-900">
                    {dateUtils.formatDate(viewingInvoice.date)}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${badgeClass}`}
                  >
                    {viewingInvoice.paid_status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Name
                    </p>
                    <p className="font-medium">
                      {viewingInvoice.customer_name}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Phone
                    </p>
                    <p className="font-medium">
                      {viewingInvoice.customer_phone}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Email
                    </p>
                    <p className="font-medium break-words">
                      {viewingInvoice.customer_email}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Address
                    </p>
                    <p className="font-medium break-words">
                      {viewingInvoice.customer_address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">Products</h4>
                <div className="space-y-2">
                  {viewingInvoice.products.map((product, index) => (
                    <div
                      key={index}
                      className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-xs text-slate-600">
                            Qty: {product.productQuantity}
                          </p>
                          {product.productSerialNo && (
                            <p className="text-xs text-slate-600">
                              SN: {product.productSerialNo}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-medium">
                            Base:{" "}
                            {formatAmount(
                              priceUtils.getBasePrice(product.productPrice),
                            )}
                          </p>
                          <p className="font-medium">
                            GST:{" "}
                            {formatAmount(
                              priceUtils.getGSTValue(product.productPrice),
                            )}
                          </p>
                          <p className="font-medium">
                            Total:{" "}
                            {formatAmount(
                              product.productPrice * product.productQuantity,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-lg">Total Amount</p>
                      <p className="font-bold text-2xl">
                        {formatAmount(Number(viewingInvoice.total_amount) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Payment Type</p>
                  <p className="font-medium capitalize">
                    {viewingInvoice.payment_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Payment Status</p>
                  <p className="font-medium capitalize">
                    {viewingInvoice.paid_status}
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setModal(false)}
              className="w-full mt-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AquaInvoiceViewDialog;
