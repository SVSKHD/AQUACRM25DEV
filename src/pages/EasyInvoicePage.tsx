import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Eraser,
  ExternalLink,
  History,
  Loader2,
  Lock,
  Mic,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useToast } from "../components/Toast";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidFileButton,
  LiquidIconButton,
  LiquidInput,
  LiquidTextarea,
} from "../components/ui/liquid";
import { formatINR } from "../components/modular/invoices/invoiceFormat";
import type { DbProduct } from "../components/modular/invoices/invoice.types";
import EasyAttachment, {
  type EasyAttachmentState,
} from "../components/modular/invoices/EasyAttachment";
import EasyDraftsDrawer from "../components/modular/invoices/EasyDraftsDrawer";
import { usePersistentFormDraft } from "../hooks/usePersistentFormDraft";
import {
  useEasyDraftsList,
  useSharedEasyDraft,
} from "../hooks/useSharedEasyDraft";
import {
  easyDraftsService,
  type EasyDraft,
} from "../services/easyInvoiceDrafts";
import { editorText, timeAgo } from "../utils/easyDrafts";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { invoicesService, productsService } from "../services/apiService";
import {
  DOCUMENT_ACCEPT,
  QUICK_DRAFT_MAX_CHARS,
  readInvoiceDocument,
  requestQuickDraft,
  type DocumentReading,
} from "../services/invoiceAI";
import {
  docFromText,
  easyProblems,
  emptyEasyDoc,
  findEasyGst,
  productLines,
  mobileOrEmpty,
  mergeQuickDraft,
  newEasyLine,
  toInvoiceForm,
  typedPhone,
  type EasyCustomerField,
  type EasyDoc,
  type EasyPaidStatus,
  type EasyPaymentType,
} from "../utils/easyInvoice";
import {
  buildInvoicePayload,
  invoiceTotal,
  normalizeCatalogProducts,
} from "../utils/invoicePayload";
import {
  chosenProduct,
  lineValue,
  lineWarnings,
  reviewTotal,
  type QuickReviewLine,
} from "../utils/quickInvoice";
import {
  getAdminInvoicePath,
  resolvePersistedInvoiceId,
} from "../utils/invoiceViews";
import "../styles/easyInvoice.css";

type Notice = { tone: "ok" | "warn" | "error"; text: string } | null;
/** What a shared draft stores: the page state. */
type EasyContent = {
  rawText: string;
  doc: EasyDoc | null;
  view: "write" | "doc";
};
type Saved = { id: string; message: string; tone: "ok" | "warn" };
type CreateReply = {
  whatsappDelivery?: {
    sent?: boolean;
    duplicate?: boolean;
    attempted?: boolean;
    channel?: string;
    message?: string;
  };
};

const PLACEHOLDER = `Paste anything here: a WhatsApp message, a contact block, a GSTIN…

Ravi Kumar, 98765 43210
Flat 12, Janapriya Utopia, Miyapur 500049
bathroom softener 14950
pressure pump 2 8500

It turns into an invoice you can edit as soon as you paste.`;

const PAID_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partly paid" },
  { value: "paid", label: "Paid" },
];
const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
];
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

/**
 * /invoice/easy — one big box. Paste (or type, speak, or add a photo) and it
 * becomes an invoice document you edit in place, then Create & send.
 * Same backend as Quick mode: local parse first, AI reads products.
 */
export default function EasyInvoicePage() {
  const { showToast } = useToast();
  const [rawText, setRawText] = React.useState("");
  const [doc, setDoc] = React.useState<EasyDoc | null>(null);
  const [view, setView] = React.useState<"write" | "doc">("write");
  const [docEdited, setDocEdited] = React.useState(false);
  const [formatting, setFormatting] = React.useState(false);
  const [reading, setReading] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);
  const [catalog, setCatalog] = React.useState<DbProduct[]>([]);
  const [catalogState, setCatalogState] = React.useState<
    "loading" | "ready" | "failed"
  >("loading");
  // Product lines of the text being read, shown while AI matches them.
  const [pending, setPending] = React.useState<string[]>([]);
  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<Saved | null>(null);
  // The photo / PDF being read. Dropped as soon as its text is in.
  const [attachment, setAttachment] =
    React.useState<EasyAttachmentState | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  // Kept only for "Try again" after a failed read; cleared otherwise.
  const fileRef = React.useRef<File | null>(null);
  const previewRef = React.useRef("");
  const doneTimer = React.useRef<number | undefined>(undefined);
  const requestId = React.useRef(0);
  // Latest text, readable right after a state update (voice / file callbacks).
  const textRef = React.useRef("");
  const uploadId = React.useId();
  const editorId = `${uploadId}-editor`;

  const [searchParams, setSearchParams] = useSearchParams();
  const urlDraftId = searchParams.get("draft") || "";
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // The page makes room for the docked drafts drawer on wide screens.
  const [drawerWidth, setDrawerWidth] = React.useState(460);
  /** Below this width the drawer covers the page, so it closes after a pick. */
  const drawerCovers = () => window.innerWidth < 1024;
  const [draftBusyId, setDraftBusyId] = React.useState("");
  const [confirmTakeover, setConfirmTakeover] = React.useState(false);
  const [, setClock] = React.useState(0);

  const notify = React.useCallback(
    (text: string, tone: "info" | "error" | "success") => showToast(text, tone),
    [showToast],
  );

  const content = React.useMemo<EasyContent>(
    () => ({ rawText, doc, view }),
    [rawText, doc, view],
  );

  /** Content from the server (opening a draft, or following another editor). */
  const applyContent = React.useCallback((next: EasyContent) => {
    requestId.current += 1;
    textRef.current = next.rawText || "";
    setRawText(next.rawText || "");
    setDoc(next.doc || null);
    setView(next.view === "doc" && next.doc ? "doc" : "write");
    setFormatting(false);
    setReading(false);
    setConfirming(false);
    setNotice(null);
    setSaved(null);
  }, []);

  const shared = useSharedEasyDraft<EasyContent>({
    content,
    hasContent: !saved && Boolean(rawText.trim() || doc),
    apply: applyContent,
    notify,
    onDraftChange: (id) =>
      setSearchParams(id ? { draft: id } : {}, { replace: true }),
  });
  const readOnly = shared.mode === "viewing";
  const draftsList = useEasyDraftsList(shared.draftId, notify);
  const otherDrafts = draftsList.drafts.filter(
    (entry) => entry.id !== shared.draftId,
  );
  const editingNow = otherDrafts.filter((entry) => entry.lock.live).length;

  // Backup on this device too (offline, or a crash before the next save).
  const draft = usePersistentFormDraft({
    key: "invoice:easy",
    value: { rawText, doc, view, draftId: shared.draftId },
    enabled: !saved && !readOnly,
    onRestore: (value) => {
      if (urlDraftId) return; // the link's draft wins
      if (value.draftId) {
        setSearchParams({ draft: value.draftId }, { replace: true });
        return;
      }
      textRef.current = value.rawText || "";
      setRawText(value.rawText || "");
      if (value.doc) {
        setDoc({ ...emptyEasyDoc(), ...value.doc });
        setView(value.view === "doc" ? "doc" : "write");
      }
    },
  });

  // ?draft=<id> (a link, a restored backup, or Continue) opens that draft.
  const openFromUrl = shared.open;
  const openingNow = shared.opening;
  const currentDraftId = shared.draftId;
  React.useEffect(() => {
    if (!urlDraftId || urlDraftId === currentDraftId || openingNow) return;
    void openFromUrl(urlDraftId).then((ok) => {
      if (!ok) setSearchParams({}, { replace: true });
    });
  }, [urlDraftId, currentDraftId, openingNow, openFromUrl, setSearchParams]);

  // Refresh the "2 min ago" labels.
  React.useEffect(() => {
    const timer = window.setInterval(
      () => setClock((tick) => tick + 1),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const openDraft = async (entry: EasyDraft) => {
    if (drawerCovers()) setDrawerOpen(false);
    setDraftBusyId(entry.id);
    setConfirmTakeover(false);
    await shared.open(entry.id);
    setDraftBusyId("");
    void draftsList.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const discardDraft = async (entry: EasyDraft) => {
    setDraftBusyId(entry.id);
    const { error } = await easyDraftsService.discard(entry.id);
    setDraftBusyId("");
    if (error) notify(error, "error");
    else notify(`Discarded “${entry.title}”.`, "info");
    void draftsList.refresh();
  };

  const takeOver = async () => {
    setConfirmTakeover(false);
    await shared.takeOver();
    void draftsList.refresh();
  };

  React.useEffect(() => {
    let alive = true;
    void productsService.getAll().then(({ data, error }) => {
      if (!alive) return;
      if (!error && data) {
        setCatalog(normalizeCatalogProducts(data));
        setCatalogState("ready");
      } else {
        setCatalogState("failed");
      }
    });
    return () => {
      alive = false;
      // Drop late AI replies after leaving the page.
      requestId.current += 1;
    };
  }, []);

  const busy = formatting || reading || readOnly;

  const setText = (next: string) => {
    textRef.current = next;
    setRawText(next);
  };

  /** Text → document: contact details instantly, products when AI answers. */
  const format = async (source = textRef.current, hint?: DocumentReading) => {
    const text = source.trim();
    if (!text || readOnly) return;
    const id = ++requestId.current;
    setDoc(docFromText(text, hint));
    setDocEdited(false);
    setConfirming(false);
    setView("doc");
    setNotice(null);
    setPending(productLines(text));
    setFormatting(true);
    const { data, error } = await requestQuickDraft(text);
    if (id !== requestId.current) return;
    setFormatting(false);
    if (error || !data) {
      setNotice({
        tone: "error",
        text: `${error || "Could not read the products."} Contact details were filled offline; add the items by hand.`,
      });
      return;
    }
    setDoc((current) => mergeQuickDraft(current || emptyEasyDoc(), data));
    const missing = data.items.filter((item) => item.unitPrice === null);
    if (missing.length) {
      // The price always comes from staff, never the catalog: alert loudly.
      buzz();
      showToast(
        `Price not sent for ${missing.map((item) => `"${item.rawName}"`).join(", ")}. Type it before creating.`,
        "error",
      );
    }
  };

  /** Frees the preview and the file; nothing about it is kept. */
  const dropFile = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    fileRef.current = null;
    window.clearTimeout(doneTimer.current);
  };

  /** Discard button: stops a read in progress, or closes the card. */
  const discardAttachment = () => {
    if (attachment?.stage === "reading") {
      requestId.current += 1;
      setReading(false);
    }
    dropFile();
    setAttachment(null);
  };

  // Free the preview if the page closes mid-read.
  React.useEffect(() => dropFile, []);

  /**
   * Photo / PDF → text in the box → formatted invoice. The file lives only
   * in this tab while it is read; the server reads it in memory and keeps
   * nothing. Once the text is in, the file is discarded.
   */
  const readFile = async (file: File) => {
    if (busy) return;
    dropFile();
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const previewable = !isPdf && /^image\/(jpeg|png|webp)$/.test(file.type);
    previewRef.current = previewable ? URL.createObjectURL(file) : "";
    fileRef.current = file;
    const key = Date.now();
    setAttachment({
      key,
      name: file.name || (isPdf ? "document.pdf" : "photo"),
      size: file.size,
      isPdf,
      previewUrl: previewRef.current,
      stage: "reading",
    });
    const id = ++requestId.current;
    setReading(true);
    setNotice(null);
    const { data, error } = await readInvoiceDocument(file);
    if (id !== requestId.current) return; // discarded while reading
    setReading(false);
    if (error || !data) {
      setAttachment((current) =>
        current?.key === key
          ? {
              ...current,
              stage: "error",
              error: error || "Could not read the file.",
            }
          : current,
      );
      return;
    }
    // Read: the file itself is no longer needed.
    dropFile();
    setAttachment((current) =>
      current?.key === key
        ? { ...current, previewUrl: "", stage: "formatting" }
        : current,
    );
    if (data.warnings.length) showToast(data.warnings.join(" "), "info");
    const next = [textRef.current.trim(), data.text]
      .filter(Boolean)
      .join("\n")
      .slice(0, QUICK_DRAFT_MAX_CHARS);
    setText(next);
    if (next.trim()) {
      await format(next, data);
    } else {
      // Only a GSTIN was readable: start a document with it.
      const gst = findEasyGst("", data);
      if (gst) {
        setDoc({ ...emptyEasyDoc(), gst });
        setView("doc");
      }
    }
    setAttachment((current) =>
      current?.key === key ? { ...current, stage: "done" } : current,
    );
    doneTimer.current = window.setTimeout(
      () => setAttachment((current) => (current?.key === key ? null : current)),
      6000,
    );
  };

  const retryFile = () => {
    const file = fileRef.current;
    if (file) void readFile(file);
    else setAttachment(null);
  };

  /** Photos, screenshots and PDFs the reader takes (HEIC may have no type). */
  const readableFile = (files: FileList | File[] | null | undefined) =>
    Array.from(files || []).find(
      (file) =>
        DOCUMENT_ACCEPT.split(",").includes(file.type) ||
        /\.(heic|heif|pdf)$/i.test(file.name),
    ) || null;

  const speech = useSpeechInput({
    onFinal: (phrase) => {
      const current = textRef.current.trimEnd();
      setText(
        (current ? `${current}\n${phrase}` : phrase).slice(
          0,
          QUICK_DRAFT_MAX_CHARS,
        ),
      );
      setView("write");
    },
    // Stopping the mic formats what was said straight away.
    onStop: (heard) => {
      if (heard) void format();
    },
  });

  /** Every paste formats at once, whatever was already in the box. */
  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // A pasted screenshot or copied file is read like Photo / PDF.
    const file = readableFile(event.clipboardData.files);
    if (file) {
      event.preventDefault();
      void readFile(file);
      return;
    }
    const pasted = event.clipboardData.getData("text");
    if (!pasted.trim()) return;
    event.preventDefault();
    const box = event.currentTarget;
    const next = (
      rawText.slice(0, box.selectionStart) +
      pasted +
      rawText.slice(box.selectionEnd)
    ).slice(0, QUICK_DRAFT_MAX_CHARS);
    setText(next);
    void format(next);
  };

  /* ---------- document edits ---------- */

  const edit = (update: (current: EasyDoc) => EasyDoc) => {
    if (readOnly) return;
    setDocEdited(true);
    setConfirming(false);
    setDoc((current) => (current ? update(current) : current));
  };

  const setCustomer = (field: EasyCustomerField, value: string) =>
    edit((current) => ({
      ...current,
      customer: { ...current.customer, [field]: value },
      touched: current.touched.includes(field)
        ? current.touched
        : [...current.touched, field],
    }));

  const updateLine = (line: number, patch: Partial<QuickReviewLine>) =>
    edit((current) => ({
      ...current,
      lines: current.lines.map((entry) =>
        entry.line === line ? { ...entry, ...patch } : entry,
      ),
    }));

  const removeLine = (line: number) =>
    edit((current) => ({
      ...current,
      lines: current.lines.filter((entry) => entry.line !== line),
    }));

  const addLine = () =>
    edit((current) => ({
      ...current,
      lines: [...current.lines, newEasyLine(current.lines)],
    }));

  const reset = async () => {
    // A saved draft is kept for later; unsaved text is simply cleared.
    if (shared.draftId) await shared.releaseCurrent();
    else shared.forget();
    void draft.clearDraft();
    void draftsList.refresh();
    setConfirmTakeover(false);
    requestId.current += 1;
    speech.stop();
    dropFile();
    setAttachment(null);
    setFormatting(false);
    setReading(false);
    setText("");
    setDoc(null);
    setDocEdited(false);
    setConfirming(false);
    setNotice(null);
    setSaved(null);
    setView("write");
    requestAnimationFrame(() => document.getElementById(editorId)?.focus());
  };

  const problems = doc ? easyProblems(doc) : [];
  const total = doc ? reviewTotal(doc.lines) : 0;

  const createAndSend = async () => {
    if (!doc || saving) return;
    if (problems.length || formatting) {
      buzz();
      setConfirming(false);
      return;
    }
    setSaving(true);
    const form = toInvoiceForm(doc, catalog);
    const { data, error } = await invoicesService.create(
      buildInvoicePayload(form, invoiceTotal(form.products)),
    );
    setSaving(false);
    setConfirming(false);
    if (error) {
      const message =
        typeof error === "string" ? error : "Could not create the invoice.";
      setNotice({ tone: "error", text: message });
      showToast(message, "error");
      return;
    }
    const reply = (data ?? {}) as { data?: unknown };
    const created = (reply.data ?? reply) as CreateReply;
    const id = resolvePersistedInvoiceId(created);
    if (!id) {
      const message =
        "The server didn't return the new invoice. Check the invoices list before trying again, so it isn't created twice.";
      setNotice({ tone: "error", text: message });
      showToast(message, "error");
      return;
    }
    const delivery = created.whatsappDelivery;
    const phone = form.customer_phone;
    let result: Saved;
    if (delivery?.sent || delivery?.duplicate) {
      result = {
        id,
        tone: "ok",
        message:
          delivery?.channel === "sms"
            ? `Invoice created. WhatsApp failed, so an SMS was sent to ${phone}.`
            : `Invoice created and sent on WhatsApp to ${phone}.`,
      };
    } else if (delivery?.attempted) {
      result = {
        id,
        tone: "warn",
        message: delivery.message
          ? `Invoice created. WhatsApp failed: ${delivery.message}`
          : "Invoice created, but WhatsApp delivery failed.",
      };
    } else {
      result = { id, tone: "ok", message: "Invoice created." };
    }
    showToast(result.message, result.tone === "ok" ? "success" : "error");
    await shared.complete(id);
    void draft.clearDraft();
    void draftsList.refresh();
    setSaved(result);
  };

  /* ---------- render ---------- */

  const toolbar = (
    <div className="easy-toolbar" role="toolbar" aria-label="Invoice editor">
      {view === "doc" ? (
        <LiquidButton
          type="button"
          variant="soft"
          onClick={() => setView("write")}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit text
        </LiquidButton>
      ) : (
        <LiquidButton
          type="button"
          variant="primary"
          onClick={() => void format()}
          disabled={busy || !rawText.trim()}
          title="Turn the text into an invoice (Ctrl+Enter)"
        >
          {formatting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          Format
        </LiquidButton>
      )}
      <LiquidFileButton
        id={`${uploadId}-document`}
        variant="soft"
        accept={DOCUMENT_ACCEPT}
        disabled={busy || speech.listening}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void readFile(file);
        }}
      >
        {reading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-4 w-4" aria-hidden="true" />
        )}
        {reading ? "Reading…" : "Photo / PDF"}
      </LiquidFileButton>
      {speech.supported && (
        <LiquidButton
          type="button"
          variant={speech.listening ? "danger" : "soft"}
          onClick={speech.listening ? speech.stop : speech.start}
          disabled={busy}
          aria-pressed={speech.listening}
        >
          {speech.listening ? (
            <Square className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
          {speech.listening ? "Stop" : "Speak"}
        </LiquidButton>
      )}
      <span className="easy-toolbar-spacer" />
      <LiquidButton
        type="button"
        variant="ghost"
        onClick={() => void reset()}
        disabled={!rawText && !doc && !notice && !shared.draftId}
        title={
          shared.draftId
            ? "Start a new invoice. This one stays in Drafts left off."
            : "Start over"
        }
      >
        {shared.draftId ? (
          <Plus className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eraser className="h-4 w-4" aria-hidden="true" />
        )}
        {shared.draftId ? "New" : "Clear"}
      </LiquidButton>
    </div>
  );

  return (
    <div
      className={`easy-page${drawerOpen ? " easy-docked" : ""}`}
      style={
        drawerOpen
          ? ({ "--easy-dock": `${drawerWidth}px` } as React.CSSProperties)
          : undefined
      }
    >
      <header className="easy-header">
        <Link to="/dashboard" className="easy-back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        <div>
          <h1 className="easy-title">Easy invoice</h1>
          <p className="easy-subtitle">
            Paste the details. They turn into an invoice you can edit right
            here.
          </p>
        </div>
      </header>

      <main
        className={`easy-main ${dragOver ? "easy-drop" : ""}`}
        onDragOver={(event) => {
          if (busy || saved) return;
          if (Array.from(event.dataTransfer.types).includes("Files")) {
            event.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragOver(false);
        }}
        onDrop={(event) => {
          setDragOver(false);
          const file = readableFile(event.dataTransfer.files);
          if (!file) return;
          event.preventDefault();
          void readFile(file);
        }}
      >
        {dragOver && (
          <p className="easy-drop-hint" aria-hidden="true">
            Drop the photo or PDF to read it
          </p>
        )}
        {saved ? (
          <section className="easy-paper easy-done" aria-live="polite">
            <CheckCircle2
              className={`h-10 w-10 ${saved.tone === "ok" ? "easy-good" : "easy-warn"}`}
              aria-hidden="true"
            />
            <p className="easy-done-text">{saved.message}</p>
            <div className="easy-actions">
              <Link
                to={getAdminInvoicePath(saved.id)}
                className="liquid-button liquid-button-primary easy-link-button"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open invoice
              </Link>
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => void reset()}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New invoice
              </LiquidButton>
            </div>
          </section>
        ) : (
          <>
            <section
              className="easy-drafts-strip"
              aria-labelledby="easy-drafts-title"
            >
              <History className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 id="easy-drafts-title" className="easy-drafts-title">
                  Drafts left off
                  {otherDrafts.length > 0 && (
                    <span className="easy-count">{otherDrafts.length}</span>
                  )}
                  {editingNow > 0 && (
                    <span className="easy-live easy-live-other">
                      <span className="easy-live-dot" aria-hidden="true" />
                      {editingNow} editing now
                    </span>
                  )}
                </h2>
                <p className="easy-small easy-muted easy-strip-latest">
                  {draftsList.error
                    ? draftsList.error
                    : otherDrafts[0]
                      ? `Latest: ${otherDrafts[0].title} · ${otherDrafts[0].updatedBy.name || otherDrafts[0].createdBy.name} · ${timeAgo(otherDrafts[0].updatedAt)}`
                      : draftsList.loading
                        ? "Loading drafts…"
                        : "Nothing left off. Work here is saved as a draft automatically."}
                </p>
              </div>
              <LiquidButton
                type="button"
                variant={
                  drawerOpen ? "soft" : otherDrafts.length ? "primary" : "soft"
                }
                onClick={() => setDrawerOpen((open) => !open)}
                aria-expanded={drawerOpen}
              >
                {drawerOpen ? "Hide drafts" : "Open drafts"}
              </LiquidButton>
            </section>

            {toolbar}

            {attachment && (
              <EasyAttachment
                attachment={attachment}
                onDiscard={discardAttachment}
                onRetry={retryFile}
              />
            )}

            {shared.opening && (
              <p
                className="easy-note easy-info easy-loading-inline"
                role="status"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Opening the draft…
              </p>
            )}

            {readOnly ? (
              <div className="easy-lockbar" role="status" aria-live="polite">
                <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="easy-strong">
                    {shared.takenOver
                      ? `${shared.takenOver.name || "Someone"} took over this draft`
                      : shared.editor
                        ? editorText(shared.editor)
                        : "Nobody is editing this draft now"}
                  </p>
                  <p className="easy-small easy-muted">
                    {shared.editor
                      ? `Read-only here · updates live · active ${timeAgo(shared.editor.heartbeatAt)}`
                      : "Read-only until you continue editing."}
                    {shared.takenOver &&
                      ` · on ${shared.takenOver.deviceLabel}. Your changes up to then are saved.`}
                  </p>
                </div>
                {confirmTakeover ? (
                  <div className="easy-actions easy-actions-tight">
                    <LiquidButton
                      type="button"
                      variant="primary"
                      onClick={() => void takeOver()}
                    >
                      Yes, take over
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      variant="soft"
                      onClick={() => setConfirmTakeover(false)}
                    >
                      Cancel
                    </LiquidButton>
                  </div>
                ) : (
                  <LiquidButton
                    type="button"
                    variant="primary"
                    onClick={() =>
                      shared.editor ? setConfirmTakeover(true) : void takeOver()
                    }
                    title={
                      shared.editor
                        ? `${shared.editor.name || "They"} will see the draft become read-only on their device`
                        : undefined
                    }
                  >
                    {shared.editor ? "Take over" : "Continue editing"}
                  </LiquidButton>
                )}
              </div>
            ) : shared.draftId || shared.mode === "offline" ? (
              <p className="easy-savebar" aria-live="polite">
                {shared.mode === "offline" ? (
                  <span className="easy-warn">
                    Not synced: saved on this device only. It syncs when the
                    server is back.
                  </span>
                ) : shared.saveState === "saving" ? (
                  <span className="easy-loading-inline">
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Saving…
                  </span>
                ) : (
                  <span>
                    Saved {timeAgo(shared.savedAt)} · editing on this device ·
                    staff see it in Drafts left off
                  </span>
                )}
              </p>
            ) : null}

            {(speech.listening || speech.error) && (
              <p
                role={speech.error ? "alert" : "status"}
                className={`easy-note ${speech.error ? "easy-bad" : "easy-info"}`}
              >
                {speech.error ||
                  (speech.interim
                    ? `Hearing: "${speech.interim}"`
                    : 'Listening… e.g. "Ravi, 98765 43210, Kondapur 500084, bathroom softener 14950". Tap Stop when done.')}
              </p>
            )}

            {notice && (
              <p
                role={notice.tone === "error" ? "alert" : "status"}
                className={`easy-note ${notice.tone === "error" ? "easy-bad" : notice.tone === "warn" ? "easy-warn" : "easy-good"}`}
              >
                {notice.text}
              </p>
            )}

            {view === "write" || !doc ? (
              <section className="easy-paper easy-write">
                {doc && docEdited && (
                  <p className="easy-note easy-warn">
                    Formatting again replaces the edits you made in the invoice.{" "}
                    <LiquidButton
                      type="button"
                      variant="ghost"
                      className="easy-inline-link"
                      onClick={() => setView("doc")}
                    >
                      Back to the invoice
                    </LiquidButton>
                  </p>
                )}
                <LiquidTextarea
                  id={editorId}
                  aria-label="Invoice details"
                  className="easy-editor"
                  value={rawText}
                  maxLength={QUICK_DRAFT_MAX_CHARS}
                  placeholder={PLACEHOLDER}
                  disabled={busy || speech.listening}
                  autoFocus
                  onPaste={onPaste}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.ctrlKey || event.metaKey)
                    ) {
                      event.preventDefault();
                      void format();
                    }
                  }}
                />
                <p className="easy-hint">
                  Any order works. Write products as "name qty price" (no qty =
                  1). Pasting formats at once; after typing, press Format or
                  Ctrl+Enter. For a photo or PDF, use Photo / PDF, paste a
                  screenshot, or drop the file here. It is read, then discarded:
                  only the text is kept.
                </p>
              </section>
            ) : (
              <InvoiceDocument
                readOnly={readOnly}
                doc={doc}
                formatting={formatting}
                problems={problems}
                total={total}
                catalogState={catalogState}
                pending={pending}
                setCustomer={setCustomer}
                edit={edit}
                updateLine={updateLine}
                removeLine={removeLine}
                addLine={addLine}
              />
            )}

            {view === "doc" && doc && !readOnly && (
              <footer className="easy-footer">
                {confirming ? (
                  <div className="easy-confirm">
                    <p>
                      Create the invoice for <strong>{formatINR(total)}</strong>{" "}
                      and send it on WhatsApp to{" "}
                      <strong>{doc.customer.phone}</strong>?
                    </p>
                    <div className="easy-actions">
                      <LiquidButton
                        type="button"
                        variant="primary"
                        onClick={() => void createAndSend()}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Send className="h-4 w-4" aria-hidden="true" />
                        )}
                        {saving ? "Creating…" : "Yes, create & send"}
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        variant="soft"
                        onClick={() => setConfirming(false)}
                        disabled={saving}
                      >
                        Back
                      </LiquidButton>
                    </div>
                  </div>
                ) : (
                  <div className="easy-footer-row">
                    <span className="easy-footer-total" aria-live="polite">
                      {formatting ? (
                        <span className="easy-loading-inline">
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Loading products…
                        </span>
                      ) : (
                        <>
                          Total <strong>{formatINR(total)}</strong>
                        </>
                      )}
                    </span>
                    <LiquidButton
                      type="button"
                      variant="primary"
                      aria-disabled={problems.length > 0 || formatting}
                      className={
                        problems.length || formatting ? "opacity-60" : ""
                      }
                      title={
                        formatting
                          ? "Wait for the products to be read"
                          : problems.length
                            ? "Fix the items marked in red first"
                            : "Create the invoice and send it on WhatsApp"
                      }
                      onClick={() => {
                        if (problems.length || formatting) buzz();
                        else setConfirming(true);
                      }}
                    >
                      {formatting ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                      {formatting ? "Please wait…" : "Create & send"}
                    </LiquidButton>
                  </div>
                )}
              </footer>
            )}
          </>
        )}
      </main>

      <EasyDraftsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        drafts={draftsList.drafts}
        loading={draftsList.loading}
        error={draftsList.error}
        activeId={shared.draftId}
        busyId={draftBusyId}
        onOpen={(entry) => void openDraft(entry)}
        onDiscard={(entry) => void discardDraft(entry)}
        onNew={() => {
          if (drawerCovers()) setDrawerOpen(false);
          void reset();
        }}
        onWidthChange={setDrawerWidth}
      />
    </div>
  );
}

/* ---------- the formatted, editable invoice ---------- */

function InvoiceDocument({
  readOnly,
  doc,
  formatting,
  problems,
  total,
  catalogState,
  pending,
  setCustomer,
  edit,
  updateLine,
  removeLine,
  addLine,
}: {
  readOnly: boolean;
  doc: EasyDoc;
  formatting: boolean;
  problems: ReturnType<typeof easyProblems>;
  total: number;
  catalogState: "loading" | "ready" | "failed";
  pending: string[];
  setCustomer: (field: EasyCustomerField, value: string) => void;
  edit: (update: (current: EasyDoc) => EasyDoc) => void;
  updateLine: (line: number, patch: Partial<QuickReviewLine>) => void;
  removeLine: (line: number) => void;
  addLine: () => void;
}) {
  const general = problems.filter((problem) => !problem.line);
  const phoneOk = Boolean(mobileOrEmpty(doc.customer.phone));
  const gst = doc.gst;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      className="easy-paper easy-doc"
      aria-label={
        readOnly ? "Invoice preview, read-only" : "Invoice preview, editable"
      }
    >
      {/* Disables every field and button while someone else edits. */}
      <fieldset disabled={readOnly} className="easy-fieldset">
        <div className="easy-doc-head">
          <div>
            <p className="easy-kicker">Invoice</p>
            <p className="easy-muted">{today} · number given on save</p>
          </div>
          {formatting && (
            <span className="easy-chip easy-info" aria-hidden="true">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading products…
            </span>
          )}
        </div>

        <section className="easy-section" aria-labelledby="easy-bill-to">
          <h2 id="easy-bill-to" className="easy-label">
            Bill to
          </h2>
          <LiquidInput
            aria-label="Customer name"
            className="easy-inline easy-name"
            placeholder="Customer name"
            value={doc.customer.name}
            aria-invalid={!doc.customer.name.trim()}
            onChange={(event) => setCustomer("name", event.target.value)}
          />
          <div className="easy-grid">
            <div>
              <LiquidInput
                aria-label="Phone"
                aria-describedby="easy-phone-help"
                className="easy-inline easy-mono"
                placeholder="10-digit mobile"
                inputMode="numeric"
                autoComplete="tel"
                value={doc.customer.phone}
                aria-invalid={!phoneOk}
                onChange={(event) =>
                  // Digits only, 10 max after a +91 / 0 prefix.
                  setCustomer("phone", typedPhone(event.target.value))
                }
              />
              {!phoneOk && (
                <p id="easy-phone-help" className="easy-small easy-bad px-2">
                  {doc.customer.phone
                    ? `${doc.customer.phone.length}/10 digits. A mobile number has 10 digits and starts with 6, 7, 8 or 9.`
                    : "Type the 10-digit mobile number."}
                </p>
              )}
            </div>
            <LiquidInput
              aria-label="Email"
              className="easy-inline"
              placeholder="Email (optional)"
              inputMode="email"
              value={doc.customer.email}
              onChange={(event) => setCustomer("email", event.target.value)}
            />
          </div>
          <LiquidTextarea
            aria-label="Address"
            className="easy-inline"
            placeholder="Address"
            rows={2}
            value={doc.customer.address}
            onChange={(event) => setCustomer("address", event.target.value)}
          />
        </section>

        <section className="easy-section">
          {gst ? (
            <div className="easy-gst">
              <LiquidCheckbox
                label="GST invoice"
                checked={gst.use}
                onChange={(event) =>
                  edit((current) => ({
                    ...current,
                    gst: current.gst && {
                      ...current.gst,
                      use: event.target.checked,
                    },
                  }))
                }
              />
              {gst.use && (
                <div className="easy-grid">
                  <LiquidInput
                    aria-label="GSTIN"
                    className="easy-inline easy-mono"
                    placeholder="GSTIN"
                    value={gst.gstin}
                    onChange={(event) =>
                      edit((current) => ({
                        ...current,
                        gst: current.gst && {
                          ...current.gst,
                          gstin: event.target.value
                            .toUpperCase()
                            .replace(/\s/g, ""),
                        },
                      }))
                    }
                  />
                  <LiquidInput
                    aria-label="GST business name"
                    className="easy-inline"
                    placeholder="Legal name on the certificate"
                    value={gst.name}
                    aria-invalid={!gst.name.trim()}
                    onChange={(event) =>
                      edit((current) => ({
                        ...current,
                        gst: current.gst && {
                          ...current.gst,
                          name: event.target.value,
                        },
                      }))
                    }
                  />
                  <LiquidInput
                    aria-label="GST address"
                    wrapperClassName="easy-span"
                    className="easy-inline"
                    placeholder="GST address (optional)"
                    value={gst.address}
                    onChange={(event) =>
                      edit((current) => ({
                        ...current,
                        gst: current.gst && {
                          ...current.gst,
                          address: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              )}
            </div>
          ) : (
            <LiquidButton
              type="button"
              variant="ghost"
              className="easy-add"
              onClick={() =>
                edit((current) => ({
                  ...current,
                  gst: { use: true, gstin: "", name: "", address: "" },
                }))
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add GST details
            </LiquidButton>
          )}
        </section>

        <section className="easy-section" aria-labelledby="easy-items">
          <h2 id="easy-items" className="easy-label">
            Items
          </h2>
          {formatting ? (
            <ProductsLoading pending={pending} />
          ) : doc.lines.length ? (
            <ul className="easy-lines">
              {doc.lines.map((line) => (
                <EasyLine
                  key={line.line}
                  line={line}
                  problems={problems
                    .filter((problem) => problem.line === line.line)
                    .map((problem) => problem.message)}
                  onChange={(patch) => updateLine(line.line, patch)}
                  onRemove={() => removeLine(line.line)}
                />
              ))}
            </ul>
          ) : (
            <p className="easy-muted">No items yet.</p>
          )}
          <LiquidButton
            type="button"
            variant="ghost"
            className="easy-add"
            onClick={addLine}
            disabled={formatting}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add item
          </LiquidButton>
          {catalogState === "loading" && (
            <p className="easy-muted easy-small easy-loading-inline">
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
              Loading the product catalog…
            </p>
          )}
          {catalogState === "failed" && (
            <p className="easy-warn easy-small">
              The product catalog didn't load; product links may be missing on
              the invoice.
            </p>
          )}
          <div className="easy-total">
            <span>Total (incl. GST)</span>
            {formatting ? (
              <span className="easy-muted easy-loading-inline">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Calculating…
              </span>
            ) : (
              <strong>{formatINR(total)}</strong>
            )}
          </div>
        </section>

        <section className="easy-section easy-grid">
          <LiquidDropdown
            label="Payment status"
            value={doc.paidStatus}
            options={PAID_OPTIONS}
            onChange={(value) =>
              edit((current) => ({
                ...current,
                paidStatus: value as EasyPaidStatus,
              }))
            }
          />
          <LiquidDropdown
            label="Paid by"
            value={doc.paymentType}
            options={PAYMENT_OPTIONS}
            onChange={(value) =>
              edit((current) => ({
                ...current,
                paymentType: value as EasyPaymentType,
              }))
            }
          />
        </section>

        {doc.notes.length > 0 && (
          <ul className="easy-list easy-warn">
            {doc.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        )}
        {general.length > 0 && (
          <ul role="alert" className="easy-list easy-bad">
            {general.map((problem) => (
              <li key={problem.message}>{problem.message}</li>
            ))}
          </ul>
        )}
      </fieldset>
    </article>
  );
}

/** Shown in Items while AI reads the short product names. */
function ProductsLoading({ pending }: { pending: string[] }) {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);
  const rows = pending.length ? pending : [""];

  return (
    <div className="easy-items-loading" role="status" aria-live="polite">
      <div className="easy-items-loading-head">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <div>
          <p className="easy-strong">
            Loading products
            {pending.length > 1 ? ` (${pending.length})` : ""}…
          </p>
          <p className="easy-muted easy-small">
            {slow
              ? "Still working. Short names take a few more seconds to match."
              : "Matching what you wrote to the catalog, with qty and price."}
          </p>
        </div>
      </div>
      <ul className="easy-items-loading-rows" aria-hidden="true">
        {rows.map((line, index) => (
          <li key={`${index}-${line}`}>
            <span className="easy-items-loading-text">
              {line || "Reading the text…"}
            </span>
            <span className="easy-items-loading-bar" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EasyLine({
  line,
  problems,
  onChange,
  onRemove,
}: {
  line: QuickReviewLine;
  problems: string[];
  onChange: (patch: Partial<QuickReviewLine>) => void;
  onRemove: () => void;
}) {
  const product = chosenProduct(line);
  const value = lineValue(line);
  const warnings = lineWarnings(line);
  const badge = product ? CONFIDENCE_LABEL[line.confidence] : "";
  const priceMissing = !line.price.trim();

  return (
    <li className="easy-line">
      <div className="easy-line-main">
        {line.options.length > 0 ? (
          <LiquidDropdown
            ariaLabel="Product"
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
        ) : (
          <LiquidInput
            aria-label="Item name"
            className="easy-inline easy-strong"
            placeholder="Item name"
            value={line.rawName}
            aria-invalid={!line.rawName.trim()}
            onChange={(event) => onChange({ rawName: event.target.value })}
          />
        )}
        <p className="easy-muted easy-small">
          {badge && <span className="easy-chip easy-warn">{badge}</span>}
          {line.options.length > 0 && <>You wrote "{line.rawName}"</>}
          {product &&
            ` · catalog ${formatINR(product.catalogPrice)} · stock ${product.stock ?? "none"}`}
          {!product &&
            "Custom item: stock and service reminders won't track it."}
        </p>
      </div>
      <div className="easy-line-nums">
        <LiquidInput
          aria-label={
            line.quantityAssumed ? "Quantity (not given, set to 1)" : "Quantity"
          }
          className="easy-inline easy-num"
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
        <span className="easy-muted" aria-hidden="true">
          ×
        </span>
        <LiquidInput
          aria-label={priceMissing ? "Unit price, not sent" : "Unit price"}
          className={`easy-inline easy-num ${priceMissing ? "easy-missing" : ""}`}
          inputMode="decimal"
          placeholder="Price"
          aria-invalid={priceMissing}
          value={line.price}
          onChange={(event) =>
            onChange({ price: event.target.value.replace(/[^\d.]/g, "") })
          }
        />
        <strong className="easy-line-value">
          {value === null ? "—" : formatINR(value)}
        </strong>
        <LiquidIconButton
          type="button"
          aria-label={`Remove ${product?.name || line.rawName || "item"}`}
          title="Remove item"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </LiquidIconButton>
      </div>
      {problems.map((message) => (
        <p
          key={message}
          role="alert"
          className="easy-small easy-bad easy-problem"
        >
          <AlertTriangle
            className="h-3.5 w-3.5 flex-shrink-0"
            aria-hidden="true"
          />
          {message}
        </p>
      ))}
      {warnings
        .filter((message) => !message.startsWith("Custom item"))
        .map((message) => (
          <p key={message} className="easy-small easy-warn">
            {message}
          </p>
        ))}
    </li>
  );
}
