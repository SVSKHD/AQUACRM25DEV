import type {
  DraftEditor,
  DraftEvent,
  EasyDraft,
} from "../services/easyInvoiceDrafts";

/*
 * Shared Easy invoice drafts: wording and "what changed" checks for the
 * on-page notifications. Pure functions only.
 */

/** "just now", "4 min ago", "2 h ago", "yesterday", "5 Nov". */
export const timeAgo = (iso: string | undefined, now = Date.now()) => {
  const at = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(at)) return "";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "yesterday";
  return new Date(at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

/** "Ravi K is editing on iPhone · Safari" / "You're editing on Windows · Chrome". */
export const editorText = (editor: DraftEditor) =>
  editor.sameStaff
    ? `You're editing this on ${editor.thisDevice ? "this device" : editor.deviceLabel}`
    : `${editor.name || "Someone"} is editing on ${editor.deviceLabel}`;

/** Someone other than this device holds the lock. */
export const lockedByOther = (draft: Pick<EasyDraft, "lock">) =>
  Boolean(draft.lock.live && !draft.lock.mine && draft.lock.editor);

/** The newest event that took this draft away from this device, if any. */
export const takeoverOfThisDevice = (
  events: DraftEvent[],
  since?: string,
): DraftEvent | null => {
  const sinceMs = since ? new Date(since).getTime() : 0;
  return (
    events.find(
      (event) =>
        event.type === "taken_over" &&
        event.fromThisDevice &&
        new Date(event.at).getTime() >= sinceMs,
    ) || null
  );
};

export const takeoverText = (event: DraftEvent) =>
  `${event.name || "Someone"} took over this draft on ${event.deviceLabel}. Your changes up to then are saved.`;

/**
 * What to tell this device after a drafts-list refresh: someone (not this
 * device) started editing a draft, took one over, or finished one. The
 * first load (prev = null) never notifies.
 */
export const listNotices = (
  prev: EasyDraft[] | null,
  next: EasyDraft[],
): string[] => {
  if (!prev) return [];
  const before = new Map(prev.map((draft) => [draft.id, draft]));
  const notices: string[] = [];
  for (const draft of next) {
    const old = before.get(draft.id);
    const editor = draft.lock.editor;
    if (!editor || editor.thisDevice) continue;
    const who = editor.sameStaff
      ? `You (on ${editor.deviceLabel})`
      : editor.name || "Someone";
    const oldEditor = old?.lock.editor;
    const tookOver = draft.events.find(
      (event) =>
        event.type === "taken_over" &&
        !event.byThisDevice &&
        (!old || new Date(event.at) > new Date(old.updatedAt)),
    );
    if (tookOver && oldEditor && oldEditor.name !== editor.name)
      notices.push(
        `${who} took over “${draft.title}” from ${tookOver.fromName || oldEditor.name}.`,
      );
    else if (!oldEditor)
      notices.push(
        `${who} started editing “${draft.title}” on ${editor.deviceLabel}.`,
      );
  }
  for (const old of prev) {
    if (next.some((draft) => draft.id === old.id)) continue;
    // Gone from the open list: created as an invoice or discarded elsewhere.
    if (old.lock.editor && !old.lock.editor.thisDevice)
      notices.push(`“${old.title}” was finished or discarded.`);
  }
  return notices;
};
