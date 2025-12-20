import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import TabInnerContent from "../Layout/tabInnerlayout";

import {
  leadsService,
  customersService,
  dealsService,
  activitiesService,
} from "../../services/apiService";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Stats {
  totalLeads: number;
  totalCustomers: number;
  totalDeals: number;
  totalRevenue: number;
  wonDeals: number;
  lostDeals: number;
  pendingActivities: number;
  completedActivities: number;
}

export default function ReportsTab() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalCustomers: 0,
    totalDeals: 0,
    totalRevenue: 0,
    wonDeals: 0,
    lostDeals: 0,
    pendingActivities: 0,
    completedActivities: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [leadsRes, customersRes, dealsRes, activitiesRes] = await Promise.all(
      [
        leadsService.getAll(),
        customersService.getAll(),
        dealsService.getAll(),
        activitiesService.getAll(),
      ],
    );

    const leads = (leadsRes?.data || []) as any[];
    const customers = (customersRes?.data || []) as any[];
    const deals = (dealsRes?.data || []) as any[];
    const activities = (activitiesRes?.data || []) as any[];

    const totalRevenue =
      deals.reduce((sum, deal) => {
        if (deal.stage === "closed_won") {
          return sum + parseFloat(deal.amount || 0);
        }
        return sum;
      }, 0) || 0;

    const wonDeals = deals.filter((d) => d.stage === "closed_won").length || 0;
    const lostDeals =
      deals.filter((d) => d.stage === "closed_lost").length || 0;
    const pendingActivities =
      activities.filter((a) => a.status === "pending").length || 0;
    const completedActivities =
      activities.filter((a) => a.status === "completed").length || 0;

    setStats({
      totalLeads: leads.length || 0,
      totalCustomers: customers.length || 0,
      totalDeals: deals.length || 0,
      totalRevenue,
      wonDeals,
      lostDeals,
      pendingActivities,
      completedActivities,
    });

    setLoading(false);
  };

  const statCards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Users,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "bg-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Deals",
      value: stats.totalDeals,
      icon: TrendingUp,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Won Deals",
      value: stats.wonDeals,
      icon: CheckCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Lost Deals",
      value: stats.lostDeals,
      icon: XCircle,
      color: "bg-red-500",
      bgColor: "bg-red-50",
    },
    {
      title: "Pending Activities",
      value: stats.pendingActivities,
      icon: Calendar,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Completed Activities",
      value: stats.completedActivities,
      icon: Target,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  // Manual icons mapping because they were removed from the top
  const IconMap: Record<string, any> = {
    "Total Leads": Users,
    "Total Customers": Users,
    "Total Deals": TrendingUp,
    "Total Revenue": DollarSign,
    "Won Deals": CheckCircle,
    "Lost Deals": XCircle,
    "Pending Activities": Calendar,
    "Completed Activities": Target,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const conversionRate =
    stats.totalDeals > 0
      ? ((stats.wonDeals / stats.totalDeals) * 100).toFixed(1)
      : 0;

  const avgDealValue =
    stats.wonDeals > 0 ? (stats.totalRevenue / stats.wonDeals).toFixed(0) : 0;

  return (
    <div>
      <TabInnerContent
        title="Reports & Analytics"
        description="Overview of your sales performance"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, index) => {
            const Icon = IconMap[card.title];
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass p-5 rounded-xl hover:shadow-lg transition-all ${card.bgColor} dark:bg-white/5`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${card.color} p-3 rounded-lg shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-black dark:text-white/60 mb-1">
                  {card.title}
                </h3>
                <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                  {card.value}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-6 border border-blue-100 dark:border-blue-500/20"
          >
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Deal Conversion Rate
            </h3>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                  {conversionRate}
                </span>
                <span className="text-2xl font-semibold text-black dark:text-white/40 mb-1">
                  %
                </span>
              </div>
              <div className="w-full bg-white dark:bg-white/10 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionRate}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-blue-600"
                />
              </div>
              <p className="text-sm text-black dark:text-white/60">
                {stats.wonDeals} won out of {stats.totalDeals} total deals
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl p-6 border border-emerald-100 dark:border-emerald-500/20"
          >
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Average Deal Value
            </h3>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold text-black dark:text-white/40 font-mono">
                  ₹
                </span>
                <span className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">
                  {parseInt(avgDealValue.toString()).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-black dark:text-white/60 mt-4">
                Based on {stats.wonDeals} closed deals
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-white dark:bg-white/5 rounded-xl p-6 border border-slate-100 dark:border-white/5 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-neutral-950 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-black dark:text-white/60" />
            Pipeline Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-sm text-black dark:text-white/60 mb-1">
                Total Pipeline Value
              </p>
              <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                ₹{stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-sm text-black dark:text-white/60 mb-1">
                Active Deals
              </p>
              <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                {stats.totalDeals - stats.wonDeals - stats.lostDeals}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-sm text-black dark:text-white/60 mb-1">
                Win Rate
              </p>
              <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                {conversionRate}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-white/5">
              <p className="text-sm text-black dark:text-white/60 mb-1">
                Task Completion
              </p>
              <p className="text-2xl font-bold text-neutral-950 dark:text-white">
                {stats.pendingActivities + stats.completedActivities > 0
                  ? (
                      (stats.completedActivities /
                        (stats.pendingActivities + stats.completedActivities)) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </p>
            </div>
          </div>
        </motion.div>
      </TabInnerContent>
    </div>
  );
}
