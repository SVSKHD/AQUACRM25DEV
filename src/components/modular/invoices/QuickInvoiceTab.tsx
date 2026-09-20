import React from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { parseInvoiceBlock } from "../../../utils/parseInvoiceBlock";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
  LiquidInput,
  LiquidPanel,
  LiquidTextarea,
} from "../../ui/liquid";

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
    productId?: string;
    productSlug?: string;
    productLink?: string;
  }[];
} & Record<string, any>;

type ProductOption = {
  id: string | number;
  name: string;
  price: number;
  sku?: string | null;
  slug?: string | null;
  link?: string | null;
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

  const productOptions = React.useMemo(
    () =>
      filtered.map((product) => ({
        value: String(product.id),
        label: `${product.name}${product.sku ? ` (${product.sku})` : ""}`,
      })),
    [filtered],
  );

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
          productId: /^[a-f\d]{24}$/i.test(String(selectedProduct.id))
            ? String(selectedProduct.id)
            : "",
          productSlug: selectedProduct.slug || "",
          productLink: selectedProduct.link || "",
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
        <LiquidTextarea
          label="Paste contact block (jumbled order is fine)"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder={PLACEHOLDER}
          className="min-h-[110px] text-sm font-mono"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <LiquidButton type="button" variant="primary" onClick={useTheseValues}>
            <Sparkles className="h-4 w-4" />
            Use these values
          </LiquidButton>
          <LiquidButton type="button" variant="soft" onClick={() => setRawText("")}>
            Reset
          </LiquidButton>
          {pdfUploadSlot}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/60 dark:bg-white/5">
        <div className="sm:col-span-2 text-xs uppercase tracking-wide text-slate-500 dark:text-white/40 font-semibold">
          Parsed preview — edit any field if a line was misclassified
        </div>
        <LiquidInput
          label="Name"
          type="text"
          value={formData.customer_name}
          onChange={(event) => updateField("customer_name", event.target.value)}
          placeholder="Customer name"
        />
        <LiquidInput
          label="Phone"
          type="tel"
          value={formData.customer_phone || ""}
          onChange={(event) =>
            updateField("customer_phone", Number(event.target.value) || 0)
          }
          placeholder="10-digit number"
        />
        <LiquidInput
          label="Email"
          type="email"
          value={formData.customer_email}
          onChange={(event) => updateField("customer_email", event.target.value)}
          placeholder="optional"
        />
        <LiquidTextarea
          label="Address"
          value={formData.customer_address}
          onChange={(event) => updateField("customer_address", event.target.value)}
          wrapperClassName="sm:col-span-2"
          className="min-h-[60px]"
          placeholder="Address lines joined with commas"
        />
      </div>

      <div className="border-t border-slate-200 dark:border-white/10 pt-4">
        <h4 className="font-semibold text-neutral-950 dark:text-white mb-3">
          Add Product
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LiquidInput
            label="Search product"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product"
          />
          <LiquidDropdown
            label="Product"
            value={selectedId}
            options={productOptions}
            onChange={(value) => {
              setSelectedId(value);
              setPrice("");
            }}
            placeholder="Select product"
          />
          <div className="flex items-end gap-2">
            <LiquidInput
              label="Quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              placeholder="Qty"
              wrapperClassName="min-w-0 flex-1"
            />
            <div className="flex gap-1 pb-0.5">
              {[1, 2, 3, 5].map((value) => (
                <LiquidButton
                  key={value}
                  type="button"
                  variant={quantity === value ? "primary" : "soft"}
                  onClick={() => setQuantity(value)}
                  className="min-h-0 px-2 py-1 text-xs"
                >
                  {value}
                </LiquidButton>
              ))}
            </div>
          </div>
          <LiquidInput
            label="Price"
            type="number"
            min={0}
            value={price === "" ? effectivePrice : price}
            onChange={(event) =>
              setPrice(event.target.value === "" ? "" : Number(event.target.value))
            }
            placeholder="Price"
          />
        </div>
        <LiquidButton
          type="button"
          variant="primary"
          onClick={addProductToInvoice}
          disabled={!selectedProduct}
          className="mt-3"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </LiquidButton>

        {formData.products.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {formData.products.map((product, index) => (
              <LiquidPanel
                key={index}
                className="flex items-center justify-between p-3"
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
                <LiquidIconButton
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="text-rose-600 dark:text-rose-400"
                  aria-label={`Remove ${product.productName}`}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </LiquidIconButton>
              </LiquidPanel>
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
