import { useCallback, useEffect, useRef, useState } from "react";
import {
  easyDraftsService,
  type DraftEditor,
  type DraftEvent,
  type EasyDraft,
} from "../services/easyInvoiceDrafts";
import type { ApiResponse } from "../services/api";
import {
  listNotices,
  lockedByOther,
  takeoverOfThisDevice,
  takeoverText,
} from "../utils/easyDrafts";

type Tone = "info" | "error" | "success";
type Notify = (text: string, tone: Tone) => void;

/** none: nothing saved yet · editing: this device holds the lock · viewing: read-only · offline: server unavailable. */
export type SharedDraftMode = "none" | "editing" | "viewing" | "offline";

const AUTOSAVE_MS = 1200;
const EDITING_HEARTBEAT_MS = 15_000;
const VIEWING_POLL_MS = 5_000;
const LIST_POLL_MS = 10_000;
const OFFLINE_CODES = ["DRAFTS_UNAVAILABLE", "NETWORK_ERROR", "TIMEOUT"];

/**
 * Keeps one Easy invoice draft in sync with the server: autosave while this
 * device holds the lock, heartbeats to keep it, read-only polling while
 * someone else edits, and notices when the lock changes hands.
 */
export function useSharedEasyDraft<C>({
  content,
  hasContent,
  apply,
  notify,
  onDraftChange,
}: {
  content: C;
  /** False for an empty page: nothing is created until there is something to keep. */
  hasContent: boolean;
  /** Puts content from the server into the page. */
  apply: (content: C) => void;
  notify: Notify;
  /** The open draft id changed ("" = none), e.g. to update the URL. */
  onDraftChange?: (id: string) => void;
}) {
  const [draftId, setDraftIdState] = useState("");
  const [mode, setModeState] = useState<SharedDraftMode>("none");
  const [editor, setEditorState] = useState<DraftEditor | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savedAt, setSavedAt] = useState("");
  const [takenOver, setTakenOver] = useState<DraftEvent | null>(null);
  const [opening, setOpening] = useState(false);

  const idRef = useRef("");
  const modeRef = useRef<SharedDraftMode>("none");
  const editorRef = useRef<DraftEditor | null>(null);
  const revRef = useRef(0);
  const lastSavedRef = useRef("");
  const contentRef = useRef(content);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const openedAtRef = useRef("");
  // While a draft opens, autosave must not create a second one.
  const openingRef = useRef(false);
  const callbacks = useRef({ apply, notify, onDraftChange });
  callbacks.current = { apply, notify, onDraftChange };
  contentRef.current = content;
  const serialized = JSON.stringify(content);

  const setMode = (next: SharedDraftMode) => {
    modeRef.current = next;
    setModeState(next);
  };
  const setEditor = (next: DraftEditor | null) => {
    editorRef.current = next;
    setEditorState(next);
  };
  const setDraftId = (next: string) => {
    if (idRef.current === next) return;
    idRef.current = next;
    setDraftIdState(next);
    callbacks.current.onDraftChange?.(next);
  };

  /** Take a server draft as the current one. */
  const adopt = useCallback((draft: EasyDraft<C>, withContent: boolean) => {
    setDraftId(draft.id);
    revRef.current = draft.rev;
    setEditor(draft.lock.editor);
    setMode(draft.lock.mine ? "editing" : "viewing");
    if (withContent && draft.content !== undefined) {
      lastSavedRef.current = JSON.stringify(draft.content);
      callbacks.current.apply(draft.content);
    }
  }, []);

  const forget = useCallback(() => {
    setDraftId("");
    setMode("none");
    setEditor(null);
    setTakenOver(null);
    setSaveState("idle");
    lastSavedRef.current = "";
    revRef.current = 0;
  }, []);

  /** Reacts to a refused write: someone else has it, it expired, it closed, or the server is away. */
  const writeFailed = useCallback(
    async (response: ApiResponse<EasyDraft<C>>) => {
      setSaveState("error");
      if (response.code === "DRAFT_LOCKED") {
        const holder = (response.details?.editor as DraftEditor) || null;
        setEditor(holder);
        setMode("viewing");
        callbacks.current.notify(
          `${holder?.name || "Someone"} is editing this draft now. It's read-only here.`,
          "error",
        );
        return false;
      }
      if (response.code === "LOCK_EXPIRED" && idRef.current) {
        const claimed = await easyDraftsService.claim<C>(idRef.current);
        if (claimed.data?.lock.mine) {
          adopt(claimed.data, false);
          return true;
        }
        if (claimed.data) adopt(claimed.data, true);
        return false;
      }
      if (response.code === "DRAFT_CLOSED") {
        callbacks.current.notify(
          "This draft was finished or discarded on another device.",
          "error",
        );
        forget();
        return false;
      }
      if (response.code && OFFLINE_CODES.includes(response.code)) {
        if (modeRef.current !== "offline")
          callbacks.current.notify(
            `${response.error} Your work is kept on this device.`,
            "error",
          );
        setMode("offline");
        return false;
      }
      callbacks.current.notify(
        response.error || "Could not save the draft.",
        "error",
      );
      return false;
    },
    [adopt, forget],
  );

  /** Saves the latest content now (queued, so saves never overlap). */
  const flush = useCallback((): Promise<unknown> => {
    const run = async (retry = true): Promise<void> => {
      const json = JSON.stringify(contentRef.current);
      if (
        openingRef.current ||
        json === lastSavedRef.current ||
        modeRef.current === "viewing"
      )
        return;
      setSaveState("saving");
      const body = JSON.parse(json) as C;
      const response = idRef.current
        ? await easyDraftsService.save<C>(idRef.current, body)
        : await easyDraftsService.create<C>(body);
      if (response.data) {
        lastSavedRef.current = json;
        if (!idRef.current) {
          openedAtRef.current = new Date().toISOString();
          adopt(response.data, false);
        } else {
          revRef.current = response.data.rev;
          if (modeRef.current === "offline") setMode("editing");
        }
        setSaveState("saved");
        setSavedAt(new Date().toISOString());
        return;
      }
      if ((await writeFailed(response)) && retry) await run(false);
    };
    queueRef.current = queueRef.current.then(() => run()).catch(() => {});
    return queueRef.current;
  }, [adopt, writeFailed]);

  // Autosave shortly after each change (not while read-only).
  useEffect(() => {
    if (!hasContent || mode === "viewing") return;
    if (serialized === lastSavedRef.current) return;
    const timer = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [serialized, hasContent, mode, flush]);

  // Editing: keep the lock alive and notice a takeover. Viewing: follow the editor.
  useEffect(() => {
    if (!draftId || (mode !== "editing" && mode !== "viewing")) return;
    const tick = async () => {
      if (mode === "viewing" && document.visibilityState === "hidden") return;
      const response = await easyDraftsService.heartbeat<C>(
        draftId,
        revRef.current,
      );
      const draft = response.data;
      if (!draft || idRef.current !== draftId) return;
      if (draft.status !== "open") {
        callbacks.current.notify(
          draft.status === "done"
            ? `${draft.updatedBy.name || "Someone"} created the invoice from this draft.`
            : "This draft was discarded on another device.",
          "info",
        );
        forget();
        return;
      }
      if (modeRef.current === "editing" && !draft.lock.mine) {
        if (!draft.lock.live) {
          // Lost only to a pause (sleep, bad network): take it back quietly.
          const claimed = await easyDraftsService.claim<C>(draftId);
          if (claimed.data?.lock.mine) {
            adopt(claimed.data, false);
            return;
          }
        }
        const event = takeoverOfThisDevice(draft.events, openedAtRef.current);
        setTakenOver(event);
        callbacks.current.notify(
          event
            ? takeoverText(event)
            : `${draft.lock.editor?.name || "Someone"} is editing this draft now. It's read-only here.`,
          "error",
        );
        setEditor(draft.lock.editor);
        setMode("viewing");
      } else if (modeRef.current === "viewing") {
        const before = editorRef.current;
        const now = draft.lock.editor;
        if (before && !now)
          callbacks.current.notify(
            `${before.sameStaff ? "You" : before.name || "The editor"} stopped editing. You can continue now.`,
            "success",
          );
        else if (now && before && now.name !== before.name)
          callbacks.current.notify(
            `${now.name} is now editing on ${now.deviceLabel}.`,
            "info",
          );
        setEditor(now);
      }
      if (draft.content !== undefined && modeRef.current === "viewing") {
        lastSavedRef.current = JSON.stringify(draft.content);
        callbacks.current.apply(draft.content);
      }
      revRef.current = draft.rev;
    };
    const timer = window.setInterval(
      () => void tick(),
      mode === "editing" ? EDITING_HEARTBEAT_MS : VIEWING_POLL_MS,
    );
    return () => window.clearInterval(timer);
  }, [draftId, mode, adopt, forget]);

  // Let go of the lock when the tab closes or the page is left.
  useEffect(() => {
    const leave = () => {
      if (modeRef.current === "editing" && idRef.current)
        easyDraftsService.releaseOnExit(idRef.current);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, []);

  /** Saves and lets go of the current draft (it stays in the list). */
  const releaseCurrent = useCallback(async () => {
    if (modeRef.current !== "viewing") await flush();
    const id = idRef.current;
    if (id && modeRef.current === "editing")
      await easyDraftsService.release(id);
    forget();
  }, [flush, forget]);

  /** Opens a draft: takes it when free, else shows it read-only. */
  const open = useCallback(
    async (id: string) => {
      if (id === idRef.current) return true;
      setOpening(true);
      try {
        // Save what's on screen first (creating a draft if needed), then
        // block autosave until the other draft is in.
        await releaseCurrent();
        openingRef.current = true;
        const got = await easyDraftsService.get<C>(id);
        let draft = got.data;
        if (!draft) {
          callbacks.current.notify(
            got.error || "Could not open the draft.",
            "error",
          );
          return false;
        }
        if (draft.status !== "open") {
          callbacks.current.notify("This draft is already closed.", "error");
          return false;
        }
        if (!lockedByOther(draft)) {
          const claimed = await easyDraftsService.claim<C>(id);
          if (claimed.data) draft = claimed.data;
        }
        openedAtRef.current = new Date().toISOString();
        setTakenOver(null);
        adopt(draft, true);
        setSaveState("saved");
        setSavedAt(draft.updatedAt);
        return true;
      } finally {
        openingRef.current = false;
        setOpening(false);
      }
    },
    [adopt, releaseCurrent],
  );

  /** Takes the draft from whoever is editing it; they are told on their device. */
  const takeOver = useCallback(async () => {
    const id = idRef.current;
    if (!id) return false;
    const claimed = await easyDraftsService.claim<C>(id, true);
    if (!claimed.data) {
      callbacks.current.notify(
        claimed.error || "Could not take over the draft.",
        "error",
      );
      return false;
    }
    openedAtRef.current = new Date().toISOString();
    setTakenOver(null);
    adopt(claimed.data, true);
    callbacks.current.notify("You're editing this draft now.", "success");
    return true;
  }, [adopt]);

  /** After the invoice is created: closes the draft for everyone. */
  const complete = useCallback(
    async (invoiceId: string) => {
      const id = idRef.current;
      if (id && modeRef.current === "editing")
        await easyDraftsService.complete(id, invoiceId);
      forget();
    },
    [forget],
  );

  return {
    draftId,
    mode,
    editor,
    saveState,
    savedAt,
    takenOver,
    opening,
    open,
    takeOver,
    releaseCurrent,
    complete,
    flush,
    forget,
  };
}

/**
 * Open drafts for every staff member, refreshed every 10 s while the tab is
 * visible. Notifies when someone else starts editing, takes over or closes
 * a draft (the open draft's own changes are announced by useSharedEasyDraft).
 */
export function useEasyDraftsList(activeId: string, notify: Notify) {
  const [drafts, setDrafts] = useState<EasyDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previous = useRef<EasyDraft[] | null>(null);
  const callbacks = useRef({ notify, activeId });
  callbacks.current = { notify, activeId };

  const refresh = useCallback(async () => {
    const response = await easyDraftsService.list();
    setLoading(false);
    if (!response.data) {
      setError(response.error || "Could not load drafts.");
      return;
    }
    setError("");
    const next = response.data;
    const skip = callbacks.current.activeId;
    const notices = listNotices(
      previous.current?.filter((draft) => draft.id !== skip) ?? null,
      next.filter((draft) => draft.id !== skip),
    );
    notices
      .slice(0, 3)
      .forEach((text) => callbacks.current.notify(text, "info"));
    previous.current = next;
    setDrafts(next);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, LIST_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { drafts, loading, error, refresh };
}
