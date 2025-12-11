import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function StockFormDialog({ open, onClose, onSave, initial, productOptions = [] }) {
  const emptyForm = { id: "", productId: "", name: "", quantity: 0, distributorPrice: 0, history: [] };
  const [form, setForm] = useState(initial || emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        ...emptyForm,
        ...initial,
        productId: (initial as any).productId || (initial as any).id || "",
        quantity: Number((initial as any).quantity ?? 0),
        distributorPrice: Number((initial as any).distributorPrice ?? 0),
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial]);

  const resetForm = () => setForm(initial || emptyForm);

  const handleSelectProduct = (productId: string) => {
    const selected = productOptions.find((p: any) => p.id === productId);
    if (selected) {
      setForm({
        ...form,
        productId,
        name: selected.name,
        distributorPrice: selected.price ?? 0,
      });
    } else {
      setForm({ ...form, productId, name: "", distributorPrice: 0 });
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
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-half p-6 border border-slate-100"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {initial ? "Edit Stock" : "Add Stock"}
            </h3>
            <div className="space-y-3">
              {productOptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                    Select Product
                  </p>
                  <select
                    value={form.productId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Choose a product</option>
                    {productOptions.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.price ? `- ₹${p.price}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                  Product Name
                </p>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Product"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                    Quantity
                  </p>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                    Distributor Price
                  </p>
                  <input
                    type="number"
                    value={form.distributorPrice}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        distributorPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSave(form);
                  resetForm();
                }}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm"
              >
                {initial ? "Update" : "Create"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default StockFormDialog;
