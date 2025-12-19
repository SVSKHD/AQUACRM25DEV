import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
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
  ShoppingCart,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import DashboardOverview from "../components/tabs/DashboardOverview";
import LeadsTab from "../components/tabs/LeadsTab";
import CustomersTab from "../components/tabs/CustomersTab";
import DealsTab from "../components/tabs/DealsTab";
import ActivitiesTab from "../components/tabs/ActivitiesTab";
import ReportsTab from "../components/tabs/ReportsTab";
import InvoicesTab from "../components/tabs/InvoicesTab";
import ProductsTab from "../components/tabs/ProductsTab";
import NotificationsTab from "../components/tabs/NotificationsTab";
import OrdersTab from "../components/tabs/OrdersTab";
import StockTab from "../components/tabs/StockTab";
import QuotationsTab from "../components/tabs/quotationsTab";

type TabType =
  | "dashboard"
  | "leads"
  | "customers"
  | "deals"
  | "activities"
  | "invoices"
  | "quotations"
  | "stocks"
  | "products"
  | "orders"
  | "notifications"
  | "reports";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem("activeTab") as TabType) || "dashboard";
  });
  const { signOut, user, lock } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
    { id: "leads" as TabType, label: "Leads", icon: UserPlus },
    { id: "customers" as TabType, label: "Customers", icon: Users },
    { id: "deals" as TabType, label: "Deals", icon: TrendingUp },
    { id: "activities" as TabType, label: "Activities", icon: CheckSquare },
    { id: "invoices" as TabType, label: "Invoices", icon: FileText },
    { id: "quotations" as TabType, label: "Quotations", icon: FileText },
    { id: "stocks" as TabType, label: "Stocks", icon: Package },
    { id: "products" as TabType, label: "Products", icon: Package },
    { id: "orders" as TabType, label: "Orders", icon: ShoppingCart },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "reports" as TabType, label: "Reports", icon: BarChart3 },
  ];

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        lock();
        return;
      }

      // Check for open modals (heuristic: looking for fixed overlay with high z-index)
      const isModalOpen = document.querySelector(".fixed.inset-0.z-50");
      if (isModalOpen) {
        return;
      }

      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        setActiveTab(tabs[prevIndex].id);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        setActiveTab(tabs[nextIndex].id);
      } else if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.closest('[role="tablist"]') || target.closest("nav")) {
          e.preventDefault();
          const nextIndex =
            currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          setActiveTab(tabs[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, tabs, lock]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen liquid-bg">
      <div className="relative z-50 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-nav max-w-7xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <img
                  src="/aqua-white.png"
                  alt="Aquakart"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                />
                <div>
                  <h1 className="text-base sm:text-xl font-bold text-blue-600 dark:text-white leading-none">
                    Aquakart CRM
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-white/70 font-medium hidden sm:block mt-1">
                    Sales Management
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 sm:gap-4"
              >
                <div className="hidden md:flex items-center gap-2 text-sm text-black dark:text-white/80 font-semibold px-4 cursor-default">
                  <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span>{user?.email}</span>
                </div>

                <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-white/10" />

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={lock}
                  className="glass-btn-amber flex items-center gap-2 px-3 sm:px-4 py-2 text-sm"
                  title="Lock screen (Cmd/Ctrl + L)"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Lock</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTheme}
                  className="glass-btn flex items-center justify-center p-2"
                  title={
                    theme === "light"
                      ? "Switch to Dark Mode"
                      : "Switch to Light Mode"
                  }
                >
                  {theme === "light" ? (
                    <Moon className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-400" />
                  )}
                </motion.button>

                <div className="hidden md:block w-px h-6 bg-white/10" />

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSignOut}
                  className="glass-btn flex items-center gap-2 px-3 sm:px-4 py-2 text-sm"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Logout</span>
                </motion.button>
              </motion.div>
            </div>
          </div>
        </header>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card shadow-2xl overflow-visible"
        >
          <div className="glass-tabs rounded-t-[2.5rem]">
            <nav
              className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory p-2"
              role="tablist"
              aria-label="Dashboard Navigation"
            >
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${tab.id}-panel`}
                    tabIndex={isActive ? 0 : -1}
                    className={`relative flex-shrink-0 snap-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all rounded-3xl z-10 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-600 dark:text-blue-200 dark:hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-blue-500/10 dark:bg-white/[0.08] rounded-3xl -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5 z-10" />
                    <span className="text-[10px] sm:text-sm leading-tight z-10">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 sm:p-6 bg-transparent">
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
                {activeTab === "dashboard" && <DashboardOverview />}
                {activeTab === "leads" && <LeadsTab />}
                {activeTab === "customers" && <CustomersTab />}
                {activeTab === "deals" && <DealsTab />}
                {activeTab === "activities" && <ActivitiesTab />}
                {activeTab === "invoices" && <InvoicesTab />}
                {activeTab === "products" && <ProductsTab />}
                {activeTab === "orders" && <OrdersTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {activeTab === "stocks" && <StockTab />}
                {activeTab === "quotations" && <QuotationsTab />}
                {activeTab === "reports" && <ReportsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
