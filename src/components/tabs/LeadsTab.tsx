import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { leadsService } from "../../services/apiService";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { Plus, Edit2, Trash2, Phone, Mail, Building2 } from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  payment_status: string;
  created_at: string;
}

type PaymentFilter = "all" | "pending" | "cod" | "paid";

export default function LeadsTab() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("pending");

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    status: "new",
    source: "",
    notes: "",
    payment_status: "pending",
  });

  useKeyboardShortcut("Escape", () => setShowModal(false), showModal);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, paymentFilter]);

  const filterLeads = () => {
    if (paymentFilter === "all") {
      setFilteredLeads(leads);
    } else {
      setFilteredLeads(
        leads.filter((lead) => lead.payment_status === paymentFilter),
      );
    }
  };

  const fetchLeads = async () => {
    const { data, error } = await leadsService.getAll();

    if (!error && data) {
      const leadsList = Array.isArray(data) ? data : (data as any).data || [];
      setLeads(leadsList);
    }
    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      if (editingLead) {
        const { error } = await leadsService.update(editingLead.id, formData);

        if (error) throw error;

        showToast("Lead updated successfully", "success");
        fetchLeads();
        resetForm();
      } else {
        const { error } = await leadsService.create(formData);

        if (error) throw error;

        showToast("Lead created successfully", "success");
        fetchLeads();
        resetForm();
      }
    } catch (error) {
      showToast("Failed to save lead", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        const { error } = await leadsService.delete(id);

        if (error) throw error;

        showToast("Lead deleted successfully", "success");
        fetchLeads();
      } catch (error) {
        showToast("Failed to delete lead", "error");
      }
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone || "",
      status: lead.status,
      source: lead.source || "",
      notes: lead.notes || "",
      payment_status: lead.payment_status || "pending",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      status: "new",
      source: "",
      notes: "",
      payment_status: "pending",
    });
    setEditingLead(null);
    setShowModal(false);
  };

  const statusColors = {
    new: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300",
    contacted:
      "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300",
    qualified:
      "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
    lost: "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300",
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
      <TabInnerContent title="Leads" description="Manage your sales leads">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Lead
          </motion.button>
        </div>

        <div className="glass shadow-xl rounded-xl mb-6 overflow-hidden">
          <div className="border-b border-gray-400 dark:border-white/10">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {[
                { id: "pending", label: "Pending" },
                { id: "cod", label: "COD" },
                { id: "paid", label: "Paid" },
                { id: "all", label: "All" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setPaymentFilter(filter.id as PaymentFilter)}
                  className={`flex-shrink-0 py-3 px-4 text-sm font-medium transition-all relative ${
                    paymentFilter === filter.id
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-white/5"
                      : "text-black dark:text-white/60 hover:text-neutral-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredLeads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-5 hover:shadow-2xl transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-950 dark:text-white">
                        {lead.company_name}
                      </h3>
                      <p className="text-sm text-black dark:text-white/60">
                        {lead.contact_name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[lead.status as keyof typeof statusColors]
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
                      <Phone className="w-4 h-4" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <p className="text-sm text-black dark:text-white/60 mb-4 line-clamp-2">
                    {lead.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(lead)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-black dark:text-white rounded-lg transition-colors text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(lead.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {leads.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-950 mb-2">
              No leads yet
            </h3>
            <p className="text-black">Get started by adding your first lead</p>
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
                  {editingLead ? "Edit Lead" : "Add New Lead"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            company_name: e.target.value,
                          })
                        }
                        required
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_name: e.target.value,
                          })
                        }
                        required
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Source
                      </label>
                      <input
                        type="text"
                        value={formData.source}
                        onChange={(e) =>
                          setFormData({ ...formData, source: e.target.value })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Website, Referral"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={formData.payment_status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_status: e.target.value,
                          })
                        }
                        className="glass-input w-full px-4 py-2 border-slate-300 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="cod">COD</option>
                        <option value="paid">Paid</option>
                      </select>
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
                      {editingLead ? "Update Lead" : "Add Lead"}
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
