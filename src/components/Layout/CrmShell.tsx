import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu } from "lucide-react";
import CrmSidebar from "./CrmSidebar";
import type { CrmNavigationItem, CrmSubNavigation } from "./CrmSidebar";

type CrmShellProps = {
  navigationItems: CrmNavigationItem[];
  activeItemId: string;
  activeItemLabel: string;
  onItemSelect: (itemId: string) => void;
  moduleNavigation?: CrmSubNavigation;
  userEmail?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLock: () => void;
  onSignOut: () => void;
  children: ReactNode;
};

export default function CrmShell({
  navigationItems,
  activeItemId,
  activeItemLabel,
  onItemSelect,
  moduleNavigation,
  userEmail,
  theme,
  onToggleTheme,
  onLock,
  onSignOut,
  children,
}: CrmShellProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!mobileDrawerOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleDrawerKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDrawerKeyDown);
    };
  }, [mobileDrawerOpen]);

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const handleMobileNavigation = (itemId: string) => {
    onItemSelect(itemId);
    closeMobileDrawer();
  };

  return (
    <div className="crm-shell-bg liquid-bg">
      <a href="#crm-active-panel" className="crm-skip-link">
        Skip to active content
      </a>

      <div className="crm-mobile-launcher md:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="crm-mobile-menu-button"
          aria-label="Open navigation menu"
          aria-expanded={mobileDrawerOpen}
          aria-controls="crm-mobile-navigation"
        >
          <Menu aria-hidden="true" />
        </button>
      </div>

      <div className="crm-shell-grid">
        <aside
          className="crm-desktop-sidebar hidden md:block"
          aria-label="Aquakart CRM sidebar"
          data-expanded="false"
        >
          <CrmSidebar
            idPrefix="crm-desktop"
            items={navigationItems}
            activeItemId={activeItemId}
            onItemSelect={onItemSelect}
            moduleNavigation={moduleNavigation}
            expanded={false}
            userEmail={userEmail}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onLock={onLock}
            onSignOut={onSignOut}
          />
        </aside>

        <main id="crm-main-content" className="crm-content-panel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={activeItemId}
              id="crm-active-panel"
              role="tabpanel"
              aria-label={activeItemLabel}
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
              className="crm-content-inner"
            >
              {children}
            </motion.section>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            className="crm-mobile-drawer-layer md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <button
              type="button"
              className="crm-mobile-drawer-backdrop"
              onClick={closeMobileDrawer}
              aria-label="Close navigation menu"
              tabIndex={-1}
            />
            <motion.aside
              ref={mobileDrawerRef}
              id="crm-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Aquakart CRM navigation"
              className="crm-mobile-drawer"
              initial={{ x: reduceMotion ? 0 : "-105%" }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : "-105%" }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            >
              <CrmSidebar
                idPrefix="crm-mobile"
                items={navigationItems}
                activeItemId={activeItemId}
                onItemSelect={handleMobileNavigation}
                moduleNavigation={
                  moduleNavigation
                    ? {
                        ...moduleNavigation,
                        onItemSelect: (itemId) => {
                          moduleNavigation.onItemSelect(itemId);
                          closeMobileDrawer();
                        },
                      }
                    : undefined
                }
                expanded
                mobile
                onClose={closeMobileDrawer}
                closeButtonRef={closeButtonRef}
                userEmail={userEmail}
                theme={theme}
                onToggleTheme={onToggleTheme}
                onLock={() => {
                  closeMobileDrawer();
                  onLock();
                }}
                onSignOut={() => {
                  closeMobileDrawer();
                  onSignOut();
                }}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
