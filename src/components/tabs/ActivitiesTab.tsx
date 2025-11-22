import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { activitiesService } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { Plus, Edit2, Trash2, Phone, Mail, Calendar, CheckCircle, Clock } from 'lucide-react';

interface Activity {
  id: string;
  related_to: string;
  related_id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function ActivitiesTab() {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    related_to: 'lead',
    related_id: '',
    type: 'task',
    title: '',
    description: '',
    status: 'pending',
    due_date: '',
  });

  useKeyboardShortcut('Escape', resetForm, showModal);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const { data, error } = await activitiesService.getAll();

    if (!error && data) {
      setActivities(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      if (editingActivity) {
        const { error } = await activitiesService.update(editingActivity.id, formData);

        if (error) throw error;

        showToast('Activity updated successfully', 'success');
        fetchActivities();
        resetForm();
      } else {
        const { error } = await activitiesService.create(formData);

        if (error) throw error;

        showToast('Activity created successfully', 'success');
        fetchActivities();
        resetForm();
      }
    } catch (error) {
      showToast('Failed to save activity', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      try {
        const { error } = await activitiesService.delete(id);

        if (error) throw error;

        showToast('Activity deleted successfully', 'success');
        fetchActivities();
      } catch (error) {
        showToast('Failed to delete activity', 'error');
      }
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      related_to: activity.related_to,
      related_id: activity.related_id,
      type: activity.type,
      title: activity.title,
      description: activity.description || '',
      status: activity.status,
      due_date: activity.due_date ? new Date(activity.due_date).toISOString().split('T')[0] : '',
    });
    setShowModal(true);
  };

  const toggleStatus = async (activity: Activity) => {
    const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
    const completed_at = newStatus === 'completed' ? new Date().toISOString() : null;

    try {
      const { error } = await activitiesService.update(activity.id, { status: newStatus, completed_at });

      if (error) throw error;

      showToast(`Activity marked as ${newStatus}`, 'success');
      fetchActivities();
    } catch (error) {
      showToast('Failed to update activity status', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      related_to: 'lead',
      related_id: '',
      type: 'task',
      title: '',
      description: '',
      status: 'pending',
      due_date: '',
    });
    setEditingActivity(null);
    setShowModal(false);
  };

  const typeIcons = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    task: CheckCircle,
    note: Clock,
  };

  const typeColors = {
    call: 'bg-blue-100 text-blue-800',
    email: 'bg-green-100 text-green-800',
    meeting: 'bg-yellow-100 text-yellow-800',
    task: 'bg-purple-100 text-purple-800',
    note: 'bg-slate-100 text-slate-800',
  };

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    return activity.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activities</h2>
          <p className="text-slate-600 mt-1">Manage your tasks and activities</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Activity
        </motion.button>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'completed'].map((f) => (
          <motion.button
            key={f}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </motion.button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredActivities.map((activity, index) => {
            const Icon = typeIcons[activity.type as keyof typeof typeIcons];
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all ${
                  activity.status === 'completed' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleStatus(activity)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      activity.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 hover:border-blue-500'
                    }`}
                  >
                    {activity.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className={`p-1.5 rounded-lg ${
                            typeColors[activity.type as keyof typeof typeColors]
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-semibold text-slate-900 ${
                              activity.status === 'completed' ? 'line-through' : ''
                            }`}
                          >
                            {activity.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="capitalize">{activity.type}</span>
                            <span>•</span>
                            <span className="capitalize">{activity.related_to}</span>
                          </div>
                        </div>
                      </div>

                      {activity.due_date && (
                        <div className="flex items-center gap-1 text-sm text-slate-600 flex-shrink-0">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(activity.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {activity.description && (
                      <p className="text-sm text-slate-600 mb-3 ml-8">{activity.description}</p>
                    )}

                    <div className="flex gap-2 ml-8">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(activity)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(activity.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No {filter !== 'all' && filter} activities
          </h3>
          <p className="text-slate-600">
            {filter === 'all'
              ? 'Get started by adding your first activity'
              : `No ${filter} activities found`}
          </p>
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingActivity ? 'Edit Activity' : 'Add New Activity'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Activity Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="task">Task</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Related To
                    </label>
                    <select
                      value={formData.related_to}
                      onChange={(e) => setFormData({ ...formData, related_to: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="lead">Lead</option>
                      <option value="customer">Customer</option>
                      <option value="deal">Deal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Related ID
                  </label>
                  <input
                    type="text"
                    value={formData.related_id}
                    onChange={(e) => setFormData({ ...formData, related_id: e.target.value })}
                    required
                    placeholder="Enter the ID of the related lead, customer, or deal"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
                  >
                    {editingActivity ? 'Update Activity' : 'Add Activity'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={resetForm}
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
    </div>
  );
}
