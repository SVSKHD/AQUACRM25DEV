import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, CalendarDays, Copy, FileText, Mail, MapPin, Package, Phone, User } from "lucide-react";
import { quotationsService } from "../services/quotationsService";

type QuotationProduct = {
  _id?: string;
  productName?: string;
  productDescription?: string;
  productSerialNo?: string;
  productQuantity?: number;
  productPrice?: number;
  productDiscount?: number;
  productTax?: number;
  productTotal?: number;
};

type QuotationView = {
  quotationNo?: string;
  date?: string;
  validUntil?: string;
  status?: string;
  customerDetails?: { name?: string; phone?: string | number; email?: string; address?: string };
  gst?: boolean;
  gstDetails?: { gstName?: string; gstNo?: string; gstPhone?: string | number; gstEmail?: string; gstAddress?: string };
  products?: QuotationProduct[];
  subTotal?: number;
  discount?: number;
  tax?: number;
  totalAmount?: number;
  notes?: string;
  terms?: string;
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
};

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const unwrapQuotation = (payload: any): QuotationView | null => {
  const candidate = payload?.data?.data || payload?.data || payload;
  return candidate && typeof candidate === "object" ? candidate : null;
};

export default function QuotationPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<QuotationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadQuotation = async () => {
      if (!id) {
        setError("Quotation id is missing");
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await quotationsService.getPublicById(id);
      setLoading(false);

      if (response.error) {
        setError(response.error);
        return;
      }

      const data = unwrapQuotation(response.data);
      if (!data) {
        setError("Quotation not found");
        return;
      }

      setQuotation(data);
    };

    loadQuotation();
  }, [id]);

  const products = Array.isArray(quotation?.products) ? quotation.products : [];

  const computedSubTotal = useMemo(
    () =>
      products.reduce((sum, product) => {
        const quantity = num(product.productQuantity);
        const price = num(product.productPrice);
        const discount = num(product.productDiscount);
        const tax = num(product.productTax);
        return sum + Math.max(quantity * price - discount, 0) + tax;
      }, 0),
    [products],
  );

  const subTotal = num(quotation?.subTotal) || computedSubTotal;
  const discount = num(quotation?.discount);
  const tax = num(quotation?.tax);
  const total = num(quotation?.totalAmount) || Math.max(subTotal - discount, 0) + tax;

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (error || !quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-xl">
          <FileText className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h1 className="text-2xl font-black text-slate-950">Quotation Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl justify-end px-4 py-3">
          <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700">
            <Copy className="h-4 w-4" /> {copied ? "Link Copied" : "Copy Quotation Link"}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] border bg-white shadow-2xl">
          <header className="bg-[#233D4D] px-6 py-8 text-white sm:px-10">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-start gap-4">
                <img src="/aquakart.png" alt="Aquakart" className="h-16 w-16 rounded-2xl bg-white p-1" />
                <div>
                  <h1 className="text-3xl font-black">Aquakart</h1>
                  <p className="mt-1 text-sm font-semibold text-white/75">Water Solutions</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#FE7F2D]">GST: 36AJOPH6387A1Z2</p>
                  <a href="https://aquakart.co.in" target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm font-bold text-[#FE7F2D]">aquakart.co.in</a>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 md:text-right">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FE7F2D]">Quotation</p>
                <h2 className="mt-2 break-all text-2xl font-black">{quotation.quotationNo || "—"}</h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-white/80 md:justify-end"><CalendarDays className="h-4 w-4" /> Date: {formatDate(quotation.date)}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/80 md:justify-end"><CalendarDays className="h-4 w-4" /> Valid Until: {formatDate(quotation.validUntil)}</p>
                <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase text-white">{quotation.status || "Draft"}</span>
              </div>
            </div>
          </header>

          <div className="space-y-8 p-6 sm:p-10">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500"><User className="h-4 w-4" /> Customer Details</div>
                <p className="text-lg font-black">{quotation.customerDetails?.name || "—"}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-700"><Phone className="h-4 w-4 text-blue-600" /> {quotation.customerDetails?.phone || "—"}</p>
                {quotation.customerDetails?.email && <p className="mt-2 flex items-center gap-2 text-sm text-slate-700"><Mail className="h-4 w-4 text-blue-600" /> {quotation.customerDetails.email}</p>}
                {quotation.customerDetails?.address && <p className="mt-2 flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-4 w-4 text-blue-600" /> {quotation.customerDetails.address}</p>}
              </div>

              <div className="rounded-3xl border bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500"><Building2 className="h-4 w-4" /> GST Details</div>
                {quotation.gst ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="text-lg font-black text-slate-950">{quotation.gstDetails?.gstName || "—"}</p>
                    <p>GST No: {quotation.gstDetails?.gstNo || "—"}</p>
                    {quotation.gstDetails?.gstPhone && <p>Phone: {quotation.gstDetails.gstPhone}</p>}
                    {quotation.gstDetails?.gstEmail && <p>Email: {quotation.gstDetails.gstEmail}</p>}
                    {quotation.gstDetails?.gstAddress && <p>{quotation.gstDetails.gstAddress}</p>}
                  </div>
                ) : <p className="text-sm text-slate-500">No GST details added.</p>}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border">
              <div className="flex items-center gap-2 bg-slate-100 px-5 py-4 font-black uppercase tracking-wide text-slate-600"><Package className="h-4 w-4" /> Products</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead><tr className="bg-white"><th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-500">Product</th><th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-500">Qty</th><th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-500">Price</th><th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-500">Discount</th><th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-500">Tax</th><th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-500">Total</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {products.map((product, index) => {
                      const quantity = num(product.productQuantity);
                      const price = num(product.productPrice);
                      const productDiscount = num(product.productDiscount);
                      const productTax = num(product.productTax);
                      const productTotal = num(product.productTotal) || Math.max(quantity * price - productDiscount, 0) + productTax;
                      return (
                        <tr key={product._id || index}>
                          <td className="px-5 py-4 text-sm"><p className="font-bold">{product.productName || "Product"}</p>{product.productSerialNo && <p className="mt-1 text-xs text-slate-500">SKU/S.No: {product.productSerialNo}</p>}{product.productDescription && <p className="mt-1 text-xs text-slate-500">{product.productDescription}</p>}</td>
                          <td className="px-5 py-4 text-right text-sm font-semibold">{quantity}</td>
                          <td className="px-5 py-4 text-right text-sm">{formatCurrency(price)}</td>
                          <td className="px-5 py-4 text-right text-sm">{formatCurrency(productDiscount)}</td>
                          <td className="px-5 py-4 text-right text-sm">{formatCurrency(productTax)}</td>
                          <td className="px-5 py-4 text-right text-sm font-black">{formatCurrency(productTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {quotation.notes && <div className="rounded-3xl border bg-slate-50 p-5"><p className="text-xs font-black uppercase text-slate-500">Notes</p><p className="mt-2 whitespace-pre-line text-sm text-slate-700">{quotation.notes}</p></div>}
                {quotation.terms && <div className="rounded-3xl border bg-slate-50 p-5"><p className="text-xs font-black uppercase text-slate-500">Terms</p><p className="mt-2 whitespace-pre-line text-sm text-slate-700">{quotation.terms}</p></div>}
              </div>
              <div className="rounded-3xl border bg-white p-5 shadow-lg">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold">{formatCurrency(subTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-bold">{formatCurrency(discount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-bold">{formatCurrency(tax)}</span></div>
                  <div className="border-t pt-4"><div className="flex items-center justify-between"><span className="font-black">Total Amount</span><span className="text-2xl font-black text-[#FE7F2D]">{formatCurrency(total)}</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
