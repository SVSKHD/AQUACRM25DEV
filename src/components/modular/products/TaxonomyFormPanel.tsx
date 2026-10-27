import { useEffect, useState, type FormEvent } from "react";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import FormSection from "../../ui/FormSection";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidTextarea,
  SidebarRequestBanner,
  type LiquidDropdownOption,
  type RequestState,
} from "../../ui/liquid";
import AICatalogSuggestions from "../../ai/AICatalogSuggestions";
import AIFieldAnimation, {
  AIFieldAnimationScope,
} from "../../ai/AIFieldAnimation";
import PhotoUploader from "./PhotoUploader";
import type { CatalogPhoto } from "../../../utils/productList";

export type TaxonomyFormValue = {
  title: string;
  description: string;
  keywords: string;
  photos: CatalogPhoto[];
  category_id?: string;
};

/**
 * Editor for a category or a subcategory. A subcategory passes `parentOptions`
 * and gets a required parent-category picker.
 */
export default function TaxonomyFormPanel<T extends TaxonomyFormValue>({
  kind,
  open,
  editing,
  form,
  parentOptions,
  onChange,
  onSubmit,
  onClose,
  onClearDraft,
  onPhotoError,
}: {
  kind: "category" | "subcategory";
  open: boolean;
  editing: boolean;
  form: T;
  parentOptions?: LiquidDropdownOption[];
  onChange: (patch: Partial<T>) => void;
  /** Resolves to an error message, or "" when saved. */
  onSubmit: () => Promise<string>;
  onClose: () => void;
  onClearDraft: () => void;
  onPhotoError: (message: string) => void;
}) {
  const label = kind === "category" ? "Category" : "Subcategory";
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRequestState("idle");
    setRequestError("");
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (requestState === "loading") return;
    setRequestState("loading");
    setRequestError("");
    const message = await onSubmit();
    setRequestState(message ? "error" : "idle");
    setRequestError(message);
  };

  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${label}` : `Add New ${label}`}
      subtitle={
        kind === "category"
          ? "Manage category details, keywords, photos, and description."
          : "Manage parent category, keywords, photos, and description."
      }
      widthStorageKey={`aquacrm:${kind}-editor-width`}
      initialWidth={520}
      minWidth={420}
      maxWidth={760}
    >
      <SidebarRequestBanner
        state={requestState}
        message={requestError}
        title={`${label} not saved`}
        onDismiss={() => {
          setRequestState("idle");
          setRequestError("");
        }}
      />
      <AIFieldAnimationScope>
        <form id={`${kind}-form`} onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
            Draft auto-saves locally. Closing keeps your work.
          </div>
          <AICatalogSuggestions
            kind={kind}
            value={{
              title: form.title,
              description: form.description,
              keywords: form.keywords,
            }}
            onApply={(changes) => onChange(changes as Partial<T>)}
          />

          <FormSection title="Details">
            {parentOptions && (
              <LiquidDropdown
                label="Parent category *"
                value={form.category_id || ""}
                options={parentOptions}
                placeholder="Select category"
                searchPlaceholder="Search categories…"
                searchable
                onChange={(category_id) =>
                  onChange({ category_id } as Partial<T>)
                }
              />
            )}
            <AIFieldAnimation>
              <LiquidInput
                label={`${label} title`}
                wrapperClassName="w-full"
                type="text"
                value={form.title}
                onChange={(event) =>
                  onChange({ title: event.target.value } as Partial<T>)
                }
                required
              />
            </AIFieldAnimation>
            <AIFieldAnimation>
              <LiquidTextarea
                label="Keywords"
                value={form.keywords}
                onChange={(event) =>
                  onChange({ keywords: event.target.value } as Partial<T>)
                }
                rows={2}
                placeholder="Enter keywords separated by commas"
              />
            </AIFieldAnimation>
            <AIFieldAnimation>
              <LiquidTextarea
                label="Description"
                value={form.description}
                onChange={(event) =>
                  onChange({ description: event.target.value } as Partial<T>)
                }
                rows={4}
              />
            </AIFieldAnimation>
          </FormSection>

          <FormSection title="Photos">
            <PhotoUploader
              id={`${kind}-photos`}
              photos={form.photos}
              onChange={(photos) => onChange({ photos } as Partial<T>)}
              onError={onPhotoError}
            />
          </FormSection>
        </form>
      </AIFieldAnimationScope>

      <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
        <LiquidButton
          type="submit"
          form={`${kind}-form`}
          variant="primary"
          className="min-w-[8rem] flex-1"
          requestState={requestState}
          loadingLabel="Saving…"
        >
          {editing ? `Update ${label}` : `Add ${label}`}
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="soft"
          onClick={onClose}
          className="flex-1"
        >
          Close
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="danger"
          onClick={onClearDraft}
          className="flex-1"
        >
          Clear draft
        </LiquidButton>
      </div>
    </ResizableFloatingSidebar>
  );
}
