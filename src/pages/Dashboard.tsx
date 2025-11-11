import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Users,
  UserPlus,
  TrendingUp,
  CheckSquare,
  BarChart3,
  User,
  FileText,
  Package
} from 'lucide-react';
import LeadsTab from '../components/tabs/LeadsTab';
import CustomersTab from '../components/tabs/CustomersTab';
import DealsTab from '../components/tabs/DealsTab';
import ActivitiesTab from '../components/tabs/ActivitiesTab';
import ReportsTab from '../components/tabs/ReportsTab';
import InvoicesTab from '../components/tabs/InvoicesTab';
import ProductsTab from '../components/tabs/ProductsTab';

type TabType = 'leads' | 'customers' | 'deals' | 'activities' | 'invoices' | 'products' | 'reports';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const { signOut, user } = useAuth();

  const tabs = [
    { id: 'leads' as TabType, label: 'Leads', icon: UserPlus },
    { id: 'customers' as TabType, label: 'Customers', icon: Users },
    { id: 'deals' as TabType, label: 'Deals', icon: TrendingUp },
    { id: 'activities' as TabType, label: 'Activities', icon: CheckSquare },
    { id: 'invoices' as TabType, label: 'Invoices', icon: FileText },
    { id: 'products' as TabType, label: 'Products', icon: Package },
    { id: 'reports' as TabType, label: 'Reports', icon: BarChart3 },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <img src="/aquakart.png" alt="Aquakart" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Aquakart CRM</h1>
                <p className="text-xs text-slate-500">Sales Management</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-400 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </motion.button>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="border-b border-slate-200">
            <nav className="flex">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all relative ${
                      activeTab === tab.id
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-600"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'leads' && <LeadsTab />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'deals' && <DealsTab />}
                {activeTab === 'activities' && <ActivitiesTab />}
                {activeTab === 'invoices' && <InvoicesTab />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'reports' && <ReportsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
