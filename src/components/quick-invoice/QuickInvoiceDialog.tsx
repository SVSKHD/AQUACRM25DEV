import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { invoicesService, productsService } from "../../services/apiService";
import { parseCustomerDetails } from "../../utils/customerDetailsParser";
import { useToast } from "../Toast";

type ProductOption = {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  alias?: string[];
  price?: number;
  defaultPrice?: number;
  mrp?: number;
  gstRate?: number;
  category?: string;
  brand?: string;
};

type SelectedProduct = {
  productId: string;
  productName: string;
  productQuantity: number;
  productPrice: number;
};

export default function QuickInvoiceDialog() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [rawDetails, setRawDetails] = useState("");
  const [parsed, setParsed] = useState(parseCustomerDetails(""));
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const [items, setItems] = useState<SelectedProduct[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    invoiceNo?: string;
    id?: string;
  } | null>(null);

  const selectedProduct = useMemo(
    () => catalog.find((p) => (p.id || p._id) === selectedId),
    [catalog, selectedId],
  );
  const selectedPrice =
    manualPrice ??
    selectedProduct?.price ??
    selectedProduct?.defaultPrice ??
    selectedProduct?.mrp ??
    0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...catalog];
    if (!q) return base.slice(0, 40);
    return base
      .filter((p) => {
        const name = (p.name || p.title || "").toLowerCase();
        const aliases = (p.alias || []).join(" ").toLowerCase();
        return name.includes(q) || aliases.includes(q);
      })
      .slice(0, 40);
  }, [catalog, query]);

  const total = items.reduce(
    (sum, it) => sum + it.productPrice * it.productQuantity,
    0,
  );

  const openDialog = async () => {
    setOpen(true);
    if (catalog.length) return;
    const { data } = await productsService.getAll();
    const list = Array.isArray(data) ? data : data?.data || [];
    setCatalog(list);
  };

  const formatDetails = () => setParsed(parseCustomerDetails(rawDetails));

  const addProduct = () => {
    if (!selectedProduct) return;
    const productId = String(selectedProduct.id || selectedProduct._id || "");
    const productName =
      selectedProduct.name || selectedProduct.title || "Unknown";
    if (!productId) return;
    if (quantity <= 0 || selectedPrice < 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId,
        productName,
        productQuantity: quantity,
        productPrice: Number(selectedPrice),
      },
    ]);
    setSelectedId("");
    setQuery("");
    setQuantity(1);
    setManualPrice(null);
  };

  const validate = () => {
    const missing = [...parsed.missingFields];
    if (!items.length) missing.push("products");
    if (parsed.gst && !parsed.gstDetails.gstNo)
      missing.push("gstDetails.gstNo");
    if (items.some((x) => x.productQuantity <= 0))
      missing.push("products.quantity");
    if (items.some((x) => x.productPrice < 0)) missing.push("products.price");
    return missing;
  };

  const createInvoice = async (status: "draft" | "confirmed") => {
    const missing = validate();
    if (missing.length) {
      showToast(`Missing/invalid fields: ${missing.join(", ")}`, "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customerDetails: parsed.customerDetails,
        gst: parsed.gst,
        gstDetails: parsed.gst ? parsed.gstDetails : {},
        products: items,
        source: "quick-dialog",
        status,
      };
      const { data, error } = await invoicesService.create(payload);
      if (error) throw new Error(error);
      const invoice = data?.data || data;
      setResult({
        invoiceNo: invoice?.invoiceNo || invoice?.invoice_number,
        id: invoice?.id || invoice?._id,
      });
      showToast(
        `Invoice ${status === "draft" ? "draft" : "created"} successfully`,
        "success",
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to create invoice", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setRawDetails("");
    setParsed(parseCustomerDetails(""));
    setItems([]);
    setResult(null);
  };

  return (
    <>
      <button
        onClick={() => (open ? setOpen(false) : openDialog())}
        className="fixed bottom-5 right-5 z-[1000] glass-btn-amber px-4 py-3 rounded-full font-semibold shadow-lg"
      >
        {open ? "Close" : "+ Quick Invoice"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{
              position: "fixed",
              right: "1.25rem",
              bottom: "5rem",
              width: "min(92vw, 420px)",
              maxHeight: "min(80vh, 720px)",
              transformOrigin: "bottom right",
              zIndex: 1001,
              display: "flex",
              flexDirection: "column",
            }}
            className="glass-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  Q
                </div>
                <div>
                  <h3 className="font-bold leading-tight">Quick Invoice</h3>
                  <p className="text-xs text-white/80 leading-tight">
                    Create an invoice fast
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="hover:bg-white/20 rounded-full p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="p-4"
              style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}
            >
            {result ? (
              <div className="space-y-2 text-sm">
                <p className="text-emerald-600">
                  Success! Invoice: {result.invoiceNo || result.id}
                </p>
                <div className="flex gap-2">
                  <a
                    href={result.id ? `/invoice/${result.id}` : "#"}
                    className="glass-btn px-3 py-2"
                  >
                    View Invoice
                  </a>
                  <button className="glass-btn px-3 py-2" onClick={reset}>
                    Create Another
                  </button>
                  <button
                    className="glass-btn px-3 py-2"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={rawDetails}
                  onChange={(e) => setRawDetails(e.target.value)}
                  placeholder="Paste customer details"
                  className="glass-input w-full h-24"
                />
                <button
                  className="glass-btn px-3 py-2 mt-2"
                  onClick={formatDetails}
                >
                  Format Details
                </button>
                <div className="text-xs mt-2">
                  Name: {parsed.customerDetails.name || "-"} | Phone:{" "}
                  {parsed.customerDetails.phone || "-"} | Address:{" "}
                  {parsed.customerDetails.address || "-"} | GST:{" "}
                  {parsed.gst ? parsed.gstDetails.gstNo : "No"}
                </div>
                {parsed.missingFields.length > 0 && (
                  <div className="text-xs text-rose-500 mt-1">
                    Missing: {parsed.missingFields.join(", ")}
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search product"
                    className="glass-input w-full"
                  />
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="glass-input w-full"
                  >
                    <option value="">Select Product</option>
                    {filtered.map((p) => {
                      const id = String(p.id || p._id || "");
                      return (
                        <option key={id} value={id}>
                          {p.name || p.title} {p.brand ? `(${p.brand})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuantity(n)}
                        className="glass-btn px-2 py-1 text-xs"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    className="glass-input w-full"
                  />
                  <input
                    type="number"
                    min={0}
                    value={selectedPrice}
                    onChange={(e) => setManualPrice(Number(e.target.value))}
                    className="glass-input w-full"
                  />
                  <button
                    onClick={addProduct}
                    className="glass-btn-amber px-3 py-2 inline-flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                </div>
                <div className="mt-3 space-y-1">
                  {items.map((it, idx) => (
                    <div
                      key={`${it.productId}-${idx}`}
                      className="text-sm flex justify-between"
                    >
                      <span>
                        {it.productName} x {it.productQuantity} @{" "}
                        {it.productPrice}
                      </span>
                      <button
                        onClick={() =>
                          setItems((p) => p.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="font-semibold mt-2">
                  Total: ₹{total.toFixed(2)}
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    disabled={submitting}
                    onClick={() => createInvoice("draft")}
                    className="glass-btn px-3 py-2"
                  >
                    Create Draft
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => createInvoice("confirmed")}
                    className="glass-btn-amber px-3 py-2"
                  >
                    Create Invoice
                  </button>
                  <button onClick={reset} className="glass-btn px-3 py-2">
                    Reset
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="glass-btn px-3 py-2"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
