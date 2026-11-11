import React from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
  Package,
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
  fillEmptyGstFields,
  normalizeGstin,
  type GstDetails,
  type GstMatch,
} from "../../../utils/gstin";

/** What the form says under the GSTIN after a complete GSTIN is typed. */
type GstLookupStatus =
  | { kind: "invalid"; reason: string }
  | {
      kind: "valid";
      state: string;
      pan: string;
      match: GstMatch | null;
      /** Fields filled from the match (for Undo). */
      filled: Partial<GstDetails>;
    };

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
  React.useEffect(() => {
    setGstLookup(null);
  }, [showModal, editingInvoice?.id]);

  // Typing/pasting a GSTIN: once it is complete, validate it and fill the
  // empty GST fields from the newest earlier invoice with the same GSTIN.
  const handleGstinChange = (raw: string) => {
    const gst_no = normalizeGstin(raw);
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
    const filled = match ? fillEmptyGstFields(formData, match) : {};
    setGstLookup({
      kind: "valid",
      state: info.state,
      pan: info.pan,
      match,
      filled,
    });
    updateForm({ gst_no, ...filled });
  };

  // Undo clears only the filled fields the user hasn't changed since.
  const undoGstFill = () => {
    if (gstLookup?.kind !== "valid") return;
    const { filled } = gstLookup;
    setFormData((prev) => {
      const next = { ...prev };
      for (const [field, value] of Object.entries(filled) as [
        keyof GstDetails,
        string,
      ][]) {
        if (String(prev[field] ?? "") === value)
          next[field] = "" as F[typeof field];
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
                      {gstLookup?.kind === "valid" && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                          <p className="flex min-w-0 flex-1 items-start gap-2">
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                              aria-hidden="true"
                            />
                            <span className="min-w-0 break-words">
                              Valid GSTIN · {gstLookup.state} · PAN{" "}
                              {gstLookup.pan}.{" "}
                              {!gstLookup.match
                                ? "Not used on an earlier invoice — enter the details."
                                : Object.keys(gstLookup.filled).length
                                  ? `Filled ${(
                                      Object.keys(
                                        gstLookup.filled,
                                      ) as (keyof GstDetails)[]
                                    )
                                      .map((field) => GST_FIELD_LABELS[field])
                                      .join(", ")} from invoice ${
                                      gstLookup.match.invoiceNo || "(no number)"
                                    }${
                                      gstLookup.match.date
                                        ? ` (${gstLookup.match.date})`
                                        : ""
                                    }. Check before saving.`
                                  : `Matches invoice ${
                                      gstLookup.match.invoiceNo || "(no number)"
                                    }; your entries were kept.`}
                            </span>
                          </p>
                          {Object.keys(gstLookup.filled).length > 0 && (
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
                      )}
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
