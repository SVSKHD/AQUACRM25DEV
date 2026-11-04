import React from "react";
import { Check, Eraser, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { parseInvoiceBlock } from "../../../utils/parseInvoiceBlock";
import { usePersistentFormDraft } from "../../../hooks/usePersistentFormDraft";
import {
  formatInvoicePaste,
  type InvoicePasteDraft,
} from "../../../services/invoiceAI";
import { AI_PROMPT_MAX_CHARS } from "../../../services/aiService";
import AIFieldAnimation, {
  AIFieldAnimationScope,
} from "../../ai/AIFieldAnimation";
import { LiquidButton, LiquidTextarea } from "../../ui/liquid";
import {
  findCatalogProduct,
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
Flat 12, Janapriya Utopia, Miyapur 500049`;

const FIELD_LABELS: Record<string, string> = {
  customer_name: "name",
  customer_phone: "phone",
  customer_email: "email",
  customer_address: "address",
};

/** Paste → fill. Local parsing is instant; AI handles messy text and products. */
export default function QuickInvoiceTab<F extends FormDataLike>({
  formData,
  setFormData,
  availableProducts,
  onBusyChange,
}: QuickInvoiceTabProps<F>) {
  const [rawText, setRawText] = React.useState("");
  const [formatting, setFormatting] = React.useState(false);
  const [aiDraft, setAIDraft] = React.useState<InvoicePasteDraft | null>(null);
  const [notice, setNotice] = React.useState<Notice>(null);
  const requestId = React.useRef(0);
  const draftSnapshot = React.useRef("");

  const quickDraft = usePersistentFormDraft({
    key: "invoice:quick-entry",
    value: { rawText },
    onRestore: (draft) => setRawText(draft.rawText || ""),
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

  const formatWithAI = async () => {
    if (formatting || !rawText.trim()) return;
    const id = ++requestId.current;
    draftSnapshot.current = snapshot;
    setFormatting(true);
    setNotice(null);
    setAIDraft(null);
    try {
      const draft = await formatInvoicePaste(rawText);
      if (id === requestId.current) setAIDraft(draft);
    } catch (err) {
      if (id === requestId.current)
        setNotice({
          tone: "error",
          text:
            err instanceof Error
              ? err.message
              : "Could not format the pasted text.",
        });
    } finally {
      if (id === requestId.current) setFormatting(false);
    }
  };

  // AI returns UNIT prices; an invoice line stores the LINE value (PR #89).
  const draftLines = (draft: InvoicePasteDraft): InvoiceLine[] =>
    draft.products.map((item) => {
      const catalog = findCatalogProduct(availableProducts, item.productName);
      const id = catalog ? String(catalog.id) : "";
      return {
        productName: catalog?.name || item.productName,
        productQuantity: item.productQuantity,
        productPrice:
          Math.round(item.productPrice * item.productQuantity * 100) / 100,
        productSerialNo: item.productSerialNo,
        productId: /^[a-f\d]{24}$/i.test(id) ? id : "",
        productSlug: catalog?.slug || "",
        productLink: catalog?.link || "",
      };
    });

  const applyAIDraft = () => {
    if (!aiDraft) return;
    if (snapshot !== draftSnapshot.current) {
      setNotice({
        tone: "error",
        text: "The invoice changed after formatting. Format again so your edits aren't overwritten.",
      });
      setAIDraft(null);
      return;
    }
    const lines = draftLines(aiDraft);
    setFormData((prev) => ({
      ...prev,
      customer_name: aiDraft.name || prev.customer_name,
      customer_phone: aiDraft.phone
        ? Number(aiDraft.phone)
        : prev.customer_phone,
      customer_email: aiDraft.email || prev.customer_email,
      customer_address: aiDraft.address
        ? tidyAddress(aiDraft.address)
        : prev.customer_address,
      products: [...prev.products, ...lines],
    }));
    setAIDraft(null);
    setNotice({
      tone: "ok",
      text: lines.length
        ? `Applied. ${lines.length} product line${lines.length > 1 ? "s" : ""} added. Review before saving.`
        : "Applied. Review the fields before saving.",
    });
  };

  const reset = () => {
    void quickDraft.clearDraft();
    requestId.current += 1;
    setFormatting(false);
    setRawText("");
    setAIDraft(null);
    setNotice(null);
  };

  const noticeClass =
    notice?.tone === "ok"
      ? "text-emerald-300"
      : notice?.tone === "warn"
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <div className="flex flex-col gap-3">
      <AIFieldAnimationScope active={formatting}>
        <AIFieldAnimation>
          <LiquidTextarea
            label="Paste customer details"
            aria-describedby="quick-paste-help"
            value={rawText}
            maxLength={AI_PROMPT_MAX_CHARS}
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
              setAIDraft(null);
            }}
          />
        </AIFieldAnimation>
      </AIFieldAnimationScope>
      <p id="quick-paste-help" className="-mt-1 text-xs text-white/50">
        Any order works. Quick fill reads contact details offline; Format with
        AI also finds products.
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
          {formatting ? "Formatting…" : "Format with AI"}
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
          disabled={!rawText && !aiDraft && !notice}
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

      {aiDraft && (
        <div className="inv-animate rounded-2xl border border-violet-400/25 bg-violet-500/[0.07] p-4">
          <p className="text-sm font-black text-white">
            Review before applying
          </p>
          <dl className="inv-fields mt-3 text-sm">
            {(
              [
                ["Name", aiDraft.name],
                ["Phone", aiDraft.phone],
                ["Email", aiDraft.email],
                ["Address", aiDraft.address],
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

          {aiDraft.products.length > 0 && (
            <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
              {draftLines(aiDraft).map((line, index) => (
                <li
                  key={index}
                  className="flex items-baseline justify-between gap-3 px-3 py-2"
                >
                  <span className="min-w-0 break-words text-white">
                    {line.productName}
                    <span className="block text-xs text-white/50">
                      {aiDraft.products[index].productQuantity} ×{" "}
                      {formatINR(aiDraft.products[index].productPrice)}
                      {line.productSerialNo
                        ? ` · SN ${line.productSerialNo}`
                        : ""}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums text-white">
                    {formatINR(line.productPrice)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {aiDraft.warnings.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-300">
              {aiDraft.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <LiquidButton
              type="button"
              variant="primary"
              onClick={applyAIDraft}
              className="flex-1 sm:flex-none"
            >
              <Check className="h-4 w-4" />
              Apply
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="soft"
              onClick={() => setAIDraft(null)}
            >
              <X className="h-4 w-4" />
              Dismiss
            </LiquidButton>
          </div>
        </div>
      )}
    </div>
  );
}
