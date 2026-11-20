import React from "react";
import {
  AlertTriangle,
  Check,
  Eraser,
  Loader2,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { parseInvoiceBlock } from "../../../utils/parseInvoiceBlock";
import { usePersistentFormDraft } from "../../../hooks/usePersistentFormDraft";
import {
  QUICK_DRAFT_MAX_CHARS,
  requestQuickDraft,
  type QuickDraft,
} from "../../../services/invoiceAI";
import {
  blockingProblems,
  chosenProduct,
  lineValue,
  lineWarnings,
  reviewTotal,
  toInvoiceLines,
  toReviewLines,
  type QuickReviewLine,
} from "../../../utils/quickInvoice";
import { useToast } from "../../Toast";
import AIFieldAnimation, {
  AIFieldAnimationScope,
} from "../../ai/AIFieldAnimation";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidTextarea,
} from "../../ui/liquid";
import {
  formatINR,
  tidyAddress,
  type CatalogProduct,
  type InvoiceLine,
} from "./invoiceFormat";

type FormDataLike = {
  customer_name: string;
  customer_phone: number;
  customer_email: string;
  customer_address: string;
  products: InvoiceLine[];
  paid_status?: string;
  payment_type?: string;
};

type QuickInvoiceTabProps<F extends FormDataLike> = {
  formData: F;
  setFormData: React.Dispatch<React.SetStateAction<F>>;
  availableProducts: CatalogProduct[];
  onBusyChange?: (busy: boolean) => void;
};

type Notice = { tone: "ok" | "warn" | "error"; text: string } | null;

const PLACEHOLDER = `Paste a WhatsApp message or contact block, e.g.
Hithesh, 95534 19654
Flat 12, Janapriya Utopia, Miyapur 500049
bathroom softener 14950`;

const FIELD_LABELS: Record<string, string> = {
  customer_name: "name",
  customer_phone: "phone",
  customer_email: "email",
  customer_address: "address",
};

const CONFIDENCE_LABEL: Record<QuickReviewLine["confidence"], string> = {
  high: "",
  ai: "AI pick · check",
  low: "Best guess · check",
  none: "Not in catalog",
};

/** A short vibration on phones that support it. */
const buzz = () => {
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    /* not supported */
  }
};

/** Paste → fill. Local parsing is instant; AI reads products and matches the catalog. */
export default function QuickInvoiceTab<F extends FormDataLike>({
  formData,
  setFormData,
  availableProducts,
  onBusyChange,
}: QuickInvoiceTabProps<F>) {
  const { showToast } = useToast();
  const [rawText, setRawText] = React.useState("");
  const [formatting, setFormatting] = React.useState(false);
  const [draft, setDraft] = React.useState<QuickDraft | null>(null);
  const [lines, setLines] = React.useState<QuickReviewLine[]>([]);
  const [confirming, setConfirming] = React.useState(false);
  const [submitPending, setSubmitPending] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);
  const requestId = React.useRef(0);
  const draftSnapshot = React.useRef("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const quickDraft = usePersistentFormDraft({
    key: "invoice:quick-entry",
    value: { rawText },
    onRestore: (saved) => setRawText(saved.rawText || ""),
  });

  const snapshot = JSON.stringify([
    formData.customer_name,
    formData.customer_phone,
    formData.customer_email,
    formData.customer_address,
    formData.products.length,
  ]);

  React.useEffect(() => {
    onBusyChange?.(formatting);
    return () => onBusyChange?.(false);
  }, [formatting, onBusyChange]);

  // Drop late AI replies after the tab closes.
  React.useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  /** Fill customer fields with the local parser. */
  const quickFill = (text: string, onlyEmpty: boolean) => {
    const parsed = parseInvoiceBlock(text);
    let address = parsed.address;
    if (parsed.pincode && !address.includes(parsed.pincode)) {
      address = address ? `${address}, ${parsed.pincode}` : parsed.pincode;
    }
    const found: Partial<FormDataLike> = {};
    if (parsed.name) found.customer_name = parsed.name;
    if (parsed.phone) found.customer_phone = Number(parsed.phone);
    if (parsed.email) found.customer_email = parsed.email;
    if (address) found.customer_address = tidyAddress(address);

    const patch = Object.fromEntries(
      Object.entries(found).filter(
        ([key]) => !onlyEmpty || !formData[key as keyof FormDataLike],
      ),
    );
    const filled = Object.keys(patch).map((key) => FIELD_LABELS[key]);

    if (!filled.length) {
      setNotice(
        Object.keys(found).length
          ? {
              tone: "warn",
              text: "Fields already have values. Tap Quick fill to replace them.",
            }
          : {
              tone: "warn",
              text: "No name, phone or address found. Try Format with AI.",
            },
      );
      return;
    }
    setFormData((prev) => ({ ...prev, ...patch }));
    setNotice({
      tone: "ok",
      text: `Filled ${filled.join(", ")}. Check the fields below.`,
    });
  };

  const closeReview = () => {
    setDraft(null);
    setLines([]);
    setConfirming(false);
  };

  const formatWithAI = async () => {
    if (formatting || !rawText.trim()) return;
    const id = ++requestId.current;
    draftSnapshot.current = snapshot;
    setFormatting(true);
    setNotice(null);
    closeReview();
    const { data, error } = await requestQuickDraft(rawText);
    if (id !== requestId.current) return;
    setFormatting(false);
    if (error || !data) {
      setNotice({ tone: "error", text: error || "Could not read the text." });
      return;
    }
    const review = toReviewLines(data);
    setDraft(data);
    setLines(review);
    const missing = review.filter((line) => !line.price);
    if (missing.length) {
      // The price always comes from the user, never the catalog: alert loudly.
      buzz();
      showToast(
        `Price not sent for ${missing.map((line) => `"${line.rawName}"`).join(", ")}. Type it before creating.`,
        "error",
      );
    }
  };

  // What the form will hold once the draft is applied.
  const nextCustomer = draft
    ? {
        name: draft.customer.name || formData.customer_name || "",
        phone:
          draft.customer.phone ||
          (formData.customer_phone ? String(formData.customer_phone) : ""),
      }
    : { name: "", phone: "" };
  const problems = draft ? blockingProblems(lines, nextCustomer) : [];
  const total = reviewTotal(lines);

  const updateLine = (line: number, patch: Partial<QuickReviewLine>) => {
    setConfirming(false);
    setLines((current) =>
      current.map((entry) =>
        entry.line === line ? { ...entry, ...patch } : entry,
      ),
    );
  };

  /** Writes the reviewed draft into the form. Returns false if it is stale. */
  const applyDraft = (): boolean => {
    if (!draft) return false;
    if (snapshot !== draftSnapshot.current) {
      setNotice({
        tone: "error",
        text: "The invoice changed after formatting. Format again so your edits aren't overwritten.",
      });
      closeReview();
      return false;
    }
    const invoiceLines = toInvoiceLines(lines, availableProducts);
    setFormData((prev) => ({
      ...prev,
      customer_name: draft.customer.name || prev.customer_name,
      customer_phone: draft.customer.phone
        ? Number(draft.customer.phone)
        : prev.customer_phone,
      customer_email: draft.customer.email || prev.customer_email,
      customer_address: draft.customer.address
        ? tidyAddress(draft.customer.address)
        : prev.customer_address,
      ...(draft.paidStatus ? { paid_status: draft.paidStatus } : {}),
      ...(draft.paymentType ? { payment_type: draft.paymentType } : {}),
      products: [...prev.products, ...invoiceLines],
    }));
    return true;
  };

  const apply = () => {
    if (!applyDraft()) return;
    const count = lines.length;
    closeReview();
    setNotice({
      tone: lines.some((line) => !line.price) ? "warn" : "ok",
      text: count
        ? `Applied. ${count} product line${count > 1 ? "s" : ""} added. Review before saving.`
        : "Applied. Review the fields before saving.",
    });
  };

  const createAndSend = () => {
    if (problems.length) {
      buzz();
      return;
    }
    if (!applyDraft()) return;
    setSubmitPending(true);
  };

  // Submit once the applied values have reached the form (next render), so
  // the invoice tab saves what was reviewed. Saving sends it on WhatsApp.
  React.useEffect(() => {
    if (!submitPending) return;
    setSubmitPending(false);
    rootRef.current?.closest("form")?.requestSubmit();
    void quickDraft.clearDraft();
    requestId.current += 1;
    setRawText("");
    closeReview();
    setNotice(null);
  }, [submitPending, quickDraft]);

  const reset = () => {
    void quickDraft.clearDraft();
    requestId.current += 1;
    setFormatting(false);
    setRawText("");
    closeReview();
    setNotice(null);
  };

  const noticeClass =
    notice?.tone === "ok"
      ? "text-emerald-300"
      : notice?.tone === "warn"
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <AIFieldAnimationScope active={formatting}>
        <AIFieldAnimation
          action={{
            label: "Format with AI",
            onClick: () => void formatWithAI(),
            disabled: formatting || !rawText.trim(),
          }}
        >
          <LiquidTextarea
            label="Paste customer details"
            aria-describedby="quick-paste-help"
            value={rawText}
            maxLength={QUICK_DRAFT_MAX_CHARS}
            disabled={formatting}
            placeholder={PLACEHOLDER}
            rows={4}
            className="min-h-[6.5rem] text-sm"
            onPaste={(event) => {
              // First paste into an empty box fills empty fields straight away.
              if (rawText.trim()) return;
              const pasted = event.clipboardData.getData("text");
              if (pasted.trim()) quickFill(pasted, true);
            }}
            onChange={(event) => {
              setRawText(event.target.value);
              closeReview();
            }}
          />
        </AIFieldAnimation>
      </AIFieldAnimationScope>
      <p id="quick-paste-help" className="-mt-1 text-xs text-white/50">
        Any order works. Write products as "name qty price" (no qty = 1). Quick
        fill reads contact details offline; Format with AI also matches products
        to the catalog.
      </p>

      <div className="inv-paste-actions">
        <LiquidButton
          type="button"
          variant="primary"
          onClick={() => void formatWithAI()}
          disabled={formatting || !rawText.trim()}
        >
          {formatting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {formatting ? "Reading…" : "Format with AI"}
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="soft"
          onClick={() => quickFill(rawText, false)}
          disabled={formatting || !rawText.trim()}
        >
          <Wand2 className="h-4 w-4" />
          Quick fill
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="ghost"
          onClick={reset}
          disabled={!rawText && !draft && !notice}
          aria-label="Clear pasted text"
          title="Clear pasted text"
          className="px-3"
        >
          <Eraser className="h-4 w-4" />
        </LiquidButton>
      </div>

      {notice && (
        <p
          key={notice.text}
          role={notice.tone === "error" ? "alert" : "status"}
          className={`inv-animate text-sm ${noticeClass}`}
        >
          {notice.text}
        </p>
      )}

      {draft && (
        <div className="inv-animate rounded-2xl border border-violet-400/25 bg-violet-500/[0.07] p-4">
          <p className="text-sm font-black text-white">
            Review before applying
          </p>
          <dl className="inv-fields mt-3 text-sm">
            {(
              [
                ["Name", draft.customer.name],
                ["Phone", draft.customer.phone],
                ["Email", draft.customer.email],
                ["Address", draft.customer.address],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className={label === "Address" ? "inv-span" : ""}
              >
                <dt className="text-xs text-white/50">{label}</dt>
                <dd
                  className={`break-words ${value ? "text-white" : "text-white/40"}`}
                >
                  {value || "Not found — current value stays"}
                </dd>
              </div>
            ))}
          </dl>

          {lines.length > 0 && (
            <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
              {lines.map((line) => (
                <QuickLine
                  key={line.line}
                  line={line}
                  problems={problems
                    .filter((problem) => problem.line === line.line)
                    .map((problem) => problem.message)}
                  onChange={(patch) => updateLine(line.line, patch)}
                />
              ))}
              <li className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-white/60">Total (incl. GST)</span>
                <span className="font-black tabular-nums text-white">
                  {formatINR(total)}
                </span>
              </li>
            </ul>
          )}

          {draft.notes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-300">
              {draft.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          )}

          {problems.some((problem) => !problem.line) && (
            <ul
              role="alert"
              className="mt-3 list-disc space-y-1 pl-5 text-xs text-rose-300"
            >
              {problems
                .filter((problem) => !problem.line)
                .map((problem) => (
                  <li key={problem.message}>{problem.message}</li>
                ))}
            </ul>
          )}

          {confirming ? (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <p className="text-sm text-white">
                Create the invoice for{" "}
                <strong className="tabular-nums">{formatINR(total)}</strong> and
                send it on WhatsApp to{" "}
                <strong className="tabular-nums">{nextCustomer.phone}</strong>?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <LiquidButton
                  type="button"
                  variant="primary"
                  onClick={createAndSend}
                  className="flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4" />
                  Create &amp; send
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="soft"
                  onClick={() => setConfirming(false)}
                >
                  Back
                </LiquidButton>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <LiquidButton
                type="button"
                variant="primary"
                onClick={() => {
                  if (problems.length) buzz();
                  else setConfirming(true);
                }}
                aria-disabled={problems.length > 0}
                className={`flex-1 sm:flex-none ${problems.length ? "opacity-60" : ""}`}
                title={
                  problems.length
                    ? "Fix the items marked in red first"
                    : "Create the invoice and send it on WhatsApp"
                }
              >
                <Send className="h-4 w-4" />
                Create &amp; send
              </LiquidButton>
              <LiquidButton type="button" variant="soft" onClick={apply}>
                <Check className="h-4 w-4" />
                Apply only
              </LiquidButton>
              <LiquidButton type="button" variant="ghost" onClick={closeReview}>
                <X className="h-4 w-4" />
                Dismiss
              </LiquidButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickLine({
  line,
  problems,
  onChange,
}: {
  line: QuickReviewLine;
  problems: string[];
  onChange: (patch: Partial<QuickReviewLine>) => void;
}) {
  const product = chosenProduct(line);
  const value = lineValue(line);
  const warnings = lineWarnings(line);
  const badge = product ? CONFIDENCE_LABEL[line.confidence] : "Custom item";
  const priceMissing = !line.price.trim();

  return (
    <li className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words font-bold text-white">
          {product ? product.name : line.rawName}
          {badge && (
            <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
              {badge}
            </span>
          )}
          <span className="block text-xs font-normal text-white/50">
            You wrote "{line.rawName}"
            {product
              ? ` · catalog ${formatINR(product.catalogPrice)} · stock ${product.stock ?? "none"}`
              : ""}
          </span>
        </span>
        <span className="font-bold tabular-nums text-white">
          {value === null ? "—" : formatINR(value)}
        </span>
      </div>

      {line.options.length > 0 && (
        <LiquidDropdown
          label="Product"
          value={line.choice}
          options={[
            ...line.options.map((option) => ({
              label: `${option.name} · ${formatINR(option.catalogPrice)}`,
              value: option.productId,
            })),
            { label: `Custom item: ${line.rawName}`, value: "" },
          ]}
          onChange={(choice) => onChange({ choice })}
        />
      )}

      <div
        className="grid grid-cols-2 gap-2"
        // Enter here must not submit the invoice form before the draft is applied.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      >
        <LiquidInput
          label={line.quantityAssumed ? "Qty (not given → 1)" : "Qty"}
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          value={String(line.quantity)}
          onChange={(event) =>
            onChange({
              quantity: Math.trunc(Number(event.target.value)) || 0,
              quantityAssumed: false,
            })
          }
        />
        <LiquidInput
          label={priceMissing ? "Unit price — not sent" : "Unit price"}
          inputMode="decimal"
          placeholder="Type the price"
          aria-invalid={priceMissing}
          className={priceMissing ? "ring-2 ring-rose-400/70" : ""}
          value={line.price}
          onChange={(event) =>
            onChange({ price: event.target.value.replace(/[^\d.]/g, "") })
          }
        />
      </div>

      {problems.map((message) => (
        <p
          key={message}
          role="alert"
          className="flex items-start gap-1 text-xs text-rose-300"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          {message}
        </p>
      ))}
      {warnings.map((message) => (
        <p key={message} className="text-xs text-amber-300">
          {message}
        </p>
      ))}
    </li>
  );
}
