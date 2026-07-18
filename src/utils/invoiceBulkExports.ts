import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SheetData } from "write-excel-file/browser";
import priceUtils from "./priceUtils";

interface BulkInvoiceProduct {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
}

export interface BulkInvoice {
  id: string;
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone: string | number;
  customer_email: string;
  customer_address: string;
  gst: boolean;
  po: boolean;
  gst_no: string | null;
  payment_type: string;
  delivery_date: string | null;
  delivered_by: string | null;
  paid_status: string;
  total_amount: number;
  products: BulkInvoiceProduct[];
}

const INVOICE_PUBLIC_ORIGIN = "https://admin.aquakart.co.in";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

export const getInvoiceLink = (invoiceId: string) =>
  `${INVOICE_PUBLIC_ORIGIN}/invoice/${invoiceId}`;

export const getInvoiceLinksText = (invoices: readonly BulkInvoice[]) =>
  invoices.map((invoice) => getInvoiceLink(invoice.id)).join("\n");

export async function downloadInvoicesExcel(invoices: readonly BulkInvoice[]) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const headerCell = (value: string) => ({
    value,
    type: String,
    fontWeight: "bold" as const,
    backgroundColor: "#E2E8F0",
  });
  const invoiceHeaders = [
    "Invoice No",
    "Date",
    "Customer",
    "Phone",
    "Email",
    "Address",
    "GST",
    "PO",
    "GST No",
    "Payment Type",
    "Delivery Date",
    "Delivered By",
    "Base Price",
    "GST (18%)",
    "Total Amount",
    "Status",
    "Link",
  ];
  const invoicesData: SheetData = [
    invoiceHeaders.map(headerCell),
    ...invoices.map((invoice) => [
      invoice.invoice_no,
      formatDate(invoice.date),
      invoice.customer_name,
      String(invoice.customer_phone),
      invoice.customer_email || "",
      invoice.customer_address || "",
      invoice.gst ? "Yes" : "No",
      invoice.po ? "Yes" : "No",
      invoice.gst_no || "",
      invoice.payment_type,
      formatDate(invoice.delivery_date),
      invoice.delivered_by || "",
      {
        value: priceUtils.getBasePrice(invoice.total_amount),
        type: Number,
        format: "#,##0",
      },
      {
        value: priceUtils.getGSTValue(invoice.total_amount),
        type: Number,
        format: "#,##0",
      },
      { value: invoice.total_amount, type: Number, format: "#,##0" },
      invoice.paid_status,
      getInvoiceLink(invoice.id),
    ]),
  ];
  const productHeaders = [
    "Invoice No",
    "Product",
    "Quantity",
    "Price",
    "Serial No",
  ];
  const productsData: SheetData = [
    productHeaders.map(headerCell),
    ...invoices.flatMap((invoice) =>
      invoice.products.map((product) => [
        invoice.invoice_no,
        product.productName,
        { value: product.productQuantity, type: Number },
        { value: product.productPrice, type: Number, format: "#,##0" },
        product.productSerialNo || "",
      ]),
    ),
  ];
  const sheets = [
    {
      data: invoicesData,
      sheet: "Invoices",
      stickyRowsCount: 1,
      columns: [
        24, 14, 24, 16, 28, 40, 8, 8, 20, 16, 16, 18, 16, 16, 16, 14, 52,
      ].map((width) => ({ width })),
    },
  ];

  if (productsData.length > 1) {
    sheets.push({
      data: productsData,
      sheet: "Products",
      stickyRowsCount: 1,
      columns: [24, 36, 12, 16, 24].map((width) => ({ width })),
    });
  }

  await writeXlsxFile(sheets).toFile(
    `selected_invoices_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function downloadInvoicesPdf(invoices: readonly BulkInvoice[]) {
  type PdfWithTable = jsPDF & {
    lastAutoTable?: { finalY: number };
  };

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  invoices.forEach((invoice, invoiceIndex) => {
    if (invoiceIndex > 0) doc.addPage();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Aquakart Invoice", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_no || "Invoice", 14, 20);
    doc.text(formatDate(invoice.date), pageWidth - 14, 20, {
      align: "right",
    });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To", 14, 39);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customer_name || "—", 14, 46);
    doc.text(`Phone: ${invoice.customer_phone || "—"}`, 14, 52);
    if (invoice.customer_email) {
      doc.text(`Email: ${invoice.customer_email}`, 14, 58);
    }
    const addressStartY = invoice.customer_email ? 64 : 58;
    const addressLines = doc.splitTextToSize(
      `Address: ${invoice.customer_address || "—"}`,
      pageWidth - 28,
    ) as string[];
    doc.text(addressLines, 14, addressStartY);

    const tableStartY = addressStartY + addressLines.length * 5 + 5;
    autoTable(doc, {
      startY: tableStartY,
      head: [["Product", "Qty", "Price", "Serial No"]],
      body: invoice.products.length
        ? invoice.products.map((product) => [
            product.productName,
            product.productQuantity,
            formatAmount(product.productPrice),
            product.productSerialNo || "—",
          ])
        : [["No products", "—", "—", "—"]],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    let summaryY =
      ((doc as PdfWithTable).lastAutoTable?.finalY ?? tableStartY) + 10;
    if (summaryY > 275) {
      doc.addPage();
      summaryY = 24;
    }

    doc.setFont("helvetica", "normal");
    doc.text(`Payment: ${invoice.payment_type || "—"}`, 14, summaryY);
    doc.text(`Status: ${invoice.paid_status || "—"}`, 14, summaryY + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(
      `Total: ${formatAmount(invoice.total_amount)}`,
      pageWidth - 14,
      summaryY + 7,
      { align: "right" },
    );
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.textWithLink("Open invoice online", 14, summaryY + 16, {
      url: getInvoiceLink(invoice.id),
    });
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, 290, {
      align: "right",
    });
  }

  doc.save(`selected_invoices_${new Date().toISOString().slice(0, 10)}.pdf`);
}
