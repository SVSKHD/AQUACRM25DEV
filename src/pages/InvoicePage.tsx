import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { invoicesService } from "../services/apiService";
import priceUtils from "../utils/priceUtils";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  Package,
  Copy,
} from "lucide-react";
import { AquaToast } from "../components/AquaToast";

interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  gst: boolean;
  po: boolean;
  quotation: boolean;
  gst_name: string | null;
  gst_no: string | null;
  gst_phone: string | null;
  gst_email: string | null;
  gst_address: string | null;
  products: Product[];
  delivered_by: string | null;
  delivery_date: string | null;
  paid_status: string;
  payment_type: string;
  aquakart_online_user: boolean;
  aquakart_invoice: boolean;
  total_amount: number;
  created_at: string;
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(
    new Set(),
  );
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    if (!id) return;
    console.log("id", id);

    try {
      const response = await invoicesService.fetchById(id);
      setInvoice(mapInvoiceFromApi(response.data));
    } catch (error) {
      console.error("Error fetching invoice:", error);
    }
    setLoading(false);
  };

  const copyToClipboard = (field: string) => {
    let textToCopy = "";
    let label = "";

    switch (field) {
      case "iciciDetails":
        textToCopy =
          "ICICI Bank\nA/c Name: Kundana Enterprises\nA/c No: 8813356673\nIFSC: ICIC0001316";
        label = "ICICI Details";
        break;
      case "kotakDetails":
        textToCopy =
          "KOTAK Bank\nA/c Name: Kundana Enterprises\nA/c No: 131605003314\nIFSC: KKBK0007463";
        label = "Kotak Details";
        break;
      case "upiDetails":
        textToCopy = "UPI\nGPay: 9182119842\nPhonePe: 9182119842";
        label = "UPI Details";
        break;
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopyToast(`${label} copied`);
        setTimeout(() => setCopyToast(null), 2000);
      });
    }
  };

  const termsAndConditions = [
    {
      title: "Transport",
      description: "TRANSPORT / LIFTING CHARGES WILL BE BORNE BY THE CUSTOMER.",
    },
    {
      title: "Plumber",
      description:
        "PLUMBER SHOULD BE PROVIDED AT THE TIME OF PLUMBING (OR) OUR PLUMBING CONTRACTORS WILL ATTRACT PLUMBING CHARGES.",
    },
    {
      title: "Plumbing Material",
      description:
        "PLUMBING MATERIALS / ELECTRICAL CONNECTION BY CUSTOMER , IF THE PRESSURE BOOSTER PUMP PLUMBING WILL ATTRACT EXTRA CHARGES ",
    },
    {
      title: "SALES RETURN",
      description: "IF THE UNIT IS UNBOXED MACHINE WILL NOT BE TAKEN BACK",
    },
    {
      title: "Delivery and Installation policy",
      description: "DELIVERY / INSTALLATION COMPLETED WITHIN 7 WORKING DAYS. ",
    },
    {
      title: "Advance policy",
      description: "100% ADVANCE ALONG WITH PO.",
    },
    {
      title: "Work Monitoring",
      description:
        "PLUMBING WORK VERIFICATION , PROGRAMMING AND TRAINING AND WARRANTY UPLOAD WILL BE DONE BY OUR SERVICE ENGINEERS",
    },
  ];

  const mapInvoiceFromApi = (inv: any): Invoice => {
    const customer = inv.customerDetails ?? {};
    const gstDetails = inv.gstDetails ?? {};
    const transport = inv.transport ?? {};
    const paidStatus =
      inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? "unpaid";
    const paymentType = inv.payment_type ?? inv.paymentType ?? "cash";

    const products = Array.isArray(inv.products)
      ? inv.products.map((p: any) => ({
          productName: p.productName ?? p.name ?? "",
          productQuantity: Number(p.productQuantity ?? p.quantity ?? 1) || 1,
          productPrice: Number(p.productPrice ?? p.unit_price ?? 0) || 0,
          productSerialNo: p.productSerialNo ?? p.serial_no ?? "",
        }))
      : [];

    const computedTotal = products.reduce(
      (sum, p) => sum + p.productPrice * p.productQuantity,
      0,
    );

    return {
      id: inv.id ?? inv._id ?? inv.invoice_id ?? "",
      invoice_no: inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number ?? "",
      date:
        inv.date ||
        inv.issue_date ||
        inv.created_at ||
        inv.createdAt ||
        new Date().toISOString(),
      customer_name: customer.name ?? inv.customer_name ?? "",
      customer_phone: (customer.phone ?? inv.customer_phone ?? "").toString(),
      customer_email: customer.email ?? inv.customer_email ?? "",
      customer_address: customer.address ?? inv.customer_address ?? "",
      gst: Boolean(inv.gst),
      po: Boolean(inv.po),
      quotation: Boolean(inv.quotation),
      gst_name: gstDetails.gstName ?? inv.gst_name ?? null,
      gst_no: gstDetails.gstNo ?? inv.gst_no ?? null,
      gst_phone: gstDetails.gstPhone?.toString?.() ?? inv.gst_phone ?? null,
      gst_email: gstDetails.gstEmail ?? inv.gst_email ?? null,
      gst_address: gstDetails.gstAddress ?? inv.gst_address ?? null,
      products,
      delivered_by: transport.deliveredBy ?? inv.delivered_by ?? null,
      delivery_date: transport.deliveryDate ?? inv.delivery_date ?? null,
      paid_status: paidStatus,
      payment_type: paymentType,
      aquakart_online_user: Boolean(
        inv.aquakart_online_user ?? inv.aquakartOnlineUser,
      ),
      aquakart_invoice: Boolean(inv.aquakart_invoice ?? inv.aquakartInvoice),
      total_amount: Number(inv.total_amount ?? inv.total ?? computedTotal) || 0,
      created_at: inv.created_at ?? inv.createdAt ?? new Date().toISOString(),
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const toggleProduct = (index: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedProducts(newExpanded);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-950 mb-2">
            Invoice Not Found
          </h2>
          <p className="text-black">
            The invoice you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-400 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-sm sm:text-base"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Download </span>PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none"
        >
          <div className="p-6 sm:p-8 md:p-12">
            <div className="mb-8 pb-6 border-b border-gray-400">
              <div className="md:hidden flex justify-center mb-4">
                <img src="/aquakart.png" alt="Aquakart" className="w-16 h-16" />
              </div>
              <div className="flex flex-col items-center gap-4 text-center md:text-left md:grid md:grid-cols-2 md:items-start md:gap-6">
                <div className="flex items-start gap-3 md:justify-start">
                  <img
                    src="/aquakart.png"
                    alt="Aquakart"
                    className="hidden md:block w-12 h-12 sm:w-16 sm:h-16"
                  />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-neutral-950 tracking-tight font-mono">
                      Aquakart
                    </h1>
                    <p className="text-[11px] uppercase font-semibold tracking-[0.15em] text-slate-500 mb-0.5">
                      GST:
                    </p>
                    <p className="text-sm font-mono text-black leading-tight">
                      36AJOPH6387A1Z2
                    </p>
                    <p className="text-sm font-mono text-black leading-tight">
                      Water
                    </p>
                    <p className="text-sm font-mono text-black leading-tight">
                      Solutions
                    </p>
                  </div>
                </div>

                <div className="text-center md:text-right space-y-1">
                  {invoice.po && (
                    <h2 className="text-xl font-bold text-neutral-950 uppercase tracking-widest mb-2 border-2 border-yellow-500 inline-block px-3 py-1 rounded">
                      PO-INVOICE
                    </h2>
                  )}
                  <p className="text-[11px] uppercase font-semibold tracking-[0.15em] text-slate-500">
                    Invoice No.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-xl sm:text-2xl font-bold text-neutral-950 font-mono tracking-tight">
                      {invoice.invoice_no}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyInvoiceNumber}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                      aria-label="Copy invoice number"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-black font-mono">
                    {new Date(invoice.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-black uppercase mb-3">
                  Bill To
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-neutral-950">
                        {invoice.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p className="text-black">{invoice.customer_phone}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p className="text-black">{invoice.customer_email}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p className="text-black">{invoice.customer_address}</p>
                  </div>
                </div>
              </div>

              {invoice.gst && (
                <div>
                  <h3 className="text-sm font-semibold text-black uppercase mb-3">
                    GST Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
                      <p className="font-medium text-neutral-950">
                        {invoice.gst_name}
                      </p>
                    </div>
                    <p className="text-sm text-black">
                      GST No: {invoice.gst_no}
                    </p>
                    {invoice.gst_phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                        <p className="text-black">{invoice.gst_phone}</p>
                      </div>
                    )}
                    {invoice.gst_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                        <p className="text-black">{invoice.gst_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-black uppercase mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Items ({invoice.products.length})
              </h3>
              <div className="space-y-3">
                {invoice.products.map((product, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-400 rounded-lg overflow-hidden hover:shadow-md transition-all"
                  >
                    <button
                      onClick={() => toggleProduct(index)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors print:bg-white print:hover:bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-left flex-1">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-950">
                              {product.productName}
                            </p>
                            <p className="text-sm text-black">
                              Qty: {product.productQuantity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-neutral-950">
                              ₹
                              {(
                                product.productQuantity * product.productPrice
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="print:hidden">
                            {expandedProducts.has(index) ? (
                              <ChevronUp className="w-5 h-5 text-black" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-black" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedProducts.has(index) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden print:block print:h-auto print:opacity-100"
                        >
                          <div className="px-4 py-3 bg-white border-t border-gray-400">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-black mb-1">
                                  Product Name
                                </p>
                                <p className="font-medium text-neutral-950">
                                  {product.productName}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-black mb-1">
                                  Quantity
                                </p>
                                <p className="font-medium text-neutral-950">
                                  {product.productQuantity} units
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-black mb-1">
                                  Base Price
                                </p>
                                <p className="font-medium text-neutral-950">
                                  ₹
                                  {priceUtils
                                    .getBasePrice(product.productPrice)
                                    .toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-black mb-1">
                                  Gst Price
                                </p>
                                <p className="font-bold text-green-600">
                                  ₹
                                  {priceUtils
                                    .getGSTValue(product.productPrice)
                                    .toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-black mb-1">
                                  Total Price
                                </p>
                                <p className="font-bold text-green-600">
                                  ₹
                                  {(
                                    product.productQuantity *
                                    product.productPrice
                                  ).toLocaleString()}
                                </p>
                              </div>
                              {product.productSerialNo && (
                                <div className="col-span-2">
                                  <p className="text-xs text-black mb-1">
                                    Serial Number
                                  </p>
                                  <p className="font-mono text-sm text-neutral-950 bg-slate-50 px-3 py-2 rounded border border-gray-400">
                                    {product.productSerialNo}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-full md:w-64">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-black">Subtotal</span>
                    <span className="font-medium text-neutral-950">
                      ₹
                      {priceUtils
                        .getBasePrice(invoice.total_amount)
                        .toLocaleString()}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-sm">
                    <span className="text-black">GST(18%)</span>
                    <span className="font-medium text-neutral-950">
                      ₹
                      {priceUtils
                        .getGSTValue(invoice.total_amount)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-gray-400 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-neutral-950">
                        Total
                      </span>
                      <span className="text-xl font-bold text-neutral-950">
                        ₹{invoice.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-400">
              <div>
                <p className="text-sm text-black mb-1">Payment Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                    invoice.paid_status === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {invoice.paid_status}
                </span>
              </div>
              <div>
                <p className="text-sm text-black mb-1">Payment Type</p>
                <p className="font-medium text-neutral-950 capitalize">
                  {invoice.payment_type}
                </p>
              </div>
              {invoice.po && (
                <div>
                  <p className="text-sm text-black mb-1">Invoice Type</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                    PO Invoice
                  </span>
                </div>
              )}
              {invoice.delivered_by && (
                <div>
                  <p className="text-sm text-black mb-1">Delivered By</p>
                  <p className="font-medium text-neutral-950">
                    {invoice.delivered_by}
                  </p>
                </div>
              )}
              {invoice.delivery_date && (
                <div>
                  <p className="text-sm text-black mb-1">Delivery Date</p>
                  <p className="font-medium text-neutral-950">
                    {new Date(invoice.delivery_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {invoice.po && (
              <div className="mt-8 pt-6 border-t border-gray-400">
                <h3 className="text-sm font-semibold text-black uppercase mb-4">
                  Bank Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => copyToClipboard("iciciDetails")}
                    className="p-4 bg-slate-50 border border-gray-400 rounded-lg relative group cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-neutral-950">
                        ICICI Bank
                      </span>
                    </div>
                    <div className="text-sm text-black space-y-1 font-mono">
                      <p>Kundana Enterprises</p>
                      <p>A/c: 8813356673</p>
                      <p>IFSC: ICIC0001316</p>
                    </div>
                  </div>

                  <div
                    onClick={() => copyToClipboard("kotakDetails")}
                    className="p-4 bg-slate-50 border border-gray-400 rounded-lg relative group cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-red-600" />
                      <span className="font-semibold text-neutral-950">
                        KOTAK Bank
                      </span>
                    </div>
                    <div className="text-sm text-black space-y-1 font-mono">
                      <p>Kundana Enterprises</p>
                      <p>A/c: 131605003314</p>
                      <p>IFSC: KKBK0007463</p>
                    </div>
                  </div>

                  <div
                    onClick={() => copyToClipboard("upiDetails")}
                    className="p-4 bg-slate-50 border border-gray-400 rounded-lg relative group cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-neutral-950">
                        UPI
                      </span>
                    </div>
                    <div className="text-sm text-black space-y-1 font-mono">
                      <p>GPay: 9182119842</p>
                      <p>PhonePe: 9182119842</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {termsAndConditions.length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-semibold text-black uppercase mb-4">
                  Terms & Conditions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {termsAndConditions.map((term, i) => (
                    <div
                      key={term.title}
                      className="p-4 bg-slate-50 border border-gray-400 rounded-lg text-left shadow-sm"
                    >
                      <p className="font-semibold text-neutral-950 mb-1">
                        {i + 1}.{term.title}
                      </p>
                      <p className="text-sm text-black leading-relaxed">
                        {term.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 pt-6 border-t border-gray-400 text-center text-sm text-black">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none print:hidden"
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
