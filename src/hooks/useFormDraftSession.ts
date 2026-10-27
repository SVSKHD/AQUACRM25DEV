import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearFormDraft,
  loadFormDraft,
  usePersistentFormDraft,
} from "./usePersistentFormDraft";

/** Field-by-field comparison; arrays compare by length and item (objects by `id`/`secure_url`). */
export const shallowFormEqual = <T extends object>(a: T, b: T) =>
  (Object.keys(b) as Array<keyof T>).every((key) => {
    const left = a[key] as unknown;
    const right = b[key] as unknown;
    if (Array.isArray(left) && Array.isArray(right)) {
      return (
        left.length === right.length &&
        left.every((item, index) => {
          const other = right[index];
          if (
            item &&
            other &&
            typeof item === "object" &&
            typeof other === "object"
          ) {
            const x = item as { id?: unknown; secure_url?: unknown };
            const y = other as { id?: unknown; secure_url?: unknown };
            return x.id === y.id && x.secure_url === y.secure_url;
          }
          return item === other;
        })
      );
    }
    return left === right;
  });

/**
 * Local draft for a form shown in a panel.
 *
 * Compared with `usePersistentFormDraft` on its own, this:
 * - restores on every open, not only when the key changes;
 * - restores only a draft that differs from `baseline`, and reports when it did (`restoredAt`);
 * - writes a draft only while the form differs from `baseline`, and deletes it when the form
 *   returns to `baseline`, so opening a record never leaves a stale copy behind.
 *
 * `baseline` must keep the same identity for the whole time the panel is open (memoize it).
 */
export function useFormDraftSession<T extends object>({
  key,
  open,
  baseline,
  isEqual = shallowFormEqual,
  skipRestore = false,
  normalize = (value: T) => value,
}: {
  key: string;
  open: boolean;
  baseline: T;
  isEqual?: (a: T, b: T) => boolean;
  /** Start from `baseline` even if a draft exists (e.g. an explicit prefill). */
  skipRestore?: boolean;
  /** Applied to a restored draft, e.g. to upgrade drafts saved by older versions. */
  normalize?: (value: T) => T;
}) {
  const [value, setValue] = useState<T>(baseline);
  const [ready, setReady] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const helpers = useRef({ isEqual, normalize });
  useEffect(() => {
    helpers.current = { isEqual, normalize };
  });

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    let cancelled = false;
    setValue(baseline);
    setRestoredAt(null);
    setReady(false);
    if (skipRestore) {
      setReady(true);
      return;
    }
    void loadFormDraft<T>(key).then((draft) => {
      if (cancelled) return;
      if (draft?.value && typeof draft.value === "object") {
        const merged = helpers.current.normalize({
          ...baseline,
          ...draft.value,
        });
        if (!helpers.current.isEqual(merged, baseline)) {
          setValue(merged);
          setRestoredAt(draft.savedAt);
        }
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, key, baseline, skipRestore]);

  const dirty = ready && !isEqual(value, baseline);
  const noopRestore = useCallback(() => undefined, []);
  const persistent = usePersistentFormDraft({
    key,
    value,
    onRestore: noopRestore,
    enabled: open && dirty,
  });

  useEffect(() => {
    if (open && ready && !dirty) void clearFormDraft(key);
  }, [open, ready, dirty, key]);

  const discard = useCallback(() => {
    setValue(baseline);
    setRestoredAt(null);
  }, [baseline]);

  return {
    value,
    setValue,
    ready,
    dirty,
    restoredAt,
    savedAt: dirty ? persistent.savedAt : null,
    discard,
    clearDraft: persistent.clearDraft,
  };
}
