import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSearch,
  LockKeyhole,
  Search,
  ReceiptText,
  User,
  Phone,
  Mail,
  CalendarDays,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { invoicesService } from "../services/apiService";

const SERVICE_TOKEN_KEY = "aquakart_service_token";

const getInvoiceId = (invoice: any) =>
  String(invoice?._id || invoice?.id || "").trim();

const formatDate = (value: unknown) => {
  if (!value) return "Not available";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ServicePage() {
  const navigate = useNavigate();
  const [serviceToken, setServiceToken] = useState(
    () => sessionStorage.getItem(SERVICE_TOKEN_KEY) || "",
  );
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [query, setQuery] = useState("");
  const [invoice, setInvoice] = useState<any>(null);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);

  const unlocked = Boolean(serviceToken);
  const invoiceId = useMemo(() => getInvoiceId(invoice), [invoice]);

  const unlockService = async (event: FormEvent) => {
    event.preventDefault();
    setPasscodeError("");
    setLoading(true);

    try {
      const result = await invoicesService.verifyServicePin(passcode);
      const token = result.data?.token;

      if (result.error || !token) {
        setPasscodeError(result.error || "Incorrect service PIN.");
        setPasscode("");
        return;
      }

      sessionStorage.setItem(SERVICE_TOKEN_KEY, token);
      setServiceToken(token);
      setPasscode("");
    } finally {
      setLoading(false);
    }
  };

  const findInvoice = async (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value || !serviceToken) return;

    setLoading(true);
    setSearchError("");
    setInvoice(null);

    try {
      const result = await invoicesService.findServiceInvoice(
        value,
        serviceToken,
      );

      if (result.error) {
        if (/expired|authentication required/i.test(result.error)) {
          sessionStorage.removeItem(SERVICE_TOKEN_KEY);
          setServiceToken("");
          setPasscodeError("Service session expired. Enter the PIN again.");
        } else {
          setSearchError(result.error);
        }
        return;
      }

      if (!result.data) {
        setSearchError("No invoice found for that invoice number, phone or ID.");
        return;
      }

      setInvoice(result.data);
    } finally {
      setLoading(false);
    }
  };

  const lockService = () => {
    sessionStorage.removeItem(SERVICE_TOKEN_KEY);
    setServiceToken("");
    setPasscode("");
    setInvoice(null);
    setQuery("");
    setSearchError("");
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 ring-1 ring-emerald-300/20">
            <LockKeyhole className="h-8 w-8 text-emerald-300" />
          </div>

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
              Aquakart Service
            </p>
            <h1 className="mt-3 text-3xl font-black text-white">
              Enter service PIN
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              No CRM login is required. Enter the service PIN to find and
              download customer invoices.
            </p>
          </div>

          <form onSubmit={unlockService} className="mt-8 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              autoComplete="off"
              value={passcode}
              onChange={(event) =>
                setPasscode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Service PIN"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-center text-2xl font-bold tracking-[0.35em] text-white outline-none transition focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
            />

            {passcodeError ? (
              <p className="text-center text-sm font-semibold text-rose-400">
                {passcodeError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !passcode}
              className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Checking..." : "Unlock invoices"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
              Aquakart Service
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              Find invoice
            </h1>
          </div>
          <button
            type="button"
            onClick={lockService}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Lock
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.22em]">
                Service invoice access
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              Find and download an invoice.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Search by invoice number, 10-digit phone number, or invoice ID.
            </p>
          </div>

          <form
            onSubmit={findInvoice}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <FileSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="find-invoice"
                name="find-invoice"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Invoice no, phone or invoice ID"
                className="w-full rounded-2xl border border-white/10 bg-white px-12 py-4 font-semibold text-slate-950 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              <Search className="h-5 w-5" />
              {loading ? "Finding..." : "Find invoice"}
            </button>
          </form>
        </section>

        {searchError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {searchError}
          </div>
        ) : null}

        {invoice ? (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 bg-slate-50 p-6 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <ReceiptText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Invoice found
                    </p>
                    <h3 className="text-xl font-black text-slate-950">
                      {invoice.invoiceNo || invoice.invoice_no || invoiceId}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {invoice.gst ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      GST
                    </span>
                  ) : null}
                  {invoice.po ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      Purchase order
                    </span>
                  ) : null}
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">
                    {invoice.paidStatus || invoice.paid_status || "Invoice"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-7">
              <div className="rounded-2xl bg-slate-50 p-4">
                <User className="h-4 w-4 text-slate-400" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Customer
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {invoice.customerDetails?.name || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <Phone className="h-4 w-4 text-slate-400" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Phone
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {invoice.customerDetails?.phone || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <Mail className="h-4 w-4 text-slate-400" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Email
                </p>
                <p className="mt-1 truncate font-bold text-slate-900">
                  {invoice.customerDetails?.email || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Date
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  {formatDate(invoice.date || invoice.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <p className="text-sm text-slate-500">
                {Array.isArray(invoice.products) ? invoice.products.length : 0}{" "}
                product(s) on this invoice.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setInvoice(null);
                    setQuery("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Search another
                </button>
                <button
                  type="button"
                  disabled={!invoiceId}
                  onClick={() => navigate(`/service/invoice/${invoiceId}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  View & download invoice
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
