import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
}

interface QuotationFormDialogProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData: any | null;
  availableProducts: { id: string | number; name: string; price: number }[];
}

const QuotationFormDialog = ({
  show,
  onClose,
  onSubmit,
  initialData,
  availableProducts,
}: QuotationFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    quotation_date: new Date().toISOString().split("T")[0],
    products: [] as Product[],
    notes: "",
    status: "Draft",
  });

  const [currentProduct, setCurrentProduct] = useState<Product>({
    productName: "",
    productQuantity: 1,
    productPrice: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        customer_name: initialData.customer_name || "",
        customer_phone: initialData.customer_phone || "",
        customer_email: initialData.customer_email || "",
        customer_address: initialData.customer_address || "",
        quotation_date: initialData.quotation_date
          ? initialData.quotation_date.split("T")[0]
          : new Date().toISOString().split("T")[0],
        products: initialData.products || [],
        notes: initialData.notes || "",
        status: initialData.status || "Draft",
      });
    } else {
      setFormData({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        customer_address: "",
        quotation_date: new Date().toISOString().split("T")[0],
        products: [],
        notes: "",
        status: "Draft",
      });
    }
  }, [initialData, show]);

  const handleProductSelect = (productName: string) => {
    const product = availableProducts.find((p) => p.name === productName);
    if (product) {
      setCurrentProduct({
        ...currentProduct,
        productName: product.name,
        productPrice: product.price,
      });
    } else {
      setCurrentProduct({
        ...currentProduct,
        productName: productName,
      });
    }
  };

  const addProduct = () => {
    if (currentProduct.productName && currentProduct.productQuantity > 0) {
      setFormData({
        ...formData,
        products: [...formData.products, currentProduct],
      });
      setCurrentProduct({
        productName: "",
        productQuantity: 1,
        productPrice: 0,
      });
    }
  };

  const removeProduct = (index: number) => {
    const newProducts = [...formData.products];
    newProducts.splice(index, 1);
    setFormData({ ...formData, products: newProducts });
  };

  const calculateTotal = () => {
    return formData.products.reduce(
      (sum, item) => sum + item.productPrice * item.productQuantity,
      0,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        total_amount: calculateTotal(),
      });
      onClose();
    } catch (error) {
      console.error("Error submitting quotation:", error);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "glass-input w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-neutral-950 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400";
  const labelClass =
    "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-[200] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/20 dark:border-white/10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
              <h3 className="text-xl font-bold text-neutral-950 dark:text-white">
                {initialData ? "Edit Quotation" : "Create New Quotation"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
              <form
                id="quotation-form"
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* Customer Details Section */}
                <div className="bg-white/40 dark:bg-white/5 rounded-2xl p-6 border border-white/20 dark:border-white/5">
                  <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Customer Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Customer Name</label>
                      <input
                        type="text"
                        required
                        className={inputClass}
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_name: e.target.value,
                          })
                        }
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="tel"
                          required
                          className={`${inputClass} pl-10`}
                          value={formData.customer_phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customer_phone: e.target.value,
                            })
                          }
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="email"
                          className={`${inputClass} pl-10`}
                          value={formData.customer_email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customer_email: e.target.value,
                            })
                          }
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="date"
                          required
                          className={`${inputClass} pl-10`}
                          value={formData.quotation_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              quotation_date: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                        <textarea
                          className={`${inputClass} pl-10 min-h-[80px]`}
                          value={formData.customer_address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customer_address: e.target.value,
                            })
                          }
                          placeholder="Enter complete address"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products Section */}
                <div className="bg-white/40 dark:bg-white/5 rounded-2xl p-6 border border-white/20 dark:border-white/5">
                  <h4 className="text-md font-semibold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Products
                  </h4>

                  {/* Add Product Form */}
                  <div className="grid grid-cols-12 gap-3 mb-4 items-end bg-slate-50 dark:bg-black/20 p-4 rounded-xl">
                    <div className="col-span-12 md:col-span-5">
                      <label className={labelClass}>Product</label>
                      <input
                        list="products-list"
                        type="text"
                        className={inputClass}
                        value={currentProduct.productName}
                        onChange={(e) => handleProductSelect(e.target.value)}
                        placeholder="Search or enter product"
                      />
                      <datalist id="products-list">
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.name}>
                            ₹{p.price}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className={labelClass}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        className={inputClass}
                        value={currentProduct.productQuantity}
                        onChange={(e) =>
                          setCurrentProduct({
                            ...currentProduct,
                            productQuantity: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className={labelClass}>Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={currentProduct.productPrice}
                        onChange={(e) =>
                          setCurrentProduct({
                            ...currentProduct,
                            productPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <button
                        type="button"
                        onClick={addProduct}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Products List */}
                  {formData.products.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-white/5 text-left">
                          <tr>
                            <th className="p-3 font-semibold text-neutral-600 dark:text-neutral-400">
                              Product
                            </th>
                            <th className="p-3 font-semibold text-neutral-600 dark:text-neutral-400 text-center">
                              Qty
                            </th>
                            <th className="p-3 font-semibold text-neutral-600 dark:text-neutral-400 text-right">
                              Price
                            </th>
                            <th className="p-3 font-semibold text-neutral-600 dark:text-neutral-400 text-right">
                              Total
                            </th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {formData.products.map((item, index) => (
                            <tr key={index} className="hover:bg-white/5">
                              <td className="p-3 text-neutral-900 dark:text-white">
                                {item.productName}
                              </td>
                              <td className="p-3 text-center text-neutral-700 dark:text-neutral-300">
                                {item.productQuantity}
                              </td>
                              <td className="p-3 text-right text-neutral-700 dark:text-neutral-300">
                                ₹{item.productPrice}
                              </td>
                              <td className="p-3 text-right font-medium text-neutral-900 dark:text-white">
                                ₹
                                {(
                                  item.productPrice * item.productQuantity
                                ).toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeProduct(index)}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-white/5 font-semibold">
                          <tr>
                            <td
                              colSpan={3}
                              className="p-3 text-right text-neutral-900 dark:text-white"
                            >
                              Total Amount
                            </td>
                            <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 text-lg">
                              ₹{calculateTotal().toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>Notes / Terms</label>
                  <textarea
                    className={`${inputClass} min-h-[100px]`}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Enter any additional notes or terms..."
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="quotation-form"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : initialData
                    ? "Update Quotation"
                    : "Create Quotation"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuotationFormDialog;
