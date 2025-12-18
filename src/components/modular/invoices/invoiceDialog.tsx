import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2 } from "lucide-react";

interface AquaInvoiceFormDialogProps {
  showModal: boolean;
  onClose: () => void;
  onClear: () => void;
  editingInvoice: any | null;
  handleSubmit: (e: React.FormEvent) => void;
  formData: {
    invoice_no: string;
    date: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_address: string;
    gst: boolean;
    po: boolean;
    quotation: boolean;
    gst_name: string;
    gst_no: string;
    gst_phone: string;
    gst_email: string;
    gst_address: string;
    products: {
      productName: string;
      productQuantity: number;
      productPrice: number;
      productSerialNo?: string;
    }[];
    paid_status: string;
    payment_type: string;
    delivered_by?: string;
    delivery_date?: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  productForm: {
    productName: string;
    productQuantity: number;
    productPrice: number;
    productSerialNo?: string;
  };
  setProductForm: React.Dispatch<React.SetStateAction<any>>;
  availableProducts: {
    id: string | number;
    name: string;
    price: number;
    sku?: string | null;
  }[];
  handleProductSelect: (productName: string) => void;
  addProduct: () => void;
  editingProductIndex: number | null;
  editProduct: (index: number) => void;
  removeProduct: (index: number) => void;
  cancelEditProduct: () => void;
  isDraftDirty: boolean;
  calculateTotal: (
    products: {
      productName: string;
      productQuantity: number;
      productPrice: number;
      productSerialNo?: string;
    }[],
  ) => number;
}

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) => (
  <label className="inline-flex items-center cursor-pointer">
    {label && (
      <span className="mr-3 text-sm font-medium text-black dark:text-white/70">
        {label}
      </span>
    )}
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
    </div>
  </label>
);

const AquaInvoiceFormDialog = ({
  showModal,
  onClose,
  onClear,
  editingInvoice,
  handleSubmit,
  formData,
  setFormData,
  productForm,
  setProductForm,
  availableProducts,
  addProduct,
  editingProductIndex,
  editProduct,
  removeProduct,
  cancelEditProduct,
  calculateTotal,
  handleProductSelect,
  isDraftDirty,
}: AquaInvoiceFormDialogProps) => {
  return (
    <>
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4 sm:p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-white/20 dark:border-white/5"
            >
              {/* Sticky Header */}
              <div className="px-8 py-6 border-b border-gray-400 dark:border-white/10 flex-shrink-0">
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white">
                  {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                </h3>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                <form
                  id="invoice-form"
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Invoice Number
                      </label>
                      <input
                        type="text"
                        value={formData.invoice_no}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            invoice_no: e.target.value,
                          })
                        }
                        required
                        className="glass-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        required
                        className="glass-input w-full"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-400 dark:border-white/10 pt-4">
                    <h4 className="font-semibold text-neutral-950 dark:text-white mb-3">
                      Customer Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
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
                          className="glass-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
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
                          className="glass-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
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
                          className="glass-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                          Address
                        </label>
                        <textarea
                          value={formData.customer_address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customer_address: e.target.value,
                            })
                          }
                          required
                          className="glass-input w-full min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-400 dark:border-white/10 pt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-gray-400 dark:border-white/10">
                        <h4 className="font-semibold text-neutral-950 dark:text-white">
                          PO Details
                        </h4>
                        <Toggle
                          label="Enable PO"
                          checked={Boolean(formData.po)}
                          onChange={(checked) =>
                            setFormData({ ...formData, po: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-gray-400 dark:border-white/10">
                        <h4 className="font-semibold text-neutral-950 dark:text-white">
                          GST Details
                        </h4>
                        <Toggle
                          label="Enable GST"
                          checked={Boolean(formData.gst)}
                          onChange={(checked) =>
                            setFormData({ ...formData, gst: checked })
                          }
                        />
                      </div>
                    </div>

                    {formData.gst && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                            GST Name
                          </label>
                          <input
                            type="text"
                            value={formData.gst_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gst_name: e.target.value,
                              })
                            }
                            placeholder="Business / Legal name"
                            className="glass-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                            GST Number
                          </label>
                          <input
                            type="text"
                            value={formData.gst_no}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gst_no: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="e.g. 36HEDPS5768R1Z8"
                            className="glass-input w-full uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                            GST Phone
                          </label>
                          <input
                            type="tel"
                            value={formData.gst_phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gst_phone: e.target.value,
                              })
                            }
                            placeholder="Contact number for GST"
                            className="glass-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                            GST Email
                          </label>
                          <input
                            type="email"
                            value={formData.gst_email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gst_email: e.target.value,
                              })
                            }
                            placeholder="Billing email"
                            className="glass-input w-full"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                            GST Address
                          </label>
                          <textarea
                            value={formData.gst_address}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gst_address: e.target.value,
                              })
                            }
                            placeholder="Registered address"
                            className="glass-input w-full min-h-[80px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-400 dark:border-white/10 pt-4">
                    <h4 className="font-semibold text-neutral-950 dark:text-white mb-3">
                      Products
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                      <div className="relative md:col-span-2">
                        <input
                          type="text"
                          placeholder="Product Name"
                          value={productForm.productName}
                          onChange={(e) => handleProductSelect(e.target.value)}
                          list="products-list"
                          className="glass-input w-full text-sm"
                        />
                        <datalist id="products-list">
                          {availableProducts.map((product) => (
                            <option key={product.id} value={product.name}>
                              {product.sku && `${product.sku} - `}₹
                              {product.price}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:contents">
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
                          className="glass-input w-full text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={productForm.productPrice || ""}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              productPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="glass-input w-full text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Serial No"
                        value={productForm.productSerialNo}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            productSerialNo: e.target.value,
                          })
                        }
                        className="glass-input w-full text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addProduct}
                          disabled={
                            !productForm.productName ||
                            productForm.productPrice <= 0
                          }
                          className={`flex-1 px-4 py-2 rounded-xl transition-all text-sm font-semibold ${
                            !productForm.productName ||
                            productForm.productPrice <= 0
                              ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 cursor-not-allowed"
                              : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 shadow-lg shadow-blue-500/20"
                          }`}
                        >
                          {editingProductIndex !== null ? "Update" : "Add"}
                        </button>
                        {editingProductIndex !== null && (
                          <button
                            type="button"
                            onClick={cancelEditProduct}
                            className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-black dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 transition-all text-sm font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    {formData.products.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {formData.products.map((product, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                              editingProductIndex === index
                                ? "bg-blue-500/10 dark:bg-white/15 border border-blue-200 dark:border-white/20"
                                : "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-neutral-950 dark:text-white">
                                {product.productName || "Product"}
                              </p>
                              <p className="text-xs text-black dark:text-white/60 mt-0.5">
                                Qty: {product.productQuantity} × ₹
                                {product.productPrice.toLocaleString("en-IN")} =
                                <span className="font-semibold text-neutral-950 dark:text-white ml-1">
                                  ₹
                                  {(
                                    product.productQuantity *
                                    product.productPrice
                                  ).toLocaleString("en-IN")}
                                </span>
                                {product.productSerialNo &&
                                  ` | SN: ${product.productSerialNo}`}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => editProduct(index)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => removeProduct(index)}
                                className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        ))}
                        <div className="bg-blue-600/5 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                          <p className="font-bold text-lg text-blue-600 dark:text-blue-400 flex justify-between items-center">
                            <span>Total Amount:</span>
                            <span>
                              {calculateTotal(formData.products).toLocaleString(
                                "en-IN",
                                {
                                  style: "currency",
                                  currency: "INR",
                                  maximumFractionDigits: 0,
                                },
                              )}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={formData.paid_status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paid_status: e.target.value,
                          })
                        }
                        className="glass-input w-full"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Payment Type
                      </label>
                      <select
                        value={formData.payment_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_type: e.target.value,
                          })
                        }
                        className="glass-input w-full"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              {/* Sticky Footer */}
              <div className="px-8 py-6 border-t border-gray-400 dark:border-white/10 flex gap-3 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  form="invoice-form"
                  className="flex-1 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/20"
                >
                  {editingInvoice ? "Update Invoice" : "Create Invoice"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onClear}
                  disabled={!isDraftDirty}
                  className={`flex-1 py-3 rounded-xl transition-all font-semibold ${
                    isDraftDirty
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30"
                      : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/20 cursor-not-allowed"
                  }`}
                >
                  Clear
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white/70 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
export default AquaInvoiceFormDialog;
