import { useEffect, useState, type FormEvent } from "react";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import FormSection from "../../ui/FormSection";
import RichTextEditor from "../../ui/RichTextEditor";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidInput,
  SidebarRequestBanner,
  type LiquidDropdownOption,
  type RequestState,
} from "../../ui/liquid";
import AIAssist from "../../ai/AIAssist";
import AICatalogSuggestions from "../../ai/AICatalogSuggestions";
import AIFieldAnimation, {
  AIFieldAnimationScope,
} from "../../ai/AIFieldAnimation";
import PhotoUploader from "./PhotoUploader";
import { discountPercent } from "../../../utils/productList";
import { stripHtml } from "../../../utils/blogList";
import type { ProductForm } from "./productForm";

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "refurbished", label: "Refurbished" },
  { value: "used", label: "Used" },
];

const toNumber = (
  value: string,
  parse: (value: string) => number = parseFloat,
) => parse(value) || 0;

export default function ProductFormPanel({
  open,
  editing,
  form,
  savedAt,
  categoryOptions,
  subcategoryOptions,
  onChange,
  onSubmit,
  onClose,
  onClearDraft,
  onPhotoError,
}: {
  open: boolean;
  editing: boolean;
  form: ProductForm;
  savedAt: string | null;
  categoryOptions: LiquidDropdownOption[];
  /** Subcategories of the selected category. */
  subcategoryOptions: LiquidDropdownOption[];
  onChange: (patch: Partial<ProductForm>) => void;
  /** Resolves to an error message, or "" when saved. */
  onSubmit: () => Promise<string>;
  onClose: () => void;
  onClearDraft: () => void;
  onPhotoError: (message: string) => void;
}) {
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState("");
  const discount = discountPercent(form);

  useEffect(() => {
    if (!open) return;
    setRequestState("idle");
    setRequestError("");
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (requestState === "loading") return;
    setRequestState("loading");
    setRequestError("");
    const message = await onSubmit();
    setRequestState(message ? "error" : "idle");
    setRequestError(message);
  };

  const productContext = `Product: ${form.title || "(untitled)"}${form.brand ? `\nBrand: ${form.brand}` : ""}${form.keywords ? `\nKeywords: ${form.keywords}` : ""}\nDescription: ${stripHtml(String(form.description || "")).slice(0, 1200) || "(none)"}`;

  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={onClose}
      title={editing ? "Edit Product" : "Add New Product"}
      subtitle="Drag the left grip to resize."
      widthStorageKey="aquacrm:product-editor-width"
      initialWidth={560}
      minWidth={420}
      maxWidth={960}

      footer={
        <div className="flex flex-wrap gap-3">
          <LiquidButton
            type="submit"
            form="product-form"
            variant="primary"
            className="min-w-[8rem] flex-1"
            requestState={requestState}
            loadingLabel="Saving…"
          >
            {editing ? "Update Product" : "Add Product"}
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="danger"
            onClick={onClearDraft}
            className="flex-1"
          >
            Clear draft
          </LiquidButton>
        </div>
      }
    >
      <SidebarRequestBanner
        state={requestState}
        message={requestError}
        title="Product not saved"
        onDismiss={() => {
          setRequestState("idle");
          setRequestError("");
        }}
      />
      <AIFieldAnimationScope>
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
            Draft auto-saves locally
            {savedAt
              ? ` · saved ${new Date(savedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
            . Closing keeps your work.
          </div>
          <AICatalogSuggestions
            kind="product"
            value={{
              title: form.title,
              description: form.description,
              keywords: form.keywords,
              brand: form.brand,
            }}
            onApply={(changes) => onChange(changes)}
          />

          <FormSection
            title="Basics"
            description="Name, brand and where the product sits in the catalog."
          >
            <AIFieldAnimation
              assist={{
                value: form.title,
                onChange: (title) => onChange({ title }),
                context: "product title for the Aquakart store",
                maxChars: 120,
                suggest: {
                  label: "Suggest product title",
                  instruction: `Write one clear product title (brand, product type, key spec such as capacity) for an Indian e-commerce listing, under 80 characters:\n${productContext}`,
                },
              }}
            >
              <LiquidInput
                label="Product title *"
                type="text"
                value={form.title}
                onChange={(event) => onChange({ title: event.target.value })}
                required
                placeholder="e.g. Kent Bathroom Water Softener 5.5L"
              />
            </AIFieldAnimation>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <AIFieldAnimation
                assist={{
                  value: form.brand,
                  onChange: (brand) => onChange({ brand }),
                  context: "product brand name",
                  maxChars: 60,
                  suggest: {
                    label: "Suggest brand",
                    instruction: `Name this product's brand in one or two words:\n${productContext}`,
                  },
                }}
              >
                <LiquidInput
                  label="Brand *"
                  type="text"
                  value={form.brand}
                  onChange={(event) => onChange({ brand: event.target.value })}
                  placeholder="e.g. Kent"
                  required
                />
              </AIFieldAnimation>
              <LiquidInput
                label="Slug"
                type="text"
                value={form.slug}
                onChange={(event) => onChange({ slug: event.target.value })}
                placeholder="url-friendly-slug"
              />
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <LiquidDropdown
                label="Category"
                value={form.category_id}
                placeholder="Select category"
                searchPlaceholder="Search categories…"
                searchable
                options={[
                  { value: "", label: "No category" },
                  ...categoryOptions,
                ]}
                onChange={(category_id) =>
                  onChange({ category_id, subcategory_id: "" })
                }
                wrapperClassName="min-w-0"
              />
              <LiquidDropdown
                label="Subcategory"
                value={form.subcategory_id}
                disabled={!form.category_id}
                placeholder={
                  form.category_id
                    ? "No subcategory"
                    : "Choose a category first"
                }
                searchPlaceholder="Search subcategories…"
                options={[
                  { value: "", label: "No subcategory" },
                  ...subcategoryOptions,
                ]}
                onChange={(subcategory_id) => onChange({ subcategory_id })}
                wrapperClassName="min-w-0"
              />
            </div>
            <AIFieldAnimation
              assist={{
                value: form.keywords,
                onChange: (keywords) => onChange({ keywords }),
                context: "comma-separated product SEO keywords",
                suggest: {
                  label: "Suggest keywords",
                  instruction: `Write 6-10 comma-separated SEO keywords Indian shoppers search for this product:\n${productContext}`,
                },
              }}
            >
              <LiquidInput
                label="Keywords"
                type="text"
                value={form.keywords}
                onChange={(event) => onChange({ keywords: event.target.value })}
                placeholder="Comma separated keywords"
              />
            </AIFieldAnimation>
            <LiquidCheckbox
              label="Active product (visible on the storefront)"
              checked={form.is_active}
              onChange={(event) =>
                onChange({ is_active: event.target.checked })
              }
            />
          </FormSection>

          <FormSection
            title="Description *"
            actions={
              <AIAssist
                value={form.description}
                onChange={(description) => onChange({ description })}
                context="ecommerce product description for a water purifier/softener store"
              />
            }
          >
            <RichTextEditor
              label="Product description"
              value={form.description}
              onChange={(description) => onChange({ description })}
              placeholder="Write the product description here…"
              minHeight={300}
            />
          </FormSection>

          <FormSection title="Pricing & stock">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <LiquidInput
                label="Price (₹) *"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.price || ""}
                onChange={(event) =>
                  onChange({ price: toNumber(event.target.value) })
                }
                required
              />
              <LiquidInput
                label="DP price (₹)"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.dpPrice || ""}
                onChange={(event) =>
                  onChange({ dpPrice: toNumber(event.target.value) })
                }
              />
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 p-3">
              <LiquidCheckbox
                label="Discount active"
                checked={form.discountPriceStatus}
                onChange={(event) =>
                  onChange({ discountPriceStatus: event.target.checked })
                }
              />
              <LiquidInput
                label={
                  discount > 0
                    ? `Discount price (₹) · ${discount}% off`
                    : "Discount price (₹)"
                }
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.discountPrice || ""}
                onChange={(event) =>
                  onChange({ discountPrice: toNumber(event.target.value) })
                }
                disabled={!form.discountPriceStatus}
                className="disabled:opacity-50"
              />
              {form.discountPriceStatus &&
                form.discountPrice > form.price &&
                form.price > 0 && (
                  <p
                    role="status"
                    className="text-xs font-semibold text-amber-300"
                  >
                    The discount price is higher than the price.
                  </p>
                )}
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <LiquidInput
                label="Stock"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  onChange({
                    stock: toNumber(event.target.value, (value) =>
                      parseInt(value, 10),
                    ),
                  })
                }
              />
              <LiquidInput
                label="SKU (optional)"
                type="text"
                value={form.sku}
                onChange={(event) => onChange({ sku: event.target.value })}
              />
            </div>
          </FormSection>

          <FormSection title="Photos *">
            <PhotoUploader
              id="product-photos"
              label="Product photos"
              photos={form.photos}
              onChange={(photos) => onChange({ photos })}
              onError={onPhotoError}
            />
          </FormSection>

          <FormSection
            title="Google Merchant & indexing"
            description="These fields feed Google Shopping/free listings and enrich Product schema for search and AI engines."
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <LiquidInput
                label="GTIN / barcode"
                type="text"
                value={form.gtin}
                onChange={(event) => onChange({ gtin: event.target.value })}
                placeholder="EAN / UPC / GTIN"
              />
              <LiquidInput
                label="MPN"
                type="text"
                value={form.mpn}
                onChange={(event) => onChange({ mpn: event.target.value })}
                placeholder="Manufacturer part number"
              />
              <LiquidInput
                label="Google product category"
                type="text"
                value={form.googleProductCategory}
                onChange={(event) =>
                  onChange({ googleProductCategory: event.target.value })
                }
                placeholder="Google taxonomy ID or path"
              />
              <LiquidInput
                label="Product type"
                type="text"
                value={form.productType}
                onChange={(event) =>
                  onChange({ productType: event.target.value })
                }
                placeholder="Water Treatment > Water Softeners"
              />
              <LiquidDropdown
                label="Condition"
                value={form.condition}
                options={CONDITION_OPTIONS}
                onChange={(condition) => onChange({ condition })}
                wrapperClassName="min-w-0"
              />
              <LiquidInput
                label="Shipping weight"
                type="text"
                value={form.shippingWeight}
                onChange={(event) =>
                  onChange({ shippingWeight: event.target.value })
                }
                placeholder="25 kg"
              />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <LiquidCheckbox
                label="Include in Google product feed"
                checked={form.merchantEnabled}
                onChange={(event) =>
                  onChange({ merchantEnabled: event.target.checked })
                }
              />
              <LiquidCheckbox
                label="Product has standard identifiers"
                checked={form.identifierExists}
                onChange={(event) =>
                  onChange({ identifierExists: event.target.checked })
                }
              />
            </div>
          </FormSection>
        </form>
      </AIFieldAnimationScope>
    </ResizableFloatingSidebar>
  );
}
