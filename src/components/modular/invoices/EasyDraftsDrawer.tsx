import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { EasyDraft } from "../../../services/easyInvoiceDrafts";
import { lockedByOther } from "../../../utils/easyDrafts";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import { LiquidButton, LiquidInput } from "../../ui/liquid";
import EasyDraftsList from "./EasyDraftsList";

type Filter = "all" | "editing" | "free";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "editing", label: "Editing now" },
  { key: "free", label: "Free" },
];

/** Words of the search must all appear in the title, phone or staff names. */
const matches = (draft: EasyDraft, query: string) => {
  const haystack = [
    draft.title,
    draft.phone,
    draft.createdBy.name,
    draft.updatedBy.name,
    draft.lock.editor?.name,
    ...draft.devices.map((device) => `${device.label} ${device.name}`),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

/**
 * "Drafts left off" in a non-modal drawer: no backdrop, the page stays
 * usable beside it (the page makes room for it on wide screens). Same live
 * list as the page (all staff).
 */
export default function EasyDraftsDrawer({
  open,
  onClose,
  drafts,
  loading,
  error,
  activeId,
  busyId,
  onOpen,
  onDiscard,
  onNew,
  onWidthChange,
}: {
  open: boolean;
  onClose: () => void;
  drafts: EasyDraft[];
  loading: boolean;
  error: string;
  activeId: string;
  busyId: string;
  onOpen: (draft: EasyDraft) => void;
  onDiscard: (draft: EasyDraft) => void;
  onNew: () => void;
  onWidthChange?: (width: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const others = useMemo(
    () => drafts.filter((draft) => draft.id !== activeId),
    [drafts, activeId],
  );
  const editingCount = others.filter((draft) => draft.lock.live).length;
  const shown = others.filter(
    (draft) =>
      (filter === "all" ||
        (filter === "editing" ? draft.lock.live : !draft.lock.live)) &&
      matches(draft, query),
  );
  const filtered = Boolean(query.trim()) || filter !== "all";

  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={onClose}
      modal={false}
      onWidthChange={onWidthChange}
      widthStorageKey="easy-invoice:drafts-drawer-width"
      initialWidth={460}
      minWidth={420}
      title="Drafts left off"
      subtitle={
        loading && !drafts.length
          ? "Loading…"
          : `${others.length} open${editingCount ? ` · ${editingCount} being edited now` : ""} · shared with all staff · updates live`
      }
      toolbar={
        <div className="easy-drawer-toolbar">
          <label className="easy-drawer-search">
            <Search className="h-4 w-4" aria-hidden="true" />
            <LiquidInput
              aria-label="Search drafts"
              placeholder="Search name, phone, staff or device"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            className="easy-drawer-filters"
            role="group"
            aria-label="Show drafts"
          >
            {FILTERS.map((option) => (
              <LiquidButton
                key={option.key}
                type="button"
                variant={filter === option.key ? "primary" : "ghost"}
                aria-pressed={filter === option.key}
                onClick={() => setFilter(option.key)}
              >
                {option.label}
                {option.key === "editing" && editingCount > 0 && (
                  <span className="easy-drawer-count">{editingCount}</span>
                )}
              </LiquidButton>
            ))}
          </div>
        </div>
      }
      footer={
        <div className="easy-drawer-footer">
          <p className="easy-small">
            A draft locks to one device while it is edited. Others can view it
            live or take it over.
          </p>
          <LiquidButton type="button" variant="primary" onClick={onNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New invoice
          </LiquidButton>
        </div>
      }
    >
      <div className="easy-drawer">
        <EasyDraftsList
          drafts={shown}
          loading={loading}
          error={error}
          activeId={activeId}
          busyId={busyId}
          onOpen={onOpen}
          onDiscard={onDiscard}
          emptyText={
            filtered
              ? "No drafts match. Clear the search or pick another filter."
              : "No drafts left off. Anything you paste on Easy invoice is saved here automatically."
          }
        />
        {others.some(lockedByOther) && (
          <p className="easy-small easy-drawer-note">
            Drafts with an amber badge are being edited on another device. Open
            one to watch it live, or take it over.
          </p>
        )}
      </div>
    </ResizableFloatingSidebar>
  );
}
