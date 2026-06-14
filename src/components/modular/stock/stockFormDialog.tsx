import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ProductOption {
  id: string;
  name: string;
  price?: number;
  stock?: number;
}

interface StockFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: any) => void;
  initial: any;
  productOptions: ProductOption[];
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

function StockFormDialog({
  open,
  onClose,
  onSave,
  initial,
  productOptions = [],
}: StockFormDialogProps) {
  const emptyForm = {
    id: "",
    productId: "",
    name: "",
    quantity: 0,
    dpPrice: 0,
    history: [],
  };
  const [form, setForm] = useState<any>(initial || emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        ...emptyForm,
        ...initial,
        productId: (initial as any).productId || "",
        quantity: Number((initial as any).quantity ?? 0),
        dpPrice: Number((initial as any).dpPrice ?? 0),
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial, open]);

  const resetForm = () => setForm(initial || emptyForm);

  const handleSelectProduct = (productId: string) => {
    const selected = productOptions.find((p: any) => p.id === productId);
    if (selected) {
      setForm({
        ...form,
        productId,
        name: selected.name,
        quantity: selected.stock ?? form.quantity ?? 0,
        dpPrice: selected.price ?? 0,
      });
    } else {
      setForm({ ...form, productId, name: "", dpPrice: 0 });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-lg w-full p-8 shadow-2xl border-white/20 dark:border-white/5"
          >
            <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
              {initial ? "Edit Stock" : "Add Stock"}
            </h3>
            <div className="space-y-3">
              {productOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    Select Product
                  </label>
                  <select
                    value={form.productId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="glass-input w-full"
                    disabled={!!initial}
                  >
                    <option value="">Choose a product</option>
                    {productOptions.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.price ? `- DP ₹${p.price}` : ""}
                        {p.stock !== undefined ? ` | CRM Stock ${p.stock}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                  Product Name
                </label>
                <input
                  value={form.name}
                  readOnly
                  className="glass-input w-full opacity-80"
                  placeholder="Product Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    CRM Stock Count
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    Product DP Price
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(form.dpPrice)}
                    readOnly
                    className="glass-input w-full opacity-80"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  Stock Valuation
                </p>
                <p className="text-lg font-bold text-neutral-950 dark:text-white">
                  {formatCurrency(Number(form.quantity || 0) * Number(form.dpPrice || 0))}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(form);
                  resetForm();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
              >
                {initial ? "Update Stock" : "Create Stock"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default StockFormDialog;
