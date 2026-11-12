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
import { MAX_CATEGORY_PHOTOS } from "../../../services/categoryPhotos";

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

  const taxonomyContext = `${label}: ${form.title || "(untitled)"}${
    form.keywords
      ? `
Keywords: ${form.keywords}`
      : ""
  }
Description: ${String(form.description || "").slice(0, 1200) || "(none)"}
Store: Aquakart, Hyderabad (water softeners, purifiers, sand filters)`;

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

      footer={
        <div className="flex flex-wrap gap-3">
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
      }
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
            <AIFieldAnimation
              assist={{
                value: form.title,
                onChange: (title) => onChange({ title } as Partial<T>),
                context: `${kind} title`,
                maxChars: 80,
                suggest: {
                  label: `Suggest ${kind} title`,
                  instruction: `Write one short, search-friendly ${kind} name (2-5 words) for this store section:\n${taxonomyContext}`,
                },
              }}
            >
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
            <AIFieldAnimation
              assist={{
                value: form.keywords,
                onChange: (keywords) => onChange({ keywords } as Partial<T>),
                context: `comma-separated ${kind} SEO keywords`,
                suggest: {
                  label: "Suggest keywords",
                  instruction: `Write 6-10 comma-separated SEO keywords Indian shoppers search for this ${kind}:\n${taxonomyContext}`,
                },
              }}
            >
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
            <AIFieldAnimation
              assist={{
                value: form.description,
                onChange: (description) =>
                  onChange({ description } as Partial<T>),
                context: `${kind} description for the storefront`,
                maxChars: 1000,
                suggest: {
                  label: "Suggest description",
                  instruction: `Write a 2-3 sentence storefront description for this ${kind} that uses its main keyword naturally and helps buyers choose:\n${taxonomyContext}`,
                },
              }}
            >
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
              maxPhotos={kind === "category" ? MAX_CATEGORY_PHOTOS : undefined}
              hint={
                kind === "category"
                  ? "First photo is the primary image. Max 5MB each. A category needs at least one photo."
                  : undefined
              }
            />
          </FormSection>
        </form>
      </AIFieldAnimationScope>
    </ResizableFloatingSidebar>
  );
}
