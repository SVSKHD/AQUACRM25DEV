import { useMemo } from "react";
import TabInnerContent from "../Layout/tabInnerlayout";

const sampleQuotations = [
  {
    id: "Q-001",
    customer: "Arjun Sharma",
    date: "2024-08-10",
    items: 3,
    total: 54000,
    status: "Sent",
  },
  {
    id: "Q-002",
    customer: "Priya Verma",
    date: "2024-08-12",
    items: 2,
    total: 32000,
    status: "Draft",
  },
  {
    id: "Q-003",
    customer: "Kiran Rao",
    date: "2024-08-14",
    items: 4,
    total: 86500,
    status: "Accepted",
  },
];

export default function QuotationsTab() {
  const totals = useMemo(() => {
    const totalValue = sampleQuotations.reduce((sum, q) => sum + q.total, 0);
    return { count: sampleQuotations.length, totalValue };
  }, []);

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Quotations"
        description="Drafts and sent quotations overview"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-black dark:text-blue-400 uppercase tracking-wide">
                Total Quotations
              </p>
              <p className="text-xl font-bold text-neutral-950 dark:text-white">
                {totals.count}
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-black dark:text-emerald-400 uppercase tracking-wide">
                Value
              </p>
              <p className="text-xl font-bold text-neutral-950 dark:text-white">
                ₹{totals.totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden shadow-xl border border-white/20 dark:border-white/10 p-0 rounded-3xl">
          <div className="px-6 py-4 border-b border-white/20 dark:border-white/10">
            <h3 className="text-xl font-bold text-neutral-950 dark:text-white">
              Recent Quotations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-gray-400 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/10">
                {sampleQuotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-black dark:text-white/60">
                      {q.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-950 dark:text-white font-medium">
                      {q.customer}
                    </td>
                    <td className="px-4 py-3 text-sm text-black dark:text-white/60">
                      {q.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-black dark:text-white/60">
                      {q.items}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-neutral-950 dark:text-white font-semibold">
                      ₹{q.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                          q.status === "Accepted"
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                            : q.status === "Sent"
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400"
                              : "bg-slate-100 dark:bg-white/10 text-black dark:text-white/60"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabInnerContent>
    </div>
  );
}
