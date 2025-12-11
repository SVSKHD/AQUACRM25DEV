import {useState} from "react";
import { AnimatePresence, motion } from "framer-motion";
function StockFormDialog({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || { id: "", name: "", stock: 0, price: 0, history: [] },
  );

  // reset when initial changes
  const resetForm = () =>
    setForm(initial || { id: "", name: "", stock: 0, price: 0, history: [] });

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
                    Stock
                  </p>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                    Price
                  </p>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price: parseFloat(e.target.value) || 0,
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