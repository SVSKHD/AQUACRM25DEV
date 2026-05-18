import TabInnerContent from "../Layout/tabInnerlayout";
import {
  Quotation,
  getQuotationStatusClassName,
  useQuotationsSummary,
} from "../../hooks/useQuotationsSummary";

const sampleQuotations: Quotation[] = [
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

const formatCurrency = (value: number): string => `₹${value.toLocaleString()}`;

export default function QuotationsTab() {
  const totals = useQuotationsSummary(sampleQuotations);

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Quotations"
        description="Drafts and sent quotations overview"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black dark:text-blue-400">
                Total Quotations
              </p>
              <p className="text-xl font-bold text-neutral-950 dark:text-white">
                {totals.count}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black dark:text-emerald-400">
                Value
              </p>
              <p className="text-xl font-bold text-neutral-950 dark:text-white">
                {formatCurrency(totals.totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden rounded-3xl border border-white/20 p-0 shadow-xl dark:border-white/10">
          <div className="border-b border-white/20 px-6 py-4 dark:border-white/10">
            <h3 className="text-xl font-bold text-neutral-950 dark:text-white">
              Recent Quotations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-400 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/10">
                {sampleQuotations.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-sm text-black dark:text-white/60">
                      {quotation.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-950 dark:text-white">
                      {quotation.customer}
                    </td>
                    <td className="px-4 py-3 text-sm text-black dark:text-white/60">
                      {quotation.date}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-black dark:text-white/60">
                      {quotation.items}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-950 dark:text-white">
                      {formatCurrency(quotation.total)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getQuotationStatusClassName(quotation.status)}`}
                      >
                        {quotation.status}
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
