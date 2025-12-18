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
    sku?: string;
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
    {label && <span className="mr-3 text-sm font-medium text-slate-700">{label}</span>}
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
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
                      onChange={(e) =>
                        setFormData({ ...formData, invoice_no: e.target.value })
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
                  <div className="grid grid-cols-2 gap-4">
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
                        type="text"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_email: e.target.value,
                          })
                        }

                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900">
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
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900">
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
                        <label className="block text-sm font-medium text-slate-700 mb-2">
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Products
                  </h4>
                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Product Name (type or select)"
                        value={productForm.productName}
                        onChange={(e) => handleProductSelect(e.target.value)}
                        list="products-list"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full"
                      />
                      <datalist id="products-list">
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.name}>
                            {product.sku && `${product.sku} - `}₹{product.price}
                          </option>
                        ))}
                      </datalist>
                    </div>
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
                      value={productForm.productPrice || ""}
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
                        setProductForm({
                          ...productForm,
                          productSerialNo: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={addProduct}
                      disabled={
                        !productForm.productName ||
                        productForm.productPrice <= 0
                      }
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${!productForm.productName ||
                        productForm.productPrice <= 0
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                    >
                      {editingProductIndex !== null ? "Update" : "Add"}
                    </button>
                    {editingProductIndex !== null && (
                      <button
                        type="button"
                        onClick={cancelEditProduct}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {formData.products.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.products.map((product, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg ${editingProductIndex === index
                            ? "bg-blue-50 border-2 border-blue-300"
                            : "bg-slate-50"
                            }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {product.productName || "Product"}
                            </p>
                            <p className="text-xs text-slate-600">
                              Qty: {product.productQuantity} × ₹
                              {product.productPrice} = ₹
                              {product.productQuantity * product.productPrice}
                              {product.productSerialNo &&
                                ` | SN: ${product.productSerialNo}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editProduct(index)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-700"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-bold text-slate-900">
                          Total:{" "}
                          {calculateTotal(formData.products).toLocaleString(
                            "en-IN",
                            {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            },
                          )}
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paid_status: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_type: e.target.value,
                        })
                      }
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
                    {editingInvoice ? "Update Invoice" : "Create Invoice"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClear}
                    disabled={!isDraftDirty}
                    className={`flex-1 py-3 rounded-lg transition-colors font-medium ${isDraftDirty
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    Clear
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
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
    </>
  );
};
export default AquaInvoiceFormDialog;
