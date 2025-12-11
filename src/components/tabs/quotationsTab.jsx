import { useMemo } from "react";

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quotations</h2>
          <p className="text-slate-600">Drafts and sent quotations overview</p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Quotations</p>
            <p className="text-xl font-bold text-slate-900">{totals.count}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Value</p>
            <p className="text-xl font-bold text-slate-900">₹{totals.totalValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Recent Quotations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sampleQuotations.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{q.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{q.customer}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{q.date}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">{q.items}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900 font-semibold">
                    ₹{q.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        q.status === "Accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : q.status === "Sent"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
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
    </div>
  );
}
