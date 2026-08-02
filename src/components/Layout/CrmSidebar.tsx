import type { KeyboardEvent, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lock,
  LogOut,
  Moon,
  Sun,
  User,
  X,
} from "lucide-react";

export type CrmNavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type CrmSubNavigation = {
  label: string;
  items: CrmNavigationItem[];
  activeItemId: string;
  onItemSelect: (itemId: string) => void;
};

type CrmSidebarProps = {
  idPrefix: string;
  items: CrmNavigationItem[];
  activeItemId: string;
  onItemSelect: (itemId: string) => void;
  moduleNavigation?: CrmSubNavigation;
  expanded: boolean;
  mobile?: boolean;
  onToggleExpanded?: () => void;
  onClose?: () => void;
  closeButtonRef?: RefObject<HTMLButtonElement>;
  userEmail?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLock: () => void;
  onSignOut: () => void;
};

type NavigationListProps = {
  ariaLabel: string;
  idPrefix: string;
  items: CrmNavigationItem[];
  activeItemId: string;
  onItemSelect: (itemId: string) => void;
  compactClassName?: string;
  controlsId?: string;
};

function NavigationList({
  ariaLabel,
  idPrefix,
  items,
  activeItemId,
  onItemSelect,
  compactClassName = "",
  controlsId,
}: NavigationListProps) {
  const selectRelativeItem = (direction: -1 | 1) => {
    const currentIndex = Math.max(
      0,
      items.findIndex((item) => item.id === activeItemId),
    );
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    onItemSelect(items[nextIndex].id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      return;
    }

    const currentButton = (
      event.target as HTMLElement
    ).closest<HTMLButtonElement>("[data-navigation-index]");
    if (!currentButton) return;

    event.preventDefault();
    const currentIndex = Number(currentButton.dataset.navigationIndex || 0);
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % items.length;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    }

    const nextButton = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-navigation-index="${nextIndex}"]`,
    );
    nextButton?.focus();
    onItemSelect(items[nextIndex].id);
  };

  return (
    <div className="crm-navigation-cluster">
      <button
        type="button"
        className="crm-tab-stepper crm-tab-stepper-previous"
        onClick={() => selectRelativeItem(-1)}
        aria-label={`Previous ${ariaLabel} tab`}
        title="Previous tab"
      >
        <ChevronUp aria-hidden="true" />
      </button>

      <div
        className={`crm-navigation-list ${compactClassName}`}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="vertical"
        onKeyDown={handleKeyDown}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;

          return (
            <button
              key={item.id}
              id={`${idPrefix}-${item.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-controls={controlsId}
              aria-label={item.label}
              title={item.label}
              tabIndex={isActive ? 0 : -1}
              data-navigation-index={index}
              onClick={() => onItemSelect(item.id)}
              className={`crm-nav-item ${isActive ? "crm-nav-item-active" : ""}`}
            >
              <span className="crm-nav-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="crm-sidebar-label">{item.label}</span>
              {isActive && (
                <span className="crm-nav-active-marker" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="crm-tab-stepper crm-tab-stepper-next"
        onClick={() => selectRelativeItem(1)}
        aria-label={`Next ${ariaLabel} tab`}
        title="Next tab"
      >
        <ChevronDown aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CrmSidebar({
  idPrefix,
  items,
  activeItemId,
  onItemSelect,
  moduleNavigation,
  expanded,
  mobile = false,
  onToggleExpanded,
  onClose,
  closeButtonRef,
  userEmail,
  theme,
  onToggleTheme,
  onLock,
  onSignOut,
}: CrmSidebarProps) {
  return (
    <div className="crm-sidebar-panel" data-expanded={mobile || expanded}>
      <div className="crm-sidebar-brand">
        <div className="crm-sidebar-brand-lockup">
          <span className="crm-sidebar-logo-shell">
            <img src="/aqua-white.png" alt="" className="crm-sidebar-logo" />
          </span>
          <span className="crm-sidebar-brand-copy crm-sidebar-label">
            <strong>Aquakart CRM</strong>
            <small>Sales Management</small>
          </span>
        </div>

        {mobile ? (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="crm-sidebar-icon-button"
            aria-label="Close navigation menu"
            title="Close menu"
          >
            <X aria-hidden="true" />
          </button>
        ) : onToggleExpanded ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="crm-sidebar-icon-button crm-sidebar-toggle"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <ChevronLeft aria-hidden="true" />
            ) : (
              <ChevronRight aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      <div className="crm-sidebar-scroll custom-scrollbar">
        <nav aria-label="CRM navigation">
          <p className="crm-sidebar-section-label crm-sidebar-label">
            Workspace
          </p>
          <NavigationList
            ariaLabel="CRM sections"
            idPrefix={`${idPrefix}-main-tab`}
            items={items}
            activeItemId={activeItemId}
            onItemSelect={onItemSelect}
            controlsId="crm-active-panel"
          />
        </nav>

        {moduleNavigation && moduleNavigation.items.length > 0 && (
          <section
            className="crm-module-navigation"
            aria-label={moduleNavigation.label}
          >
            <p className="crm-sidebar-section-label crm-sidebar-label">
              {moduleNavigation.label}
            </p>
            <NavigationList
              ariaLabel={moduleNavigation.label}
              idPrefix={`${idPrefix}-module-tab`}
              items={moduleNavigation.items}
              activeItemId={moduleNavigation.activeItemId}
              onItemSelect={moduleNavigation.onItemSelect}
              compactClassName="crm-module-navigation-list"
              controlsId="crm-active-panel"
            />
          </section>
        )}
      </div>

      <div className="crm-sidebar-footer">
        <div className="crm-user-summary" title={userEmail || "Signed-in user"}>
          <span className="crm-user-avatar" aria-hidden="true">
            <User />
          </span>
          <span className="crm-user-copy crm-sidebar-label">
            <small>Signed in as</small>
            <strong>{userEmail || "Aquakart user"}</strong>
          </span>
        </div>

        <div className="crm-sidebar-actions">
          <button
            type="button"
            onClick={onLock}
            className="crm-sidebar-action"
            aria-label="Lock CRM"
            title="Lock CRM (Ctrl or Command + L)"
          >
            <Lock aria-hidden="true" />
            <span className="crm-sidebar-label">Lock</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="crm-sidebar-action"
            aria-label={
              theme === "light" ? "Use dark theme" : "Use light theme"
            }
            title={theme === "light" ? "Use dark theme" : "Use light theme"}
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" />
            ) : (
              <Sun aria-hidden="true" />
            )}
            <span className="crm-sidebar-label">
              {theme === "light" ? "Dark" : "Light"}
            </span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="crm-sidebar-action crm-sidebar-action-danger"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut aria-hidden="true" />
            <span className="crm-sidebar-label">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
