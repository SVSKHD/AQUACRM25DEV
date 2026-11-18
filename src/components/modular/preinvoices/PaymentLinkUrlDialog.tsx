import { useState } from "react";
import { Check, Copy, MessageCircle, ShieldAlert } from "lucide-react";
import SidebarDialog from "../../ui/SidebarDialog";
import { LiquidButton } from "../../ui/liquid";
import { formatDocDateTime, formatInr } from "../../../utils/preInvoice";
import {
  whatsappShareUrl,
  type PaymentLinkState,
} from "../../../utils/paymentLink";

// Shows a freshly created pay URL once. The backend stores only its hash, so
// this is the only place it ever appears. It lives in the parent's dialog
// state and is dropped when the dialog closes; never log or store it.

export type OneTimeLink = {
  url: string;
  link: PaymentLinkState;
  customerName: string;
  customerPhone: string;
};

export default function PaymentLinkUrlDialog({
  created,
  onClose,
  copyText = (text) => navigator.clipboard.writeText(text),
  openWindow = (url) => window.open(url, "_blank", "noopener,noreferrer"),
}: {
  created: OneTimeLink;
  onClose: () => void;
  copyText?: (text: string) => Promise<void>;
  openWindow?: (url: string) => void;
}) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const { url, link } = created;
  const share = whatsappShareUrl({
    phone: created.customerPhone,
    customerName: created.customerName,
    documentNumber: link.source.number,
    amount: formatInr(link.amount),
    url,
  });

  const copy = async () => {
    try {
      await copyText(url);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <SidebarDialog
      open
      onClose={onClose}
      title="Payment link created"
      description={`${link.source.number || "Document"} · ${formatInr(link.amount)}`}
      widthStorageKey="aquacrm:payment-link-url-width"
      size="sm"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <LiquidButton type="button" variant="primary" onClick={onClose}>
            Done
          </LiquidButton>
        </div>
      }
    >
      <PaymentLinkUrlBody
        created={created}
        shareUrl={share}
        copyState={copied}
        onCopy={() => void copy()}
        onShare={() => share && openWindow(share)}
      />
    </SidebarDialog>
  );
}

/** Dialog body (no portal), so the one-time display is testable. */
export function PaymentLinkUrlBody({
  created,
  shareUrl,
  copyState,
  onCopy,
  onShare,
}: {
  created: OneTimeLink;
  shareUrl: string | null;
  copyState: "idle" | "copied" | "failed";
  onCopy: () => void;
  onShare: () => void;
}) {
  const { url, link } = created;
  return (
    <div className="space-y-4">
      <div
        role="note"
        className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Copy or share it now.</strong> This link is shown only once;
          after you close this, it can&apos;t be shown again. To get a new one,
          use Regenerate (the old link then stops working).
        </p>
      </div>

      <div>
        <p className="liquid-label">Customer payment link</p>
        <p
          data-testid="one-time-url"
          className="select-all break-all rounded-xl border border-slate-200 bg-white/70 p-3 font-mono text-sm text-neutral-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          {url}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
          Expires {formatDocDateTime(link.expiresAt)}. The customer signs in
          with Google, confirms the address and pays with PhonePe.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <LiquidButton type="button" variant="soft" onClick={onCopy}>
          {copyState === "copied" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copyState === "copied" ? "Copied" : "Copy link"}
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="soft"
          disabled={!shareUrl}
          onClick={onShare}
        >
          <MessageCircle className="h-4 w-4" />
          Share on WhatsApp
        </LiquidButton>
      </div>
      {copyState === "failed" && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">
          Couldn&apos;t copy automatically. Select the link above and copy it.
        </p>
      )}
      {!shareUrl && (
        <p className="text-xs text-slate-500 dark:text-white/50">
          WhatsApp sharing needs a valid Indian mobile number on the document.
        </p>
      )}
    </div>
  );
}
