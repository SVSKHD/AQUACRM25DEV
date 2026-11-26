import { useState, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  downloadPublicInvoicePdf,
  getInvoiceTaxSummary,
  getPlaceOfSupply,
  getUnitPrice,
} from "../utils/invoicePdf";
import { getInvoiceStamp, isInvoicePaid } from "../utils/invoiceStamp";
import InvoiceStampSeal from "./dynamicInvoiceComponents/InvoiceStampSeal";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  Printer,
  Download,
  Copy,
  Smartphone,
} from "lucide-react";
import { AquaToast } from "../components/AquaToast";
import TermsAndConditions from "./dynamicInvoiceComponents/termsAndConditions";
import SuggestedProducts from "./dynamicInvoiceComponents/suggestedProducts";
import InvoiceWish from "./dynamicInvoiceComponents/wish";
import CustomerCare from "./dynamicInvoiceComponents/customerCare";
import { termsAndConditions } from "./dynamicInvoiceComponents/constants/constants";
import { useInvoicePageData } from "./dynamicInvoiceComponents/useInvoicePageData";
import {
  getPaymentCopyContent,
  type PaymentCopyField,
} from "./dynamicInvoiceComponents/paymentUtils";

// One money format for the whole page: Indian grouping, two decimals.
const money = (value: number) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
};

const sentenceCase = (value: string | null | undefined) => {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
};

const BANK_ACCOUNTS: {
  field: PaymentCopyField;
  name: string;
  icon: typeof Building2;
  lines: [string, string][];
}[] = [
  {
    field: "iciciDetails",
    name: "ICICI Bank",
    icon: Building2,
    lines: [
      ["Account name", "Kundana Enterprises"],
      ["Account no.", "131605003314"],
      ["IFSC", "ICIC0001316"],
    ],
  },
  {
    field: "kotakDetails",
    name: "Kotak Bank",
    icon: Building2,
    lines: [
      ["Account name", "Kundana Enterprises"],
      ["Account no.", "8813356673"],
      ["IFSC", "KKBK0007463"],
    ],
  },
  {
    field: "upiDetails",
    name: "UPI",
    icon: Smartphone,
    lines: [
      ["GPay", "9182119842"],
      ["PhonePe", "9182119842"],
    ],
  },
];

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-3 text-sm font-medium text-zinc-900">{children}</h2>
);

const IconLine = ({
  icon: Icon,
  children,
  strong = false,
}: {
  icon: typeof User;
  children: ReactNode;
  strong?: boolean;
}) => (
  <div className="flex items-start gap-2">
    <Icon
      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
      strokeWidth={1.5}
      aria-hidden="true"
    />
    <p
      className={`min-w-0 break-words text-sm ${
        strong ? "font-medium text-zinc-900" : "text-zinc-600"
      }`}
    >
      {children}
    </p>
  </div>
);

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isServiceInvoice = location.pathname.startsWith("/service/invoice/");
  const serviceToken = isServiceInvoice
    ? sessionStorage.getItem("aquakart_service_token") || ""
    : undefined;
  const { invoice, loading, suggestedProducts } = useInvoicePageData(
    id,
    serviceToken,
  );
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const copyToClipboard = (field: PaymentCopyField) => {
    const content = getPaymentCopyContent(field);
    navigator.clipboard.writeText(content.text).then(() => {
      setCopyToast(`${content.label} copied`);
      setTimeout(() => setCopyToast(null), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      await downloadPublicInvoicePdf(invoice);
      setCopyToast("Invoice PDF downloaded");
      setTimeout(() => setCopyToast(null), 1800);
    } catch (error) {
      console.error("Invoice PDF download failed", error);
      setCopyToast("PDF download failed. Please try again.");
      setTimeout(() => setCopyToast(null), 2200);
    }
  };

  const handleCopyInvoiceNumber = async () => {
    if (!invoice?.invoice_no) return;
    try {
      await navigator.clipboard.writeText(invoice.invoice_no);
      setCopyToast("Invoice number copied");
      setTimeout(() => setCopyToast(null), 1800);
    } catch (error) {
      console.error("Failed to copy invoice number", error);
    }
  };

  const getFestivalWish = () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    // New Year: Dec 28 to Jan 2
    if ((month === 12 && day >= 28) || (month === 1 && day <= 2)) {
      return `Wishing you a happy New Year ${month === 12 ? year + 1 : year}`;
    }

    // Sankranthi: Jan 10 to Jan 16
    if (month === 1 && day >= 10 && day <= 16) {
      return "Wishing you a happy Sankranthi";
    }

    return null;
  };

  const currentWish = getFestivalWish();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
          role="status"
          aria-label="Loading invoice"
        />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 font-sans">
        <div className="text-center">
          <FileText
            className="mx-auto mb-4 h-10 w-10 text-zinc-400"
            strokeWidth={1.5}
          />
          <h1 className="mb-1 text-lg font-medium text-zinc-900">
            Invoice not found
          </h1>
          <p className="text-sm text-zinc-600">
            Check the link, or ask Aquakart to send it again.
          </p>
        </div>
      </div>
    );
  }

  const stamp = getInvoiceStamp(invoice);
  const { lineTaxes, totals } = getInvoiceTaxSummary(invoice);
  const placeOfSupply = getPlaceOfSupply(invoice.gst_no);
  const paid = isInvoicePaid(invoice.paid_status);
  const documentTitle = invoice.quotation
    ? "Quotation"
    : invoice.po
      ? "Purchase order invoice"
      : invoice.gst
        ? "Tax invoice"
        : "Invoice";

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-zinc-900 print:bg-white">
      <header className="sticky top-0 z-50 border-b border-zinc-900/10 bg-white/95 print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/aquakart.png" alt="" className="h-7 w-7" />
            <span className="truncate text-sm font-medium">
              {documentTitle}
              <span className="text-zinc-500"> · {invoice.invoice_no}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-900/10 px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#05845f]"
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#05845f] px-4 text-sm font-medium text-white transition-[background-color,transform] hover:bg-[#04704f] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#05845f]"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 print:p-0">
        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
          className="rounded-2xl border border-zinc-900/10 bg-white p-6 sm:p-10 print:rounded-none print:border-0 print:p-0"
        >
          {/* Seller and document */}
          <div className="flex flex-col gap-6 border-b border-zinc-900/10 pb-8 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <img src="/aquakart.png" alt="Aquakart" className="h-12 w-12" />
              <div className="space-y-1">
                <p className="text-lg font-medium leading-6">Aquakart</p>
                <p className="text-sm text-zinc-600">Water solutions</p>
                <p className="text-sm text-zinc-600">
                  GSTIN{" "}
                  <span className="font-mono text-zinc-900">
                    36AJOPH6387A1Z2
                  </span>
                </p>
                <a
                  href="https://aquakart.co.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#05845f] underline-offset-4 hover:underline"
                >
                  aquakart.co.in
                </a>
              </div>
            </div>

            <div className="md:text-right">
              <p className="text-sm text-zinc-500">{documentTitle}</p>
              <div className="mt-1 flex items-center gap-1 md:justify-end">
                <p className="font-mono text-2xl font-medium tabular-nums">
                  {invoice.invoice_no}
                </p>
                <button
                  type="button"
                  onClick={handleCopyInvoiceNumber}
                  className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 print:hidden"
                  aria-label="Copy invoice number"
                >
                  <Copy className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-sm text-zinc-600">
                {formatDate(invoice.date)}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 gap-6 py-8 md:grid-cols-2">
            <section>
              <SectionTitle>Billed to</SectionTitle>
              <div className="space-y-2">
                <IconLine icon={User} strong>
                  {invoice.customer_name}
                </IconLine>
                {invoice.customer_phone && (
                  <IconLine icon={Phone}>{invoice.customer_phone}</IconLine>
                )}
                {invoice.customer_email && (
                  <IconLine icon={Mail}>{invoice.customer_email}</IconLine>
                )}
                {invoice.customer_address && (
                  <IconLine icon={MapPin}>{invoice.customer_address}</IconLine>
                )}
              </div>
            </section>

            {invoice.gst && (
              <section>
                <SectionTitle>GST details</SectionTitle>
                <div className="space-y-2">
                  <IconLine icon={Building2} strong>
                    {invoice.gst_name || invoice.customer_name}
                  </IconLine>
                  <p className="pl-6 text-sm text-zinc-600">
                    GSTIN{" "}
                    <span className="font-mono text-zinc-900">
                      {invoice.gst_no || "not given"}
                    </span>
                  </p>
                  {placeOfSupply && (
                    <p className="pl-6 text-sm text-zinc-600">
                      Place of supply {placeOfSupply}
                    </p>
                  )}
                  {invoice.gst_phone && (
                    <IconLine icon={Phone}>{invoice.gst_phone}</IconLine>
                  )}
                  {invoice.gst_address && (
                    <IconLine icon={MapPin}>{invoice.gst_address}</IconLine>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Items */}
          <section>
            <SectionTitle>
              Items{" "}
              <span className="font-normal text-zinc-500">
                {invoice.products.length}
              </span>
            </SectionTitle>

            {/* Phone: one block per line */}
            <ul className="divide-y divide-zinc-900/10 rounded-xl border border-zinc-900/10 md:hidden print:hidden">
              {invoice.products.map((product, index) => (
                <li key={index} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 text-sm font-medium">
                      {product.productName}
                    </p>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {money(product.productPrice)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 tabular-nums">
                    {product.productQuantity} × {money(getUnitPrice(product))}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                    Taxable {money(lineTaxes[index]?.basePrice ?? 0)} · GST{" "}
                    {money(lineTaxes[index]?.gstValue ?? 0)}
                  </p>
                  {product.productSerialNo && (
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      S/N {product.productSerialNo}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {/* Wider screens and print: the same table as the PDF */}
            <div className="hidden overflow-hidden rounded-xl border border-zinc-900/10 md:block print:block">
              <table className="w-full text-sm tabular-nums">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="w-10 px-4 py-3 font-normal">#</th>
                    <th className="px-4 py-3 font-normal">Product</th>
                    <th className="px-4 py-3 text-right font-normal">Qty</th>
                    <th className="px-4 py-3 text-right font-normal">
                      Unit price
                    </th>
                    <th className="px-4 py-3 text-right font-normal">
                      Taxable value
                    </th>
                    <th className="px-4 py-3 text-right font-normal">
                      GST 18%
                    </th>
                    <th className="px-4 py-3 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/10">
                  {invoice.products.map((product, index) => (
                    <tr key={index} className="align-top">
                      <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.productName}</p>
                        {product.productSerialNo && (
                          <p className="mt-1 font-mono text-xs text-zinc-500">
                            S/N {product.productSerialNo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {product.productQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {money(getUnitPrice(product))}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {money(lineTaxes[index]?.basePrice ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {money(lineTaxes[index]?.gstValue ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {money(product.productPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-zinc-900/10 bg-zinc-50">
                  <tr>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 font-medium" colSpan={3}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right">
                      {money(totals.taxable)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {money(totals.gst)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {money(totals.grand)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Stamp and totals */}
          <div className="flex flex-col-reverse items-center gap-6 py-8 md:flex-row md:items-center md:justify-between">
            <div className="md:pl-4">
              <InvoiceStampSeal stamp={stamp} />
            </div>
            <dl className="w-full space-y-2 text-sm tabular-nums md:w-80">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Taxable value</dt>
                <dd>{money(totals.taxable)}</dd>
              </div>
              {invoice.gst ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">CGST 9%</dt>
                    <dd>{money(totals.cgst)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">SGST 9%</dt>
                    <dd>{money(totals.sgst)}</dd>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <dt className="text-zinc-600">GST 18%</dt>
                  <dd>{money(totals.gst)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-zinc-900/10 pt-3">
                <dt className="font-medium">
                  {invoice.quotation
                    ? "Quotation total"
                    : paid
                      ? "Amount paid"
                      : "Amount due"}
                </dt>
                <dd className="text-2xl font-medium text-[#05845f]">
                  {money(totals.grand)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Payment and delivery facts */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-zinc-900/10 pt-6 text-sm md:grid-cols-4">
            <div>
              <dt className="text-zinc-500">Payment status</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stamp.hex }}
                  aria-hidden="true"
                />
                {sentenceCase(invoice.paid_status) || "Unpaid"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Payment type</dt>
              <dd className="mt-1 font-medium">
                {sentenceCase(invoice.payment_type) || "Not set"}
              </dd>
            </div>
            {invoice.delivered_by && (
              <div>
                <dt className="text-zinc-500">Delivered by</dt>
                <dd className="mt-1 font-medium">{invoice.delivered_by}</dd>
              </div>
            )}
            {invoice.delivery_date && (
              <div>
                <dt className="text-zinc-500">Delivery date</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(invoice.delivery_date)}
                </dd>
              </div>
            )}
          </dl>

          {invoice.po && (
            <section className="mt-8 border-t border-zinc-900/10 pt-6">
              <SectionTitle>Bank details</SectionTitle>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {BANK_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.field}
                      type="button"
                      onClick={() => copyToClipboard(account.field)}
                      className="group rounded-xl border border-zinc-900/10 bg-zinc-50 p-4 text-left transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#05845f]"
                    >
                      <span className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon
                            className="h-4 w-4 text-zinc-400"
                            strokeWidth={1.5}
                          />
                          {account.name}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-zinc-700 print:hidden">
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Copy
                        </span>
                      </span>
                      <span className="block space-y-1 text-sm">
                        {account.lines.map(([label, value]) => (
                          <span
                            key={label}
                            className="flex justify-between gap-3"
                          >
                            <span className="text-zinc-500">{label}</span>
                            <span
                              className={`text-right text-zinc-900 ${
                                /\d/.test(value) ? "font-mono" : ""
                              }`}
                            >
                              {value}
                            </span>
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <CustomerCare />

          <TermsAndConditions termsAndConditions={termsAndConditions} />
          <SuggestedProducts suggestedProducts={suggestedProducts} />
          <InvoiceWish currentWish={currentWish || ""} />

          <p className="mt-12 border-t border-zinc-900/10 pt-6 text-center text-sm text-zinc-500">
            Thank you for your business
          </p>
        </motion.article>
      </main>

      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center print:hidden"
          >
            <AquaToast
              message={copyToast}
              type="success"
              showClose={false}
              animate={false}
              className="pointer-events-auto"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
