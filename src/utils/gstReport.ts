/** GST working-paper calculations. No portal filing or guessed tax metadata. */
export const GST_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu (legacy)",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (legacy)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other territory",
};
export type RawRecord = Record<string, unknown>;
export const asRecord = (value: unknown): RawRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
export const stringValue = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
const numberValue = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? NaN
    : Number(String(value).replace(/,/g, ""));
export const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const validGSTIN = (value: string) =>
  /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value) &&
  Boolean(GST_STATES[value.slice(0, 2)]);
export function invoiceList(value: unknown): RawRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const body = asRecord(value);
  for (const key of ["data", "invoices", "results"])
    if (body[key] !== undefined) return invoiceList(body[key]);
  throw new Error("Unexpected invoice response. Report was not generated.");
}
export function gstDate(value: unknown): string {
  const text = stringValue(value);
  if (!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(text)) return "";
  const calendarDate = new Date(`${text.slice(0, 10)}T00:00:00Z`);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== text.slice(0, 10)
  )
    return "";
  if (!text.includes("T")) return text;
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((key) => parts.find((p) => p.type === key)?.value)
    .join("-");
}
export function gstPeriod(
  financialYear: number,
  frequency: "monthly" | "quarterly",
  period: number,
) {
  if (
    !Number.isInteger(financialYear) ||
    !Number.isInteger(period) ||
    (frequency === "monthly"
      ? period < 1 || period > 12
      : period < 0 || period > 3)
  )
    throw new Error("Invalid GST period");
  const startMonth = frequency === "quarterly" ? 4 + period * 3 : period;
  const month = ((startMonth - 1) % 12) + 1;
  const year =
    frequency === "quarterly"
      ? financialYear + (startMonth > 12 ? 1 : 0)
      : financialYear + (month < 4 ? 1 : 0);
  const end = new Date(
    Date.UTC(year, month - 1 + (frequency === "quarterly" ? 3 : 1), 1),
  );
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: end.toISOString().slice(0, 10),
  };
}
export const GST_UQC = [
  "NOS",
  "UNT",
  "SET",
  "KGS",
  "GMS",
  "LTR",
  "MLT",
  "MTR",
  "SQM",
  "SQF",
  "CBM",
  "BOX",
  "PAC",
  "BTL",
  "BAG",
  "DOZ",
  "TON",
  "OTH",
];
export interface GSTSettings {
  gstin: string;
  rate: string;
  hsnDigits: 4 | 6;
  priceBasis: "line" | "unit";
  confirmed: boolean;
}
export interface GSTLineOverride {
  hsn?: string;
  uqc?: string;
  rate?: string;
  cess?: string;
}
export interface GSTInvoiceOverride {
  pos?: string;
  gstin?: string;
  consumer?: boolean;
  reviewed?: boolean;
  regular?: boolean;
  exclude?: boolean;
  lines?: Record<number, GSTLineOverride>;
}
export interface GSTLine {
  index: number;
  name: string;
  quantity: number;
  amount: number;
  hsn: string;
  uqc: string;
  rate: string;
  cess: string;
}
export interface GSTInvoice {
  key: string;
  number: string;
  date: string;
  customer: string;
  recipient: string;
  pos: string;
  registered: boolean;
  total: number;
  lines: GSTLine[];
  issues: string[];
  excluded: boolean;
  reason: string;
  reviewed: boolean;
}
export interface GSTAmounts {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  gross: number;
}
export interface GSTSalesLine extends GSTAmounts {
  key: string;
  invoice: string;
  date: string;
  customer: string;
  recipient: string;
  pos: string;
  section: "B2B" | "B2CL" | "B2CS";
  hsn: string;
  uqc: string;
  quantity: number;
  rate: number;
  name: string;
}
export const zeroGST = (): GSTAmounts => ({
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  cess: 0,
  gross: 0,
});
export const addGST = (rows: GSTAmounts[]): GSTAmounts => {
  const result = zeroGST();
  for (const row of rows)
    for (const key of Object.keys(result) as (keyof GSTAmounts)[])
      result[key] = money(result[key] + row[key]);
  return result;
};
export function buildGSTReport(
  raw: RawRecord[],
  settings: GSTSettings,
  overrides: Record<string, GSTInvoiceOverride>,
  start: string,
  end: string,
) {
  const seen = new Map<string, number>();
  const seenKeys = new Map<string, number>();
  const financialYear =
    Number(start.slice(0, 4)) - (Number(start.slice(5, 7)) < 4 ? 1 : 0);
  const financialStart = `${financialYear}-04-01`,
    financialEnd = `${financialYear + 1}-04-01`;
  for (const source of raw) {
    const no = stringValue(
      source.invoice_no ?? source.invoiceNo ?? source.invoice_number,
    );
    const date = gstDate(source.date ?? source.issue_date);
    if (no && date >= financialStart && date < financialEnd)
      seen.set(no.toUpperCase(), (seen.get(no.toUpperCase()) || 0) + 1);
    const key = stringValue(source._id ?? source.id ?? source.invoice_id);
    if (key) seenKeys.set(key, (seenKeys.get(key) || 0) + 1);
  }
  const invoices: GSTInvoice[] = [];
  const sales: GSTSalesLine[] = [];
  const configIssues: string[] = [];
  const seller = settings.gstin.trim().toUpperCase();
  if (!validGSTIN(seller))
    configIssues.push("Enter a valid supplier GSTIN format and state code.");
  if (!settings.confirmed)
    configIssues.push(
      "Confirm the supplier GSTIN, GST rate and saved-price basis.",
    );
  for (const [index, source] of raw.entries()) {
    const key =
      stringValue(source._id ?? source.id ?? source.invoice_id) ||
      `row-${index}`;
    const edit = overrides[key] || {};
    const date = gstDate(source.date ?? source.issue_date);
    if (date && (date < start || date >= end)) continue;
    const customer = asRecord(source.customerDetails);
    const gst = asRecord(source.gstDetails);
    const number = stringValue(
      source.invoice_no ?? source.invoiceNo ?? source.invoice_number,
    );
    const recipient = stringValue(
      edit.consumer ? "" : (edit.gstin ?? gst.gstNo ?? source.gst_no),
    ).toUpperCase();
    const registered = edit.consumer ? false : Boolean(recipient || source.gst);
    // Recipient registration state is not necessarily the place of supply.
    const pos = stringValue(
      edit.pos ?? source.placeOfSupply ?? source.place_of_supply ?? source.pos,
    );
    const status = stringValue(
      source.status ?? source.invoiceStatus,
    ).toLowerCase();
    const excluded = Boolean(
      edit.exclude ||
      source.cancelled === true ||
      ["cancelled", "canceled", "draft", "quotation", "proforma"].includes(
        status,
      ) ||
      source.quotation === true,
    );
    const reason = edit.exclude
      ? "Excluded by reviewer"
      : excluded
        ? "Cancelled, draft or quotation; not counted as taxable sales"
        : "";
    const issues: string[] = [];
    if (!date)
      issues.push(
        "Missing or invalid invoice date; period cannot be determined",
      );
    if (!number || !/^[A-Za-z0-9/-]{1,16}$/.test(number))
      issues.push(
        "Invoice number must be 1-16 letters/digits, slash or hyphen",
      );
    if ((seen.get(number.toUpperCase()) || 0) > 1)
      issues.push("Duplicate invoice number within the financial year");
    if ((seenKeys.get(key) || 0) > 1)
      issues.push(
        "Duplicate source invoice ID; reload and reconcile source records",
      );
    if (!GST_STATES[pos])
      issues.push("Place of supply is required (do not infer it from GSTIN)");
    if (registered && !validGSTIN(recipient))
      issues.push("Registered recipient needs a valid GSTIN format");
    if (!edit.reviewed) issues.push("Review and confirm invoice tax details");
    const documentType = stringValue(
      source.documentType ??
        source.document_type ??
        source.invoiceType ??
        source.type,
    ).toLowerCase();
    if (
      source.reverseCharge ||
      source.reverse_charge ||
      source.export ||
      source.sez ||
      source.creditNote ||
      source.debitNote ||
      (documentType &&
        !["invoice", "inv", "regular", "tax_invoice"].includes(documentType))
    )
      issues.push(
        "Special document/tax treatment is outside regular domestic sales; reconcile separately",
      );
    if (source.po && !edit.regular)
      issues.push(
        "PO flag: confirm that this document is a regular sales invoice",
      );
    const products = [
      source.products,
      source.items,
      source.invoice_items,
      source.invoiceItems,
    ].find(Array.isArray) as unknown[] | undefined;
    if (!products?.length) issues.push("No invoice line items");
    const lines: GSTLine[] = (products || []).map((value, lineIndex) => {
      const p = asRecord(value),
        patch = edit.lines?.[lineIndex] || {};
      const line: GSTLine = {
        index: lineIndex,
        name: stringValue(p.productName ?? p.name ?? p.title),
        quantity: numberValue(p.productQuantity ?? p.quantity ?? p.qty),
        amount: numberValue(p.productPrice ?? p.unitPrice ?? p.price ?? p.rate),
        hsn: stringValue(patch.hsn ?? p.hsn ?? p.hsnCode ?? p.hsn_code),
        uqc: stringValue(patch.uqc ?? p.uqc),
        rate: stringValue(
          patch.rate ?? p.gstRate ?? p.gst_rate ?? settings.rate,
        ),
        cess: stringValue(patch.cess ?? p.cessAmount ?? "0"),
      };
      const prefix = `Line ${lineIndex + 1}: `;
      if (
        !line.name ||
        !Number.isFinite(line.quantity) ||
        line.quantity <= 0 ||
        !Number.isFinite(line.amount) ||
        line.amount < 0
      )
        issues.push(prefix + "invalid description, quantity or saved amount");
      if (
        !/^\d{4}(?:\d{2})?(?:\d{2})?$/.test(line.hsn) ||
        line.hsn.length < settings.hsnDigits
      )
        issues.push(
          prefix + "HSN/SAC is missing or shorter than the configured minimum",
        );
      if (!GST_UQC.includes(line.uqc))
        issues.push(prefix + "select a supported GST UQC");
      const rate = numberValue(line.rate),
        cess = numberValue(line.cess);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 100)
        issues.push(
          prefix +
            "confirm a positive GST rate; nil/exempt/non-GST supplies need separate reconciliation",
        );
      if (!Number.isFinite(cess) || cess < 0)
        issues.push(prefix + "invalid cess amount");
      return line;
    });
    const total = numberValue(
      source.total_amount ?? source.totalAmount ?? source.total,
    );
    if (!Number.isFinite(total) || total < 0)
      issues.push("Missing or invalid saved invoice total");
    const lineGross = money(
      lines.reduce(
        (sum, line) =>
          sum +
          line.amount * (settings.priceBasis === "unit" ? line.quantity : 1),
        0,
      ),
    );
    if (
      Number.isFinite(total) &&
      Number.isFinite(lineGross) &&
      Math.round(total * 100) !== Math.round(lineGross * 100)
    )
      issues.push(
        "Saved invoice total does not reconcile to saved line amounts",
      );
    const invoice: GSTInvoice = {
      key,
      number,
      date,
      customer: stringValue(customer.name ?? source.customer_name),
      recipient,
      registered,
      pos,
      total,
      lines,
      issues,
      excluded,
      reason,
      reviewed: Boolean(edit.reviewed),
    };
    invoices.push(invoice);
    if (excluded || issues.length || configIssues.length) continue;
    const threshold = date >= "2024-08-01" ? 100000 : 250000;
    const section = registered
      ? "B2B"
      : pos !== seller.slice(0, 2) && total > threshold
        ? "B2CL"
        : "B2CS";
    for (const line of lines) {
      const gross = money(
        line.amount * (settings.priceBasis === "unit" ? line.quantity : 1),
      );
      const cess = money(Number(line.cess));
      if (cess > gross) {
        invoice.issues.push("Cess exceeds inclusive line value");
        break;
      }
      const taxable = money((gross - cess) / (1 + Number(line.rate) / 100));
      const tax = money(gross - cess - taxable);
      const interstate = pos !== seller.slice(0, 2);
      const cgst = interstate ? 0 : money(tax / 2);
      sales.push({
        key,
        invoice: number,
        date,
        customer: invoice.customer,
        recipient,
        pos,
        section,
        hsn: line.hsn,
        uqc: line.uqc,
        quantity: line.quantity,
        rate: Number(line.rate),
        name: line.name,
        taxable,
        cgst,
        sgst: interstate ? 0 : money(tax - cgst),
        igst: interstate ? tax : 0,
        cess,
        gross,
      });
    }
  }
  // A partially valid invoice must never enter summaries.
  const validKeys = new Set(
    invoices.filter((i) => !i.excluded && !i.issues.length).map((i) => i.key),
  );
  const accepted = sales.filter((line) => validKeys.has(line.key));
  const group = (key: (line: GSTSalesLine) => string) => {
    const map = new Map<string, GSTSalesLine[]>();
    for (const line of accepted) {
      const id = key(line);
      map.set(id, [...(map.get(id) || []), line]);
    }
    return [...map.entries()].map(([key, rows]) => ({
      ...rows[0],
      key,
      ...addGST(rows),
      quantity: money(rows.reduce((sum, row) => sum + row.quantity, 0)),
    }));
  };
  return {
    invoices,
    sales: accepted,
    totals: addGST(accepted),
    configIssues,
    pending: invoices.filter((i) => !i.excluded && i.issues.length),
    excluded: invoices.filter((i) => i.excluded),
    hsn: group(
      (line) =>
        `${line.section === "B2B" ? "B2B" : "B2C"}|${line.hsn}|${line.uqc}|${line.rate}`,
    ),
    b2cs: group((line) => `${line.pos}|${line.rate}|${line.section}`).filter(
      (row) => row.section === "B2CS",
    ),
  };
}
export type GSTReport = ReturnType<typeof buildGSTReport>;

export const GST3B_MANUAL_ROWS = [
  ["adjustments", "3.1(a) adjustments outside reviewed CRM sales"],
  ["zeroRated", "3.1(b) zero-rated outward supplies"],
  ["nilExempt", "3.1(c) nil-rated / exempt outward supplies"],
  ["reverseCharge", "3.1(d) inward supplies liable to reverse charge"],
  ["nonGST", "3.1(e) non-GST outward supplies"],
  ["itcImportGoods", "4(A)(1) ITC: import of goods"],
  ["itcImportServices", "4(A)(2) ITC: import of services"],
  ["itcRCM", "4(A)(3) ITC: inward reverse charge"],
  ["itcISD", "4(A)(4) ITC: ISD"],
  ["itcOther", "4(A)(5) ITC: all other"],
  ["reversalPermanent", "4(B)(1) ITC reversals"],
  ["reversalOther", "4(B)(2) other ITC reversals"],
  ["reclaimed", "4(D)(1) reclaimed ITC (information only)"],
  ["ineligible", "4(D)(2) ineligible ITC (information only)"],
] as const;
export type GST3BManual = Record<string, GSTAmounts>;
export function gst3BRows(report: GSTReport, manual: GST3BManual) {
  const values = (key: string) => manual[key] || zeroGST();
  const sum = (keys: string[]) => addGST(keys.map(values));
  const outward = addGST([report.totals, values("adjustments")]);
  const itc = sum([
    "itcImportGoods",
    "itcImportServices",
    "itcRCM",
    "itcISD",
    "itcOther",
  ]);
  const reversed = sum(["reversalPermanent", "reversalOther"]);
  const net = zeroGST();
  for (const key of ["cgst", "sgst", "igst", "cess"] as const)
    net[key] = money(itc[key] - reversed[key]);
  return {
    outward,
    itc,
    reversed,
    net,
    rows: [
      {
        key: "outward",
        label: "3.1(a) outward taxable supplies including manual adjustments",
        ...outward,
      },
      ...GST3B_MANUAL_ROWS.filter(([key]) => key !== "adjustments").map(
        ([key, label]) => ({ key, label, ...values(key) }),
      ),
      {
        key: "netITC",
        label: "4(C) net ITC (4A minus 4B; eligibility must be reconciled)",
        ...net,
      },
    ],
  };
}
