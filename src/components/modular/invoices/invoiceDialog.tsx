import React from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import QuickInvoiceTab from "./QuickInvoiceTab";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidFileButton,
  LiquidInput,
  LiquidTextarea,
  SidebarRequestBanner,
  type RequestState,
} from "../../ui/liquid";
import {
  CustomerFields,
  PhoneInput,
  ProductsSection,
  SectionHeader,
  SectionNav,
  type NavSection,
} from "./invoiceFormParts";
import {
  formatINR,
  type CatalogProduct,
  type InvoiceLine,
} from "./invoiceFormat";
import {
  GST_FIELD_LABELS,
  describeGstin,
  differingGstFields,
  fillEmptyGstFields,
  normalizeGstin,
  taxpayerGstDetails,
  type GstDetailField,
  type GstDetails,
  type GstMatch,
} from "../../../utils/gstin";
import type { ApiResponse } from "../../../services/api";
import type { GstTaxpayer } from "../../../services/gstinPortal";

type GstFill = {
  value: string;
  /** What the field held before (restored by Undo). */
  previous: string;
  source: "portal" | "invoice";
};
type GstFills = Partial<Record<GstDetailField, GstFill>>;

type PortalLookup =
  | { state: "loading" }
  | { state: "found"; taxpayer: GstTaxpayer }
  | { state: "error"; message: string; code?: string };

/** What the form says under the GSTIN after a complete GSTIN is typed. */
type GstLookupStatus =
  | { kind: "invalid"; reason: string }
  | {
      kind: "valid";
      gstin: string;
      state: string;
      pan: string;
      match: GstMatch | null;
      /** null when no portal lookup is wired in. */
      portal: PortalLookup | null;
      /** Fields this lookup changed (for the note and Undo). */
      filled: GstFills;
    };

const toFills = (
  patch: Partial<GstDetails>,
  form: Partial<Record<GstDetailField, unknown>>,
  source: GstFill["source"],
): GstFills =>
  Object.fromEntries(
    Object.entries(patch).map(([field, value]) => [
      field,
      {
        value,
        previous: String(form[field as GstDetailField] ?? ""),
        source,
      },
    ]),
  );

const fillValues = (fills: GstFills): Partial<GstDetails> =>
  Object.fromEntries(
    Object.entries(fills).map(([field, fill]) => [field, fill!.value]),
  );

const fieldList = (fills: GstFills, source: GstFill["source"]) =>
  (Object.keys(fills) as GstDetailField[])
    .filter((field) => fills[field]?.source === source)
    .map((field) => GST_FIELD_LABELS[field])
    .join(", ");

/** "Filled name, address from the GST portal; phone from invoice AQ-205 (2026-10-02)." */
const describeFills = (fills: GstFills, match: GstMatch | null) => {
  const parts: string[] = [];
  const portal = fieldList(fills, "portal");
  const invoice = fieldList(fills, "invoice");
  if (portal) parts.push(`${portal} from the GST portal`);
  if (invoice && match)
    parts.push(
      `${invoice} from invoice ${match.invoiceNo || "(no number)"}${
        match.date ? ` (${match.date})` : ""
      }`,
    );
  return parts.length ? `Filled ${parts.join("; ")}. Check before saving.` : "";
};

const RETRYABLE_PORTAL_ERROR = (code?: string) =>
  code !== "GSTIN_NOT_FOUND" &&
  code !== "GSTIN_LOOKUP_DISABLED" &&
  code !== "GSTIN_INVALID";

type InvoiceFormData = {
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone: number;
  customer_email: string;
  customer_address: string;
  gst: boolean;
  po: boolean;
  quotation: boolean;
  gst_name: string;
  gst_no: string;
  gst_phone: string;
  gst_email: string;
  gst_address: string;
  products: InvoiceLine[];
  paid_status: string;
  payment_type: string;
  delivered_by?: string;
  delivery_date?: string;
};

interface AquaInvoiceFormDialogProps<
  F extends InvoiceFormData,
  L extends InvoiceLine,
> {
  showModal: boolean;
  onClose: () => void;
  onClear: () => void;
  editingInvoice: { id?: string; migrated?: boolean } | null;
  handleSubmit: (e: React.FormEvent) => void;
  formData: F;
  setFormData: React.Dispatch<React.SetStateAction<F>>;
  productForm: L;
  setProductForm: React.Dispatch<React.SetStateAction<L>>;
  availableProducts: CatalogProduct[];
  handleProductSelect: (productName: string) => void;
  addProduct: () => void;
  editingProductIndex: number | null;
  editProduct: (index: number) => void;
  removeProduct: (index: number) => void;
  cancelEditProduct: () => void;
  isDraftDirty: boolean;
  requestState?: RequestState;
  requestError?: string;
  onDismissRequestError?: () => void;
  calculateTotal: (products: F["products"]) => number;
  /** GST details used with this GSTIN on earlier invoices (fills empty GST fields). */
  findGstDetails?: (gstin: string) => GstMatch | null;
  /** Fetches the GSTIN's record from the GST portal (fills empty name/address). */
  lookupGstinOnPortal?: (gstin: string) => Promise<ApiResponse<GstTaxpayer>>;
}

type Mode = "easy" | "standard" | "quick";

const MODES: {
  label: string;
  helper: string;
  value: Mode;
  icon: React.ElementType;
}[] = [
  {
    label: "Easy",
    helper: "Customer, products and payment status.",
    value: "easy",
    icon: Sparkles,
  },
  {
    label: "Standard",
    helper: "Adds email, GST, PO and payment type.",
    value: "standard",
    icon: ListChecks,
  },
  {
    label: "Quick",
    helper: "Paste a message and let it fill the form.",
    value: "quick",
    icon: Zap,
  },
];

const MODE_STORAGE_KEY = "aquacrm:invoice-editor-mode";

const readStoredMode = (): Mode => {
  try {
    const saved = window.localStorage.getItem(MODE_STORAGE_KEY);
    return saved === "standard" || saved === "quick" ? saved : "easy";
  } catch {
    return "easy";
  }
};

const paidStatusOptions = [
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
];

const paymentTypeOptions = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "UPI", value: "upi" },
  { label: "Bank Transfer", value: "bank_transfer" },
];

function AquaInvoiceFormDialog<
  F extends InvoiceFormData,
  L extends InvoiceLine,
>({
  showModal,
  onClose,
  onClear,
  editingInvoice,
  handleSubmit,
  formData,
  setFormData,
  productForm,
  setProductForm,
  availableProducts,
  addProduct,
  editingProductIndex,
  editProduct,
  removeProduct,
  cancelEditProduct,
  calculateTotal,
  handleProductSelect,
  isDraftDirty,
  requestState = "idle",
  requestError = "",
  onDismissRequestError,
  findGstDetails,
  lookupGstinOnPortal,
}: AquaInvoiceFormDialogProps<F, L>) {
  const [gstLookup, setGstLookup] = React.useState<GstLookupStatus | null>(
    null,
  );
  const [mode, setModeState] = React.useState<Mode>(readStoredMode);
  const [quickBusy, setQuickBusy] = React.useState(false);
  const [gstUploading, setGstUploading] = React.useState(false);
  const [gstUploadError, setGstUploadError] = React.useState<string | null>(
    null,
  );

  const setMode = (next: Mode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Remembering the mode is a convenience only.
    }
  };

  // Opening an invoice with GST or PO details shows the mode that displays them.
  React.useEffect(() => {
    if (showModal && editingInvoice && (formData.gst || formData.po)) {
      setModeState("standard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, editingInvoice?.id]);

  // The GSTIN note belongs to what was typed in this session of the form.
  // Latest form values for async portal answers, and a counter so an answer
  // for an older GSTIN (or a closed form) is ignored.
  const formRef = React.useRef(formData);
  formRef.current = formData;
  const lookupSeq = React.useRef(0);

  React.useEffect(() => {
    lookupSeq.current += 1;
    setGstLookup(null);
  }, [showModal, editingInvoice?.id]);

  // Asks the GST portal (through the backend) and fills name/address that
  // are still empty; earlier invoices fill whatever the portal didn't.
  const runPortalLookup = (gstin: string, match: GstMatch | null) => {
    if (!lookupGstinOnPortal) return;
    const seq = ++lookupSeq.current;
    setGstLookup((prev) =>
      prev?.kind === "valid" && prev.gstin === gstin
        ? { ...prev, portal: { state: "loading" } }
        : prev,
    );
    void lookupGstinOnPortal(gstin).then((res) => {
      if (seq !== lookupSeq.current) return;
      const form = formRef.current;
      const fromPortal = res.data
        ? fillEmptyGstFields(form, { details: taxpayerGstDetails(res.data) })
        : {};
      const fromPast = match
        ? fillEmptyGstFields({ ...form, ...fromPortal }, match)
        : {};
      const fills: GstFills = {
        ...toFills(fromPast, form, "invoice"),
        ...toFills(fromPortal, form, "portal"),
      };
      setGstLookup((prev) =>
        prev?.kind === "valid" && prev.gstin === gstin
          ? {
              ...prev,
              filled: { ...prev.filled, ...fills },
              portal: res.data
                ? { state: "found", taxpayer: res.data }
                : {
                    state: "error",
                    message: res.error || "GST portal lookup failed.",
                    code: res.code,
                  },
            }
          : prev,
      );
      if (Object.keys(fills).length) updateForm(fillValues(fills));
    });
  };

  // Typing/pasting a GSTIN: once it is complete, validate it, fill empty GST
  // fields from earlier invoices with the same GSTIN, and ask the GST portal.
  const handleGstinChange = (raw: string) => {
    const gst_no = normalizeGstin(raw);
    if (gst_no === normalizeGstin(formData.gst_no)) {
      updateForm({ gst_no });
      return;
    }
    lookupSeq.current += 1;
    if (gst_no.length !== 15) {
      setGstLookup(null);
      updateForm({ gst_no });
      return;
    }
    const info = describeGstin(gst_no);
    if (!info.valid) {
      setGstLookup({ kind: "invalid", reason: info.reason });
      updateForm({ gst_no });
      return;
    }
    const match = findGstDetails?.(gst_no) ?? null;
    // With the portal on, name/address wait for it (it is the official
    // record); phone/email only exist on earlier invoices, so fill them now.
    const pastNow = match
      ? fillEmptyGstFields(
          formData,
          lookupGstinOnPortal
            ? {
                details: {
                  gst_phone: match.details.gst_phone,
                  gst_email: match.details.gst_email,
                },
              }
            : match,
        )
      : {};
    setGstLookup({
      kind: "valid",
      gstin: gst_no,
      state: info.state,
      pan: info.pan,
      match,
      portal: lookupGstinOnPortal ? { state: "loading" } : null,
      filled: toFills(pastNow, formData, "invoice"),
    });
    updateForm({ gst_no, ...pastNow });
    runPortalLookup(gst_no, match);
  };

  // Replaces the typed name/address with the portal record (explicit choice).
  const usePortalDetails = () => {
    if (gstLookup?.kind !== "valid" || gstLookup.portal?.state !== "found")
      return;
    const details = taxpayerGstDetails(gstLookup.portal.taxpayer);
    const fields = differingGstFields(formData, details);
    if (!fields.length) return;
    const filled = { ...gstLookup.filled };
    const patch: Partial<GstDetails> = {};
    for (const field of fields) {
      patch[field] = details[field];
      filled[field] = {
        value: details[field]!,
        // Undo goes back to what was there before this lookup touched it.
        previous:
          gstLookup.filled[field]?.previous ?? String(formData[field] ?? ""),
        source: "portal",
      };
    }
    setGstLookup({ ...gstLookup, filled });
    updateForm(patch);
  };

  // Undo restores the earlier value of each filled field the user hasn't
  // changed since.
  const undoGstFill = () => {
    if (gstLookup?.kind !== "valid") return;
    const { filled } = gstLookup;
    setFormData((prev) => {
      const next = { ...prev };
      for (const [field, fill] of Object.entries(filled) as [
        GstDetailField,
        GstFill,
      ][]) {
        if (String(prev[field] ?? "") === fill.value)
          next[field] = fill.previous as F[typeof field];
      }
      return next;
    });
    setGstLookup({ ...gstLookup, filled: {} });
  };

  const handleGstPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setGstUploadError("Please select a PDF file.");
      return;
    }
    setGstUploadError(null);
    setGstUploading(true);
    try {
      const { parseGstCertificatePdf } =
        await import("../../../utils/gstCertificateParser");
      const parsed = await parseGstCertificatePdf(file);
      if (!parsed.gstNo && !parsed.legalName) {
        setGstUploadError(
          "Couldn't read GST details from this PDF. Try a Form REG-06 certificate.",
        );
        return;
      }
      setFormData((prev) => ({
        ...prev,
        gst: true,
        gst_name: parsed.legalName || prev.gst_name,
        gst_no: parsed.gstNo || prev.gst_no,
        gst_address: parsed.address || prev.gst_address,
      }));
    } catch (err) {
      setGstUploadError(
        err instanceof Error ? err.message : "Failed to parse PDF.",
      );
    } finally {
      setGstUploading(false);
    }
  };

  const updateForm = (patch: Partial<InvoiceFormData>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const total = calculateTotal(formData.products);
  const lineCount = formData.products.length;
  const isStandard = mode === "standard";
  const isQuick = mode === "quick";
  const modeIndex = Math.max(
    0,
    MODES.findIndex((m) => m.value === mode),
  );
  const activeMode = MODES[modeIndex];

  const uid = React.useId().replace(/:/g, "");
  const sectionId = (name: string) => `${uid}-${name}`;
  const navSections: NavSection[] = [
    ...(isQuick ? [{ id: sectionId("paste"), label: "Paste" }] : []),
    {
      id: sectionId("customer"),
      label: "Customer",
      done:
        Boolean(formData.customer_name?.trim()) &&
        String(formData.customer_phone || "").length === 10,
    },
    ...(isStandard
      ? [
          {
            id: sectionId("business"),
            label: "Business",
            done:
              !formData.gst ||
              (Boolean(formData.gst_name?.trim()) &&
                formData.gst_no?.length === 15),
          },
        ]
      : []),
    { id: sectionId("products"), label: "Products", done: lineCount > 0 },
    {
      id: sectionId("payment"),
      label: "Payment",
      done:
        Boolean(formData.paid_status) && (isQuick || Boolean(formData.date)),
    },
  ];

  // Arrow keys move between the mode tabs (WAI-ARIA tabs pattern).
  const onModeKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = MODES.length - 1;
    const next = {
      ArrowRight: modeIndex === last ? 0 : modeIndex + 1,
      ArrowLeft: modeIndex === 0 ? last : modeIndex - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setMode(MODES[next].value);
    event.currentTarget
      .querySelectorAll<HTMLElement>('[role="tab"]')
      [next]?.focus();
  };

  const footer = (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {lineCount
            ? `${lineCount} line${lineCount > 1 ? "s" : ""}`
            : "No products"}
        </p>
        <p className="whitespace-nowrap text-lg font-black tabular-nums leading-tight text-white">
          {formatINR(total)}
        </p>
      </div>
      <LiquidButton
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={!isDraftDirty || requestState === "loading"}
        aria-label="Clear draft"
        title="Clear draft"
        className="px-3"
      >
        <RotateCcw className="h-4 w-4" />
        <span className="hidden sm:inline">Clear</span>
      </LiquidButton>
      <LiquidButton
        type="submit"
        form="invoice-form"
        variant="primary"
        disabled={quickBusy}
        requestState={requestState}
        loadingLabel={editingInvoice ? "Saving…" : "Creating…"}
        errorLabel="Retry"
        className="flex-shrink-0"
      >
        {editingInvoice ? "Save" : "Create"}
        <span className="hidden min-[360px]:inline">invoice</span>
      </LiquidButton>
    </div>
  );

  return (
    <ResizableFloatingSidebar
      open={showModal}
      onClose={onClose}
      title={editingInvoice ? "Edit invoice" : "New invoice"}
      widthStorageKey="aquacrm:invoice-editor-width"
      initialWidth={620}
      minWidth={440}
      maxWidth={1040}
      toolbar={<SectionNav sections={navSections} />}
      footer={footer}
    >
      <div className="invoice-editor">
        <SidebarRequestBanner
          state={requestState}
          message={requestError}
          title={
            editingInvoice ? "Invoice update failed" : "Invoice creation failed"
          }
          onDismiss={onDismissRequestError}
        />

        <div>
          <div
            className="inv-modes"
            role="tablist"
            aria-label="Invoice form mode"
            onKeyDown={onModeKey}
            style={{ "--inv-mode": modeIndex } as React.CSSProperties}
          >
            <span className="inv-modes-thumb" aria-hidden="true" />
            {MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.value;
              return (
                <LiquidButton
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  variant="ghost"
                  onClick={() => setMode(item.value)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </LiquidButton>
              );
            })}
          </div>
          <p key={mode} className="inv-animate mt-2 px-1 text-xs text-white/50">
            {activeMode.helper}
          </p>
        </div>

        {editingInvoice?.migrated && (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
            <p className="text-sm font-black text-violet-100">
              Migrated invoice review
            </p>
            <p className="mt-1 text-sm leading-relaxed text-violet-100/70">
              Correct the customer phone and details, and pick every product
              from the current AquaKart list. Once all products are linked,
              saving marks this invoice reviewed and turns on the invoice and
              service reminders.
            </p>
          </div>
        )}

        <form
          id="invoice-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {isQuick && (
            <section
              id={sectionId("paste")}
              tabIndex={-1}
              className="inv-section"
              aria-label="Paste details"
            >
              <QuickInvoiceTab
                formData={formData}
                setFormData={setFormData}
                availableProducts={availableProducts}
                onBusyChange={setQuickBusy}
              />
            </section>
          )}

          <section
            id={sectionId("customer")}
            tabIndex={-1}
            className="inv-section"
          >
            <SectionHeader icon={UserRound} title="Customer" />
            <CustomerFields
              formData={formData}
              update={updateForm}
              showEmail={isStandard || isQuick}
              required={!isQuick}
            />
          </section>

          {isStandard && (
            <section
              id={sectionId("business")}
              tabIndex={-1}
              className="inv-section"
            >
              <SectionHeader icon={Building2} title="Business" />
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <LiquidCheckbox
                  label="GST invoice"
                  checked={Boolean(formData.gst)}
                  onChange={(e) => updateForm({ gst: e.target.checked })}
                />
                <LiquidCheckbox
                  label="Purchase order"
                  checked={Boolean(formData.po)}
                  onChange={(e) => updateForm({ po: e.target.checked })}
                />
              </div>

              {formData.gst && (
                <>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <LiquidFileButton
                      id={`${uid}-gst-pdf`}
                      variant="soft"
                      accept="application/pdf"
                      onChange={handleGstPdfUpload}
                      disabled={gstUploading}
                    >
                      {gstUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {gstUploading ? "Reading PDF…" : "GST certificate"}
                    </LiquidFileButton>
                    <span className="text-xs text-white/45">
                      Reads a REG-06 PDF on this device.
                    </span>
                  </div>
                  {gstUploadError && (
                    <p role="alert" className="text-xs text-rose-300">
                      {gstUploadError}
                    </p>
                  )}
                  <div className="inv-fields">
                    <LiquidInput
                      label="GST name"
                      placeholder="Business / legal name"
                      value={formData.gst_name}
                      onChange={(e) => updateForm({ gst_name: e.target.value })}
                    />
                    <LiquidInput
                      label="GSTIN"
                      placeholder="36HEDPS5768R1Z8"
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={15}
                      className="uppercase tracking-wide"
                      value={formData.gst_no}
                      aria-describedby={
                        gstLookup ? `${uid}-gstin-status` : undefined
                      }
                      aria-invalid={gstLookup?.kind === "invalid" || undefined}
                      onChange={(e) => handleGstinChange(e.target.value)}
                    />
                    <div
                      id={`${uid}-gstin-status`}
                      className="inv-span min-w-0 empty:hidden"
                      aria-live="polite"
                    >
                      {gstLookup?.kind === "invalid" && (
                        <p className="flex items-start gap-2 text-xs text-rose-300">
                          <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">{gstLookup.reason}</span>
                        </p>
                      )}
                      {gstLookup?.kind === "valid" &&
                        (() => {
                          const { portal, match, filled } = gstLookup;
                          const taxpayer =
                            portal?.state === "found" ? portal.taxpayer : null;
                          const inactive =
                            taxpayer &&
                            taxpayer.status &&
                            !/^active$/i.test(taxpayer.status);
                          const differs = taxpayer
                            ? differingGstFields(
                                formData,
                                taxpayerGstDetails(taxpayer),
                              )
                            : [];
                          const fillNote = describeFills(filled, match);
                          const pastNote =
                            portal?.state === "loading" || fillNote
                              ? ""
                              : match
                                ? `Matches invoice ${match.invoiceNo || "(no number)"}; your entries were kept.`
                                : taxpayer
                                  ? ""
                                  : "Not used on an earlier invoice — enter the details.";
                          return (
                            <div className="flex flex-col gap-1.5 text-xs text-white/70">
                              <p className="flex min-w-0 items-start gap-2">
                                <CheckCircle2
                                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0 break-words">
                                  Valid GSTIN · {gstLookup.state} · PAN{" "}
                                  {gstLookup.pan}.
                                </span>
                              </p>
                              {portal?.state === "loading" && (
                                <p className="flex min-w-0 items-start gap-2">
                                  <Loader2
                                    className="mt-0.5 h-4 w-4 shrink-0 animate-spin"
                                    aria-hidden="true"
                                  />
                                  <span>Checking the GST portal…</span>
                                </p>
                              )}
                              {taxpayer && (
                                <p
                                  className={`flex min-w-0 items-start gap-2 ${
                                    inactive ? "text-amber-200" : ""
                                  }`}
                                >
                                  <Building2
                                    className="mt-0.5 h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 break-words">
                                    GST portal:{" "}
                                    <strong className="font-semibold text-white/90">
                                      {taxpayer.legalName || taxpayer.tradeName}
                                    </strong>
                                    {taxpayer.tradeName &&
                                    taxpayer.legalName &&
                                    taxpayer.tradeName.toLowerCase() !==
                                      taxpayer.legalName.toLowerCase()
                                      ? ` (trade name ${taxpayer.tradeName})`
                                      : ""}
                                    {taxpayer.status
                                      ? ` · ${taxpayer.status}`
                                      : ""}
                                    {taxpayer.registeredOn
                                      ? ` · registered ${taxpayer.registeredOn}`
                                      : ""}
                                    .
                                    {inactive
                                      ? ` This GSTIN is ${taxpayer.status.toLowerCase()}${
                                          taxpayer.cancelledOn
                                            ? ` since ${taxpayer.cancelledOn}`
                                            : ""
                                        } — check before billing it.`
                                      : ""}
                                  </span>
                                </p>
                              )}
                              {portal?.state === "error" && (
                                <p
                                  className={`flex min-w-0 items-start gap-2 ${
                                    portal.code === "GSTIN_NOT_FOUND"
                                      ? "text-rose-300"
                                      : ""
                                  }`}
                                >
                                  <AlertCircle
                                    className="mt-0.5 h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 break-words">
                                    {portal.code === "GSTIN_NOT_FOUND"
                                      ? "Not found on the GST portal — check the number."
                                      : portal.code === "GSTIN_LOOKUP_DISABLED"
                                        ? "GST portal lookup isn't set up on the server yet."
                                        : `GST portal lookup failed: ${portal.message}`}
                                  </span>
                                </p>
                              )}
                              {(fillNote || pastNote) && (
                                <p className="min-w-0 break-words pl-6">
                                  {fillNote || pastNote}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 empty:hidden">
                                {differs.length > 0 && (
                                  <LiquidButton
                                    type="button"
                                    variant="ghost"
                                    onClick={usePortalDetails}
                                    className="min-h-[44px]"
                                  >
                                    <Building2
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Use portal{" "}
                                    {differs
                                      .map((field) => GST_FIELD_LABELS[field])
                                      .join(" & ")}
                                  </LiquidButton>
                                )}
                                {portal?.state === "error" &&
                                  RETRYABLE_PORTAL_ERROR(portal.code) && (
                                    <LiquidButton
                                      type="button"
                                      variant="ghost"
                                      onClick={() =>
                                        runPortalLookup(gstLookup.gstin, match)
                                      }
                                      className="min-h-[44px]"
                                    >
                                      <RefreshCw
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />
                                      Try again
                                    </LiquidButton>
                                  )}
                                {Object.keys(filled).length > 0 && (
                                  <LiquidButton
                                    type="button"
                                    variant="ghost"
                                    onClick={undoGstFill}
                                    className="min-h-[44px]"
                                  >
                                    <RotateCcw
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Undo fill
                                  </LiquidButton>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                    <PhoneInput
                      label="GST phone"
                      value={formData.gst_phone}
                      onChange={(digits) => updateForm({ gst_phone: digits })}
                    />
                    <LiquidInput
                      label="GST email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      placeholder="Billing email"
                      value={formData.gst_email}
                      onChange={(e) =>
                        updateForm({ gst_email: e.target.value })
                      }
                      onBlur={(e) =>
                        updateForm({
                          gst_email: e.target.value.trim().toLowerCase(),
                        })
                      }
                    />
                    <LiquidTextarea
                      wrapperClassName="inv-span"
                      label="GST address"
                      placeholder="Registered address"
                      rows={2}
                      className="min-h-[4.5rem]"
                      value={formData.gst_address}
                      onChange={(e) =>
                        updateForm({ gst_address: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </section>
          )}

          <section
            id={sectionId("products")}
            tabIndex={-1}
            className="inv-section"
          >
            <SectionHeader
              icon={Package}
              title="Products"
              aside={
                lineCount > 0 ? (
                  <span className="text-sm font-bold tabular-nums text-white/70">
                    {formatINR(total)}
                  </span>
                ) : undefined
              }
            />
            <ProductsSection
              products={formData.products}
              productForm={productForm}
              setProductForm={setProductForm}
              availableProducts={availableProducts}
              handleProductSelect={handleProductSelect}
              addProduct={addProduct}
              editingProductIndex={editingProductIndex}
              editProduct={editProduct}
              removeProduct={removeProduct}
              cancelEditProduct={cancelEditProduct}
            />
          </section>

          <section
            id={sectionId("payment")}
            tabIndex={-1}
            className="inv-section"
          >
            <SectionHeader
              icon={FileText}
              title={isQuick ? "Payment" : "Invoice & payment"}
            />
            <div className="inv-fields">
              {!isQuick && (
                <>
                  <LiquidInput
                    label="Invoice no."
                    placeholder="Optional"
                    autoComplete="off"
                    value={formData.invoice_no}
                    onChange={(e) => updateForm({ invoice_no: e.target.value })}
                  />
                  <LiquidInput
                    label="Date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => updateForm({ date: e.target.value })}
                  />
                </>
              )}
              <LiquidDropdown
                label="Payment status"
                value={formData.paid_status}
                options={paidStatusOptions}
                onChange={(value) => updateForm({ paid_status: value })}
              />
              {isStandard && (
                <LiquidDropdown
                  label="Payment type"
                  value={formData.payment_type}
                  options={paymentTypeOptions}
                  onChange={(value) => updateForm({ payment_type: value })}
                />
              )}
            </div>
          </section>
        </form>
      </div>
    </ResizableFloatingSidebar>
  );
}

export default AquaInvoiceFormDialog;
