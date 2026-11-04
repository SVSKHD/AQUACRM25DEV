import React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toTitleCase } from "../../../utils/parseInvoiceBlock";
import {
  findCatalogProduct,
  formatINR,
  tidyAddress,
  type CatalogProduct,
  type InvoiceLine,
} from "./invoiceFormat";
import {
  LiquidButton,
  LiquidIconButton,
  LiquidInput,
  LiquidTextarea,
} from "../../ui/liquid";

/*
 * Pieces shared by every invoice editor mode (Easy, Standard, Quick).
 * Money rule: `productPrice` is the LINE value (PR #89). The composer may
 * derive it from a catalog unit price × quantity, but a saved line's
 * productPrice is never multiplied again.
 */

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

const groupIndian = (raw: string) => {
  if (!raw) return "";
  const [intPart, decimals] = raw.split(".");
  const grouped = intPart
    ? Number(intPart).toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : "0";
  return decimals !== undefined ? `${grouped}.${decimals}` : grouped;
};

const cleanAmount = (value: string) => {
  let raw = value.replace(/[^\d.]/g, "");
  const dot = raw.indexOf(".");
  if (dot !== -1) {
    raw = `${raw.slice(0, dot + 1)}${raw
      .slice(dot + 1)
      .replace(/\./g, "")
      .slice(0, 2)}`;
  }
  return raw.replace(/^0+(?=\d)/, "");
};

/** Rupee amount typed with Indian digit grouping (1,25,000) as you type. */
export function AmountInput({
  label,
  value,
  onChange,
  hint,
  wrapperClassName,
  onKeyDown,
  placeholder = "0",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: React.ReactNode;
  wrapperClassName?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
}) {
  const [text, setText] = React.useState(() => (value ? String(value) : ""));
  const caret = React.useRef<{ el: HTMLInputElement; count: number } | null>(
    null,
  );

  // Follow outside changes (product picked, form cleared) without fighting typing.
  React.useEffect(() => {
    setText((current) =>
      Number(current || 0) === (value || 0)
        ? current
        : value
          ? String(value)
          : "",
    );
  }, [value]);

  const display = groupIndian(text);

  React.useLayoutEffect(() => {
    const pending = caret.current;
    if (!pending || document.activeElement !== pending.el) return;
    caret.current = null;
    let seen = 0;
    let position = display.length;
    for (let i = 0; i < display.length; i += 1) {
      if (seen === pending.count) {
        position = i;
        break;
      }
      if (/[\d.]/.test(display[i])) seen += 1;
    }
    pending.el.setSelectionRange(position, position);
  }, [display]);

  return (
    <div className={wrapperClassName}>
      <LiquidInput
        label={label}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={display ? `₹ ${display}` : ""}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          const el = event.target;
          const position = el.selectionStart ?? el.value.length;
          caret.current = {
            el,
            count: el.value.slice(0, position).replace(/[^\d.]/g, "").length,
          };
          const raw = cleanAmount(el.value);
          setText(raw);
          onChange(raw ? Number(raw) : 0);
        }}
      />
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

/** Indian mobile number: digits only, a pasted +91 / 0 prefix is dropped. */
export function PhoneInput({
  label = "Phone",
  value,
  onChange,
  required,
  wrapperClassName,
}: {
  label?: string;
  value: number | string;
  onChange: (digits: string) => void;
  required?: boolean;
  wrapperClassName?: string;
}) {
  const digits = value ? String(value) : "";
  const invalid = digits.length > 0 && digits.length !== 10;
  return (
    <div className={wrapperClassName}>
      <LiquidInput
        label={label}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="10-digit mobile"
        value={digits}
        required={required}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          let next = event.target.value.replace(/\D/g, "");
          if (next.length > 10) next = next.replace(/^(91|0)/, "");
          onChange(next.slice(0, 10));
        }}
      />
      {invalid && (
        <p className="mt-1 text-xs text-amber-300">{digits.length}/10 digits</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  icon: Icon,
  title,
  aside,
}: {
  icon: React.ElementType;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[1.75rem] items-center justify-between gap-3">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-black uppercase tracking-wide text-white/80">
        <Icon
          className="h-4 w-4 flex-shrink-0 text-cyan-300"
          aria-hidden="true"
        />
        <span className="truncate">{title}</span>
      </h3>
      {aside}
    </div>
  );
}

export type NavSection = { id: string; label: string; done?: boolean };

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Jump bar for a long panel form: ↑/↓ arrows, one pill per section (with a
 * check once it's filled) and Alt+↑ / Alt+↓ from anywhere in the panel.
 * Render it in ResizableFloatingSidebar's `toolbar`; each section needs the
 * matching `id`.
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const navRef = React.useRef<HTMLElement>(null);
  const pillsRef = React.useRef<HTMLDivElement>(null);
  const lockUntil = React.useRef(0);
  const [active, setActive] = React.useState(sections[0]?.id ?? "");
  const ids = sections.map((section) => section.id);
  const idsKey = ids.join("|");
  const activeIndex = Math.max(0, ids.indexOf(active));

  const scrollRoot = () =>
    navRef.current
      ?.closest(".aquacrm-dialog-surface")
      ?.querySelector<HTMLElement>(".aquacrm-dialog-scroll") ?? null;

  const goTo = React.useCallback(
    (index: number) => {
      const id = idsKey.split("|")[index];
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      lockUntil.current = Date.now() + 700;
      setActive(id);
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      target.focus({ preventScroll: true });
    },
    [idsKey],
  );

  // Highlight the section at the top of the scroll area.
  React.useEffect(() => {
    const root = scrollRoot();
    if (!root) return;
    const list = idsKey.split("|");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      const top = root.getBoundingClientRect().top + 72;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= top) current = id;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
        current = list[list.length - 1];
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [idsKey]);

  // Alt+↑ / Alt+↓ anywhere in the panel.
  React.useEffect(() => {
    const surface = navRef.current?.closest<HTMLElement>(
      ".aquacrm-dialog-surface",
    );
    if (!surface) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        !event.altKey ||
        (event.key !== "ArrowDown" && event.key !== "ArrowUp")
      )
        return;
      event.preventDefault();
      const count = idsKey.split("|").length;
      const next = activeIndex + (event.key === "ArrowDown" ? 1 : -1);
      goTo(Math.min(count - 1, Math.max(0, next)));
    };
    surface.addEventListener("keydown", onKey);
    return () => surface.removeEventListener("keydown", onKey);
  }, [activeIndex, goTo, idsKey]);

  // Keep the active pill visible when the pills overflow on a phone.
  React.useEffect(() => {
    const strip = pillsRef.current;
    const pill = strip?.children[activeIndex] as HTMLElement | undefined;
    if (!strip || !pill) return;
    const left = pill.offsetLeft - (strip.clientWidth - pill.offsetWidth) / 2;
    strip.scrollTo({
      left,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [activeIndex]);

  const onPillKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      Home: 0,
      End: sections.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = Math.min(sections.length - 1, Math.max(0, keys[event.key]));
    goTo(next);
    (pillsRef.current?.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <nav ref={navRef} className="inv-nav" aria-label="Form sections">
      <LiquidIconButton
        type="button"
        aria-label="Previous section (Alt+Up)"
        title="Previous section (Alt+↑)"
        disabled={activeIndex === 0}
        onClick={() => goTo(activeIndex - 1)}
      >
        <ChevronUp className="h-4 w-4" />
      </LiquidIconButton>
      <div
        ref={pillsRef}
        className="inv-nav-pills scrollbar-hide"
        onKeyDown={onPillKey}
      >
        {sections.map((section, index) => {
          const current = index === activeIndex;
          return (
            <LiquidButton
              key={section.id}
              type="button"
              variant="ghost"
              tabIndex={current ? 0 : -1}
              aria-current={current ? "step" : undefined}
              data-done={section.done || undefined}
              onClick={() => goTo(index)}
            >
              {section.done && (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {section.label}
              {section.done && <span className="sr-only"> (done)</span>}
            </LiquidButton>
          );
        })}
      </div>
      <LiquidIconButton
        type="button"
        aria-label="Next section (Alt+Down)"
        title="Next section (Alt+↓)"
        disabled={activeIndex >= sections.length - 1}
        onClick={() => goTo(activeIndex + 1)}
      >
        <ChevronDown className="h-4 w-4" />
      </LiquidIconButton>
    </nav>
  );
}

type CustomerShape = {
  customer_name: string;
  customer_phone: number;
  customer_email: string;
  customer_address: string;
};

export function CustomerFields({
  formData,
  update,
  showEmail,
  required,
}: {
  formData: CustomerShape;
  update: (patch: Partial<CustomerShape>) => void;
  showEmail: boolean;
  required: boolean;
}) {
  return (
    <div className="inv-fields">
      <LiquidInput
        label="Name"
        autoComplete="name"
        autoCapitalize="words"
        placeholder="Customer name"
        value={formData.customer_name}
        required={required}
        onChange={(e) => update({ customer_name: e.target.value })}
        onBlur={(e) => {
          const next = toTitleCase(e.target.value);
          if (next !== e.target.value) update({ customer_name: next });
        }}
      />
      <PhoneInput
        value={formData.customer_phone}
        required={required}
        onChange={(digits) => update({ customer_phone: Number(digits) || 0 })}
      />
      {showEmail && (
        <LiquidInput
          wrapperClassName="inv-span"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="Optional"
          value={formData.customer_email}
          onChange={(e) => update({ customer_email: e.target.value })}
          onBlur={(e) => {
            const next = e.target.value.trim().toLowerCase();
            if (next !== e.target.value) update({ customer_email: next });
          }}
        />
      )}
      <LiquidTextarea
        wrapperClassName="inv-span"
        label="Address"
        autoComplete="street-address"
        placeholder="House / flat, area, city, pincode"
        rows={2}
        className="min-h-[4.5rem]"
        value={formData.customer_address}
        required={required}
        onChange={(e) => update({ customer_address: e.target.value })}
        onBlur={(e) => {
          const next = tidyAddress(e.target.value);
          if (next !== e.target.value) update({ customer_address: next });
        }}
      />
    </div>
  );
}

export function ProductsSection<L extends InvoiceLine>({
  products,
  productForm,
  setProductForm,
  availableProducts,
  handleProductSelect,
  addProduct,
  editingProductIndex,
  editProduct,
  removeProduct,
  cancelEditProduct,
}: {
  products: InvoiceLine[];
  productForm: L;
  setProductForm: React.Dispatch<React.SetStateAction<L>>;
  availableProducts: CatalogProduct[];
  handleProductSelect: (productName: string) => void;
  addProduct: () => void;
  editingProductIndex: number | null;
  editProduct: (index: number) => void;
  removeProduct: (index: number) => void;
  cancelEditProduct: () => void;
}) {
  const listId = React.useId();
  // While false, the amount follows catalog unit price × quantity.
  const [amountEdited, setAmountEdited] = React.useState(false);
  const match = findCatalogProduct(availableProducts, productForm.productName);
  const quantity = Math.max(1, Number(productForm.productQuantity) || 1);
  const autoAmount = Boolean(match) && !amountEdited;
  const canAdd =
    Boolean(productForm.productName.trim()) && productForm.productPrice > 0;
  const editing = editingProductIndex !== null;

  React.useEffect(() => {
    // An existing line keeps its saved amount until the user changes it.
    setAmountEdited(editingProductIndex !== null);
  }, [editingProductIndex]);

  const setQuantity = (next: number) => {
    const q = Math.min(999, Math.max(1, Math.round(next) || 1));
    setProductForm((prev) => ({
      ...prev,
      productQuantity: q,
      productPrice: autoAmount && match ? match.price * q : prev.productPrice,
    }));
  };

  const submitLine = () => {
    if (!canAdd) return;
    addProduct();
    setAmountEdited(false);
  };

  const addOnEnter: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    // Enter adds the line instead of submitting the whole invoice.
    if (event.key === "Enter") {
      event.preventDefault();
      submitLine();
    }
  };

  return (
    <>
      <div className="inv-composer">
        <div className="inv-area-product">
          <LiquidInput
            label="Product"
            placeholder="Search or type a product"
            autoComplete="off"
            enterKeyHint="done"
            value={productForm.productName}
            list={listId}
            onKeyDown={addOnEnter}
            onChange={(e) => {
              const name = e.target.value;
              handleProductSelect(name);
              const picked = findCatalogProduct(availableProducts, name);
              if (picked && !editing) {
                setAmountEdited(false);
                setProductForm((prev) => ({
                  ...prev,
                  productPrice:
                    picked.price *
                    Math.max(1, Number(prev.productQuantity) || 1),
                }));
              }
            }}
          />
          <datalist id={listId}>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.name}>
                {product.sku ? `${product.sku} · ` : ""}
                {formatINR(product.price)}
              </option>
            ))}
          </datalist>
          {productForm.productName.trim() && (
            <p className="mt-1 text-xs text-white/50">
              {match
                ? `Catalog item · ${formatINR(match.price)} each`
                : "Not in the catalog — saved as typed"}
            </p>
          )}
        </div>

        <div className="inv-area-qty">
          <span className="liquid-label">Qty</span>
          <div className="inv-stepper">
            <LiquidIconButton
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </LiquidIconButton>
            <LiquidInput
              aria-label="Quantity"
              type="text"
              inputMode="numeric"
              value={productForm.productQuantity || ""}
              onKeyDown={addOnEnter}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                if (!digits) {
                  setProductForm((prev) => ({ ...prev, productQuantity: 0 }));
                  return;
                }
                setQuantity(Number(digits));
              }}
              onBlur={() => {
                if (!productForm.productQuantity) setQuantity(1);
              }}
            />
            <LiquidIconButton
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </LiquidIconButton>
          </div>
        </div>

        <AmountInput
          wrapperClassName="inv-area-amount"
          label="Line amount"
          value={productForm.productPrice}
          onKeyDown={addOnEnter}
          onChange={(value) => {
            setAmountEdited(true);
            setProductForm((prev) => ({ ...prev, productPrice: value }));
          }}
          hint={
            autoAmount && match && quantity > 1
              ? `${formatINR(match.price)} × ${quantity}`
              : undefined
          }
        />

        <LiquidInput
          wrapperClassName="inv-area-serial"
          label="Serial no."
          placeholder="Optional"
          autoComplete="off"
          autoCapitalize="characters"
          value={productForm.productSerialNo || ""}
          onKeyDown={addOnEnter}
          onChange={(e) =>
            setProductForm((prev) => ({
              ...prev,
              productSerialNo: e.target.value,
            }))
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <LiquidButton
          type="button"
          variant="primary"
          onClick={submitLine}
          disabled={!canAdd}
          className="flex-1 sm:flex-none"
        >
          {editing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {editing ? "Update line" : "Add product"}
        </LiquidButton>
        {editing && (
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => {
              cancelEditProduct();
              setAmountEdited(false);
            }}
          >
            <X className="h-4 w-4" />
            Cancel
          </LiquidButton>
        )}
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-center text-sm text-white/50">
          No products yet. Pick one above and tap Add product.
        </p>
      ) : (
        <ul className="inv-lines divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
          {products.map((product, index) => (
            <li
              key={`${product.productName}-${index}`}
              className={`flex items-center gap-2 px-3 py-2.5 ${
                editingProductIndex === index ? "bg-cyan-400/10" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-snug text-white">
                  {product.productName || "Product"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-white/55">
                  <span>
                    Qty {product.productQuantity}
                    {product.productSerialNo
                      ? ` · SN ${product.productSerialNo}`
                      : ""}
                  </span>
                  {/* productPrice is the line value: shown as-is, never × quantity. */}
                  <span className="text-sm font-bold tabular-nums text-white">
                    {formatINR(Number(product.productPrice) || 0)}
                  </span>
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <LiquidIconButton
                  type="button"
                  onClick={() => editProduct(index)}
                  aria-label={`Edit ${product.productName}`}
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </LiquidIconButton>
                <LiquidIconButton
                  type="button"
                  onClick={() => removeProduct(index)}
                  aria-label={`Remove ${product.productName}`}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </LiquidIconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
