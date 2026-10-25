import { AnimatePresence } from "framer-motion";
import ResponsiveDialog from "../../ui/ResponsiveDialog";
import { useMemo, useState } from "react";
import { Clipboard, Send } from "lucide-react";

export interface StockStatusProduct {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  dpPrice: number;
  totalValue?: number;
}

interface StockStatusSendDialogProps {
  open: boolean;
  products: StockStatusProduct[];
  onClose: () => void;
  onSend: (phone: string, message: string) => Promise<void>;
  isSending?: boolean;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const buildStockStatusMessage = (products: StockStatusProduct[]) => {
  const stockedProducts = products.filter(
    (product) => Number(product.quantity || 0) > 0,
  );
  const totalUnits = stockedProducts.reduce(
    (sum, product) => sum + Number(product.quantity || 0),
    0,
  );
  const totalValue = stockedProducts.reduce(
    (sum, product) =>
      sum + Number(product.quantity || 0) * Number(product.dpPrice || 0),
    0,
  );
  const today = new Date().toLocaleDateString("en-IN");

  const productLines = stockedProducts
    .map((product, index) => {
      const valuation =
        Number(product.quantity || 0) * Number(product.dpPrice || 0);
      return `${index + 1}. ${product.name}\n   Qty: ${product.quantity}\n   DP: ${formatCurrency(product.dpPrice)}\n   Value: ${formatCurrency(valuation)}`;
    })
    .join("\n\n");

  return `*Aquakart CRM Stock Status*\nDate: ${today}\n\n${productLines || "No CRM stock available."}\n\n*Total Units:* ${totalUnits}\n*Total Valuation:* ${formatCurrency(totalValue)}\n\nNote: This is CRM stock status only. Ecommerce product stock is separate.`;
};

export default function StockStatusSendDialog({
  open,
  products,
  onClose,
  onSend,
  isSending = false,
}: StockStatusSendDialogProps) {
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  const stockedProducts = useMemo(
    () => products.filter((product) => Number(product.quantity || 0) > 0),
    [products],
  );

  const totals = useMemo(
    () => ({
      units: stockedProducts.reduce(
        (sum, product) => sum + Number(product.quantity || 0),
        0,
      ),
      value: stockedProducts.reduce(
        (sum, product) =>
          sum + Number(product.quantity || 0) * Number(product.dpPrice || 0),
        0,
      ),
    }),
    [stockedProducts],
  );

  const message = useMemo(() => buildStockStatusMessage(products), [products]);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const submitSend = async () => {
    await onSend(phone, message);
  };

  return (
    <AnimatePresence>
      {open && (
        <ResponsiveDialog
          open
          onClose={onClose}
          title={"Send CRM Stock Status"}
          busy={isSending}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSend}
                disabled={isSending || !stockedProducts.length}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />{" "}
                {isSending ? "Sending..." : "Send Stock Status"}
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Products
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">
                {stockedProducts.length}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                Total Units
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">
                {totals.units.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Total Valuation
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">
                {formatCurrency(totals.value)}
              </p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-[1.4fr_.45fr_.75fr_.8fr] gap-2 bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-white/60">
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">DP Price</span>
              <span className="text-right">Valuation</span>
            </div>
            <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto dark:divide-white/10">
              {stockedProducts.map((product) => {
                const value =
                  Number(product.quantity || 0) * Number(product.dpPrice || 0);
                return (
                  <div
                    key={`${product.id}-${product.productId}`}
                    className="grid grid-cols-[1.4fr_.45fr_.75fr_.8fr] gap-2 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-bold text-neutral-950 dark:text-white">
                      {product.name}
                    </span>
                    <span className="text-right text-slate-700 dark:text-white/70">
                      {product.quantity}
                    </span>
                    <span className="text-right text-slate-700 dark:text-white/70">
                      {formatCurrency(product.dpPrice)}
                    </span>
                    <span className="text-right font-black text-neutral-950 dark:text-white">
                      {formatCurrency(value)}
                    </span>
                  </div>
                );
              })}
              {!stockedProducts.length && (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60">
                  No CRM stock products available to send.
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white/45 p-4 dark:border-white/10 dark:bg-white/5">
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/50">
                WhatsApp Number
              </label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter phone number"
                className="glass-input mt-2 w-full"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-white/45">
                Sends stock status only. It will not change CRM stock or
                ecommerce stock.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/45 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/50">
                  Message Preview
                </p>
                <button
                  type="button"
                  onClick={copyMessage}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-white"
                >
                  <Clipboard className="h-3.5 w-3.5" />{" "}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="custom-scrollbar max-h-48 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-white">
                {message}
              </pre>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </AnimatePresence>
  );
}
