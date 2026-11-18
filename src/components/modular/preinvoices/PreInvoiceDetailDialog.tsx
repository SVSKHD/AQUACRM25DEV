import { useCallback, useEffect, useState } from "react";
import { Ban, Edit2, ExternalLink, FileText } from "lucide-react";
import SidebarDialog from "../../ui/SidebarDialog";
import { useToast } from "../../Toast";
import {
  LiquidBadge,
  LiquidButton,
  LiquidPanel,
  SidebarRequestBanner,
} from "../../ui/liquid";
import PaymentLinkPanel from "./PaymentLinkPanel";
import { preInvoicesService } from "../../../services/preInvoicesService";
import { getAdminInvoicePath } from "../../../utils/invoiceViews";
import {
  formatDocDate,
  formatDocDateTime,
  formatInr,
  isPreInvoiceEditable,
  preInvoiceLinkBlockedReason,
  preInvoiceStatusTone,
  type PreInvoice,
} from "../../../utils/preInvoice";
import type { PaymentLinkState } from "../../../utils/paymentLink";
import type { PreInvoiceAccess } from "../../../hooks/usePreInvoiceAccess";

export default function PreInvoiceDetailDialog({
  preInvoiceId,
  access,
  onClose,
  onEdit,
  onChanged,
  onOpenQuotation,
}: {
  preInvoiceId: string;
  access: PreInvoiceAccess;
  onClose: () => void;
  onEdit: (doc: PreInvoice, link: PaymentLinkState | null) => void;
  /** The list should refresh (status/payment changed). */
  onChanged: () => void;
  onOpenQuotation: (quotationId: string) => void;
}) {
  const { showToast } = useToast();
  const [doc, setDoc] = useState<PreInvoice | null>(null);
  const [link, setLink] = useState<PaymentLinkState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    const response = await preInvoicesService.get(preInvoiceId);
    if (response.error || !response.data) {
      setError(response.error || "Couldn't load the pre-invoice.");
      return;
    }
    setError(null);
    setDoc(response.data.preInvoice);
    setLink(response.data.paymentLink);
  }, [preInvoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // A paid link changes the document (Paid / Converted): reload it once.
  const handleLinkChange = (next: PaymentLinkState | null) => {
    const becamePaid = next?.status === "paid" && link?.status !== "paid";
    const invoiced =
      next?.conversion.status === "done" && link?.conversion.status !== "done";
    setLink(next);
    if (becamePaid || invoiced) {
      void load();
      onChanged();
    }
  };

  const cancel = async () => {
    if (!doc) return;
    setCancelling(true);
    const response = await preInvoicesService.cancel(doc._id);
    setCancelling(false);
    setConfirmCancel(false);
    if (response.error || !response.data) {
      setError(response.error || "Couldn't cancel the pre-invoice.");
      return;
    }
    showToast(
      `${doc.preInvoiceNo} cancelled; its payment link was revoked`,
      "success",
    );
    setDoc(response.data.preInvoice);
    setLink(response.data.paymentLink);
    onChanged();
  };

  const editable = doc ? isPreInvoiceEditable(doc) : false;

  return (
    <SidebarDialog
      open
      onClose={onClose}
      busy={cancelling}
      size="lg"
      title={doc?.preInvoiceNo || "Pre-invoice"}
      description={
        doc
          ? `${doc.customerDetails.name} · ${formatDocDate(doc.date)}`
          : undefined
      }
      widthStorageKey="aquacrm:pre-invoice-detail-width"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {access.canManage && doc && editable && !confirmCancel && (
            <>
              <LiquidButton
                type="button"
                variant="danger"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="h-4 w-4" />
                Cancel pre-invoice
              </LiquidButton>
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => onEdit(doc, link)}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </LiquidButton>
            </>
          )}
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={cancelling}
          >
            Close
          </LiquidButton>
        </div>
      }
    >
      <div className="space-y-4">
        <SidebarRequestBanner
          state={error ? "error" : "idle"}
          message={error}
          onDismiss={() => setError(null)}
        />

        {confirmCancel && doc && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
          >
            <p className="font-semibold">
              Cancel {doc.preInvoiceNo}? Its payment link is revoked
              {doc.sourceQuotationNo
                ? ` and quotation ${doc.sourceQuotationNo} is freed`
                : ""}
              . This can&apos;t be undone.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <LiquidButton
                type="button"
                variant="danger"
                requestState={cancelling ? "loading" : "idle"}
                loadingLabel="Cancelling…"
                onClick={() => void cancel()}
              >
                Cancel pre-invoice
              </LiquidButton>
              <LiquidButton
                type="button"
                variant="ghost"
                disabled={cancelling}
                onClick={() => setConfirmCancel(false)}
              >
                Keep it
              </LiquidButton>
            </div>
          </div>
        )}

        {!doc && !error && (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        )}

        {doc && (
          <>
            <LiquidPanel className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <LiquidBadge className={preInvoiceStatusTone(doc.status)}>
                  {doc.status}
                </LiquidBadge>
                <LiquidBadge
                  className={
                    doc.payment.status === "Paid"
                      ? preInvoiceStatusTone("Paid")
                      : preInvoiceStatusTone("Draft")
                  }
                >
                  {doc.payment.status}
                </LiquidBadge>
                {doc.gst && (
                  <LiquidBadge>GST {doc.gstDetails.gstNo}</LiquidBadge>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-slate-500 dark:text-white/50">
                    Customer:{" "}
                  </span>
                  <span className="font-semibold">
                    {doc.customerDetails.name}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-white/50">
                    Mobile:{" "}
                  </span>
                  <span className="font-semibold">
                    {doc.customerDetails.phone || "—"}
                  </span>
                </p>
                {doc.customerDetails.email && (
                  <p>
                    <span className="text-slate-500 dark:text-white/50">
                      Email:{" "}
                    </span>
                    {doc.customerDetails.email}
                  </p>
                )}
                {doc.customerDetails.address && (
                  <p className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-white/50">
                      Address:{" "}
                    </span>
                    {doc.customerDetails.address}
                  </p>
                )}
                <p>
                  <span className="text-slate-500 dark:text-white/50">
                    Created:{" "}
                  </span>
                  {formatDocDateTime(doc.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                {doc.sourceQuotationId && (
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      onOpenQuotation(doc.sourceQuotationId as string)
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Quotation {doc.sourceQuotationNo || ""}
                  </LiquidButton>
                )}
                {doc.convertedToInvoice && (
                  <a
                    href={getAdminInvoicePath(doc.convertedToInvoice.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline dark:text-sky-300"
                  >
                    Invoice {doc.convertedToInvoice.invoiceNo}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </LiquidPanel>

            <LiquidPanel className="overflow-x-auto p-0">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500 dark:text-white/50">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Price</th>
                    <th className="px-2 py-2 text-right">Discount</th>
                    <th className="px-2 py-2 text-right">Tax</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {doc.products.map((line, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <p className="font-semibold">{line.productName}</p>
                        {(line.productDescription || line.productSerialNo) && (
                          <p className="text-xs text-slate-500 dark:text-white/50">
                            {[line.productSerialNo, line.productDescription]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {line.productQuantity}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatInr(line.productPrice)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatInr(line.productDiscount)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatInr(line.productTax)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {formatInr(line.productTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 pt-3 text-right text-slate-500 dark:text-white/50"
                    >
                      Subtotal
                    </td>
                    <td className="px-4 pt-3 text-right tabular-nums">
                      {formatInr(doc.subTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 text-right text-slate-500 dark:text-white/50"
                    >
                      Discount
                    </td>
                    <td className="px-4 text-right tabular-nums">
                      − {formatInr(doc.discount)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 text-right text-slate-500 dark:text-white/50"
                    >
                      Tax
                    </td>
                    <td className="px-4 text-right tabular-nums">
                      {formatInr(doc.tax)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 pb-3 text-right font-bold">
                      Total
                    </td>
                    <td className="px-4 pb-3 text-right text-lg font-black tabular-nums">
                      {formatInr(doc.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </LiquidPanel>

            <PaymentLinkPanel
              kind="pre_invoice"
              sourceId={doc._id}
              customerName={doc.customerDetails.name}
              customerPhone={doc.customerDetails.phone}
              canManage={access.canManageLinks === true}
              canReconcile={access.canReconcile}
              blockedReason={preInvoiceLinkBlockedReason(doc)}
              onLinkChange={handleLinkChange}
            />
          </>
        )}
      </div>
    </SidebarDialog>
  );
}
