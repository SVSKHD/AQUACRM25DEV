import { useEffect, useState } from "react";
import { ArrowRightLeft, ClipboardList } from "lucide-react";
import { useToast } from "../../Toast";
import { LiquidButton, LiquidPanel } from "../../ui/liquid";
import PaymentLinkPanel from "./PaymentLinkPanel";
import { preInvoicesService } from "../../../services/preInvoicesService";
import type { PreInvoiceAccess } from "../../../hooks/usePreInvoiceAccess";
import {
  movedPreInvoiceId,
  movedPreInvoiceNo,
  moveToPreInvoiceErrorMessage,
  quotationLinkBlockedReason,
  quotationMoveBlockedReason,
  relatedPreInvoiceId,
  type QuotationLike,
} from "../../../utils/quotationPreInvoice";

// Quotation view drawer: "Move to pre-invoice" and the quotation's own payment
// link, or, once moved, a pointer to the pre-invoice instead of both.

export type QuotationForPreInvoice = QuotationLike & {
  _id: string;
  quotationNo: string;
  customerDetails?: { name?: string; phone?: string | number };
};

/** Shown instead of convert/link actions on a moved quotation. */
export function MovedToPreInvoiceNote({
  preInvoiceNo,
  onOpen,
}: {
  preInvoiceNo: string;
  onOpen: () => void;
}) {
  return (
    <LiquidPanel className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">
          Moved to pre-invoice
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-neutral-950 dark:text-white">
          {preInvoiceNo || "Pre-invoice"}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
          Payment links and the final invoice are handled on the pre-invoice.
        </p>
      </div>
      <LiquidButton type="button" variant="soft" onClick={onOpen}>
        <ClipboardList className="h-4 w-4" />
        Open pre-invoice
      </LiquidButton>
    </LiquidPanel>
  );
}

export default function QuotationPreInvoiceSection({
  quotation,
  access,
  initialConfirm = false,
  onMoved,
  onOpenPreInvoice,
}: {
  quotation: QuotationForPreInvoice;
  access: PreInvoiceAccess;
  /** Open with the move confirmation already shown (row action). */
  initialConfirm?: boolean;
  /** The quotation was moved; the caller refreshes and opens the pre-invoice. */
  onMoved: (preInvoiceId: string) => void;
  onOpenPreInvoice: (preInvoiceId: string) => void;
}) {
  const { showToast } = useToast();
  const movedId = movedPreInvoiceId(quotation);
  const [movedNo, setMovedNo] = useState(movedPreInvoiceNo(quotation));
  const [confirming, setConfirming] = useState(
    initialConfirm && !quotationMoveBlockedReason(quotation),
  );
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    preInvoiceId: string | null;
  } | null>(null);

  // The quotation API sends only the pre-invoice id; fetch its number.
  useEffect(() => {
    if (!movedId || movedNo || !access.canRead) return;
    let active = true;
    void preInvoicesService.get(movedId).then((response) => {
      if (active && response.data)
        setMovedNo(response.data.preInvoice.preInvoiceNo);
    });
    return () => {
      active = false;
    };
  }, [movedId, movedNo, access.canRead]);

  if (movedId)
    return (
      <MovedToPreInvoiceNote
        preInvoiceNo={movedNo}
        onOpen={() => onOpenPreInvoice(movedId)}
      />
    );

  const moveBlocked = quotationMoveBlockedReason(quotation);

  const move = async () => {
    setMoving(true);
    setError(null);
    const response = await preInvoicesService.moveQuotation(quotation._id);
    setMoving(false);
    setConfirming(false);
    if (response.error || !response.data) {
      const message = moveToPreInvoiceErrorMessage(response);
      setError({ message, preInvoiceId: relatedPreInvoiceId(response) });
      showToast(message, "error");
      return;
    }
    const { preInvoice, quotationLinksRevoked } = response.data;
    showToast(
      `${preInvoice.preInvoiceNo} created from ${quotation.quotationNo}${
        quotationLinksRevoked
          ? " · the quotation's payment link was revoked"
          : ""
      }`,
      "success",
    );
    onMoved(preInvoice._id);
  };

  return (
    <div className="space-y-3">
      {access.canManage && (
        <LiquidPanel className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/50">
            Pre-invoice
          </p>
          {confirming ? (
            <>
              <p className="text-sm text-neutral-950 dark:text-white">
                Move {quotation.quotationNo} to a pre-invoice? Its lines and
                totals are copied, the quotation is marked Converted, its
                WhatsApp follow-ups stop and any payment link on it is revoked.
              </p>
              <div className="flex flex-wrap gap-2">
                <LiquidButton
                  type="button"
                  variant="primary"
                  requestState={moving ? "loading" : "idle"}
                  loadingLabel="Moving…"
                  onClick={() => void move()}
                >
                  Move to pre-invoice
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="ghost"
                  disabled={moving}
                  onClick={() => setConfirming(false)}
                >
                  Keep as quotation
                </LiquidButton>
              </div>
            </>
          ) : (
            <LiquidButton
              type="button"
              variant="soft"
              disabled={Boolean(moveBlocked)}
              onClick={() => setConfirming(true)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Move to pre-invoice
            </LiquidButton>
          )}
          {moveBlocked && (
            <p className="text-xs text-slate-500 dark:text-white/50">
              {moveBlocked}
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="text-sm font-semibold text-rose-600 dark:text-rose-300"
            >
              <p>{error.message}</p>
              {error.preInvoiceId && (
                <LiquidButton
                  type="button"
                  variant="ghost"
                  className="mt-1"
                  onClick={() => onOpenPreInvoice(error.preInvoiceId as string)}
                >
                  Open the pre-invoice
                </LiquidButton>
              )}
            </div>
          )}
        </LiquidPanel>
      )}

      {!quotation.convertedToInvoice && (
        <PaymentLinkPanel
          kind="quotation"
          sourceId={quotation._id}
          customerName={quotation.customerDetails?.name || ""}
          customerPhone={String(quotation.customerDetails?.phone ?? "")}
          canManage={access.canManageLinks === true}
          canReconcile={access.canReconcile}
          blockedReason={quotationLinkBlockedReason(quotation)}
          onUsePreInvoice={onOpenPreInvoice}
        />
      )}
    </div>
  );
}
