import { Plus, Trash2 } from "lucide-react";
import { LiquidButton, LiquidIconButton, LiquidInput } from "../../ui/liquid";
import {
  applyCatalogProduct,
  emptyPreInvoiceLine,
  formatInr,
  MAX_PRE_INVOICE_LINES,
  previewLineTotal,
  type CatalogProduct,
  type FieldErrors,
  type PreInvoiceFormLine,
} from "../../../utils/preInvoice";

// Line editor for pre-invoices: pick a catalog product (fills id, price and
// SKU) or type a custom name. Row totals are a live estimate with the
// server's formula; the saved document shows the server's totals.

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
      {message}
    </p>
  );
}

const NUMBER_FIELDS = [
  { key: "productQuantity", label: "Qty", step: "1", min: "0" },
  { key: "productPrice", label: "Price (₹)", step: "0.01", min: "0" },
  { key: "productDiscount", label: "Discount (₹)", step: "0.01", min: "0" },
  { key: "productTax", label: "Tax (₹)", step: "0.01", min: "0" },
] as const;

export default function LineItemsEditor({
  idPrefix,
  lines,
  catalog,
  errors,
  disabled = false,
  onChange,
}: {
  idPrefix: string;
  lines: PreInvoiceFormLine[];
  catalog: readonly CatalogProduct[];
  errors: FieldErrors;
  disabled?: boolean;
  onChange: (lines: PreInvoiceFormLine[]) => void;
}) {
  const listId = `${idPrefix}-catalog`;

  const update = (index: number, next: PreInvoiceFormLine) =>
    onChange(lines.map((line, i) => (i === index ? next : line)));

  return (
    <div className="space-y-3">
      <datalist id={listId}>
        {catalog.map((product) => (
          <option key={`${product.id}-${product.name}`} value={product.name}>
            {formatInr(product.price)}
          </option>
        ))}
      </datalist>

      {lines.map((line, index) => {
        const path = `products[${index}]`;
        return (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/50">
                Product {index + 1}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tabular-nums text-neutral-950 dark:text-white">
                  {formatInr(previewLineTotal(line))}
                </span>
                <LiquidIconButton
                  type="button"
                  disabled={disabled || lines.length === 1}
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                  className="text-rose-500 disabled:opacity-40"
                  aria-label={`Remove product ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </LiquidIconButton>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.6fr_.5fr_.7fr_.7fr_.7fr]">
              <div>
                <LiquidInput
                  label="Product"
                  list={listId}
                  value={line.productName}
                  disabled={disabled}
                  aria-invalid={Boolean(errors[`${path}.productName`])}
                  onChange={(event) =>
                    update(
                      index,
                      applyCatalogProduct(line, event.target.value, catalog),
                    )
                  }
                  placeholder="Pick a product or type a name"
                />
                <FieldError
                  message={
                    errors[`${path}.productName`] || errors[`${path}.productId`]
                  }
                />
              </div>
              {NUMBER_FIELDS.map((field) => (
                <div key={field.key}>
                  <LiquidInput
                    label={field.label}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    step={field.step}
                    value={line[field.key]}
                    disabled={disabled}
                    aria-invalid={Boolean(errors[`${path}.${field.key}`])}
                    onChange={(event) =>
                      update(index, {
                        ...line,
                        [field.key]: event.target.value,
                      })
                    }
                  />
                  <FieldError message={errors[`${path}.${field.key}`]} />
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <LiquidInput
                label="Description"
                value={line.productDescription}
                disabled={disabled}
                onChange={(event) =>
                  update(index, {
                    ...line,
                    productDescription: event.target.value,
                  })
                }
              />
              <LiquidInput
                label="Serial no. / SKU"
                value={line.productSerialNo}
                disabled={disabled}
                onChange={(event) =>
                  update(index, {
                    ...line,
                    productSerialNo: event.target.value,
                  })
                }
              />
            </div>
          </div>
        );
      })}

      <FieldError message={errors.products} />

      <LiquidButton
        type="button"
        variant="soft"
        disabled={disabled || lines.length >= MAX_PRE_INVOICE_LINES}
        onClick={() => onChange([...lines, emptyPreInvoiceLine()])}
      >
        <Plus className="h-4 w-4" />
        Add product
      </LiquidButton>
    </div>
  );
}
