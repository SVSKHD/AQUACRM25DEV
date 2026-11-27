import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { LiquidButton, LiquidIconButton } from "../../ui/liquid";

export type AttachmentStage = "reading" | "formatting" | "done" | "error";

export interface EasyAttachmentState {
  key: number;
  name: string;
  size: number;
  isPdf: boolean;
  /** Object URL for an image preview; "" for PDFs, HEIC, or once discarded. */
  previewUrl: string;
  stage: AttachmentStage;
  error?: string;
}

const STAGE_TEXT: Record<AttachmentStage, string> = {
  reading: "Reading the file…",
  formatting: "Read. Formatting the invoice…",
  done: "Done. The file was discarded; only the text was kept.",
  error: "Couldn't read this file.",
};

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The photo / PDF being read. It is shown only while it is used: once the
 * text is read and formatted, the page drops the file and this card says so.
 */
export default function EasyAttachment({
  attachment,
  onDiscard,
  onRetry,
}: {
  attachment: EasyAttachmentState;
  onDiscard: () => void;
  onRetry: () => void;
}) {
  const { stage } = attachment;
  const working = stage === "reading" || stage === "formatting";

  return (
    <div
      className={`easy-attachment easy-attachment-${stage}`}
      role="status"
      aria-live="polite"
    >
      <div className="easy-attachment-thumb" aria-hidden="true">
        {stage === "done" ? (
          <CheckCircle2 className="h-6 w-6" />
        ) : attachment.previewUrl ? (
          <img src={attachment.previewUrl} alt="" />
        ) : (
          <FileText className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="easy-attachment-name">
          {stage === "done" ? "File discarded" : attachment.name}
          {stage !== "done" && (
            <span className="easy-muted easy-small">
              {" "}
              · {attachment.isPdf ? "PDF" : "Photo"} ·{" "}
              {sizeText(attachment.size)}
            </span>
          )}
        </p>
        <p className="easy-small easy-attachment-stage">
          {working && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
          {stage === "error" && (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {stage === "error" && attachment.error
            ? attachment.error
            : STAGE_TEXT[stage]}
        </p>
      </div>
      {stage === "error" && (
        <LiquidButton type="button" variant="soft" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </LiquidButton>
      )}
      <LiquidIconButton
        type="button"
        onClick={onDiscard}
        aria-label={
          stage === "done"
            ? "Close"
            : stage === "reading"
              ? "Stop reading and discard the file"
              : "Discard the file"
        }
        title={
          stage === "reading"
            ? "Stop reading and discard the file"
            : stage === "done"
              ? "Close"
              : "Discard the file"
        }
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </LiquidIconButton>
    </div>
  );
}
