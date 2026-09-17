import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

const toolbarButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "H2",
  "H3",
  "BLOCKQUOTE",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "UL",
  "OL",
  "LI",
  "A",
  "DIV",
  "SPAN",
]);

const BLOCKED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "META",
  "LINK",
  "BASE",
  "SVG",
  "MATH",
  "NOSCRIPT",
]);

const safeHref = (href: string) => {
  const candidate = href.trim();
  if (!candidate) return "";

  if (
    candidate.startsWith("#") ||
    candidate.startsWith("/") ||
    candidate.startsWith("./") ||
    candidate.startsWith("../")
  ) {
    return candidate;
  }

  const withProtocol =
    /^(https?:|mailto:|tel:)/i.test(candidate) || candidate.startsWith("//")
      ? candidate
      : `https://${candidate}`;

  try {
    const parsed = new URL(withProtocol, window.location.origin);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return withProtocol;
    }
  } catch {
    return "";
  }

  return "";
};

export const sanitizeRichTextHtml = (html: string) => {
  if (!html) return "";
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  const elements = Array.from(template.content.querySelectorAll("*"));

  for (const element of elements) {
    if (BLOCKED_TAGS.has(element.tagName)) {
      element.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const isAnchor = element.tagName === "A";
    const attributes = Array.from(element.attributes);

    for (const attribute of attributes) {
      const name = attribute.name.toLowerCase();

      if (name === "style") {
        const alignment = (element as HTMLElement).style.textAlign;
        element.removeAttribute("style");
        if (["left", "center", "right", "justify"].includes(alignment)) {
          (element as HTMLElement).style.textAlign = alignment;
        }
        continue;
      }

      if (isAnchor && ["href", "target", "rel", "title"].includes(name)) {
        continue;
      }

      element.removeAttribute(attribute.name);
    }

    if (isAnchor) {
      const href = element.getAttribute("href") || "";
      const cleanHref = safeHref(href);
      if (cleanHref) element.setAttribute("href", cleanHref);
      else element.removeAttribute("href");

      if (element.getAttribute("target") === "_blank") {
        element.setAttribute("rel", "noopener noreferrer");
      } else {
        element.removeAttribute("target");
        element.removeAttribute("rel");
      }
    }
  }

  return template.innerHTML;
};

export const hasRichTextContent = (html: string) => {
  if (!html) return false;
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").trim().length > 0;
  }

  const template = document.createElement("template");
  template.innerHTML = sanitizeRichTextHtml(html);
  return (template.content.textContent || "").replace(/\u00a0/g, " ").trim().length > 0;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content...",
  minHeight = 220,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(value || "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (sourceMode || !editorRef.current) return;
    const safeValue = sanitizeRichTextHtml(value || "");
    if (editorRef.current.innerHTML !== safeValue) {
      editorRef.current.innerHTML = safeValue;
    }
  }, [value, sourceMode]);

  const emitVisualChange = () => {
    const rawHtml = editorRef.current?.innerHTML || "";
    const safeHtml = sanitizeRichTextHtml(rawHtml);
    onChange(safeHtml);
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitVisualChange();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL (for example https://aquakart.co.in)");
    if (!url) return;
    const cleanUrl = safeHref(url);
    if (!cleanUrl) return;
    runCommand("createLink", cleanUrl);
  };

  const toggleSourceMode = () => {
    if (sourceMode) {
      const safeHtml = sanitizeRichTextHtml(sourceDraft);
      onChange(safeHtml);
      setSourceDraft(safeHtml);
      setSourceMode(false);
      return;
    }

    setSourceDraft(value || "");
    setSourceMode(true);
  };

  const insertSafeClipboardContent = (html: string, text: string) => {
    const safeHtml = html
      ? sanitizeRichTextHtml(html)
      : text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\r?\n/g, "<br>");

    document.execCommand("insertHTML", false, safeHtml);
    emitVisualChange();
  };

  const showPlaceholder = !sourceMode && !focused && !hasRichTextContent(value);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-white/10">
        <select
          aria-label="Text style"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          defaultValue="p"
          disabled={sourceMode}
          onChange={(event) => runCommand("formatBlock", event.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </select>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Bold" onClick={() => runCommand("bold")}><Bold className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Italic" onClick={() => runCommand("italic")}><Italic className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Underline" onClick={() => runCommand("underline")}><Underline className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Strike through" onClick={() => runCommand("strikeThrough")}><Strikethrough className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Bullet list" onClick={() => runCommand("insertUnorderedList")}><List className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Numbered list" onClick={() => runCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Align left" onClick={() => runCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Align center" onClick={() => runCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Align right" onClick={() => runCommand("justifyRight")}><AlignRight className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Add link" onClick={addLink}><Link className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Undo" onClick={() => runCommand("undo")}><Undo2 className="h-4 w-4" /></button>
        <button type="button" disabled={sourceMode} className={toolbarButton} title="Redo" onClick={() => runCommand("redo")}><Redo2 className="h-4 w-4" /></button>
        <button
          type="button"
          className={`${toolbarButton} ${sourceMode ? "ring-2 ring-blue-500" : ""}`}
          title={sourceMode ? "Return to visual editor" : "Edit HTML source"}
          onClick={toggleSourceMode}
        >
          <Code2 className="h-4 w-4" />
        </button>
      </div>

      {sourceMode ? (
        <textarea
          value={sourceDraft}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSourceDraft(nextValue);
            onChange(sanitizeRichTextHtml(nextValue));
          }}
          className="w-full resize-y bg-transparent p-4 font-mono text-sm text-neutral-950 outline-none dark:text-white"
          style={{ minHeight }}
          placeholder="<p>Write HTML...</p>"
          aria-label="HTML source"
        />
      ) : (
        <div className="relative">
          {showPlaceholder && (
            <span className="pointer-events-none absolute left-4 top-4 text-sm text-slate-400 dark:text-white/35">
              {placeholder}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Rich text editor"
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              emitVisualChange();
            }}
            onInput={emitVisualChange}
            onPaste={(event) => {
              event.preventDefault();
              insertSafeClipboardContent(
                event.clipboardData.getData("text/html"),
                event.clipboardData.getData("text/plain"),
              );
            }}
            className="max-w-none overflow-y-auto p-4 text-neutral-950 outline-none dark:text-white [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
            style={{ minHeight }}
          />
        </div>
      )}

      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-white/45">
        {sourceMode
          ? "HTML source mode - unsafe tags and links are removed automatically"
          : "Visual editor - content is saved as safe HTML"}
      </div>
    </div>
  );
}
