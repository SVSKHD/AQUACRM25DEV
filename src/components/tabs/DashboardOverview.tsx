import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  leadsService,
  customersService,
  dealsService,
  invoicesService,
  productsService,
  categoriesService,
  stockService,
} from "../../services/apiService";
import priceUtils from "../../utils/priceUtils";
import { useAuth } from "../../contexts/AuthContext";
import {
  Users,
  UserPlus,
  TrendingUp,
  FileText,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  ShoppingBag,
  Layers,
  Archive,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";

interface Stats {
  totalLeads: number;
  totalCustomers: number;
  totalDeals: number;
  totalInvoices: number;
  totalProducts: number;
  totalCategories: number;
  totalStocks: number;
  totalRevenue: number;
  paidInvoices: number;
  unpaidInvoices: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalCustomers: 0,
    totalDeals: 0,
    totalInvoices: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalStocks: 0,
    totalRevenue: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    pendingInvoices: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [
      leadsResult,
      customersResult,
      dealsResult,
      invoicesResult,
      productsResult,
      categoriesResult,
      stocksResult,
    ] = (await Promise.all([
      leadsService.getAll(),
      customersService.getAll(),
      dealsService.getAll(),
      invoicesService.getAll(),
      productsService.getAll(),
      categoriesService.getAll(),
      stockService.getAllStock(),
    ])) as [
      { data: any[] },
      { data: any[] },
      { data: any[] },
      { data: any[] } | any,
      { data: any[] },
      { data: any[] },
      { data: any[] } | any,
    ];

    const leads = leadsResult.data || [];
    const customers = customersResult.data?.data || [];
    const deals = dealsResult.data || [];

    // Invoices handling
    const rawInvoices = invoicesResult.data?.data || invoicesResult || [];
    const invoices = (Array.isArray(rawInvoices) ? rawInvoices : []) as any[];

    const products = productsResult.data?.data || [];
    const categories = categoriesResult.data?.data || [];

    // Stocks handling
    const rawStocks = stocksResult.data?.data || stocksResult || [];
    const stocks = (Array.isArray(rawStocks) ? rawStocks : []) as any[];

    const calculateInvoiceTotal = (inv: any) => {
      if (Array.isArray(inv.products)) {
        return inv.products.reduce((acc: number, prod: any) => {
          return (
            acc +
            (Number(prod.productPrice) || 0) *
              (Number(prod.productQuantity) || 1)
          );
        }, 0);
      }
      return Number(inv.total_amount) || Number(inv.total) || 0;
    };

    const totalRevenue = invoices.reduce(
      (sum: number, inv: any) => sum + calculateInvoiceTotal(inv),
      0,
    );

    const paidInvoices = invoices.filter(
      (inv: any) => inv.payment_status === "paid",
    ).length;
    const unpaidInvoices = invoices.filter(
      (inv: any) =>
        inv.payment_status === "pending" || inv.payment_status === "unpaid",
    ).length;
    const pendingInvoices = invoices.filter(
      (inv: any) => inv.status === "sent",
    ).length;

    const monthlyInvoices = invoices.filter((inv: any) => {
      const date = new Date(inv.issue_date || inv.date || inv.created_at);
      return (
        date.getMonth() + 1 === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
    const monthlyRevenue = monthlyInvoices.reduce(
      (sum: number, inv: any) => sum + calculateInvoiceTotal(inv),
      0,
    );

    setStats({
      totalLeads: leads.length,
      totalCustomers: customers.length,
      totalDeals: deals.length,
      totalInvoices: invoices.length,
      totalProducts: products.length,
      totalCategories: categories.length,
      totalStocks: stocks.length,
      totalRevenue,
      paidInvoices,
      unpaidInvoices,
      pendingInvoices,
      monthlyRevenue,
    });

    setLoading(false);
  };

  const statCards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: UserPlus,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Total Customers",
      value: stats.totalInvoices,
      icon: Users,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: "Total Deals",
      value: stats.totalDeals,
      icon: TrendingUp,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
    {
      title: "Total Invoices",
      value: stats.totalInvoices,
      icon: FileText,
      color: "bg-cyan-500",
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-600",
    },
    {
      title: "Active Categories",
      value: stats.totalCategories,
      icon: Layers,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      title: "Stock Items",
      value: stats.totalStocks,
      icon: Archive,
      color: "bg-pink-500",
      bgColor: "bg-pink-50",
      textColor: "text-pink-600",
    },
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "bg-violet-500",
      bgColor: "bg-violet-50",
      textColor: "text-violet-600",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
  ];

  const invoiceStats = [
    {
      title: "Paid Invoices",
      value: stats.paidInvoices,
      icon: CheckCircle,
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: "Unpaid Invoices",
      value: stats.unpaidInvoices,
      icon: XCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-600",
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices,
      icon: Clock,
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      icon: Calendar,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="General Statistics"
        description="Welcome back! Here's what's happening with your business."
      >
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-6 transition-all group"
                  whileHover={{ y: -5, scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-lg ${stat.bgColor} dark:bg-white/10`}
                    >
                      <Icon
                        className={`w-6 h-6 ${stat.textColor} dark:text-white`}
                      />
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-black dark:text-white/60 mb-1">
                    {stat.title}
                  </h4>
                  <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-950 dark:text-white mb-4">
            Invoice Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {invoiceStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="glass-card p-6 transition-all group"
                  whileHover={{ y: -5, scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-lg ${stat.bgColor} dark:bg-white/10`}
                    >
                      <Icon
                        className={`w-6 h-6 ${stat.textColor} dark:text-white`}
                      />
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-black dark:text-white/60 mb-1">
                    {stat.title}
                  </h4>
                  <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-600 dark:bg-white/5 rounded-2xl border border-white/10 dark:border-white/5 shadow-xl p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-full">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-1">
                ₹{stats.totalRevenue.toLocaleString()}
              </h3>
              <p className="text-blue-100 text-sm mb-1 font-medium italic capitalize">
                {priceUtils.numberToWords(stats.totalRevenue)}
              </p>
              <p className="text-blue-200 text-xs uppercase tracking-wider">
                Total Business Revenue
              </p>
            </div>
          </div>
        </div>
      </TabInnerContent>
    </div>
  );
}
