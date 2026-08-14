import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  MessageCircle,
  RefreshCw,
  SkipForward,
  XCircle,
} from "lucide-react";
import { invoicesService } from "../../../services/apiService";
import { useToast } from "../../Toast";
import { LiquidButton, LiquidPanel } from "../../ui/liquid";

type Preview = Awaited<
  ReturnType<typeof invoicesService.previewHistoricalBackfill>
>["data"];
type Batch = Awaited<
  ReturnType<typeof invoicesService.runHistoricalBackfill>
>["data"];

const batchOptions = [5, 10, 20];

export default function InvoiceBackfillPanel() {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [preview, setPreview] = useState<Preview>();
  const [lastBatch, setLastBatch] = useState<Batch>();

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await invoicesService.previewHistoricalBackfill();
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to check historical invoices");
      }
      setPreview(response.data);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load preview",
        "error",
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const togglePanel = () => {
    setExpanded((current) => !current);
    if (!expanded && !preview) void loadPreview();
  };

  const runBatch = async () => {
    if (!confirmed || sending) return;
    setSending(true);
    try {
      const response = await invoicesService.runHistoricalBackfill(batchSize);
      if (response.error || !response.data) {
        throw new Error(response.error || "Historical delivery failed");
      }
      setLastBatch(response.data);
      setPreview((current) =>
        current
          ? { ...current, eligibleCount: response.data?.remainingCount || 0 }
          : current,
      );
      setConfirmed(false);
      showToast(
        `${response.data.summary.sent} invoice message${response.data.summary.sent === 1 ? "" : "s"} accepted by Fast2SMS`,
        response.data.summary.failed ? "error" : "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to send this batch",
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <LiquidPanel className="overflow-hidden">
      <button
        type="button"
        onClick={togglePanel}
        className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <History className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-black text-neutral-950 dark:text-white">
              Historical invoice delivery
            </span>
            <span className="block text-xs text-slate-500 dark:text-white/50">
              Enrich older customers and send invoices in controlled batches.
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {preview && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              {preview.eligibleCount} remaining
            </span>
          )}
          <ChevronDown
            className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/50 p-4 dark:border-white/10 sm:p-5">
          {loadingPreview && !preview ? (
            <div className="flex items-center gap-2 py-6 text-sm font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking delivery history…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Ready to process"
                  value={String(preview?.eligibleCount || 0)}
                  icon={<MessageCircle className="h-4 w-4" />}
                />
                <Metric
                  label="Already processed"
                  value={String(preview?.processedCount || 0)}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <Metric
                  label="Last batch accepted"
                  value={String(lastBatch?.summary.sent || 0)}
                  icon={<RefreshCw className="h-4 w-4" />}
                />
              </div>

              <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    “Accepted” means Fast2SMS accepted the request. Delivered and
                    read confirmation requires the provider webhook.
                  </p>
                </div>
              </div>

              {(preview?.eligibleCount || 0) > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl bg-white/50 p-4 dark:bg-white/5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                      Batch size
                      <select
                        value={batchSize}
                        onChange={(event) => setBatchSize(Number(event.target.value))}
                        className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-neutral-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      >
                        {batchOptions.map((size) => (
                          <option key={size} value={size}>
                            {size} invoices
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex max-w-xl items-start gap-2 text-sm font-semibold text-slate-700 dark:text-white/70">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="mt-1 h-4 w-4 accent-emerald-500"
                      />
                      I confirm these customers should receive their historical
                      invoice on WhatsApp.
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LiquidButton
                      variant="soft"
                      onClick={loadPreview}
                      disabled={loadingPreview || sending}
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingPreview ? "animate-spin" : ""}`} />
                      Refresh
                    </LiquidButton>
                    <LiquidButton
                      variant="primary"
                      onClick={runBatch}
                      disabled={!confirmed || sending}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                      {sending ? "Processing…" : `Send next ${batchSize}`}
                    </LiquidButton>
                  </div>
                </div>
              )}

              {lastBatch && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Result label="Accepted" value={lastBatch.summary.sent} tone="green" />
                    <Result label="Skipped" value={lastBatch.summary.skipped} tone="amber" />
                    <Result label="Failed" value={lastBatch.summary.failed} tone="red" />
                    <Result label="Enriched" value={lastBatch.summary.enriched} tone="blue" />
                    <Result label="Linked" value={lastBatch.summary.customersLinked} tone="violet" />
                  </div>
                  <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
                    {lastBatch.results.map((result) => (
                      <div
                        key={result.invoiceId}
                        className="flex items-center justify-between gap-3 border-b border-slate-200/60 px-3 py-2.5 text-sm last:border-0 dark:border-white/10"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-neutral-950 dark:text-white">
                            {result.invoiceNo || result.invoiceId}
                          </p>
                          <p className="text-xs text-slate-500">
                            {result.customerLinked ? "Customer linked" : "Invoice enriched"}
                            {result.reason ? ` · ${result.reason}` : ""}
                            {result.errorCode ? ` · ${result.errorCode}` : ""}
                          </p>
                        </div>
                        <Status status={result.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview?.eligibleCount === 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle2 className="h-5 w-5" /> All eligible historical
                  invoices have been processed.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </LiquidPanel>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/55 p-4 dark:bg-white/5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">{value}</p>
    </div>
  );
}

const tones = {
  green: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  red: "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200",
  blue: "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200",
  violet: "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200",
};

function Result({ label, value, tone }: { label: string; value: number; tone: keyof typeof tones }) {
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function Status({ status }: { status: "sent" | "skipped" | "failed" }) {
  const meta = {
    sent: { label: "Accepted", icon: CheckCircle2, className: "text-emerald-600" },
    skipped: { label: "Skipped", icon: SkipForward, className: "text-amber-600" },
    failed: { label: "Failed", icon: XCircle, className: "text-rose-600" },
  }[status];
  const Icon = meta.icon;
  return (
    <span className={`flex shrink-0 items-center gap-1 text-xs font-black ${meta.className}`}>
      <Icon className="h-4 w-4" /> {meta.label}
    </span>
  );
}
