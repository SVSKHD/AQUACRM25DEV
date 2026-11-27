import { useState } from "react";
import { FileText, Loader2, MonitorSmartphone, Trash2 } from "lucide-react";
import type { EasyDraft } from "../../../services/easyInvoiceDrafts";
import { editorText, lockedByOther, timeAgo } from "../../../utils/easyDrafts";
import { LiquidButton, LiquidIconButton } from "../../ui/liquid";
import { formatINR } from "./invoiceFormat";

type Props = {
  drafts: EasyDraft[];
  loading: boolean;
  error: string;
  activeId: string;
  busyId: string;
  onOpen: (draft: EasyDraft) => void;
  onDiscard: (draft: EasyDraft) => void;
  /** Shown when nothing matches (e.g. a search in the drawer). */
  emptyText?: string;
};

/** "Drafts left off": every open Easy invoice draft, shared by all staff. */
export default function EasyDraftsList({
  drafts,
  loading,
  error,
  activeId,
  busyId,
  onOpen,
  onDiscard,
  emptyText = "No drafts left off. Anything you paste is saved here automatically.",
}: Props) {
  const [confirmId, setConfirmId] = useState("");
  const others = drafts.filter((draft) => draft.id !== activeId);

  if (error)
    return (
      <p role="alert" className="easy-small easy-warn">
        {error}
      </p>
    );
  if (loading && !drafts.length)
    return (
      <p className="easy-small easy-muted easy-loading-inline" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Loading drafts…
      </p>
    );
  if (!others.length)
    return (
      <p className="easy-small easy-muted easy-drafts-empty">{emptyText}</p>
    );

  return (
    <ul className="easy-drafts">
      {others.map((draft) => {
        const locked = lockedByOther(draft);
        const editor = draft.lock.editor;
        const busy = busyId === draft.id;
        return (
          <li key={draft.id} className="easy-draft">
            <div className="easy-draft-main">
              <p className="easy-draft-title">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{draft.title}</span>
              </p>
              <p className="easy-small easy-muted">
                {[
                  draft.phone,
                  draft.itemCount
                    ? `${draft.itemCount} item${draft.itemCount > 1 ? "s" : ""} · ${formatINR(draft.total)}`
                    : "No items yet",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="easy-small easy-muted">
                Started by {draft.createdBy.name || "staff"} ·{" "}
                {timeAgo(draft.createdAt)}
                {draft.updatedBy.name && (
                  <>
                    {" "}
                    · last edited by {draft.updatedBy.name} ·{" "}
                    {timeAgo(draft.updatedAt)}
                  </>
                )}
              </p>
              {editor && (
                <p
                  className={`easy-live ${locked ? "easy-live-other" : ""}`}
                  aria-live="polite"
                >
                  <span className="easy-live-dot" aria-hidden="true" />
                  {editorText(editor)} · active {timeAgo(editor.heartbeatAt)}
                </p>
              )}
              {draft.devices.length > 0 && (
                <div className="easy-devices" aria-label="Devices used">
                  <MonitorSmartphone
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {draft.devices.map((device) => (
                    <span
                      key={`${device.label}-${device.name}-${device.firstSeenAt}`}
                      className="easy-device"
                      title={`First used ${timeAgo(device.firstSeenAt)}`}
                    >
                      {device.label}
                      {device.name ? ` · ${device.name}` : ""} ·{" "}
                      {timeAgo(device.lastSeenAt)}
                      {device.thisDevice ? " (this device)" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="easy-draft-actions">
              {confirmId === draft.id ? (
                <>
                  <span className="easy-small easy-warn">Discard?</span>
                  <LiquidButton
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setConfirmId("");
                      onDiscard(draft);
                    }}
                  >
                    Yes, discard
                  </LiquidButton>
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmId("")}
                  >
                    No
                  </LiquidButton>
                </>
              ) : (
                <>
                  <LiquidButton
                    type="button"
                    variant={locked ? "soft" : "primary"}
                    onClick={() => onOpen(draft)}
                    disabled={busy}
                  >
                    {busy && (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {locked ? "View" : "Continue"}
                  </LiquidButton>
                  <LiquidIconButton
                    type="button"
                    aria-label={`Discard draft ${draft.title}`}
                    title={
                      locked
                        ? `${editor?.name || "Someone"} is editing it`
                        : "Discard draft"
                    }
                    disabled={locked || busy}
                    onClick={() => setConfirmId(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </LiquidIconButton>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
