import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  leadsService,
  customersService,
  dealsService,
  invoicesService,
  productsService,
} from "../../services/apiService";
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
} from "lucide-react";

interface Stats {
  totalLeads: number;
  totalCustomers: number;
  totalDeals: number;
  totalInvoices: number;
  totalProducts: number;
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
    ] = await Promise.all([
      leadsService.getAll(),
      customersService.getAll(),
      dealsService.getAll(),
      invoicesService.getAll(),
      productsService.getAll(),
    ]);

    const leads = leadsResult.data || [];
    const customers = customersResult.data || [];
    const deals = dealsResult.data || [];
    const invoices = invoicesResult.data || [];
    const products = productsResult.data || [];

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0,
    );

    const paidInvoices = invoices.filter(
      (inv) => inv.payment_status === "paid",
    ).length;
    const unpaidInvoices = invoices.filter(
      (inv) => inv.payment_status === "pending",
    ).length;
    const pendingInvoices = invoices.filter(
      (inv) => inv.status === "sent",
    ).length;

    const monthlyInvoices = invoices.filter((inv) => {
      const date = new Date(inv.issue_date);
      return (
        date.getMonth() + 1 === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
    const monthlyRevenue = monthlyInvoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0,
    );

    setStats({
      totalLeads: leads.length,
      totalCustomers: customers.length,
      totalDeals: deals.length,
      totalInvoices: invoices.length,
      totalProducts: products.length,
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
      value: stats.totalCustomers,
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Dashboard Overview
        </h2>
        <p className="text-slate-600">
          Welcome back! Here's what's happening with your business.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          General Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-slate-600 mb-1">
                  {stat.title}
                </h4>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
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
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-slate-600 mb-1">
                  {stat.title}
                </h4>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-1">
              ₹{stats.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-blue-100">Total Business Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
