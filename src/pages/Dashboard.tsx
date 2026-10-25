import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle,
  CheckSquare,
  Clock,
  CreditCard,
  FileText,
  Database,
  Grid3x3,
  Layers,
  Rocket,
  Link2,
  MessageSquare,
  SearchCheck,
  LayoutDashboard,
  List,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import CrmShell from "../components/Layout/CrmShell";
import type {
  CrmNavigationItem,
  CrmSubNavigation,
} from "../components/Layout/CrmSidebar";
import DashboardOverview from "../components/tabs/DashboardOverview";
import LeadsTab, { type PaymentFilter } from "../components/tabs/LeadsTab";
import CustomersTab, {
  type CustomerSourceTab,
} from "../components/tabs/CustomersTab";
import DealsTab from "../components/tabs/DealsTab";
import ActivitiesTab from "../components/tabs/ActivitiesTab";
import ReportsTab from "../components/tabs/ReportsTab";
import InvoicesTab from "../components/tabs/InvoicesTab";
import ProductsTab, {
  type ProductViewMode,
} from "../components/tabs/ProductsTab";
import NotificationsTab from "../components/tabs/NotificationsTab";
import OrdersTab from "../components/tabs/OrdersTab";
import StockTab from "../components/tabs/StockTab";
import QuotationsTab from "../components/tabs/QuotationsTab";
import AIAssistantTab, {
  type AIAssistantView,
} from "../components/tabs/AIAssistantTab";
import JobsTab from "../components/tabs/JobsTab";
import { useJobsAccess } from "../hooks/useJobsAccess";

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
  | "agents"
  | "orders"
  | "notifications"
  | "reports"
  | "ai"
  | "jobs";

type DashboardNavigationItem = CrmNavigationItem & { id: TabType };

const CRM_NAVIGATION_ITEMS: DashboardNavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "customers", label: "Customers", icon: Users },
  { id: "deals", label: "Deals", icon: TrendingUp },
  { id: "activities", label: "Activities", icon: CheckSquare },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "stocks", label: "Stocks", icon: Package },
  { id: "products", label: "Products", icon: Package },
  { id: "agents", label: "Agents", icon: User },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

const AI_NAVIGATION_ITEM: DashboardNavigationItem = {
  id: "ai",
  label: "AI Assistant",
  icon: Sparkles,
};

const ADMIN_NAVIGATION_ITEMS: DashboardNavigationItem[] = [
  { id: "jobs", label: "Scheduled Jobs", icon: CalendarClock },
];

const validTabs: TabType[] = [
  ...CRM_NAVIGATION_ITEMS.map((item) => item.id),
  AI_NAVIGATION_ITEM.id,
  ...ADMIN_NAVIGATION_ITEMS.map((item) => item.id),
];

const LEAD_FILTER_ITEMS: CrmNavigationItem[] = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "cod", label: "Cash on delivery", icon: CreditCard },
  { id: "paid", label: "Paid", icon: CheckCircle },
  { id: "all", label: "All leads", icon: List },
];

const CUSTOMER_SOURCE_ITEMS: CrmNavigationItem[] = [
  { id: "online", label: "Online ecommerce", icon: ShoppingCart },
  { id: "offline", label: "Offline invoices", icon: FileText },
];

const PRODUCT_VIEW_ITEMS: CrmNavigationItem[] = [
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "subcategories", label: "Subcategories", icon: Grid3x3 },
  { id: "blogs", label: "Blogs", icon: BookOpen },
];

const AI_VIEW_ITEMS: CrmNavigationItem[] = [
  { id: "seo", label: "SEO & keywords", icon: SearchCheck },
  { id: "autopilot", label: "SEO autopilot", icon: Rocket },
  { id: "links", label: "Interlinking", icon: Link2 },
  { id: "data", label: "Site data", icon: Database },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

const getInitialTab = (routeTab: string | null): TabType => {
  if (routeTab && validTabs.includes(routeTab as TabType)) {
    return routeTab as TabType;
  }
  if (typeof window === "undefined") return "dashboard";
  const savedTab = window.localStorage.getItem("activeTab") as TabType | null;
  return savedTab && validTabs.includes(savedTab) ? savedTab : "dashboard";
};

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    getInitialTab(searchParams.get("tab")),
  );
  const [leadFilter, setLeadFilter] = useState<PaymentFilter>("pending");
  const [customerSource, setCustomerSource] =
    useState<CustomerSourceTab>("online");
  const [productView, setProductView] = useState<ProductViewMode>("products");
  const [aiView, setAiView] = useState<AIAssistantView>("seo");
  const { signOut, user, lock } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canRead: canReadJobs } = useJobsAccess();

  // Site data views work without an AI provider, so the tab is always shown.
  const navigationItems = useMemo(
    () => [...CRM_NAVIGATION_ITEMS, AI_NAVIGATION_ITEM],
    [],
  );
  const adminNavigationItems = useMemo(
    () =>
      ADMIN_NAVIGATION_ITEMS.filter(
        (item) => item.id !== "jobs" || canReadJobs,
      ),
    [canReadJobs],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("activeTab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const routeTab = searchParams.get("tab");
    if (!routeTab) return;

    if (validTabs.includes(routeTab as TabType)) {
      setActiveTab((current) =>
        current === routeTab ? current : (routeTab as TabType),
      );
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "dashboard");
    setActiveTab("dashboard");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        lock();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lock]);

  const moduleNavigation = useMemo<CrmSubNavigation | undefined>(() => {
    if (activeTab === "leads") {
      return {
        label: "Lead views",
        items: LEAD_FILTER_ITEMS,
        activeItemId: leadFilter,
        onItemSelect: (itemId) => setLeadFilter(itemId as PaymentFilter),
      };
    }

    if (activeTab === "customers") {
      return {
        label: "Customer sources",
        items: CUSTOMER_SOURCE_ITEMS,
        activeItemId: customerSource,
        onItemSelect: (itemId) =>
          setCustomerSource(itemId as CustomerSourceTab),
      };
    }

    if (activeTab === "products" || activeTab === "agents") {
      return {
        label: "Product views",
        items: PRODUCT_VIEW_ITEMS,
        activeItemId: productView,
        onItemSelect: (itemId) => setProductView(itemId as ProductViewMode),
      };
    }

    if (activeTab === "ai") {
      return {
        label: "Assistant views",
        items: AI_VIEW_ITEMS,
        activeItemId: aiView,
        onItemSelect: (itemId) => setAiView(itemId as AIAssistantView),
      };
    }

    return undefined;
  }, [activeTab, aiView, customerSource, leadFilter, productView]);

  const activeItemLabel =
    [
      ...CRM_NAVIGATION_ITEMS,
      AI_NAVIGATION_ITEM,
      ...ADMIN_NAVIGATION_ITEMS,
    ].find((item) => item.id === activeTab)?.label || "Dashboard";

  const handleSignOut = async () => {
    await signOut();
  };

  const handleTabSelect = (itemId: string) => {
    const nextTab = itemId as TabType;
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTab);
    setSearchParams(nextParams);
  };

  return (
    <CrmShell
      navigationItems={navigationItems}
      adminNavigationItems={adminNavigationItems}
      activeItemId={activeTab}
      activeItemLabel={activeItemLabel}
      onItemSelect={handleTabSelect}
      moduleNavigation={moduleNavigation}
      userEmail={user?.email || undefined}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLock={lock}
      onSignOut={handleSignOut}
    >
      {activeTab === "dashboard" && <DashboardOverview />}
      {activeTab === "leads" && <LeadsTab paymentFilter={leadFilter} />}
      {activeTab === "customers" && (
        <CustomersTab activeSource={customerSource} />
      )}
      {activeTab === "deals" && <DealsTab />}
      {activeTab === "activities" && <ActivitiesTab />}
      {activeTab === "invoices" && <InvoicesTab />}
      {activeTab === "products" && <ProductsTab viewMode={productView} />}
      {/* {activeTab === "agents" && (
        <ProductsTab viewMode={productView} />
      )} */}
      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "stocks" && <StockTab />}
      {activeTab === "quotations" && <QuotationsTab />}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "ai" && <AIAssistantTab view={aiView} />}
      {activeTab === "jobs" && <JobsTab />}
    </CrmShell>
  );
}
