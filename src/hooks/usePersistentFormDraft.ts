import { useCallback, useEffect, useRef, useState } from "react";

type DraftEnvelope<T> = {
  value: T;
  savedAt: string;
};

type PersistentFormDraftOptions<T> = {
  key: string;
  value: T;
  onRestore: (value: T) => void;
  enabled?: boolean;
  debounceMs?: number;
};

const DB_NAME = "aquacrm-form-drafts";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Unable to open draft database"));
  });

const fallbackKey = (key: string) => `aquacrm:form-draft:${key}`;

const loadFallback = <T,>(key: string): DraftEnvelope<T> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(fallbackKey(key));
    return raw ? (JSON.parse(raw) as DraftEnvelope<T>) : null;
  } catch {
    return null;
  }
};

const saveFallback = <T,>(key: string, envelope: DraftEnvelope<T>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(fallbackKey(key), JSON.stringify(envelope));
  } catch {
    // IndexedDB is the primary store. Ignore localStorage quota failures.
  }
};

const clearFallback = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(fallbackKey(key));
  } catch {
    // Ignore browser storage cleanup failures.
  }
};

export async function loadFormDraft<T>(
  key: string,
): Promise<DraftEnvelope<T> | null> {
  try {
    const db = await openDb();
    const result = await new Promise<DraftEnvelope<T> | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () =>
          resolve((request.result as DraftEnvelope<T> | undefined) || null);
        request.onerror = () =>
          reject(request.error || new Error("Unable to load draft"));
      },
    );
    db.close();
    return result || loadFallback<T>(key);
  } catch {
    return loadFallback<T>(key);
  }
}

export async function saveFormDraft<T>(key: string, value: T) {
  const envelope: DraftEnvelope<T> = {
    value,
    savedAt: new Date().toISOString(),
  };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(envelope, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("Unable to save draft"));
      tx.onabort = () =>
        reject(tx.error || new Error("Unable to save draft"));
    });
    db.close();
  } catch {
    saveFallback(key, envelope);
  }

  return envelope.savedAt;
}

export async function clearFormDraft(key: string) {
  clearFallback(key);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("Unable to clear draft"));
      tx.onabort = () =>
        reject(tx.error || new Error("Unable to clear draft"));
    });
    db.close();
  } catch {
    // localStorage fallback was already cleared.
  }
}

export function usePersistentFormDraft<T>({
  key,
  value,
  onRestore,
  enabled = true,
  debounceMs = 300,
}: PersistentFormDraftOptions<T>) {
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const generation = ++generationRef.current;
    setRestored(false);

    void loadFormDraft<T>(key).then((draft) => {
      if (cancelled || generation !== generationRef.current) return;
      if (draft) {
        onRestore(draft.value);
        setSavedAt(draft.savedAt);
      } else {
        setSavedAt(null);
      }
      setRestored(true);
    });

    return () => {
      cancelled = true;
    };
  }, [key, onRestore]);

  useEffect(() => {
    if (!enabled || !restored) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void saveFormDraft(key, value).then(setSavedAt);
    }, debounceMs);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [debounceMs, enabled, key, restored, value]);

  const clearDraft = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await clearFormDraft(key);
    setSavedAt(null);
  }, [key]);

  return {
    restored,
    savedAt,
    clearDraft,
  };
}
