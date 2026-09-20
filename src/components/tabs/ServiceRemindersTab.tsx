import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search } from "lucide-react";
import { serviceRemindersService } from "../../services/apiService";
import TabInnerContent from "../Layout/tabInnerlayout";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
  LiquidInput,
  LiquidPanel,
} from "../ui/liquid";

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

const reminderTypeOptions = [
  { value: "", label: "All types" },
  { value: "regeneration", label: "Regeneration" },
  { value: "annual-service", label: "Annual service" },
  { value: "warranty-expiry", label: "Warranty" },
];

const deliveryStatusOptions = [
  { value: "", label: "All delivery" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "confirmed", label: "Confirmed" },
];

const confirmationFilterOptions = [
  { value: "", label: "All confirmations" },
  ...confirmationOptions.map(([value, label]) => ({ value, label })),
];

const confirmationDropdownOptions = confirmationOptions.map(
  ([value, label]) => ({ value, label }),
);

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
    <TabInnerContent
      title="Service reminders"
      description="Track delivery, contact customers, and record confirmation."
    >
      <div className="space-y-5">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Total', total], ['Sent', items.filter(x => x.status === 'sent').length], ['Confirmed', items.filter(x => x.confirmationStatus === 'confirmed').length], ['Failed', items.filter(x => x.status === 'failed').length]].map(([label, value]) => (
          <LiquidPanel key={String(label)} className="p-4">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">{value}</div>
          </LiquidPanel>
        ))}
      </div>

      <LiquidPanel className="grid gap-3 p-4 lg:grid-cols-[minmax(260px,1fr)_220px_220px_220px]">
        <div className="flex min-w-0 gap-2">
          <LiquidInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applySearch()}
            placeholder="Customer, phone, invoice or product"
            wrapperClassName="min-w-0 flex-1"
          />
          <LiquidIconButton type="button" onClick={applySearch} aria-label="Search reminders">
            <Search size={18} />
          </LiquidIconButton>
        </div>
        <LiquidDropdown
          value={type}
          options={reminderTypeOptions}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
          ariaLabel="Reminder type"
        />
        <LiquidDropdown
          value={deliveryStatus}
          options={deliveryStatusOptions}
          onChange={(value) => {
            setDeliveryStatus(value);
            setPage(1);
          }}
          ariaLabel="Delivery status"
        />
        <LiquidDropdown
          value={confirmationStatus}
          options={confirmationFilterOptions}
          onChange={(value) => {
            setConfirmationStatus(value);
            setPage(1);
          }}
          ariaLabel="Confirmation status"
        />
      </LiquidPanel>

      {message && (
        <LiquidPanel className="border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          {message}
        </LiquidPanel>
      )}

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
                  <td className="p-3">
                    <LiquidDropdown
                      value={item.confirmationStatus || "unconfirmed"}
                      options={confirmationDropdownOptions}
                      onChange={(value) => void updateStatus(item._id, value)}
                      disabled={workingId === item._id}
                      ariaLabel={`Confirmation status for ${item.customerName || "customer"}`}
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      {item.confirmedBy ? `By ${item.confirmedBy} · ${formatDate(item.confirmedAt)}` : "Awaiting customer"}
                    </div>
                  </td>
                  <td className="p-3">
                    <LiquidButton
                      type="button"
                      variant="soft"
                      disabled={workingId === item._id}
                      onClick={() => void resend(item._id)}
                      className="px-3 py-2 text-sm"
                    >
                      <RefreshCw size={15} /> Resend
                    </LiquidButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-slate-700">
          <span>Page {page} of {pages} · {total} reminders</span>
          <div className="flex gap-2">
            <LiquidIconButton
              type="button"
              aria-label="Previous reminder page"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={18} />
            </LiquidIconButton>
            <LiquidIconButton
              type="button"
              aria-label="Next reminder page"
              disabled={page >= pages}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight size={18} />
            </LiquidIconButton>
          </div>
        </div>
      </div>
      </div>
    </TabInnerContent>
  );
}
