import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle,
  CheckSquare,
  Clock,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Grid3x3,
  Layers,
  LayoutDashboard,
  Link2,
  List,
  MessageCircle,
  MessageSquare,
  Package,
  Rocket,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
  ShieldCheck,
  TicketPercent,
  UserCog,
  WalletCards,
  ScrollText,
  SearchCheck,
  Sparkles,
  Wrench,
  Settings,
  KeyRound,
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
import CommerceAdminTab, {
  type CommerceAdminView,
} from "../components/tabs/CommerceAdminTab";
import ServiceRemindersTab from "../components/tabs/ServiceRemindersTab";
import SeoTab from "../components/tabs/SeoTab";
import AnalyticsTab from "../components/tabs/AnalyticsTab";
import WhatsAppTab from "../components/tabs/WhatsAppTab";
import AIAssistantTab, {
  type AIAssistantView,
} from "../components/tabs/AIAssistantTab";
import JobsTab from "../components/tabs/JobsTab";
import { useJobsAccess } from "../hooks/useJobsAccess";
import SettingsTab, { type SettingsView } from "../components/tabs/SettingsTab";
import { useSettingsAccess } from "../hooks/useSettingsAccess";
import PreInvoicesTab from "../components/tabs/PreInvoicesTab";
import { usePreInvoiceAccess } from "../hooks/usePreInvoiceAccess";
import { filterGatedItems } from "../utils/permissions";

type TabType =
  | "dashboard"
  | "analytics"
  | "leads"
  | "customers"
  | "deals"
  | "activities"
  | "invoices"
  | "quotations"
  | "pre-invoices"
  | "stocks"
  | "products"
  | "orders"
  | "notifications"
  | "whatsapp"
  | "service-reminders"
  | "reports"
  | "seo"
  | "ai"
  | "jobs"
  | "commerce-admin"
  | "settings";

type DashboardNavigationItem = CrmNavigationItem & { id: TabType };

const CRM_NAVIGATION_ITEMS: DashboardNavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Live Analytics", icon: Activity },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "customers", label: "Customers", icon: Users },
  { id: "deals", label: "Deals", icon: TrendingUp },
  { id: "activities", label: "Activities", icon: CheckSquare },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "pre-invoices", label: "Pre-invoices", icon: ClipboardList },
  { id: "stocks", label: "Stocks", icon: Package },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "service-reminders", label: "Service Reminders", icon: Wrench },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "seo", label: "SEO", icon: SearchCheck },
  { id: "ai", label: "AI Assistant", icon: Sparkles },
  { id: "jobs", label: "Scheduled Jobs", icon: CalendarClock },
  { id: "commerce-admin", label: "Commerce Admin", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

const AI_VIEW_ITEMS: CrmNavigationItem[] = [
  { id: "seo", label: "SEO & keywords", icon: SearchCheck },
  { id: "autopilot", label: "SEO autopilot", icon: Rocket },
  { id: "links", label: "Interlinking", icon: Link2 },
  { id: "data", label: "Site data", icon: Database },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

const COMMERCE_ADMIN_ITEMS: CrmNavigationItem[] = [
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "staff", label: "Staff", icon: UserCog },
  { id: "coupons", label: "Coupons", icon: TicketPercent },
  { id: "referrals", label: "Referrals", icon: Users },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "audit", label: "Audit logs", icon: ScrollText },
];

const SETTINGS_ITEMS = [
  { id: "environment", label: "Environment", icon: KeyRound },
];

const validTabs = CRM_NAVIGATION_ITEMS.map((item) => item.id);

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

const getInitialTab = (routeTab: string | null): TabType => {
  if (routeTab === "blogs") {
    return "products";
  }
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
  const [productView, setProductView] = useState<ProductViewMode>(() => {
    if (searchParams.get("tab") === "blogs") return "blogs";
    const requestedView = searchParams.get("view") as ProductViewMode | null;
    return requestedView &&
      ["products", "categories", "subcategories", "blogs"].includes(
        requestedView,
      )
      ? requestedView
      : "products";
  });
  const [commerceAdminView, setCommerceAdminView] =
    useState<CommerceAdminView>("coupons");
  const [aiView, setAiView] = useState<AIAssistantView>("seo");
  const { signOut, user, lock } = useAuth();
  // Scheduled Jobs is hidden from staff without the jobs.read permission.
  const { canRead: canReadJobs } = useJobsAccess();
  // Settings is hidden from staff without the settings.read permission.
  const { canRead: canReadSettings } = useSettingsAccess();
  const { canRead: canReadPreInvoices } = usePreInvoiceAccess();
  const [settingsView, setSettingsView] = useState<SettingsView>("environment");
  const navigationItems = useMemo(
    () =>
      filterGatedItems(CRM_NAVIGATION_ITEMS, {
        jobs: canReadJobs,
        settings: canReadSettings,
        "pre-invoices": canReadPreInvoices,
      }),
    [canReadJobs, canReadSettings, canReadPreInvoices],
  );
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("activeTab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchParams.get("tab") === "blogs") {
      setProductView("blogs");
      return;
    }

    const requestedView = searchParams.get("view") as ProductViewMode | null;
    if (
      requestedView &&
      ["products", "categories", "subcategories", "blogs"].includes(
        requestedView,
      )
    ) {
      setProductView((current) =>
        current === requestedView ? current : requestedView,
      );
    }
  }, [searchParams]);

  useEffect(() => {
    const routeTab = searchParams.get("tab");
    if (!routeTab) return;

    if (routeTab === "blogs") {
      setActiveTab("products");
      setProductView("blogs");
      return;
    }

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

    if (activeTab === "products") {
      return {
        label: "Product views",
        items: PRODUCT_VIEW_ITEMS,
        activeItemId: productView,
        onItemSelect: (itemId) => setProductView(itemId as ProductViewMode),
      };
    }

    if (activeTab === "commerce-admin") {
      return {
        label: "Administration",
        items: COMMERCE_ADMIN_ITEMS,
        activeItemId: commerceAdminView,
        onItemSelect: (itemId) =>
          setCommerceAdminView(itemId as CommerceAdminView),
      };
    }

    if (activeTab === "settings") {
      return {
        label: "Settings",
        items: SETTINGS_ITEMS,
        activeItemId: settingsView,
        onItemSelect: (itemId) => setSettingsView(itemId as SettingsView),
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
  }, [
    activeTab,
    aiView,
    commerceAdminView,
    customerSource,
    leadFilter,
    productView,
    settingsView,
  ]);

  const activeItemLabel =
    CRM_NAVIGATION_ITEMS.find((item) => item.id === activeTab)?.label ||
    "Dashboard";

  const handleSignOut = async () => {
    await signOut();
  };

  // Opens a record in another tab: ?tab=pre-invoices&preInvoice=<id> or
  // ?tab=quotations&quotation=<id>. The tab clears the id once it opened it.
  const openRecord = (tab: "pre-invoices" | "quotations", id: string) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    nextParams.delete("preInvoice");
    nextParams.delete("quotation");
    nextParams.set(tab === "pre-invoices" ? "preInvoice" : "quotation", id);
    setSearchParams(nextParams);
  };

  const clearRecordParam = useCallback(
    (name: "preInvoice" | "quotation") => {
      setSearchParams(
        (current) => {
          if (!current.has(name)) return current;
          const nextParams = new URLSearchParams(current);
          nextParams.delete(name);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const clearPreInvoiceParam = useCallback(
    () => clearRecordParam("preInvoice"),
    [clearRecordParam],
  );
  const clearQuotationParam = useCallback(
    () => clearRecordParam("quotation"),
    [clearRecordParam],
  );

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
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "leads" && <LeadsTab paymentFilter={leadFilter} />}
      {activeTab === "customers" && (
        <CustomersTab activeSource={customerSource} />
      )}
      {activeTab === "deals" && <DealsTab />}
      {activeTab === "activities" && <ActivitiesTab />}
      {activeTab === "invoices" && <InvoicesTab />}
      {activeTab === "products" && <ProductsTab viewMode={productView} />}
      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "whatsapp" && <WhatsAppTab />}
      {activeTab === "service-reminders" && <ServiceRemindersTab />}
      {activeTab === "stocks" && <StockTab />}
      {activeTab === "quotations" && (
        <QuotationsTab
          openId={searchParams.get("quotation")}
          onOpenHandled={clearQuotationParam}
          onOpenPreInvoice={(id) => openRecord("pre-invoices", id)}
        />
      )}
      {activeTab === "pre-invoices" && (
        <PreInvoicesTab
          openId={searchParams.get("preInvoice")}
          onOpenHandled={clearPreInvoiceParam}
          onOpenQuotation={(id) => openRecord("quotations", id)}
        />
      )}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "seo" && <SeoTab />}
      {activeTab === "ai" && <AIAssistantTab view={aiView} />}
      {activeTab === "jobs" && <JobsTab />}
      {activeTab === "commerce-admin" && (
        <CommerceAdminTab view={commerceAdminView} />
      )}
      {activeTab === "settings" && <SettingsTab view={settingsView} />}
    </CrmShell>
  );
}
