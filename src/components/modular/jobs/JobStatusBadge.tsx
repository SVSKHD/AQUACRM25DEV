import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { JobStatus } from "../../../services/jobsService";

const STYLES: Record<JobStatus, string> = {
  running:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/20",
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/20",
  failed:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-400/20",
};

const LABELS: Record<JobStatus, string> = {
  running: "Running",
  success: "Success",
  failed: "Failed",
};

export default function JobStatusBadge({
  status,
  title,
}: {
  status: JobStatus | null;
  title?: string;
}) {
  if (!status)
    return (
      <span className="text-xs text-slate-400 dark:text-white/40">
        Never run
      </span>
    );
  const Icon =
    status === "running"
      ? Loader2
      : status === "success"
        ? CheckCircle2
        : XCircle;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${STYLES[status]} ${title ? "cursor-help" : ""}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {LABELS[status]}
    </span>
  );
}

export function BuiltInBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-200">
      Built-in
    </span>
  );
}
