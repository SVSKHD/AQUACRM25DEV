import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle,
  CheckSquare,
  Clock,
  CreditCard,
  FileText,
  Grid3x3,
  Layers,
  LayoutDashboard,
  List,
  Package,
  ShoppingCart,
  TrendingUp,
  User,
  UserPlus,
  Users,
  ShieldCheck,
  TicketPercent,
  UserCog,
  WalletCards,
  ScrollText,
  SearchCheck,
  Wrench,
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
  | "service-reminders"
  | "reports"
  | "commerce-admin";

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
  { id: "service-reminders", label: "Service Reminders", icon: Wrench },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "commerce-admin", label: "Commerce Admin", icon: ShieldCheck },
];

const COMMERCE_ADMIN_ITEMS: CrmNavigationItem[] = [
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "staff", label: "Staff", icon: UserCog },
  { id: "coupons", label: "Coupons", icon: TicketPercent },
  { id: "referrals", label: "Referrals", icon: Users },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "audit", label: "Audit logs", icon: ScrollText },
  { id: "seo", label: "SEO", icon: SearchCheck },
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
  const [commerceAdminView, setCommerceAdminView] =
    useState<CommerceAdminView>("coupons");
  const { signOut, user, lock } = useAuth();
  const { theme, toggleTheme } = useTheme();

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

    if (activeTab === "commerce-admin") {
      return {
        label: "Administration",
        items: COMMERCE_ADMIN_ITEMS,
        activeItemId: commerceAdminView,
        onItemSelect: (itemId) =>
          setCommerceAdminView(itemId as CommerceAdminView),
      };
    }

    return undefined;
  }, [activeTab, commerceAdminView, customerSource, leadFilter, productView]);

  const activeItemLabel =
    CRM_NAVIGATION_ITEMS.find((item) => item.id === activeTab)?.label ||
    "Dashboard";

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
      navigationItems={CRM_NAVIGATION_ITEMS}
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
      {activeTab === "agents" && <ProductsTab viewMode={productView} />}
      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "service-reminders" && <ServiceRemindersTab />}
      {activeTab === "stocks" && <StockTab />}
      {activeTab === "quotations" && <QuotationsTab />}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "commerce-admin" && (
        <CommerceAdminTab view={commerceAdminView} />
      )}
    </CrmShell>
  );
}
