import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import SidebarDialog from "../../ui/SidebarDialog";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidInput,
  LiquidTextarea,
  SidebarRequestBanner,
  type RequestState,
} from "../../ui/liquid";
import LineItemsEditor, { FieldError } from "./LineItemsEditor";
import { productsService } from "../../../services/apiService";
import {
  preInvoicesService,
  type PreInvoiceWithLink,
} from "../../../services/preInvoicesService";
import {
  buildPreInvoiceCreateBody,
  buildPreInvoicePatch,
  catalogFromProducts,
  describeSaveError,
  emptyPreInvoiceForm,
  formatInr,
  patchChangesPayable,
  preInvoiceToForm,
  previewPreInvoiceTotals,
  validatePreInvoiceForm,
  type CatalogProduct,
  type FieldErrors,
  type PreInvoice,
  type PreInvoiceForm,
} from "../../../utils/preInvoice";
import type { PaymentLinkState } from "../../../utils/paymentLink";

// Create / edit a pre-invoice. Totals here are a preview with the server's
// formula; the saved document (and everything else) shows the server's totals.
// Form state lives only in this component (no drafts: it holds customer data).

const FORM_ID = "pre-invoice-form";

export default function PreInvoiceFormDialog({
  preInvoice,
  activeLink,
  onClose,
  onSaved,
}: {
  /** null → create. */
  preInvoice: PreInvoice | null;
  activeLink: PaymentLinkState | null;
  onClose: () => void;
  onSaved: (result: PreInvoiceWithLink, created: boolean) => void;
}) {
  const [form, setForm] = useState<PreInvoiceForm>(() =>
    preInvoice ? preInvoiceToForm(preInvoice) : emptyPreInvoiceForm(),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmLinkBreak, setConfirmLinkBreak] = useState(false);

  useEffect(() => {
    let active = true;
    void productsService.getAll().then((response) => {
      if (active && response.data)
        setCatalog(catalogFromProducts(response.data));
    });
    return () => {
      active = false;
    };
  }, []);

  const totals = previewPreInvoiceTotals(form);
  const saving = state === "loading";
  const linkIsLive =
    activeLink?.status === "active" && activeLink.matchesDocument !== false;

  const setCustomer = (
    key: keyof PreInvoiceForm["customerDetails"],
    value: string,
  ) =>
    setForm((current) => ({
      ...current,
      customerDetails: { ...current.customerDetails, [key]: value },
    }));
  const setGst = (key: keyof PreInvoiceForm["gstDetails"], value: string) =>
    setForm((current) => ({
      ...current,
      gstDetails: { ...current.gstDetails, [key]: value },
    }));

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const found = validatePreInvoiceForm(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setState("error");
      setMessage("Please fix the highlighted fields.");
      return;
    }

    let response;
    if (preInvoice) {
      const patch = buildPreInvoicePatch(preInvoice, form);
      if (!patch) {
        setState("error");
        setMessage("Nothing changed.");
        return;
      }
      if (linkIsLive && patchChangesPayable(patch) && !confirmLinkBreak) {
        setConfirmLinkBreak(true);
        return;
      }
      setState("loading");
      setMessage(null);
      response = await preInvoicesService.update(preInvoice._id, patch);
    } else {
      setState("loading");
      setMessage(null);
      response = await preInvoicesService.create(
        buildPreInvoiceCreateBody(form),
      );
    }

    if (response.error || !response.data) {
      const { message: text, fields } = describeSaveError(response);
      setErrors(fields);
      setState("error");
      setMessage(text);
      setConfirmLinkBreak(false);
      return;
    }
    setState("success");
    onSaved(response.data, !preInvoice);
  };

  return (
    <SidebarDialog
      open
      onClose={onClose}
      busy={saving}
      size="lg"
      title={preInvoice ? `Edit ${preInvoice.preInvoiceNo}` : "New pre-invoice"}
      description="The customer pays this online; the final invoice is created after payment."
      widthStorageKey="aquacrm:pre-invoice-form-width"
      footer={
        <div className="space-y-3">
          {confirmLinkBreak && (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                This changes what the customer pays. The active payment link
                will stop working; you&apos;ll need to regenerate it and send
                the new one.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/45">
                Estimated total
              </p>
              <p className="text-2xl font-bold tabular-nums text-neutral-950 dark:text-white">
                {formatInr(totals.total)}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/45">
                The server calculates the final amount when you save.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <LiquidButton
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                Close
              </LiquidButton>
              <LiquidButton
                type="submit"
                form={FORM_ID}
                variant="primary"
                requestState={saving ? "loading" : "idle"}
                loadingLabel="Saving…"
              >
                {confirmLinkBreak
                  ? "Save anyway"
                  : preInvoice
                    ? "Save changes"
                    : "Create pre-invoice"}
              </LiquidButton>
            </div>
          </div>
        </div>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
        noValidate
      >
        <SidebarRequestBanner
          state={state === "error" ? "error" : "idle"}
          message={message}
          title="Not saved"
          onDismiss={() => setMessage(null)}
        />

        <section className="grid gap-3 md:grid-cols-2">
          <LiquidInput
            label="Date"
            type="date"
            value={form.date}
            disabled={saving}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <div />
          <div>
            <LiquidInput
              label="Customer name"
              value={form.customerDetails.name}
              disabled={saving}
              aria-invalid={Boolean(errors["customerDetails.name"])}
              onChange={(event) => setCustomer("name", event.target.value)}
            />
            <FieldError message={errors["customerDetails.name"]} />
          </div>
          <div>
            <LiquidInput
              label="Mobile"
              type="tel"
              inputMode="numeric"
              value={form.customerDetails.phone}
              disabled={saving}
              aria-invalid={Boolean(errors["customerDetails.phone"])}
              onChange={(event) => setCustomer("phone", event.target.value)}
              placeholder="10-digit Indian mobile"
            />
            <FieldError message={errors["customerDetails.phone"]} />
          </div>
          <div>
            <LiquidInput
              label="Email (optional)"
              type="email"
              value={form.customerDetails.email}
              disabled={saving}
              aria-invalid={Boolean(errors["customerDetails.email"])}
              onChange={(event) => setCustomer("email", event.target.value)}
            />
            <FieldError message={errors["customerDetails.email"]} />
          </div>
          <LiquidTextarea
            label="Address (optional)"
            rows={2}
            value={form.customerDetails.address}
            disabled={saving}
            onChange={(event) => setCustomer("address", event.target.value)}
          />
        </section>

        <section className="space-y-3">
          <LiquidCheckbox
            label="GST bill"
            checked={form.gst}
            disabled={saving}
            onChange={(event) =>
              setForm({ ...form, gst: event.target.checked })
            }
          />
          {form.gst && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <LiquidInput
                  label="GSTIN"
                  value={form.gstDetails.gstNo}
                  disabled={saving}
                  aria-invalid={Boolean(errors["gstDetails.gstNo"])}
                  onChange={(event) =>
                    setGst("gstNo", event.target.value.toUpperCase())
                  }
                />
                <FieldError message={errors["gstDetails.gstNo"]} />
              </div>
              <div>
                <LiquidInput
                  label="GST name"
                  value={form.gstDetails.gstName}
                  disabled={saving}
                  aria-invalid={Boolean(errors["gstDetails.gstName"])}
                  onChange={(event) => setGst("gstName", event.target.value)}
                />
                <FieldError message={errors["gstDetails.gstName"]} />
              </div>
              <LiquidInput
                label="GST phone"
                type="tel"
                value={form.gstDetails.gstPhone}
                disabled={saving}
                onChange={(event) => setGst("gstPhone", event.target.value)}
              />
              <LiquidInput
                label="GST email"
                type="email"
                value={form.gstDetails.gstEmail}
                disabled={saving}
                onChange={(event) => setGst("gstEmail", event.target.value)}
              />
              <LiquidTextarea
                label="GST address"
                rows={2}
                wrapperClassName="md:col-span-2"
                value={form.gstDetails.gstAddress}
                disabled={saving}
                onChange={(event) => setGst("gstAddress", event.target.value)}
              />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-600 dark:text-white/60">
            Products
          </h3>
          <LineItemsEditor
            idPrefix={FORM_ID}
            lines={form.products}
            catalog={catalog}
            errors={errors}
            disabled={saving}
            onChange={(products) => setForm({ ...form, products })}
          />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col justify-end">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/45">
              Products total
            </p>
            <p className="text-lg font-bold tabular-nums text-neutral-950 dark:text-white">
              {formatInr(totals.subTotal)}
            </p>
          </div>
          <div>
            <LiquidInput
              label="Overall discount (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.discount}
              disabled={saving}
              aria-invalid={Boolean(errors.discount)}
              onChange={(event) =>
                setForm({ ...form, discount: event.target.value })
              }
            />
            <FieldError message={errors.discount} />
          </div>
          <div>
            <LiquidInput
              label="Overall tax (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.tax}
              disabled={saving}
              aria-invalid={Boolean(errors.tax)}
              onChange={(event) =>
                setForm({ ...form, tax: event.target.value })
              }
            />
            <FieldError message={errors.tax} />
          </div>
        </section>
      </form>
    </SidebarDialog>
  );
}
