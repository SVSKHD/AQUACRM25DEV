import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Braces,
  Code2,
  Italic,
  Link,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import {
  LiquidButton,
  LiquidIconButton,
  LiquidPanel,
  LiquidSelect,
  LiquidTextarea,
} from "./liquid";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
  error?: string;
};

const blockOptions = [
  { value: "p", label: "Paragraph" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "pre", label: "Code block" },
];

const EMPTY_HTML = new Set(["", "<br>", "<div><br></div>", "<p><br></p>"]);

const normalizeHtml = (html: string) =>
  EMPTY_HTML.has(String(html || "").trim().toLowerCase()) ? "" : html;

export default function RichTextEditor({
  value,
  onChange,
  label = "Description",
  placeholder = "Start writing…",
  minHeight = 280,
  disabled = false,
  error,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [block, setBlock] = useState("p");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || sourceMode) return;
    if (document.activeElement === editor) return;

    const next = value || "";
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [value, sourceMode]);

  const emitEditorHtml = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(normalizeHtml(editor.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled || sourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitEditorHtml();
  };

  const applyBlock = (nextBlock: string) => {
    setBlock(nextBlock);
    runCommand("formatBlock", nextBlock);
  };

  const addLink = () => {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return;

    const raw = window.prompt("Paste the link URL");
    if (!raw) return;

    const url = /^(https?:|mailto:|tel:)/i.test(raw)
      ? raw
      : `https://${raw}`;
    runCommand("createLink", url);
  };

  const toolbarDisabled = disabled || sourceMode;

  const editorStyle = useMemo(
    () => ({ minHeight: `${minHeight}px` }),
    [minHeight],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="liquid-label mb-0">{label}</span>
        <LiquidButton
          type="button"
          variant={sourceMode ? "primary" : "soft"}
          className="min-h-0 px-3 py-1.5 text-xs"
          onClick={() => setSourceMode((current) => !current)}
          disabled={disabled}
          aria-pressed={sourceMode}
        >
          <Braces className="h-3.5 w-3.5" />
          {sourceMode ? "Visual editor" : "HTML"}
        </LiquidButton>
      </div>

      <LiquidPanel className={`overflow-hidden ${error ? "ring-2 ring-rose-400/70" : ""}`}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/70 p-2 dark:border-white/10">
          <LiquidSelect
            aria-label="Text style"
            value={block}
            onChange={(event) => applyBlock(event.target.value)}
            disabled={toolbarDisabled}
            wrapperClassName="w-36"
            className="min-h-9 py-1.5 text-xs"
          >
            {blockOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </LiquidSelect>

          <ToolbarButton
            label="Bold"
            disabled={toolbarDisabled}
            onClick={() => runCommand("bold")}
          >
            <Bold />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            disabled={toolbarDisabled}
            onClick={() => runCommand("italic")}
          >
            <Italic />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            disabled={toolbarDisabled}
            onClick={() => runCommand("underline")}
          >
            <Underline />
          </ToolbarButton>

          <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />

          <ToolbarButton
            label="Bulleted list"
            disabled={toolbarDisabled}
            onClick={() => runCommand("insertUnorderedList")}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            disabled={toolbarDisabled}
            onClick={() => runCommand("insertOrderedList")}
          >
            <ListOrdered />
          </ToolbarButton>
          <ToolbarButton
            label="Block quote"
            disabled={toolbarDisabled}
            onClick={() => runCommand("formatBlock", "blockquote")}
          >
            <Quote />
          </ToolbarButton>
          <ToolbarButton
            label="Inline code"
            disabled={toolbarDisabled}
            onClick={() => runCommand("formatBlock", "pre")}
          >
            <Code2 />
          </ToolbarButton>

          <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />

          <ToolbarButton
            label="Add link"
            disabled={toolbarDisabled}
            onClick={addLink}
          >
            <Link />
          </ToolbarButton>
          <ToolbarButton
            label="Remove link"
            disabled={toolbarDisabled}
            onClick={() => runCommand("unlink")}
          >
            <Unlink />
          </ToolbarButton>
          <ToolbarButton
            label="Clear formatting"
            disabled={toolbarDisabled}
            onClick={() => runCommand("removeFormat")}
          >
            <RemoveFormatting />
          </ToolbarButton>

          <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />

          <ToolbarButton
            label="Undo"
            disabled={toolbarDisabled}
            onClick={() => runCommand("undo")}
          >
            <Undo2 />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={toolbarDisabled}
            onClick={() => runCommand("redo")}
          >
            <Redo2 />
          </ToolbarButton>
        </div>

        {sourceMode ? (
          <LiquidTextarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="min-h-[280px] rounded-none border-0 font-mono text-sm shadow-none"
            style={editorStyle}
            aria-label={`${label} HTML source`}
          />
        ) : (
          <div className="relative">
            {!value && (
              <div
                className="pointer-events-none absolute left-4 top-4 text-sm text-slate-400 dark:text-white/30"
                aria-hidden="true"
              >
                {placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              className="rich-text-editor-content custom-scrollbar max-h-[520px] overflow-y-auto p-4 text-sm text-neutral-950 outline-none dark:text-white"
              style={editorStyle}
              contentEditable={!disabled}
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label={label}
              onInput={emitEditorHtml}
              onBlur={emitEditorHtml}
            />
          </div>
        )}
      </LiquidPanel>

      <div className="flex items-start justify-between gap-3 text-xs">
        <span className={error ? "font-semibold text-rose-500" : "text-slate-500 dark:text-white/45"}>
          {error || "Visual formatting is saved as HTML for the storefront blog."}
        </span>
        <span className="shrink-0 text-slate-400 dark:text-white/35">
          <Pilcrow className="mr-1 inline h-3.5 w-3.5" />
          Rich text
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <LiquidIconButton
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9"
    >
      {children}
    </LiquidIconButton>
  );
}
