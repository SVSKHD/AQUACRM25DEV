import { useState, useEffect, useRef } from 'react';
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
  Package,
  LayoutDashboard,
  Bell,
  Lock,
  Unlock
} from 'lucide-react';
import DashboardOverview from '../components/tabs/DashboardOverview';
import LeadsTab from '../components/tabs/LeadsTab';
import CustomersTab from '../components/tabs/CustomersTab';
import DealsTab from '../components/tabs/DealsTab';
import ActivitiesTab from '../components/tabs/ActivitiesTab';
import ReportsTab from '../components/tabs/ReportsTab';
import InvoicesTab from '../components/tabs/InvoicesTab';
import ProductsTab from '../components/tabs/ProductsTab';
import NotificationsTab from '../components/tabs/NotificationsTab';

type TabType = 'dashboard' | 'leads' | 'customers' | 'deals' | 'activities' | 'invoices' | 'products' | 'notifications' | 'reports';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem('activeTab') as TabType) || 'dashboard';
  });
  const [isLocked, setIsLocked] = useState(false);
  const [lockCode, setLockCode] = useState('');
  const [lockError, setLockError] = useState(false);
  const lockInputRef = useRef<HTMLInputElement>(null);
  const { signOut, user } = useAuth();

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads' as TabType, label: 'Leads', icon: UserPlus },
    { id: 'customers' as TabType, label: 'Customers', icon: Users },
    { id: 'deals' as TabType, label: 'Deals', icon: TrendingUp },
    { id: 'activities' as TabType, label: 'Activities', icon: CheckSquare },
    { id: 'invoices' as TabType, label: 'Invoices', icon: FileText },
    { id: 'products' as TabType, label: 'Products', icon: Package },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'reports' as TabType, label: 'Reports', icon: BarChart3 },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setIsLocked(true);
        setLockCode('');
        setLockError(false);
        return;
      }

      if (isLocked) return;

      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        setActiveTab(tabs[prevIndex].id);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        setActiveTab(tabs[nextIndex].id);
      } else if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.closest('[role="tablist"]') || target.closest('nav')) {
          e.preventDefault();
          const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          setActiveTab(tabs[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs, isLocked]);

  useEffect(() => {
    if (isLocked && lockInputRef.current) {
      lockInputRef.current.focus();
    }
  }, [isLocked]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockCode === '2607') {
      setIsLocked(false);
      setLockCode('');
      setLockError(false);
    } else {
      setLockError(true);
      setLockCode('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <img src="/aquakart.png" alt="Aquakart" className="w-8 h-8 sm:w-10 sm:h-10" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-slate-900">Aquakart CRM</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Sales Management</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
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
            <nav className="flex overflow-x-auto scrollbar-hide" role="tablist" aria-label="Dashboard Navigation">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium transition-all relative ${
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

          <div className="p-3 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                role="tabpanel"
                id={`${activeTab}-panel`}
                aria-labelledby={activeTab}
              >
                {activeTab === 'dashboard' && <DashboardOverview />}
                {activeTab === 'leads' && <LeadsTab />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'deals' && <DealsTab />}
                {activeTab === 'activities' && <ActivitiesTab />}
                {activeTab === 'invoices' && <InvoicesTab />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'notifications' && <NotificationsTab />}
                {activeTab === 'reports' && <ReportsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[100]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-block p-4 bg-blue-100 rounded-full mb-4"
                >
                  <Lock className="w-12 h-12 text-blue-600" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Screen Locked</h2>
                <p className="text-slate-600">Enter code to unlock</p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <input
                    ref={lockInputRef}
                    type="password"
                    value={lockCode}
                    onChange={(e) => {
                      setLockCode(e.target.value);
                      setLockError(false);
                    }}
                    placeholder="Enter unlock code"
                    className={`w-full px-4 py-3 text-center text-2xl tracking-widest border-2 rounded-lg outline-none transition-all ${
                      lockError
                        ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                    }`}
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  {lockError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-2 text-center flex items-center justify-center gap-1"
                    >
                      <span>Incorrect code. Try again.</span>
                    </motion.p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Unlock className="w-5 h-5" />
                  Unlock
                </motion.button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                <p>Press Shift + L to lock screen</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
