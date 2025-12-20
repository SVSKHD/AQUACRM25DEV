import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dealsService } from "../../services/apiService";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { Edit2, Trash2, DollarSign, TrendingUp, Calendar } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";

interface Deal {
  id: string;
  title: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
}

export default function DealsTab() {
  const { showToast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    stage: "prospecting",
    probability: 0,
    expected_close_date: "",
    notes: "",
  });

  useKeyboardShortcut("Escape", () => setShowModal(false), showModal);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    const { data, error } = await dealsService.getAll();

    if (!error && data) {
      const dealsList = Array.isArray(data) ? data : (data as any).data || [];
      setDeals(dealsList);
    }
    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      if (editingDeal) {
        const { error } = await dealsService.update(editingDeal.id, formData);

        if (error) throw error;

        showToast("Deal updated successfully", "success");
        fetchDeals();
        resetForm();
      } else {
        const response: any = await dealsService.create(formData);

        if (response.error) throw response.error;

        showToast("Deal created successfully", "success");
        fetchDeals();
        resetForm();
      }
    } catch (error) {
      showToast("Failed to save deal", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this deal?")) {
      try {
        const { error } = await dealsService.delete(id);

        if (error) throw error;

        showToast("Deal deleted successfully", "success");
        fetchDeals();
      } catch (error) {
        showToast("Failed to delete deal", "error");
      }
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      amount: deal.amount,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date || "",
      notes: deal.notes || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      amount: 0,
      stage: "prospecting",
      probability: 0,
      expected_close_date: "",
      notes: "",
    });
    setEditingDeal(null);
    setShowModal(false);
  };

  const stageColors = {
    prospecting: "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70",
    qualification:
      "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300",
    proposal:
      "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300",
    negotiation:
      "bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300",
    closed_won:
      "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
    closed_lost: "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300",
  };

  const stageLabels = {
    prospecting: "Prospecting",
    qualification: "Qualification",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <TabInnerContent
        title="Deals"
        description="Track your sales opportunities"
      >
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex-1 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/20 px-6"
          >
            Add Deal
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {deals.map((deal, index) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-5 hover:shadow-2xl transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-950 dark:text-white">
                        {deal.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-medium text-green-600 mt-1">
                        <DollarSign className="w-4 h-4" />
                        <span>₹{deal.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      stageColors[deal.stage as keyof typeof stageColors]
                    }`}
                  >
                    {stageLabels[deal.stage as keyof typeof stageLabels]}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white/60">
                      Probability
                    </span>
                    <span className="font-medium text-neutral-950 dark:text-white">
                      {deal.probability}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${deal.probability}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    />
                  </div>
                  {deal.expected_close_date && (
                    <div className="flex items-center gap-2 text-sm text-black">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(
                          deal.expected_close_date,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {deal.notes && (
                  <p className="text-sm text-black dark:text-white/60 mb-4 line-clamp-2">
                    {deal.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(deal)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-black dark:text-white rounded-lg transition-colors text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(deal.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {deals.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-950 mb-2">
              No deals yet
            </h3>
            <p className="text-black">Get started by adding your first deal</p>
          </motion.div>
        )}

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={resetForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-400 dark:border-white/10"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
                  {editingDeal ? "Edit Deal" : "Add New Deal"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                      Deal Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                      className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Probability (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            probability: parseInt(e.target.value) || 0,
                          })
                        }
                        required
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Stage
                      </label>
                      <select
                        value={formData.stage}
                        onChange={(e) =>
                          setFormData({ ...formData, stage: e.target.value })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="prospecting">Prospecting</option>
                        <option value="qualification">Qualification</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="closed_won">Closed Won</option>
                        <option value="closed_lost">Closed Lost</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Expected Close Date
                      </label>
                      <input
                        type="date"
                        value={formData.expected_close_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expected_close_date: e.target.value,
                          })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                      className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/20"
                    >
                      {editingDeal ? "Update Deal" : "Add Deal"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white/70 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </TabInnerContent>
    </div>
  );
}
