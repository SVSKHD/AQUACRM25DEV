import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { invoicesService, productsService } from "../services/apiService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  Truck,
  Wrench,
  Plug,
  CalendarCheck,
  CreditCard,
  Undo2,
  RefreshCcw,
  UserCheck,
} from "lucide-react";
import { AquaToast } from "../components/AquaToast";

interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
}

interface ProductPhoto {
  id: string;
  secure_url: string;
}

interface DbProduct {
  id: string;
  _id?: string;
  title: string;
  price: number;
  discountPrice: number;
  photos: ProductPhoto[];
  slug: string;
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
  const [suggestedProducts, setSuggestedProducts] = useState<DbProduct[]>([]);

  useEffect(() => {
    fetchInvoice();
    fetchSuggestedProducts();
  }, [id]);

  const fetchSuggestedProducts = async () => {
    try {
      const { data } = await productsService.getAll();
      if (data) {
        let products: any[] = [];
        if (Array.isArray(data)) {
          products = data;
        } else if (data.products && Array.isArray(data.products)) {
          products = data.products;
        } else if (data.data && Array.isArray(data.data)) {
          products = data.data;
        }

        if (products.length > 0) {
          // Flatten mapping logic based on API structure
          const mappedProducts = products.map((p) => ({
            id: p.id || p._id,
            title: p.title || p.name || p.productName,
            price: Number(p.price || p.selling_price || p.mrp || 0),
            discountPrice: Number(p.discountPrice || p.discount_price || 0),
            photos: p.photos || [],
            slug: p.slug || "",
          }));
          setSuggestedProducts(mappedProducts.slice(0, 10));
        }
      }
    } catch (error) {
      console.error("Error fetching suggested products:", error);
    }
  };

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
      icon: Truck,
      title: "Transport & Handling",
      description:
        "Transportation and lifting charges, if applicable, are to be borne by the customer. Any such charges will be clearly communicated in advance for complete transparency.",
    },
    {
      icon: Wrench,
      title: "Plumbing Support",
      description:
        "Basic plumbing arrangements should be made by the customer. If required, our authorized plumbing partners can assist at an additional cost.",
    },
    {
      icon: Plug,
      title: "Plumbing & Electrical Materials",
      description:
        "Standard plumbing and electrical connections are to be provided by the customer. Additional requirements such as pressure booster pump connections may involve extra charges, which will be informed prior to installation.",
    },
    {
      icon: CalendarCheck,
      title: "Delivery & Installation Timeline",
      description:
        "Delivery and installation are typically completed within 7 working days from order confirmation, subject to site readiness and accessibility.",
    },
    {
      icon: CreditCard,
      title: "Payment Terms",
      description:
        "Full payment is required in advance along with the purchase order to ensure timely processing, dispatch, and installation scheduling.",
    },
    {
      icon: Undo2,
      title: "Sales & Returns Policy",
      description:
        "Once the product is unboxed or installation has commenced, returns are not applicable. We recommend reviewing product specifications carefully before installation.",
    },
    {
      icon: RefreshCcw,
      title: "Replacement Policy",
      description:
        "In the unlikely event of manufacturing defects or transit damage, replacement requests must be reported within 48 hours of delivery. Our support team will assist after verification as per company policy.",
    },
    {
      icon: UserCheck,
      title: "Installation Verification & Support",
      description:
        "Our trained service engineers will handle plumbing verification, system configuration, user guidance, and warranty registration to ensure optimal performance.",
    },
  ];

  const customerCare = [
    {
      name: "Grundfos Customer care",
      description: "For Grundfos product related queries:",
      phone: "18001022535",
    },
    {
      name: "Crompton Customer care",
      description: "For Crompton product related queries:",
      phone: "+919228880505",
    },
    {
      name: "Kent Customer care",
      description: "For Kent product related queries:",
      phone: "+919278912345",
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
      (sum: number, p: Product) => sum + p.productPrice,
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

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Load Logo for Watermark/Header
    const logoUrl = "/aquakart.png";
    const logoDataUrl = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = logoUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve("");
        }
      };
      img.onerror = () => resolve("");
    });

    // --- Page Background (#F5FBE6) ---
    doc.setFillColor("#F5FBE6");
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // --- Watermark (Centered Logo with transparency) ---
    if (logoDataUrl) {
      const logoWidth = 100;
      const logoHeight = 100;
      const x = (pageWidth - logoWidth) / 2;
      const y = (pageHeight - logoHeight) / 2;

      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.1 })); // Reduced opacity
      doc.addImage(logoDataUrl, "PNG", x, y, logoWidth, logoHeight);
      doc.restoreGraphicsState();
    }

    // --- Header Background (#233D4D) ---
    doc.setFillColor("#233D4D");
    doc.rect(0, 0, pageWidth, 55, "F");

    // --- Header ---
    // --- Fonts & Colors ---
    doc.setFont("times", "normal");

    // --- Header Content ---
    doc.setFontSize(24);
    doc.setTextColor("#FE7F2D"); // Orange text
    doc.setFont("times", "bold");

    // doc.text("Aquakart", 14, 20);
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 14, 10, 25, 25);
    }
    doc.text("Aquakart", 45, 22);

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "normal");
    doc.text("Water Solutions", 45, 29);
    doc.text("GST: 36AJOPH6387A1Z2", 45, 34);

    // Website link column
    doc.setTextColor("#FE7F2D");
    doc.textWithLink("www.aquakart.co.in", 45, 40, {
      url: "https://aquakart.co.in",
    });

    // Festival Wish in Header (if any)
    const wish = currentWish
      ? currentWish
          .replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
            "",
          )
          .trim()
      : "";
    if (wish) {
      doc.setFontSize(11);
      doc.setTextColor("#FE7F2D");
      doc.setFont("times", "italic");
      doc.text(wish, 45, 48);
      doc.setFont("times", "normal");
    }

    // Invoice Details (Right Aligned)
    // Invoice Details (Right Aligned - Inside Header)
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);

    if (invoice.po) {
      doc.setTextColor("#FE7F2D");
      doc.setFont("times", "bold");
      doc.text("PO-INVOICE", pageWidth - 14, 20, { align: "right" });
      doc.setFont("times", "normal");
      doc.setTextColor(255, 255, 255);
    }

    doc.setFontSize(10);
    doc.text("Invoice No:", pageWidth - 14, 30, { align: "right" });
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.text(invoice.invoice_no, pageWidth - 14, 35, { align: "right" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(
      "Date: " + new Date(invoice.date).toLocaleDateString("en-US"),
      pageWidth - 14,
      42,
      { align: "right" },
    );

    // --- Bill To & GST Details ---
    const startY = 70; // Adjusted for header background

    // Left: Bill To
    doc.setFontSize(12);
    doc.setTextColor("#233D4D");
    doc.setFont("times", "bold");
    doc.text("Bill To:", 14, startY);

    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(invoice.customer_name, 14, startY + 6);
    doc.text(`Phone: ${invoice.customer_phone}`, 14, startY + 11);
    if (invoice.customer_email)
      doc.text(`Email: ${invoice.customer_email}`, 14, startY + 16);

    const addressLines = doc.splitTextToSize(invoice.customer_address, 80);
    doc.text(addressLines, 14, startY + 21);

    // Right: GST Details (if available)
    if (invoice.gst) {
      const gstX = pageWidth / 2 + 10;
      doc.setFontSize(12);
      doc.setTextColor("#233D4D");
      doc.setFont("times", "bold");
      doc.text("GST Details:", gstX, startY);

      doc.setTextColor(0, 0, 0);
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text(invoice.gst_name || "", gstX, startY + 6);
      doc.text(`GST No: ${invoice.gst_no}`, gstX, startY + 11);
      if (invoice.gst_phone)
        doc.text(`Phone: ${invoice.gst_phone}`, gstX, startY + 16);
      if (invoice.gst_address) {
        const gstAddressLines = doc.splitTextToSize(
          invoice.gst_address || "",
          80,
        );
        doc.text(gstAddressLines, gstX, startY + 21);
      }
    }

    // --- Products Table ---
    const tableBody = invoice.products.map((item, index) => {
      const basePrice = priceUtils.getBasePrice(item.productPrice);
      const gstVal = priceUtils.getGSTValue(item.productPrice);
      return [
        index + 1,
        item.productName +
          (item.productSerialNo ? `\nS.No: ${item.productSerialNo}` : ""),
        item.productQuantity,
        `Rs. ${basePrice.toLocaleString()}`,
        `Rs. ${gstVal.toLocaleString()}`,
        `Rs. ${item.productPrice.toLocaleString()}`,
      ];
    });

    let currentY = startY + 40;

    autoTable(doc, {
      startY: currentY,
      head: [
        ["S.No", "Product Name", "Qty", "Base Price", "GST (18%)", "Total"],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: false as any,
        textColor: "#FE7F2D",
        font: "times",
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        font: "times",
        textColor: "#233D4D",
        lineColor: "#E2E8F0",
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: "#ffffff",
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 35, halign: "right" },
        4: { cellWidth: 35, halign: "right" },
        5: { cellWidth: 35, halign: "right" },
      },
      willDrawCell: (data) => {
        // Draw Rounded Header Background
        if (data.section === "head" && data.column.index === 0) {
          const { doc } = data;
          doc.setFillColor("#233D4D");

          const rowY = data.cell.y;
          const rowHeight = (data.row as any).height;
          const tableWidth = pageWidth - 28; // 14 margin left + right

          // Top rounded rect
          doc.roundedRect(
            14, // margin left
            rowY,
            tableWidth,
            rowHeight,
            3,
            3,
            "F",
          );
          // Square off bottom corners of header
          doc.rect(14, rowY + rowHeight / 2, tableWidth, rowHeight / 2, "F");
        }
      },
      didDrawPage: (data) => {
        // Draw Rounded Border around entire table
        const { doc } = data;
        doc.setDrawColor("#E2E8F0");
        doc.setLineWidth(0.5);

        const tableStartY = data.settings.startY || startY;
        // Safe access to cursor
        const cursorY = data.cursor ? data.cursor.y : 0;
        const tableHeight = cursorY - tableStartY;

        if (tableHeight > 0) {
          const tableWidth = pageWidth - 28;
          doc.roundedRect(
            14, // margin left
            tableStartY,
            tableWidth,
            tableHeight,
            3,
            3,
            "S",
          );
        }
      },
    });

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || currentY;

    // --- Totals ---
    const summaryX = pageWidth - 90;
    const summaryY = finalY + 15;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#233D4D");
    doc.text("Subtotal:", summaryX, summaryY);
    doc.text(
      `Rs. ${priceUtils.getBasePrice(invoice.total_amount).toLocaleString()}`,
      pageWidth - 14,
      summaryY,
      { align: "right" },
    );

    doc.text("GST (Total):", summaryX, summaryY + 6);
    doc.text(
      `Rs. ${priceUtils.getGSTValue(invoice.total_amount).toLocaleString()}`,
      pageWidth - 14,
      summaryY + 6,
      { align: "right" },
    );

    doc.setDrawColor("#FE7F2D");
    doc.line(summaryX, summaryY + 9, pageWidth - 14, summaryY + 9);

    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.setTextColor("#233D4D");
    doc.text("Total Amount:", summaryX, summaryY + 16);
    doc.setTextColor("#FE7F2D");
    doc.text(
      `Rs. ${invoice.total_amount.toLocaleString()}`,
      pageWidth - 14,
      summaryY + 16,
      { align: "right" },
    );
    doc.setFont("times", "normal");

    // --- Bank Details (if PO) ---
    if (invoice.po) {
      let bankY = finalY + 40;
      if (bankY + 50 > pageHeight) {
        doc.addPage();
        doc.setFillColor("#F5FBE6");
        doc.rect(0, 0, pageWidth, pageHeight, "F");
        bankY = 30;
      }

      doc.setFontSize(14);
      doc.setFont("times", "bold");
      doc.setTextColor("#233D4D");
      doc.text("Bank Details", 14, bankY);
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0);

      const bankBoxY = bankY + 4;
      doc.setDrawColor("#233D4D");
      doc.rect(14, bankBoxY, pageWidth - 28, 45);

      doc.text(
        "ICICI Bank: Kundana Enterprises | A/c:131605003314   | IFSC: ICIC0001316",
        18,
        bankBoxY + 8,
      );
      doc.text(
        "Kotak Bank: Kundana Enterprises | A/c: 8813356673| IFSC: KKBK0007463",
        18,
        bankBoxY + 16,
      );
      doc.text("UPI: GPay/PhonePe: 9182119842", 18, bankBoxY + 24);
    }

    // --- Terms and Conditions ---
    if (termsAndConditions.length > 0) {
      doc.addPage();
      doc.setFillColor("#F5FBE6");
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Header for T&C Page
      doc.setFillColor("#233D4D");
      doc.rect(0, 0, pageWidth, 30, "F");

      doc.setFontSize(18);
      doc.setFont("times", "bold");
      doc.setTextColor("#FE7F2D");
      doc.text("Terms & Conditions", 14, 20);

      let currentTermY = 45;

      termsAndConditions.forEach((term, index) => {
        if (currentTermY > pageHeight - 30) {
          doc.addPage();
          doc.setFillColor("#F5FBE6");
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          currentTermY = 30;
        }

        doc.setFontSize(12);
        doc.setFont("times", "bold");
        doc.setTextColor("#233D4D");
        doc.text(`${index + 1}. ${term.title}`, 14, currentTermY);

        doc.setFontSize(11);
        doc.setFont("times", "normal");
        doc.setTextColor(50);

        currentTermY += 6;
        const descLines = doc.splitTextToSize(term.description, pageWidth - 28);
        doc.text(descLines, 14, currentTermY);

        currentTermY += descLines.length * 6 + 6;
      });

      if (wish) {
        const bottomY = pageHeight - 15;
        doc.setFontSize(11);
        doc.setTextColor("#FE7F2D");
        doc.setFont("times", "italic");
        doc.text(wish, pageWidth / 2, bottomY, { align: "center" });
      }
    }

    // Save
    doc.save(`Invoice_${invoice.invoice_no}.pdf`);
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

  const getFestivalWish = () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    // New Year: Dec 28 to Jan 2
    if ((month === 12 && day >= 28) || (month === 1 && day <= 2)) {
      return `✨ Wishing you a Happy New Year ${month === 12 ? year + 1 : year}! ✨`;
    }

    // Sankranthi: Jan 10 to Jan 16
    if (month === 1 && day >= 10 && day <= 16) {
      return "🌾 Wishing you a Happy Sankranthi! 🌾";
    }

    // Sankranthi: Jan 10 to Jan 16
    if (month === 1 && day >= 10 && day <= 16) {
      return "🌾 Wishing you a Happy Sankranthi! 🌾";
    }

    // Eid: Example logic (adjust specific dates as needed)
    // if (month === 3 && day >= 29 && day <= 31) {
    //   return "🌙 Eid Mubarak! 🌙";
    // }

    return null;
  };

  const currentWish = getFestivalWish();

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
          <div className="p-6 sm:p-8 md:p-12 relative overflow-hidden">
            {/* Corner Ribbon */}
            {currentWish && (
              <div className="absolute top-0 right-0 overflow-hidden w-40 h-40 pointer-events-none print:hidden z-10">
                <div className="absolute top-0 right-0 transform translate-x-[30%] -translate-y-[20%] rotate-45 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold py-2 px-12 shadow-lg border border-white/20">
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                    Festival Offer
                  </span>
                </div>
              </div>
            )}

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
                    {currentWish && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-indigo-100 via-purple-100 to-indigo-100 rounded-lg border border-indigo-200 shadow-sm">
                        <p className="text-sm font-bold text-indigo-700 text-center leading-tight flex items-center justify-center gap-2">
                          {currentWish}
                        </p>
                      </div>
                    )}
                    <a
                      href="https://aquakart.co.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Visit aquakart.co.in
                    </a>
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
                            <p className="font-bold text-green-600">
                              ₹{product.productPrice.toLocaleString()}
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
                                  ₹{product.productPrice.toLocaleString()}
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
                      <p>A/c:131605003314</p>
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
                      <p>A/c:  8813356673</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 bg-yellow-100 p-5 rounded-lg">
              {customerCare.map((item) => (
                <div>
                  <h3 className="text-sm font-semibold text-black uppercase mb-4">
                    {item.name}
                  </h3>
                  <div className="p-4 bg-slate-50 border border-gray-400 rounded-lg text-left shadow-sm">
                    <p className="text-sm text-black leading-relaxed">
                      {item.description}
                    </p>

                    <span className="font-semibold text-neutral-950">
                      {item.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {termsAndConditions.length > 0 && (
              <div className="mt-12">
                <h3 className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Terms & Conditions
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {termsAndConditions.map((term, i) => {
                    const Icon = term.icon;

                    return (
                      <div
                        key={term.title}
                        className="
              group flex gap-4 rounded-xl border border-slate-200 bg-white p-5
              shadow-sm transition
              hover:border-emerald-300 hover:shadow-md
            "
                      >
                        {/* ICON */}
                        <div className="mt-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 transition group-hover:bg-emerald-100">
                            <Icon className="h-5 w-5 text-emerald-600" />
                          </div>
                        </div>

                        {/* CONTENT */}
                        <div className="text-left">
                          <p className="mb-1 text-sm font-semibold text-slate-900">
                            {term.title}
                          </p>
                          <p className="text-sm leading-relaxed text-slate-600">
                            {term.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {suggestedProducts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-400 print:hidden">
                <h3 className="text-lg font-bold text-neutral-950 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Explore More from Aquakart
                </h3>
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {suggestedProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5 }}
                        className="min-w-[200px] w-[200px] bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-all snap-center flex-shrink-0"
                      >
                        <div className="h-32 bg-slate-100 rounded mb-3 overflow-hidden relative group">
                          {product.photos?.[0]?.secure_url ? (
                            <img
                              src={product.photos[0].secure_url}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <h4
                          className="font-medium text-sm text-neutral-950 truncate mb-1"
                          title={product.title}
                        >
                          {product.title}
                        </h4>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-green-600 font-bold text-sm">
                            ₹
                            {(
                              product.discountPrice || product.price
                            ).toLocaleString()}
                          </p>
                          {product.discountPrice > 0 && (
                            <p className="text-xs text-slate-400 line-through">
                              ₹{product.price.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <a
                          href={`https://aquakart.co.in/product/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center text-xs font-medium bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                          Shop Now
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentWish && (
              <div className="mt-8 text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100 print:hidden">
                <h1 className="text-xl sm:text-2xl font-bold text-indigo-800 italic font-serif mb-2">
                  {currentWish}
                </h1>
                <p className="text-sm text-indigo-600">
                  From all of us at Aquakart
                </p>
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
