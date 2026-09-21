import { useEffect, useMemo, useState } from "react";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidPanel,
} from "../../ui/liquid";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";

interface ProductOption {
  id: string;
  stockId?: string;
  name: string;
  price?: number;
  stock?: number;
  sku?: string | null;
  source?: "product" | "stock";
}

interface StockFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: any) => void;
  initial: any;
  productOptions: ProductOption[];
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

function StockFormDialog({
  open,
  onClose,
  onSave,
  initial,
  productOptions = [],
}: StockFormDialogProps) {
  const emptyForm = {
    id: "",
    productId: "",
    name: "",
    quantity: 0,
    dpPrice: 0,
    history: [],
  };
  const [form, setForm] = useState<any>(initial || emptyForm);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({
        ...emptyForm,
        ...initial,
        productId: initial.productId || "",
        quantity: Number(initial.quantity ?? 0),
        dpPrice: Number(initial.dpPrice ?? 0),
      });
    } else {
      setForm(emptyForm);
    }
    setProductSearch("");
  }, [initial, open]);

  const filteredProductOptions = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return productOptions;
    return productOptions.filter((product) =>
      [product.name, product.sku, product.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [productOptions, productSearch]);

  const dropdownOptions = useMemo(
    () =>
      filteredProductOptions.map((product) => ({
        value: product.id,
        label: [
          product.name,
          product.sku || null,
          product.price
            ? `DP ${formatCurrency(product.price)}`
            : "DP not set",
          product.stock !== undefined
            ? `CRM Stock ${product.stock}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [filteredProductOptions],
  );

  const resetForm = () => setForm(initial || emptyForm);

  const handleSelectProduct = (productId: string) => {
    const selected = productOptions.find((product) => product.id === productId);
    if (selected) {
      setForm({
        ...form,
        id: selected.stockId || "",
        productId,
        name: selected.name,
        quantity: selected.stock ?? form.quantity ?? 0,
        dpPrice: selected.price ?? 0,
      });
      return;
    }

    setForm({
      ...form,
      id: "",
      productId,
      name: "",
      dpPrice: 0,
    });
  };

  if (!open) return null;

  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={onClose}
      title={initial ? "Edit CRM Stock" : "Add CRM Stock"}
      subtitle="Product options come from the product collection. Quantity stays in CRM stock."
      widthStorageKey="aquacrm:stock-editor-width"
      initialWidth={500}
      minWidth={420}
      maxWidth={760}
    >
      <div className="space-y-4">
        {!initial && (
          <div className="space-y-3">
            <LiquidInput
              label={`Search Product Collection (${productOptions.length})`}
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search product name, SKU, code..."
            />
            <LiquidDropdown
              label="Product"
              value={form.productId}
              onChange={handleSelectProduct}
              options={dropdownOptions}
              placeholder="Choose from complete product list"
            />
            {!filteredProductOptions.length && (
              <p className="text-xs font-semibold text-rose-500">
                No matching product found. Clear the search or check the product collection.
              </p>
            )}
          </div>
        )}

        <LiquidInput
          label="Product Name"
          value={form.name}
          readOnly
          className="opacity-80"
          placeholder="Select product from complete product list"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LiquidInput
            label="CRM Stock Count"
            type="number"
            value={form.quantity}
            onChange={(event) =>
              setForm({
                ...form,
                quantity: Number.parseInt(event.target.value, 10) || 0,
              })
            }
          />
          <LiquidInput
            label="Product DP Price"
            type="text"
            value={formatCurrency(form.dpPrice)}
            readOnly
            className="opacity-80"
          />
        </div>

        <LiquidPanel className="border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            CRM Stock Valuation
          </p>
          <p className="mt-1 text-lg font-black text-neutral-950 dark:text-white">
            {formatCurrency(Number(form.quantity || 0) * Number(form.dpPrice || 0))}
          </p>
        </LiquidPanel>

        {form.id && !initial && (
          <LiquidPanel className="border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              This product already has a CRM stock entry. Saving updates the existing count instead of creating a duplicate.
            </p>
          </LiquidPanel>
        )}
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
        <LiquidButton type="button" onClick={onClose} variant="soft" className="flex-1">
          Cancel
        </LiquidButton>
        <LiquidButton
          type="button"
          onClick={() => {
            onSave(form);
            resetForm();
          }}
          variant="primary"
          className="flex-1"
        >
          {initial || form.id ? "Update CRM Stock" : "Create CRM Stock"}
        </LiquidButton>
      </div>
    </ResizableFloatingSidebar>
  );
}

export default StockFormDialog;
