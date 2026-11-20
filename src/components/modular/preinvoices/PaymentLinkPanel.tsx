import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ExternalLink,
  Link2,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldOff,
} from "lucide-react";
import { useToast } from "../../Toast";
import { LiquidBadge, LiquidButton, LiquidPanel } from "../../ui/liquid";
import PaymentLinkUrlDialog, { type OneTimeLink } from "./PaymentLinkUrlDialog";
import { paymentLinksService } from "../../../services/paymentLinksService";
import { getAdminInvoicePath } from "../../../utils/invoiceViews";
import { formatDocDateTime, formatInr } from "../../../utils/preInvoice";
import {
  conversionLabel,
  LINK_STATUS_LABELS,
  RECONCILABLE_CONVERSIONS,
  shouldPollLink,
  paymentLinkErrorMessage,
  preInvoiceIdFromError,
  reviewFlagInfo,
  toneClass,
  type PaymentLinkSourceKind,
  type PaymentLinkState,
} from "../../../utils/paymentLink";

// Payment-link panel for a pre-invoice or a quotation. Links are paid
// asynchronously, so the state is fetched when the panel opens and polled
// while it stays open (only while something can still change).

const POLL_MS = 10_000;

type Confirm = "regenerate" | "revoke" | null;

export type PaymentLinkViewProps = {
  link: PaymentLinkState | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  /** Why a new link can't be made (e.g. "Pre-invoice is cancelled"); null = allowed. */
  blockedReason: string | null;
  busy: "create" | "revoke" | "reconcile" | "send" | null;
  confirm: Confirm;
  canReconcileHere: boolean;
  onCreate: () => void;
  onAskConfirm: (confirm: Exclude<Confirm, null>) => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onRefresh: () => void;
  onReconcile: () => void;
  /** "Send to customer": the server re-sends the active link on WhatsApp. */
  onSend?: () => void;
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
    <span className="text-slate-500 dark:text-white/50">{label}</span>
    <span className="text-right font-semibold text-neutral-950 dark:text-white">
      {children}
    </span>
  </div>
);

/** Presentational (no requests), so every state is testable. */
export function PaymentLinkView({
  link,
  loading,
  error,
  canManage,
  blockedReason,
  busy,
  confirm,
  canReconcileHere,
  onCreate,
  onAskConfirm,
  onCancelConfirm,
  onConfirm,
  onRefresh,
  onReconcile,
  onSend,
}: PaymentLinkViewProps) {
  if (!canManage)
    return (
      <LiquidPanel className="p-4 text-sm text-slate-600 dark:text-white/60">
        You need the <code className="font-mono">payments.link.manage</code>{" "}
        permission to see or create payment links.
      </LiquidPanel>
    );

  const status = link ? LINK_STATUS_LABELS[link.status] : null;
  const conversion = link ? conversionLabel(link) : null;
  const outdated = link?.status === "active" && link.matchesDocument === false;
  const active = link?.status === "active";
  const paid = link?.status === "paid";
  const needsReconcile =
    link && RECONCILABLE_CONVERSIONS.includes(link.conversion.status);

  return (
    <LiquidPanel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600 dark:text-white/60">
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Payment link
        </h3>
        <LiquidButton
          type="button"
          variant="ghost"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh payment link status"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </LiquidButton>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {!link && !loading && !error && (
        <p className="text-sm text-slate-600 dark:text-white/60">
          No payment link yet.
        </p>
      )}

      {link && status && (
        <div className="divide-y divide-slate-200/70 dark:divide-white/10">
          <Row label="Status">
            <LiquidBadge className={toneClass[status.tone]}>
              {status.label}
            </LiquidBadge>
          </Row>
          <Row label="Amount">{formatInr(link.amount)}</Row>
          <Row label={active ? "Expires" : "Expired / ends"}>
            {formatDocDateTime(link.expiresAt)}
          </Row>
          <Row label="Created">{formatDocDateTime(link.createdAt)}</Row>
          <Row label="Customer">
            {link.boundToCustomer
              ? "Signed in and confirmed details"
              : "Hasn't opened it yet"}
          </Row>
          {paid && (
            <>
              <Row label="Paid">
                {formatInr(link.amountPaid ?? link.amount)} ·{" "}
                {formatDocDateTime(link.paidAt)}
              </Row>
              {link.gatewayTransactionId && (
                <Row label="Transaction">
                  <span className="font-mono text-xs">
                    {link.gatewayTransactionId}
                  </span>
                </Row>
              )}
            </>
          )}
          {conversion && (
            <Row label="Invoice">
              <LiquidBadge className={toneClass[conversion.tone]}>
                {conversion.label}
              </LiquidBadge>
            </Row>
          )}
        </div>
      )}

      {link?.conversion.status === "done" && link.conversion.invoiceId && (
        <a
          href={getAdminInvoicePath(link.conversion.invoiceId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:underline dark:text-sky-300"
        >
          Open invoice {link.conversion.invoiceNo || ""}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}

      {conversion?.hint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p>{conversion.hint}</p>
          {link?.conversion.lastError && (
            <p className="mt-1 font-mono text-xs">
              Last error: {link.conversion.lastError}
            </p>
          )}
          {needsReconcile &&
            (canReconcileHere ? (
              <LiquidButton
                type="button"
                variant="soft"
                className="mt-2"
                requestState={busy === "reconcile" ? "loading" : "idle"}
                loadingLabel="Retrying…"
                onClick={onReconcile}
              >
                <RotateCcw className="h-4 w-4" />
                Retry invoice
              </LiquidButton>
            ) : (
              <p className="mt-1 text-xs">
                Someone with the payments.reconcile permission can retry it
                here, or from Commerce admin → Payments (source CRM_OFFLINE).
              </p>
            ))}
        </div>
      )}

      {link?.reviewFlags.length ? (
        <ul className="space-y-2" aria-label="Review flags">
          {link.reviewFlags.map((flag) => {
            const info = reviewFlagInfo(flag);
            return (
              <li
                key={flag}
                className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <LiquidBadge className={toneClass.bad}>
                    {info.label}
                  </LiquidBadge>{" "}
                  {info.explanation}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {outdated && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
        >
          The document changed after this link was created, so the link no
          longer works. Regenerate the link and send the new one.
        </div>
      )}

      {confirm ? (
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
          <p className="font-semibold text-neutral-950 dark:text-white">
            {confirm === "regenerate"
              ? "Regenerate the link? The old link stops working."
              : "Revoke the link? The customer can no longer pay with it."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <LiquidButton
              type="button"
              variant={confirm === "revoke" ? "danger" : "primary"}
              requestState={busy ? "loading" : "idle"}
              onClick={onConfirm}
            >
              {confirm === "regenerate" ? "Regenerate" : "Revoke"}
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="ghost"
              disabled={Boolean(busy)}
              onClick={onCancelConfirm}
            >
              Keep it
            </LiquidButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!paid &&
            (active ? (
              <LiquidButton
                type="button"
                variant={outdated ? "primary" : "soft"}
                disabled={Boolean(blockedReason) || Boolean(busy)}
                onClick={() => onAskConfirm("regenerate")}
              >
                <RotateCcw className="h-4 w-4" />
                Regenerate link
              </LiquidButton>
            ) : (
              <LiquidButton
                type="button"
                variant="primary"
                disabled={Boolean(blockedReason) || loading}
                requestState={busy === "create" ? "loading" : "idle"}
                loadingLabel="Creating…"
                onClick={onCreate}
              >
                <Link2 className="h-4 w-4" />
                {link ? "Create new link" : "Create payment link"}
              </LiquidButton>
            ))}
          {active && !outdated && onSend && (
            <LiquidButton
              type="button"
              variant="soft"
              disabled={Boolean(busy) && busy !== "send"}
              requestState={busy === "send" ? "loading" : "idle"}
              loadingLabel="Sending…"
              onClick={onSend}
            >
              <Send className="h-4 w-4" />
              Send to customer
            </LiquidButton>
          )}
          {active && (
            <LiquidButton
              type="button"
              variant="danger"
              disabled={Boolean(busy)}
              onClick={() => onAskConfirm("revoke")}
            >
              <ShieldOff className="h-4 w-4" />
              Revoke
            </LiquidButton>
          )}
        </div>
      )}
      {blockedReason && !paid && (
        <p className="text-xs text-slate-500 dark:text-white/50">
          {blockedReason}
        </p>
      )}
    </LiquidPanel>
  );
}

export default function PaymentLinkPanel({
  kind,
  sourceId,
  customerName,
  customerPhone,
  canManage,
  canReconcile,
  blockedReason = null,
  onLinkChange,
  onUsePreInvoice,
}: {
  kind: PaymentLinkSourceKind;
  sourceId: string;
  customerName: string;
  customerPhone: string;
  canManage: boolean;
  canReconcile: boolean;
  blockedReason?: string | null;
  /** Called with each fetched state (e.g. to refresh the parent document when paid). */
  onLinkChange?: (link: PaymentLinkState | null) => void;
  /** USE_PRE_INVOICE: the quotation was moved; open its pre-invoice. */
  onUsePreInvoice?: (preInvoiceId: string) => void;
}) {
  const { showToast } = useToast();
  const [link, setLink] = useState<PaymentLinkState | null>(null);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PaymentLinkViewProps["busy"]>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [created, setCreated] = useState<OneTimeLink | null>(null);
  const onLinkChangeRef = useRef(onLinkChange);
  onLinkChangeRef.current = onLinkChange;

  const load = useCallback(
    async (quiet = false) => {
      if (!canManage) return;
      if (!quiet) setLoading(true);
      const response = await paymentLinksService.get(kind, sourceId);
      setLoading(false);
      if (response.error) {
        if (!quiet) setError(paymentLinkErrorMessage(response));
        return;
      }
      setError(null);
      setLink(response.data ?? null);
      onLinkChangeRef.current?.(response.data ?? null);
    },
    [canManage, kind, sourceId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while open; also keeps checking while the one-time dialog is shown.
  useEffect(() => {
    if (!canManage || !(shouldPollLink(link) || created)) return;
    const timer = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [canManage, link, created, load]);

  const fail = (response: Parameters<typeof paymentLinkErrorMessage>[0]) => {
    const message = paymentLinkErrorMessage(response);
    setError(message);
    showToast(message, "error");
    const preInvoiceId = preInvoiceIdFromError(response);
    if (response.code === "USE_PRE_INVOICE" && preInvoiceId)
      onUsePreInvoice?.(preInvoiceId);
  };

  const create = async () => {
    setBusy("create");
    const response = await paymentLinksService.create(kind, sourceId);
    setBusy(null);
    setConfirm(null);
    if (response.error || !response.data) {
      fail(response);
      return;
    }
    setError(null);
    setLink(response.data.link);
    onLinkChangeRef.current?.(response.data.link);
    const { customerNotification } = response.data;
    if (customerNotification === "queued")
      showToast(
        "Payment link created and sent to the customer on WhatsApp",
        "success",
      );
    else if (customerNotification === "not_configured")
      showToast(
        "Payment link created. WhatsApp sending isn't set up on the server; share it manually.",
        "info",
      );
    setCreated({
      url: response.data.url,
      link: response.data.link,
      customerName,
      customerPhone,
      customerNotification,
    });
  };

  const send = async () => {
    setBusy("send");
    const response = await paymentLinksService.send(kind, sourceId);
    setBusy(null);
    if (response.error) {
      fail(response);
      return;
    }
    setError(null);
    showToast("Payment link sent to the customer on WhatsApp", "success");
    if (response.data?.link) {
      setLink(response.data.link);
      onLinkChangeRef.current?.(response.data.link);
    }
  };

  const revoke = async () => {
    setBusy("revoke");
    const response = await paymentLinksService.revoke(kind, sourceId);
    setBusy(null);
    setConfirm(null);
    if (response.error) {
      fail(response);
      return;
    }
    showToast("Payment link revoked", "success");
    void load();
  };

  const reconcile = async () => {
    if (!link?.paidAttemptId) return;
    setBusy("reconcile");
    const response = await paymentLinksService.reconcile(link.paidAttemptId);
    setBusy(null);
    if (response.error) {
      showToast(response.error, "error");
      return;
    }
    showToast("Payment reconciled; checking the invoice…", "success");
    void load();
  };

  return (
    <>
      <PaymentLinkView
        link={link}
        loading={loading}
        error={error}
        canManage={canManage}
        blockedReason={blockedReason}
        busy={busy}
        confirm={confirm}
        canReconcileHere={canReconcile && Boolean(link?.paidAttemptId)}
        onCreate={() => void create()}
        onAskConfirm={setConfirm}
        onCancelConfirm={() => setConfirm(null)}
        onConfirm={() => void (confirm === "revoke" ? revoke() : create())}
        onRefresh={() => void load()}
        onReconcile={() => void reconcile()}
        onSend={() => void send()}
      />
      {created && (
        <PaymentLinkUrlDialog
          created={created}
          onClose={() => setCreated(null)}
        />
      )}
    </>
  );
}
