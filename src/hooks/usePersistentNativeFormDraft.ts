import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import {
  clearFormDraft,
  loadFormDraft,
  saveFormDraft,
} from "./usePersistentFormDraft";

type NativeFormSnapshot = {
  values: Record<string, string | string[]>;
  checked: Record<string, string[]>;
};

type NativeFormDraftOptions = {
  key: string;
  formRef: RefObject<HTMLFormElement | null>;
  enabled?: boolean;
  debounceMs?: number;
};

const shouldPersistControl = (
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) => {
  if (!element.name || element.disabled) return false;
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (
      ["password", "file", "hidden"].includes(type) ||
      element.autocomplete === "one-time-code"
    ) {
      return false;
    }
  }
  return true;
};

const snapshotForm = (form: HTMLFormElement): NativeFormSnapshot => {
  const values: Record<string, string | string[]> = {};
  const checked: Record<string, string[]> = {};
  const controls = Array.from(
    form.elements,
  ).filter(
    (
      element,
    ): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement,
  );

  controls.forEach((element) => {
    if (!shouldPersistControl(element)) return;

    if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    ) {
      if (!checked[element.name]) checked[element.name] = [];
      if (element.checked) checked[element.name].push(element.value || "on");
      return;
    }

    if (element instanceof HTMLSelectElement && element.multiple) {
      values[element.name] = Array.from(element.selectedOptions).map(
        (option) => option.value,
      );
      return;
    }

    values[element.name] = element.value;
  });

  return { values, checked };
};

const restoreForm = (form: HTMLFormElement, snapshot: NativeFormSnapshot) => {
  const controls = Array.from(
    form.elements,
  ).filter(
    (
      element,
    ): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement,
  );

  controls.forEach((element) => {
    if (!shouldPersistControl(element)) return;
    const name = element.name;

    if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    ) {
      element.checked = (snapshot.checked[name] || []).includes(
        element.value || "on",
      );
      return;
    }

    const value = snapshot.values[name];
    if (value === undefined) return;

    if (element instanceof HTMLSelectElement && element.multiple) {
      const selected = Array.isArray(value) ? value : [value];
      Array.from(element.options).forEach((option) => {
        option.selected = selected.includes(option.value);
      });
      return;
    }

    element.value = Array.isArray(value) ? value[0] || "" : value;
  });
};

export function usePersistentNativeFormDraft({
  key,
  formRef,
  enabled = true,
  debounceMs = 300,
}: NativeFormDraftOptions) {
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const form = formRef.current;
    if (!form) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void loadFormDraft<NativeFormSnapshot>(key).then((draft) => {
      if (cancelled || !draft || !formRef.current) return;
      restoreForm(formRef.current, draft.value);
      setSavedAt(draft.savedAt);
    });

    const scheduleSave = () => {
      if (!formRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const current = formRef.current;
        if (!current) return;
        const snapshot = snapshotForm(current);
        void saveFormDraft(key, snapshot).then(setSavedAt);
      }, debounceMs);
    };

    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      form.removeEventListener("input", scheduleSave);
      form.removeEventListener("change", scheduleSave);
    };
  }, [debounceMs, enabled, formRef, key]);

  const clearDraft = useCallback(async () => {
    await clearFormDraft(key);
    setSavedAt(null);
  }, [key]);

  const clearDraftAndReset = useCallback(async () => {
    await clearFormDraft(key);
    formRef.current?.reset();
    setSavedAt(null);
  }, [formRef, key]);

  return {
    savedAt,
    clearDraft,
    clearDraftAndReset,
  };
}
