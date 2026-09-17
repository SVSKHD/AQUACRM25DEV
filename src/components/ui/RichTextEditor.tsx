import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  required?: boolean;
};

const buttonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10";

const sanitizeHtml = (html: string) => {
  if (typeof window === "undefined" || !html) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("script, style, object, embed, form").forEach((node) =>
    node.remove(),
  );

  doc.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === "A") {
      element.setAttribute("rel", "noopener noreferrer");
    }
  });

  return doc.body.innerHTML;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content...",
  minHeight = 220,
  required = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sourceMode, setSourceMode] = useState(false);

  useEffect(() => {
    if (!sourceMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, sourceMode]);

  const emit = () => {
    const html = editorRef.current?.innerHTML || "";
    const sanitized = sanitizeHtml(html === "<br>" ? "" : html);
    onChange(sanitized);
  };

  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    command("createLink", url);
  };

  const toolbar = [
    { title: "Bold", icon: Bold, run: () => command("bold") },
    { title: "Italic", icon: Italic, run: () => command("italic") },
    { title: "Underline", icon: Underline, run: () => command("underline") },
    { title: "Heading 1", icon: Heading1, run: () => command("formatBlock", "h1") },
    { title: "Heading 2", icon: Heading2, run: () => command("formatBlock", "h2") },
    { title: "Bulleted list", icon: List, run: () => command("insertUnorderedList") },
    { title: "Numbered list", icon: ListOrdered, run: () => command("insertOrderedList") },
    { title: "Quote", icon: Quote, run: () => command("formatBlock", "blockquote") },
    { title: "Add link", icon: Link, run: addLink },
    { title: "Remove link", icon: Unlink, run: () => command("unlink") },
    { title: "Clear formatting", icon: RemoveFormatting, run: () => command("removeFormat") },
    { title: "Undo", icon: Undo2, run: () => command("undo") },
    { title: "Redo", icon: Redo2, run: () => command("redo") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-white/10">
        {!sourceMode &&
          toolbar.map(({ title, icon: Icon, run }) => (
            <button
              key={title}
              type="button"
              title={title}
              aria-label={title}
              onMouseDown={(event) => event.preventDefault()}
              onClick={run}
              className={buttonClass}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        <button
          type="button"
          title={sourceMode ? "Visual editor" : "Edit HTML source"}
          aria-label={sourceMode ? "Visual editor" : "Edit HTML source"}
          onClick={() => setSourceMode((current) => !current)}
          className={`${buttonClass} ml-auto ${sourceMode ? "ring-2 ring-blue-500" : ""}`}
        >
          <Code2 className="h-4 w-4" />
        </button>
      </div>

      {sourceMode ? (
        <textarea
          value={value}
          required={required}
          onChange={(event) => onChange(sanitizeHtml(event.target.value))}
          className="w-full resize-y bg-transparent p-4 font-mono text-sm text-neutral-950 outline-none dark:text-white"
          style={{ minHeight }}
          placeholder="<p>Write your content here...</p>"
        />
      ) : (
        <div className="relative">
          {!value && (
            <div className="pointer-events-none absolute left-4 top-4 text-sm text-slate-400">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            onInput={emit}
            onBlur={emit}
            className="prose prose-slate max-w-none overflow-y-auto p-4 text-sm text-neutral-950 outline-none dark:prose-invert dark:text-white"
            style={{ minHeight }}
          />
          {required && !value.trim() && (
            <input
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none absolute h-px w-px opacity-0"
              required
              value=""
              onChange={() => undefined}
            />
          )}
        </div>
      )}

      <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-white/10 dark:text-white/40">
        Visual formatting is stored as HTML. Use the &lt;/&gt; button for direct HTML editing.
      </div>
    </div>
  );
}
