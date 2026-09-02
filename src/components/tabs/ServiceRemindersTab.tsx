import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search } from "lucide-react";
import { serviceRemindersService } from "../../services/apiService";

type Reminder = {
  _id: string;
  invoiceId: string;
  invoiceNo?: string;
  customerName?: string;
  customerPhone?: string;
  productName: string;
  reminderType: "regeneration" | "annual-service" | "warranty-expiry";
  dueDate: string;
  status: "pending" | "sent" | "failed" | "confirmed";
  confirmationStatus: string;
  confirmationNotes?: string;
  confirmedBy?: "customer" | "staff";
  confirmedAt?: string;
  lastSentAt?: string;
  attemptCount: number;
  errorCode?: string;
};

const confirmationOptions = [
  ["unconfirmed", "Unconfirmed"],
  ["confirmed", "Confirmed"],
  ["service-required", "Service required"],
  ["completed", "Completed"],
  ["not-required", "Not required"],
  ["no-response", "No response"],
] as const;

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export default function ServiceRemindersTab() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [confirmationStatus, setConfirmationStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await serviceRemindersService.getAll({
      page, limit: 10, search: query, type, deliveryStatus, confirmationStatus,
    });
    if (error) setMessage(error);
    else {
      const response = data as { data: Reminder[]; pagination: { pages: number; total: number } };
      setItems(response.data || []);
      setPages(response.pagination?.pages || 1);
      setTotal(response.pagination?.total || 0);
    }
    setLoading(false);
  }, [page, query, type, deliveryStatus, confirmationStatus]);

  useEffect(() => { void load(); }, [load]);

  const applySearch = () => { setPage(1); setQuery(search.trim()); };

  const updateStatus = async (id: string, status: string) => {
    setWorkingId(id);
    const notes = window.prompt("Optional confirmation notes") || "";
    const { error } = await serviceRemindersService.updateConfirmation(id, status, notes);
    setMessage(error || "Confirmation updated.");
    setWorkingId("");
    if (!error) await load();
  };

  const resend = async (id: string) => {
    setWorkingId(id);
    const { error } = await serviceRemindersService.resend(id);
    setMessage(error || "WhatsApp reminder resent.");
    setWorkingId("");
    if (!error) await load();
  };

  return (
    <div className="space-y-5 p-1 sm:p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Service reminders</h1>
        <p className="text-sm text-slate-500">Track delivery, contact customers, and record confirmation.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Total', total], ['Sent', items.filter(x => x.status === 'sent').length], ['Confirmed', items.filter(x => x.confirmationStatus === 'confirmed').length], ['Failed', items.filter(x => x.status === 'failed').length]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs uppercase text-slate-500">{label}</div><div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-[240px] flex-1 rounded-lg border bg-white dark:bg-slate-900">
          <input className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applySearch()} placeholder="Customer, phone, invoice or product" />
          <button className="px-3" onClick={applySearch} aria-label="Search"><Search size={18} /></button>
        </div>
        <select className="rounded-lg border bg-white px-3 py-2 dark:bg-slate-900" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">All types</option><option value="regeneration">Regeneration</option><option value="annual-service">Annual service</option><option value="warranty-expiry">Warranty</option></select>
        <select className="rounded-lg border bg-white px-3 py-2 dark:bg-slate-900" value={deliveryStatus} onChange={e => { setDeliveryStatus(e.target.value); setPage(1); }}><option value="">All delivery</option><option value="pending">Pending</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="confirmed">Confirmed</option></select>
        <select className="rounded-lg border bg-white px-3 py-2 dark:bg-slate-900" value={confirmationStatus} onChange={e => { setConfirmationStatus(e.target.value); setPage(1); }}><option value="">All confirmations</option>{confirmationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>

      {message && <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">{message}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="min-h-[560px] overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="p-3">Customer</th><th className="p-3">Invoice / Product</th><th className="p-3">Reminder</th><th className="p-3">Delivery</th><th className="p-3">Confirmation</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? <tr><td colSpan={6} className="p-10 text-center">Loading reminders…</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">No reminders found.</td></tr> : items.map(item => (
                <tr key={item._id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3"><strong>{item.customerName || 'Customer'}</strong><div className="text-slate-500">{item.customerPhone || 'No phone'}</div></td>
                  <td className="p-3"><div>{item.productName}</div><a className="inline-flex items-center gap-1 text-blue-600" href={`/admin/invoice/${item.invoiceId}`} target="_blank" rel="noreferrer">{item.invoiceNo || 'View invoice'} <ExternalLink size={13} /></a></td>
                  <td className="p-3"><div className="capitalize">{item.reminderType.replaceAll('-', ' ')}</div><div className="text-slate-500">Due {formatDate(item.dueDate)}</div></td>
                  <td className="p-3"><span className="capitalize">{item.status}</span><div className="text-slate-500">{item.attemptCount || 0} attempt(s)</div>{item.errorCode && <div className="max-w-[180px] text-xs text-red-600">{item.errorCode}</div>}</td>
                  <td className="p-3"><select disabled={workingId === item._id} className="rounded border bg-transparent p-2" value={item.confirmationStatus || 'unconfirmed'} onChange={e => void updateStatus(item._id, e.target.value)}>{confirmationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="mt-1 text-xs text-slate-500">{item.confirmedBy ? `By ${item.confirmedBy} · ${formatDate(item.confirmedAt)}` : 'Awaiting customer'}</div></td>
                  <td className="p-3"><button disabled={workingId === item._id} onClick={() => void resend(item._id)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={15} /> Resend</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-700"><span>Page {page} of {pages} · {total} reminders</span><div className="flex gap-2"><button className="rounded border p-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={18} /></button><button className="rounded border p-2 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={18} /></button></div></div>
      </div>
    </div>
  );
}
