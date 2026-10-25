import type { SheetData } from "write-excel-file/browser";
import {
  GST3B_MANUAL_ROWS,
  gst3BRows,
  type GST3BManual,
  type GSTReport,
  type GSTSettings,
} from "./gstReport";

export async function downloadGSTWorkingPaper(
  report: GSTReport,
  settings: GSTSettings,
  manual: GST3BManual,
  period: string,
  reconciled: boolean,
) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  type Cell = string | number;
  const sheet = (name: string, headers: string[], rows: Cell[][]) => ({
    sheet: name,
    data: [
      headers.map((value) => ({
        value,
        type: String,
        fontWeight: "bold" as const,
        backgroundColor: "#E2E8F0",
      })),
      ...rows.map((row) =>
        row.map((value) =>
          typeof value === "number"
            ? { value, type: Number, format: "0.00" }
            : { value, type: String },
        ),
      ),
    ] as SheetData,
    stickyRowsCount: 1,
    columns: headers.map(() => ({ width: 22 })),
  });
  const taxHeaders = ["Taxable value", "IGST", "CGST", "SGST/UTGST", "Cess"];
  const taxValues = (row: {
    taxable: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  }) => [row.taxable, row.igst, row.cgst, row.sgst, row.cess];
  const salesHeaders = [
    "Recipient GSTIN",
    "Customer",
    "Invoice number",
    "Invoice date",
    "Place of supply",
    "Section",
    "Product",
    "HSN/SAC",
    "UQC",
    "Quantity",
    "GST rate",
    ...taxHeaders,
    "Inclusive line value",
  ];
  const salesRows = (section?: string) =>
    report.sales
      .filter((row) => !section || row.section === section)
      .map((row) => [
        row.recipient,
        row.customer,
        row.invoice,
        row.date,
        row.pos,
        row.section,
        row.name,
        row.hsn,
        row.uqc,
        row.quantity,
        row.rate,
        ...taxValues(row),
        row.gross,
      ]);
  const threeB = gst3BRows(report, manual);
  const issues = [
    ...report.configIssues.map((issue) => ["SETUP", "", issue]),
    ...report.pending.flatMap((inv) =>
      inv.issues.map((issue) => [inv.number || inv.key, inv.date, issue]),
    ),
    ...report.excluded.map((inv) => [
      inv.number || inv.key,
      inv.date,
      inv.reason,
    ]),
    ...(!reconciled
      ? [
          [
            "GSTR-3B",
            "",
            "Purchase / ITC and other-supplies reconciliation is not confirmed",
          ],
        ]
      : []),
  ];
  const sources =
    "https://tutorial.gst.gov.in/userguide/returns/Creation_of_Outward_Supplies_Return_in_GSTR-1.htm";
  const sheets = [
    sheet(
      "Read me",
      ["Setting", "Value"],
      [
        [
          "Preparation status",
          report.configIssues.length || report.pending.length || !reconciled
            ? "DRAFT - INCOMPLETE RECONCILIATION"
            : "REVIEWED WORKING PAPER - NOT FILED",
        ],
        [
          "Purpose",
          "Accountant working paper, not a GST Portal upload or filed return",
        ],
        ["Period", period],
        ["Supplier GSTIN", settings.gstin],
        ["Prices", "GST inclusive (confirmed by business)"],
        ["Saved price basis", settings.priceBasis],
        ["Default GST rate", settings.rate],
        ["Minimum HSN digits", settings.hsnDigits],
        ["Supplier / tax setup confirmed", settings.confirmed ? "Yes" : "No"],
        ["GSTR-3B reconciliation confirmed", reconciled ? "Yes" : "No"],
        ["Reviewed invoices", new Set(report.sales.map((row) => row.key)).size],
        ["Invoices needing review", report.pending.length],
        ["Excluded documents", report.excluded.length],
        [
          "Sales totals",
          "Only reviewed regular domestic invoices; missing/invalid records are excluded",
        ],
        [
          "GSTR-3B scope",
          "3.1(a)-(e), ITC 4(A)-4(D) working totals and unregistered interstate 3.2 sales from CRM",
        ],
        [
          "Reconcile separately",
          "GSTR-1 document series/counts (13), credit/debit notes and amendments, advances, exports/SEZ, nil/exempt/non-GST supplies, reverse charge, ECO 3.1.1, composition/UIN 3.2, inward supplies section 5, interest/late fees 5.1, payment/offset section 6",
        ],
        [
          "ITC",
          "Check purchases, GSTR-2B, eligibility and reversals; no tax payment or cross-utilisation is calculated",
        ],
        [
          "Registration",
          "GSTIN format checked only; active registration must be verified separately",
        ],
        ["GST Portal guidance", sources],
      ],
    ),
    sheet("Sales register", salesHeaders, salesRows()),
    sheet("B2B working", salesHeaders, salesRows("B2B")),
    sheet("B2CL working", salesHeaders, salesRows("B2CL")),
    sheet(
      "B2CS summary",
      ["Place of supply", "GST rate", ...taxHeaders],
      report.b2cs.map((row) => [row.pos, row.rate, ...taxValues(row)]),
    ),
    sheet(
      "HSN summary",
      [
        "Recipient class",
        "HSN/SAC",
        "UQC",
        "GST rate",
        "Quantity",
        ...taxHeaders,
        "Inclusive value",
      ],
      report.hsn.map((row) => [
        row.section === "B2B" ? "B2B" : "B2C",
        row.hsn,
        row.uqc,
        row.rate,
        row.quantity,
        ...taxValues(row),
        row.gross,
      ]),
    ),
    sheet(
      "GSTR3B working",
      ["Table / description", ...taxHeaders],
      threeB.rows.map((row) => [row.label, ...taxValues(row)]),
    ),
    sheet(
      "3B manual inputs",
      ["Description", ...taxHeaders],
      GST3B_MANUAL_ROWS.map(([key, label]) => [
        label,
        ...taxValues(
          manual[key] || { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
        ),
      ]),
    ),
    sheet(
      "3.2 unregistered",
      ["Place of supply", "Taxable value", "IGST"],
      Object.values(
        report.sales
          .filter((row) => row.section !== "B2B" && row.igst > 0)
          .reduce<
            Record<string, { pos: string; taxable: number; igst: number }>
          >((acc, row) => {
            const item = acc[row.pos] || { pos: row.pos, taxable: 0, igst: 0 };
            item.taxable += row.taxable;
            item.igst += row.igst;
            acc[row.pos] = item;
            return acc;
          }, {}),
      ).map((row) => [
        row.pos,
        Math.round(row.taxable * 100) / 100,
        Math.round(row.igst * 100) / 100,
      ]),
    ),
    sheet(
      "Documents review",
      ["Invoice", "Date", "Saved amount", "Review state", "Reason / issues"],
      report.invoices.map((invoice) => [
        invoice.number,
        invoice.date,
        Number.isFinite(invoice.total) ? invoice.total : "",
        invoice.excluded
          ? "Excluded"
          : invoice.issues.length
            ? "Needs review"
            : "Reviewed",
        invoice.excluded ? invoice.reason : invoice.issues.join("; "),
      ]),
    ),
    sheet(
      "Review checklist",
      ["Document", "Date", "Issue / exclusion"],
      issues,
    ),
  ];
  await writeXlsxFile(sheets).toFile(
    `GST-working-paper-${period.replace(/[^0-9A-Za-z-]/g, "-")}.xlsx`,
  );
}
