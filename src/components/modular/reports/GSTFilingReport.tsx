import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, ClipboardCheck, Pencil } from "lucide-react";
import { invoicesService } from "../../../services/apiService";
import { useToast } from "../../Toast";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidInput,
  LiquidPanel,
  LiquidSelect,
} from "../../ui/liquid";
import SidebarDialog from "../../ui/SidebarDialog";
import AquaGenericTable, {
  type AquaTableColumn,
} from "../invoices/invoiceTable";
import {
  asRecord,
  buildGSTReport,
  gstPeriod,
  GST_STATES,
  GST_UQC,
  GST3B_MANUAL_ROWS,
  gst3BRows,
  invoiceList,
  money,
  zeroGST,
  type GSTInvoice,
  type GSTInvoiceOverride,
  type GSTSettings,
  type GST3BManual,
  type GSTAmounts,
  type RawRecord,
} from "../../../utils/gstReport";
import { downloadGSTWorkingPaper } from "../../../utils/gstReportExport";

const currency = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      })
    : "Not available";
const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
const amountKeys = ["taxable", "igst", "cgst", "sgst", "cess"] as const;
const amountLabels = {
  taxable: "Taxable value",
  igst: "IGST",
  cgst: "CGST",
  sgst: "SGST / UTGST",
  cess: "Cess",
};
const currentParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
}).formatToParts(new Date());
const currentYear = Number(currentParts.find((p) => p.type === "year")?.value);
const currentMonth = Number(
  currentParts.find((p) => p.type === "month")?.value,
);
const currentFY = currentYear - (currentMonth < 4 ? 1 : 0);

export default function GSTFilingReport() {
  const { showToast } = useToast();
  const [raw, setRaw] = useState<RawRecord[]>([]),
    [loading, setLoading] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const [fy, setFY] = useState(currentFY),
    [frequency, setFrequency] = useState<"monthly" | "quarterly">("monthly"),
    [period, setPeriod] = useState(currentMonth);
  const [settings, setSettings] = useState<GSTSettings>({
    gstin: "",
    rate: "",
    hsnDigits: 6,
    priceBasis: "line",
    confirmed: false,
  });
  const [overrides, setOverrides] = useState<
    Record<string, GSTInvoiceOverride>
  >({});
  const [manualPeriods, setManualPeriods] = useState<
      Record<string, GST3BManual>
    >({}),
    [reconciled, setReconciled] = useState(false),
    [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<GSTInvoice | null>(null),
    [draft, setDraft] = useState<GSTInvoiceOverride>({});
  const [manualKey, setManualKey] = useState<string | null>(null),
    [manualDraft, setManualDraft] = useState<GSTAmounts>(zeroGST());
  const [view, setView] = useState<"all" | "pending" | "reviewed" | "excluded">(
    "all",
  );
  const range = useMemo(
    () => gstPeriod(fy, frequency, period),
    [fy, frequency, period],
  );
  const report = useMemo(
    () => buildGSTReport(raw, settings, overrides, range.start, range.end),
    [raw, settings, overrides, range],
  );
  const manualScope = `${settings.gstin}|${range.start}|${range.end}`;
  const manual = useMemo(
    () => manualPeriods[manualScope] || {},
    [manualPeriods, manualScope],
  );
  const setManual = (update: (previous: GST3BManual) => GST3BManual) =>
    setManualPeriods((previous) => ({
      ...previous,
      [manualScope]: update(previous[manualScope] || {}),
    }));
  const threeB = useMemo(() => gst3BRows(report, manual), [report, manual]);
  const periodLabel =
    frequency === "monthly" ? range.start.slice(0, 7) : `${fy}-Q${period + 1}`;
  const load = useCallback(async () => {
    setLoading(true);
    setLoaded(false);
    setError("");
    try {
      const result = await invoicesService.getAll();
      if (result.error) throw new Error(result.error);
      const list = invoiceList(result.data),
        body = asRecord(result.data),
        meta = asRecord(body.pagination ?? body.meta);
      const count = Number(
        meta.total ?? meta.totalCount ?? body.totalInvoices ?? body.totalCount,
      );
      if (Number.isFinite(count) && count > list.length)
        throw new Error(
          `Only ${list.length} of ${count} invoices were returned. A complete invoice dataset is required.`,
        );
      setRaw(list);
      setOverrides({});
      setReconciled(false);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invoices");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const changeSettings = (patch: Partial<GSTSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch, confirmed: false }));
    setReconciled(false);
  };
  const review = (invoice: GSTInvoice) => {
    setEditing(invoice);
    setDraft({
      ...overrides[invoice.key],
      pos: invoice.pos,
      gstin: invoice.recipient,
      consumer: !invoice.registered,
      lines: Object.fromEntries(
        invoice.lines.map((line) => [
          line.index,
          { hsn: line.hsn, uqc: line.uqc, rate: line.rate, cess: line.cess },
        ]),
      ),
    });
  };
  const saveReview = () => {
    if (!editing) return;
    setOverrides((previous) => ({
      ...previous,
      [editing.key]: { ...draft, reviewed: true },
    }));
    setEditing(null);
    setReconciled(false);
  };
  const shown = report.invoices.filter(
    (invoice) =>
      view === "all" ||
      (view === "excluded" && invoice.excluded) ||
      (view === "pending" && !invoice.excluded && invoice.issues.length > 0) ||
      (view === "reviewed" && !invoice.excluded && !invoice.issues.length),
  );
  const columns: AquaTableColumn<GSTInvoice>[] = [
    {
      key: "number",
      header: "Invoice",
      render: (invoice) => (
        <div>
          <p className="font-bold">{invoice.number || "Missing number"}</p>
          <p className="text-xs text-slate-500">
            {invoice.date || "Invalid date"}
          </p>
        </div>
      ),
    },
    { key: "customer", header: "Customer" },
    {
      key: "recipient",
      header: "Recipient GSTIN",
      render: (invoice) => invoice.recipient || "Unregistered",
    },
    {
      key: "pos",
      header: "Place of supply",
      render: (invoice) =>
        GST_STATES[invoice.pos]
          ? `${invoice.pos} - ${GST_STATES[invoice.pos]}`
          : "Needs review",
    },
    {
      key: "total",
      header: "Saved value",
      render: (invoice) => currency(invoice.total),
    },
    {
      key: "issues",
      header: "Review status",
      render: (invoice) => (
        <div className="max-w-sm text-xs">
          {invoice.excluded ? (
            invoice.reason
          ) : invoice.issues.length ? (
            <ul className="space-y-1 text-amber-700 dark:text-amber-300">
              {invoice.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          ) : report.configIssues.length ? (
            "Invoice reviewed; complete supplier setup"
          ) : (
            "Reviewed domestic sale"
          )}
        </div>
      ),
    },
  ];
  const exportReport = async () => {
    setExporting(true);
    try {
      await downloadGSTWorkingPaper(
        report,
        settings,
        manual,
        periodLabel,
        reconciled,
      );
      showToast("GST working paper downloaded", "success");
    } catch {
      showToast("Could not export GST working paper", "error");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-5">
      <LiquidPanel className="p-4 sm:p-6">
        <div className="crm-tab-toolbar">
          <div>
            <h3 className="text-xl font-bold">GST filing preparation</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
              GSTR-1 sales working paper and GSTR-3B reconciliation. Prices
              include GST.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LiquidButton onClick={() => void load()} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh invoices
            </LiquidButton>
            <LiquidButton
              onClick={() => void exportReport()}
              disabled={!loaded || loading || exporting || Boolean(error)}
              variant="primary"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export working paper"}
            </LiquidButton>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LiquidSelect
            label="Financial year (April-March)"
            value={fy}
            onChange={(event) => {
              setFY(Number(event.target.value));
              setReconciled(false);
            }}
          >
            {Array.from({ length: 8 }, (_, i) => currentFY + 1 - i).map(
              (year) => (
                <option key={year} value={year}>
                  {year}-{String(year + 1).slice(-2)}
                </option>
              ),
            )}
          </LiquidSelect>
          <LiquidSelect
            label="Report period"
            value={frequency}
            onChange={(event) => {
              const next = event.target.value as typeof frequency;
              setFrequency(next);
              setPeriod(next === "quarterly" ? 0 : currentMonth);
              setReconciled(false);
            }}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (QRMP working paper)</option>
          </LiquidSelect>
          <LiquidSelect
            label={frequency === "monthly" ? "Month" : "Quarter"}
            value={period}
            onChange={(event) => {
              setPeriod(Number(event.target.value));
              setReconciled(false);
            }}
          >
            {frequency === "monthly"
              ? months.map((month) => (
                  <option key={month} value={month}>
                    {new Date(2020, month - 1, 1).toLocaleString("en-IN", {
                      month: "long",
                    })}
                  </option>
                ))
              : [
                  "April-June",
                  "July-September",
                  "October-December",
                  "January-March",
                ].map((label, index) => (
                  <option key={index} value={index}>
                    {label}
                  </option>
                ))}
          </LiquidSelect>
          <LiquidInput
            label="Supplier GSTIN"
            value={settings.gstin}
            maxLength={15}
            placeholder="Enter business GSTIN"
            onChange={(event) =>
              changeSettings({ gstin: event.target.value.toUpperCase().trim() })
            }
          />
          <LiquidInput
            label="Default GST rate (%) - confirm product rates"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={settings.rate}
            placeholder="e.g. 18; line rates can differ"
            onChange={(event) => changeSettings({ rate: event.target.value })}
          />
          <LiquidSelect
            label="Saved invoice price means"
            value={settings.priceBasis}
            onChange={(event) =>
              changeSettings({
                priceBasis: event.target.value as "line" | "unit",
              })
            }
          >
            <option value="line">
              Line amount (current CRM total calculation)
            </option>
            <option value="unit">Unit price x quantity</option>
          </LiquidSelect>
          <LiquidSelect
            label="Minimum HSN/SAC digits for your turnover"
            value={settings.hsnDigits}
            onChange={(event) =>
              changeSettings({ hsnDigits: Number(event.target.value) as 4 | 6 })
            }
          >
            <option value="6">6 digits (or 8)</option>
            <option value="4">4 digits (or 6/8), where permitted</option>
          </LiquidSelect>
        </div>
        <LiquidCheckbox
          wrapperClassName="mt-4 items-start text-sm"
          checked={settings.confirmed}
          onChange={(event) =>
            setSettings((previous) => ({
              ...previous,
              confirmed: event.target.checked,
            }))
          }
          label="I checked the supplier GSTIN, product tax rates and price basis against the sales ledger."
        />
        <p className="mt-3 text-xs text-slate-500 dark:text-white/50">
          Report review changes stay in this screen only (leaving GST reports
          discards them); they do not alter invoices. Refreshing resets invoice
          reviews. The workbook preserves your review inputs and exclusions.
        </p>
      </LiquidPanel>
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 p-4 text-red-600 dark:text-red-300"
        >
          {error}{" "}
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={() => void load()}
            className="underline"
          >
            Retry
          </LiquidButton>
        </div>
      )}
      {report.configIssues.length > 0 && (
        <div
          role="status"
          className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
        >
          {report.configIssues.join(" ")} Unreviewed or invalid invoices are
          excluded from tax totals.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Reviewed sales", new Set(report.sales.map((row) => row.key)).size],
          ["Needs invoice review", report.pending.length],
          ["Taxable sales", currency(report.totals.taxable)],
          [
            "GST on reviewed sales",
            currency(
              report.totals.igst + report.totals.cgst + report.totals.sgst,
            ),
          ],
        ].map(([label, value]) => (
          <LiquidPanel key={String(label)} className="p-4">
            <p className="text-xs text-slate-500 dark:text-white/50">{label}</p>
            <p className="mt-2 break-words text-xl font-bold">{value}</p>
          </LiquidPanel>
        ))}
      </div>
      <LiquidPanel className="p-4">
        <p className="text-sm">
          IGST: <strong>{currency(report.totals.igst)}</strong> - CGST:{" "}
          <strong>{currency(report.totals.cgst)}</strong> - SGST/UTGST:{" "}
          <strong>{currency(report.totals.sgst)}</strong> - Cess:{" "}
          <strong>{currency(report.totals.cess)}</strong>
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-white/60">
          B2B{" "}
          {
            new Set(
              report.sales
                .filter((row) => row.section === "B2B")
                .map((row) => row.key),
            ).size
          }{" "}
          - B2CL{" "}
          {
            new Set(
              report.sales
                .filter((row) => row.section === "B2CL")
                .map((row) => row.key),
            ).size
          }{" "}
          - B2CS{" "}
          {
            new Set(
              report.sales
                .filter((row) => row.section === "B2CS")
                .map((row) => row.key),
            ).size
          }{" "}
          - Excluded documents {report.excluded.length}. Unpaid invoices remain
          included when otherwise reportable.
        </p>
      </LiquidPanel>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="GST invoice review filter"
      >
        {(["all", "pending", "reviewed", "excluded"] as const).map((value) => (
          <LiquidButton
            key={value}
            variant={view === value ? "primary" : "soft"}
            onClick={() => setView(value)}
            aria-pressed={view === value}
          >
            {value === "pending"
              ? "Needs review"
              : value[0].toUpperCase() + value.slice(1)}
          </LiquidButton>
        ))}
      </div>
      <AquaGenericTable
        heading="GST sales register"
        subHeading={`Invoice dates ${range.start} to ${new Date(`${range.end}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC" })} (end exclusive). ${raw.length} source records loaded.`}
        columns={columns}
        data={shown}
        isLoading={loading}
        getRowId={(invoice) => invoice.key}
        enableFilter
        filterPlaceholder="Search invoices or customers"
        emptyMessage={
          loaded
            ? "No matching invoice records in this period."
            : "Load invoices to prepare the report."
        }
        actions={[
          {
            label: "Review tax details",
            icon: <Pencil className="h-4 w-4" />,
            onClick: review,
          },
        ]}
      />
      <LiquidPanel className="p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-bold">GSTR-3B reconciliation</h3>
        <p className="text-sm text-slate-500 dark:text-white/60">
          Reviewed domestic sales populate 3.1(a). Enter other supplies, reverse
          charge, eligible ITC and reversals from your books and GSTR-2B. These
          are working totals, not tax payment or ITC cross-utilisation
          instructions.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["3.1(a) taxable outward", currency(threeB.outward.taxable)],
            [
              "4(A) total eligible ITC",
              currency(
                threeB.itc.igst +
                  threeB.itc.cgst +
                  threeB.itc.sgst +
                  threeB.itc.cess,
              ),
            ],
            [
              "4(B) total reversals",
              currency(
                threeB.reversed.igst +
                  threeB.reversed.cgst +
                  threeB.reversed.sgst +
                  threeB.reversed.cess,
              ),
            ],
            [
              "4(C) net ITC",
              currency(
                threeB.net.igst +
                  threeB.net.cgst +
                  threeB.net.sgst +
                  threeB.net.cess,
              ),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
            >
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GST3B_MANUAL_ROWS.map(([key, label]) => (
            <LiquidButton
              key={key}
              onClick={() => {
                setManualKey(key);
                setManualDraft({ ...(manual[key] || zeroGST()) });
              }}
              className="justify-between text-left text-xs"
            >
              <span className="min-w-0 break-words">{label}</span>
              <Pencil className="h-4 w-4 shrink-0" />
            </LiquidButton>
          ))}
        </div>
        <LiquidCheckbox
          wrapperClassName="items-start text-sm"
          checked={reconciled}
          onChange={(event) => setReconciled(event.target.checked)}
          label="I reconciled this period with the sales/purchase books and GSTR-2B, including amounts absent from CRM. Blank manual rows represent confirmed zero amounts."
        />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Reconcile separately before filing: credit/debit notes and amendments,
          advances, exports/SEZ, ECO table 3.1.1, composition/UIN recipients in
          3.2, inward exempt supplies (5), interest/late fees (5.1), and
          payment/offset (6). This report does not claim a complete or filed
          GSTR-3B.
        </p>
      </LiquidPanel>
      <p role="status" className="text-sm font-semibold">
        {report.configIssues.length || report.pending.length || !reconciled
          ? "Draft: reconciliation is incomplete."
          : "Reviewed working paper. Complete remaining GST Portal sections before filing."}
      </p>
      <p className="text-xs text-slate-500 dark:text-white/50">
        Accountant working paper only; not a GST Portal upload file. GSTIN
        format checks do not verify active registration. Guidance:{" "}
        <a
          className="underline"
          target="_blank"
          rel="noreferrer"
          href="https://tutorial.gst.gov.in/userguide/returns/Creation_of_Outward_Supplies_Return_in_GSTR-1.htm"
        >
          GSTR-1
        </a>{" "}
        -{" "}
        <a
          className="underline"
          target="_blank"
          rel="noreferrer"
          href="https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm"
        >
          GSTR-3B
        </a>
      </p>
      <SidebarDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Review GST: ${editing?.number || "invoice"}`}
        size="lg"
        widthStorageKey="aquacrm:gst-review-width"
        footer={
          <>
            <LiquidButton onClick={() => setEditing(null)}>Cancel</LiquidButton>
            <LiquidButton variant="primary" onClick={saveReview}>
              <ClipboardCheck className="h-4 w-4" />
              Save report review
            </LiquidButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Customer: {editing.customer || "Missing"} - Saved total:{" "}
              {currency(editing.total)}. Correct source amounts or document
              numbers in Invoices if they do not reconcile.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LiquidSelect
                label="Actual place of supply"
                value={draft.pos || ""}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    pos: event.target.value,
                  }))
                }
              >
                <option value="">Select state / territory</option>
                {Object.entries(GST_STATES).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} - {label}
                  </option>
                ))}
              </LiquidSelect>
              <LiquidInput
                label="Recipient GSTIN (registered customer)"
                disabled={draft.consumer}
                value={draft.gstin || ""}
                maxLength={15}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    gstin: event.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <LiquidCheckbox
              wrapperClassName="text-sm"
              checked={Boolean(draft.consumer)}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  consumer: event.target.checked,
                }))
              }
              label="Recipient is unregistered (B2C)"
            />
            <LiquidCheckbox
              wrapperClassName="text-sm"
              checked={Boolean(draft.regular)}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  regular: event.target.checked,
                }))
              }
              label="Confirmed regular domestic sale with no reverse charge, export/SEZ or credit/debit-note treatment"
            />
            {editing.lines.map((line) => (
              <LiquidPanel key={line.index} className="p-4">
                <h4 className="font-semibold">
                  {line.index + 1}. {line.name || "Missing product name"}
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Quantity {line.quantity} - Saved amount{" "}
                  {currency(line.amount)}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["hsn", "uqc", "rate", "cess"] as const).map((field) =>
                    field === "uqc" ? (
                      <LiquidSelect
                        key={field}
                        label="GST UQC"
                        value={draft.lines?.[line.index]?.uqc || ""}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            lines: {
                              ...previous.lines,
                              [line.index]: {
                                ...previous.lines?.[line.index],
                                uqc: event.target.value,
                              },
                            },
                          }))
                        }
                      >
                        <option value="">Select UQC</option>
                        {GST_UQC.map((uqc) => (
                          <option key={uqc} value={uqc}>
                            {uqc}
                          </option>
                        ))}
                      </LiquidSelect>
                    ) : (
                      <LiquidInput
                        key={field}
                        label={
                          field === "hsn"
                            ? "HSN / SAC"
                            : field === "rate"
                              ? "GST rate (%)"
                              : "Cess amount included in this line"
                        }
                        type={field === "hsn" ? "text" : "number"}
                        min="0"
                        step="0.01"
                        value={draft.lines?.[line.index]?.[field] || ""}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            lines: {
                              ...previous.lines,
                              [line.index]: {
                                ...previous.lines?.[line.index],
                                [field]: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    ),
                  )}
                </div>
              </LiquidPanel>
            ))}
            <LiquidCheckbox
              wrapperClassName="text-sm"
              checked={Boolean(draft.exclude)}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  exclude: event.target.checked,
                }))
              }
              label="Exclude this document from the working sales totals"
            />
            <p className="text-xs text-slate-500">
              Saving confirms your review; validation issues still keep the
              invoice out of totals.
            </p>
          </div>
        )}
      </SidebarDialog>
      <SidebarDialog
        open={Boolean(manualKey)}
        onClose={() => setManualKey(null)}
        title={
          GST3B_MANUAL_ROWS.find(([key]) => key === manualKey)?.[1] ||
          "GSTR-3B amounts"
        }
        size="md"
        widthStorageKey="aquacrm:gst-3b-width"
        footer={
          <>
            <LiquidButton onClick={() => setManualKey(null)}>
              Cancel
            </LiquidButton>
            <LiquidButton
              variant="primary"
              disabled={amountKeys.some(
                (key) => !Number.isFinite(manualDraft[key]),
              )}
              onClick={() => {
                if (manualKey) {
                  const rounded = { ...manualDraft };
                  for (const key of amountKeys)
                    rounded[key] = money(rounded[key]);
                  setManual((previous) => ({
                    ...previous,
                    [manualKey]: rounded,
                  }));
                  setReconciled(false);
                  setManualKey(null);
                }
              }}
            >
              Save reconciliation amounts
            </LiquidButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {amountKeys
            .filter(
              (key) =>
                key !== "taxable" ||
                (!manualKey?.startsWith("itc") &&
                  !manualKey?.startsWith("reversal") &&
                  !["reclaimed", "ineligible"].includes(manualKey || "")),
            )
            .map((key) => (
              <LiquidInput
                key={key}
                label={amountLabels[key]}
                type="number"
                step="0.01"
                value={manualDraft[key]}
                onChange={(event) =>
                  setManualDraft((previous) => ({
                    ...previous,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Enter ledger-reconciled amounts for this period. No purchases or ITC
          are inferred from product cost prices.
        </p>
      </SidebarDialog>
    </div>
  );
}
