import React from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { parseInvoiceBlock } from "../../../utils/parseInvoiceBlock";

type FormDataLike = {
  customer_name: string;
  customer_phone: number;
  customer_email: string;
  customer_address: string;
  products: {
    productName: string;
    productQuantity: number;
    productPrice: number;
    productSerialNo?: string;
  }[];
} & Record<string, any>;

type ProductOption = {
  id: string | number;
  name: string;
  price: number;
  sku?: string | null;
};

type QuickInvoiceTabProps = {
  formData: FormDataLike;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  availableProducts: ProductOption[];
  removeProduct: (index: number) => void;
  calculateTotal: (products: FormDataLike["products"]) => number;
  pdfUploadSlot?: React.ReactNode;
};

const PLACEHOLDER = `Janapriya utopia
Hithesh
9553419654`;

export default function QuickInvoiceTab({
  formData,
  setFormData,
  availableProducts,
  removeProduct,
  calculateTotal,
  pdfUploadSlot,
}: QuickInvoiceTabProps) {
  const [rawText, setRawText] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [price, setPrice] = React.useState<number | "">("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableProducts.slice(0, 40);
    return availableProducts
      .filter((p) => (p.name || "").toLowerCase().includes(q))
      .slice(0, 40);
  }, [availableProducts, query]);

  const selectedProduct = React.useMemo(
    () => availableProducts.find((p) => String(p.id) === selectedId) || null,
    [availableProducts, selectedId],
  );

  const effectivePrice =
    price === "" ? (selectedProduct?.price ?? 0) : Number(price);

  const useTheseValues = () => {
    const parsed = parseInvoiceBlock(rawText);
    setFormData((prev: any) => {
      const existingAddress = prev.customer_address || "";
      let nextAddress = parsed.address || existingAddress;
      if (parsed.pincode && !nextAddress.includes(parsed.pincode)) {
        nextAddress = nextAddress
          ? `${nextAddress}, ${parsed.pincode}`
          : parsed.pincode;
      }
      return {
        ...prev,
        customer_name: parsed.name || prev.customer_name,
        customer_phone: parsed.phone
          ? Number(parsed.phone)
          : prev.customer_phone,
        customer_email: parsed.email || prev.customer_email,
        customer_address: nextAddress,
      };
    });
  };

  const addProductToInvoice = () => {
    if (!selectedProduct) return;
    if (quantity <= 0 || effectivePrice < 0) return;
    setFormData((prev: any) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          productName: selectedProduct.name,
          productQuantity: quantity,
          productPrice: Number(effectivePrice),
          productSerialNo: "",
        },
      ],
    }));
    setSelectedId("");
    setQuery("");
    setQuantity(1);
    setPrice("");
  };

  const updateField = (field: keyof FormDataLike, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
          Paste contact block (jumbled order is fine)
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={PLACEHOLDER}
          className="glass-input w-full min-h-[110px] text-sm font-mono"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={useTheseValues}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Use these values
          </button>
          <button
            type="button"
            onClick={() => setRawText("")}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-black dark:text-white/70 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-white/10"
          >
            Reset
          </button>
          {pdfUploadSlot}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/60 dark:bg-white/5">
        <div className="sm:col-span-2 text-xs uppercase tracking-wide text-slate-500 dark:text-white/40 font-semibold">
          Parsed preview — edit any field if a line was misclassified
        </div>
        <div>
          <label className="block text-xs font-medium text-black dark:text-white/70 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => updateField("customer_name", e.target.value)}
            className="glass-input w-full text-sm"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black dark:text-white/70 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.customer_phone || ""}
            onChange={(e) =>
              updateField("customer_phone", Number(e.target.value) || 0)
            }
            className="glass-input w-full text-sm"
            placeholder="10-digit number"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black dark:text-white/70 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.customer_email}
            onChange={(e) => updateField("customer_email", e.target.value)}
            className="glass-input w-full text-sm"
            placeholder="optional"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-black dark:text-white/70 mb-1">
            Address
          </label>
          <textarea
            value={formData.customer_address}
            onChange={(e) => updateField("customer_address", e.target.value)}
            className="glass-input w-full text-sm min-h-[60px]"
            placeholder="Address lines joined with commas"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-white/10 pt-4">
        <h4 className="font-semibold text-neutral-950 dark:text-white mb-3">
          Add Product
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product"
            className="glass-input w-full text-sm"
          />
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setPrice("");
            }}
            className="glass-input w-full text-sm"
          >
            <option value="">Select product</option>
            {filtered.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
                {p.sku ? ` (${p.sku})` : ""}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="glass-input w-full text-sm"
              placeholder="Qty"
            />
            <div className="flex gap-1">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(n)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                    quantity === n
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-slate-100 dark:bg-white/5 text-black dark:text-white/70 border-slate-200 dark:border-white/10"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            min={0}
            value={price === "" ? effectivePrice : price}
            onChange={(e) =>
              setPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="glass-input w-full text-sm"
            placeholder="Price"
          />
        </div>
        <button
          type="button"
          onClick={addProductToInvoice}
          disabled={!selectedProduct}
          className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
            selectedProduct
              ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 shadow-lg shadow-blue-500/20"
              : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 cursor-not-allowed"
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>

        {formData.products.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {formData.products.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5"
              >
                <div className="text-sm">
                  <span className="font-semibold text-neutral-950 dark:text-white">
                    {product.productName}
                  </span>{" "}
                  <span className="text-black dark:text-white/60">
                    × {product.productQuantity} @ ₹
                    {product.productPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-200 dark:border-amber-500/20">
              <p className="font-bold text-amber-700 dark:text-amber-300 flex justify-between items-center">
                <span>Total:</span>
                <span>
                  {calculateTotal(formData.products).toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
