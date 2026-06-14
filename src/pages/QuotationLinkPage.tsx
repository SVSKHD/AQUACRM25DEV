import { useEffect, useState } from "react";
import { quotationsService } from "../services/quotationsService";

type Product = {
  _id?: string;
  productName?: string;
  productQuantity?: number;
  productPrice?: number;
  productTotal?: number;
};

type Quotation = {
  quotationNo?: string;
  customerDetails?: { name?: string; phone?: string; email?: string; address?: string };
  gst?: boolean;
  gstDetails?: { gstName?: string; gstNo?: string; gstPhone?: string; gstAddress?: string };
  products?: Product[];
  totalAmount?: number;
  subTotal?: number;
  discount?: number;
  tax?: number;
  notes?: string;
  terms?: string;
};

const getIdFromPath = () => window.location.pathname.split("/").filter(Boolean)[1] || "";
const money = (value?: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const unwrap = (payload: any): Quotation | null => payload?.data?.data || payload?.data || payload || null;

export default function QuotationLinkPage() {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = getIdFromPath();
    if (!id) {
      setError("Quotation id missing");
      setLoading(false);
      return;
    }

    quotationsService.getPublicById(id).then((response) => {
      if (response.error) {
        setError(response.error);
        setQuotation(null);
      } else {
        setQuotation(unwrap(response.data));
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-white p-8 text-center">Loading quotation...</div>;
  if (error || !quotation) return <div className="min-h-screen bg-white p-8 text-center">Quotation not found: {error}</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-8">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <header className="bg-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black">Aquakart Quotation</h1>
              <p className="mt-1 text-sm text-white/70">Water Solutions</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-widest text-orange-300">Quotation No</p>
              <p className="text-xl font-black">{quotation.quotationNo || "—"}</p>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <h2 className="font-black">Customer Details</h2>
              <p className="mt-3 font-bold">{quotation.customerDetails?.name || "—"}</p>
              <p>{quotation.customerDetails?.phone || "—"}</p>
              <p>{quotation.customerDetails?.email || ""}</p>
              <p>{quotation.customerDetails?.address || ""}</p>
            </div>
            <div className="rounded-2xl border p-4">
              <h2 className="font-black">GST Details</h2>
              {quotation.gst ? (
                <div className="mt-3">
                  <p className="font-bold">{quotation.gstDetails?.gstName || "—"}</p>
                  <p>{quotation.gstDetails?.gstNo || "—"}</p>
                  <p>{quotation.gstDetails?.gstPhone || ""}</p>
                  <p>{quotation.gstDetails?.gstAddress || ""}</p>
                </div>
              ) : <p className="mt-3 text-slate-500">No GST details</p>}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left"><tr><th className="p-3">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Total</th></tr></thead>
              <tbody>
                {(quotation.products || []).map((product, index) => (
                  <tr key={product._id || index} className="border-t">
                    <td className="p-3 font-semibold">{product.productName || "Product"}</td>
                    <td className="p-3 text-right">{product.productQuantity || 0}</td>
                    <td className="p-3 text-right">{money(product.productPrice)}</td>
                    <td className="p-3 text-right font-bold">{money(product.productTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-sm rounded-2xl border p-4">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(quotation.subTotal)}</strong></div>
            <div className="flex justify-between"><span>Discount</span><strong>{money(quotation.discount)}</strong></div>
            <div className="flex justify-between"><span>Tax</span><strong>{money(quotation.tax)}</strong></div>
            <div className="mt-3 flex justify-between border-t pt-3 text-xl"><span>Total</span><strong>{money(quotation.totalAmount)}</strong></div>
          </div>
        </div>
      </section>
    </main>
  );
}
