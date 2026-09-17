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
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content...",
  minHeight = 220,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sourceMode, setSourceMode] = useState(false);

  useEffect(() => {
    if (sourceMode || !editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, sourceMode]);

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runCommand("createLink", url);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-white/10">
        <select
          aria-label="Text style"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          defaultValue="p"
          onChange={(event) => runCommand("formatBlock", event.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </select>
        <button type="button" className={toolbarButton} title="Bold" onClick={() => runCommand("bold")}><Bold className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Italic" onClick={() => runCommand("italic")}><Italic className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Underline" onClick={() => runCommand("underline")}><Underline className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Strike through" onClick={() => runCommand("strikeThrough")}><Strikethrough className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Bullet list" onClick={() => runCommand("insertUnorderedList")}><List className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Numbered list" onClick={() => runCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Align left" onClick={() => runCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Align center" onClick={() => runCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Align right" onClick={() => runCommand("justifyRight")}><AlignRight className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Add link" onClick={addLink}><Link className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Undo" onClick={() => runCommand("undo")}><Undo2 className="h-4 w-4" /></button>
        <button type="button" className={toolbarButton} title="Redo" onClick={() => runCommand("redo")}><Redo2 className="h-4 w-4" /></button>
        <button
          type="button"
          className={`${toolbarButton} ${sourceMode ? "ring-2 ring-blue-500" : ""}`}
          title="HTML source"
          onClick={() => setSourceMode((current) => !current)}
        >
          <Code2 className="h-4 w-4" />
        </button>
      </div>

      {sourceMode ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-y bg-transparent p-4 font-mono text-sm text-neutral-950 outline-none dark:text-white"
          style={{ minHeight }}
          placeholder="<p>Write HTML...</p>"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || "")}
          className="max-w-none overflow-y-auto p-4 text-neutral-950 outline-none dark:text-white [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-white/45">
        {sourceMode ? "HTML source mode" : "Visual editor - content is saved as HTML"}
      </div>
    </div>
  );
}
