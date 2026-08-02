import { renderToStaticMarkup } from "react-dom/server";
import { Clock, LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";
import CrmShell from "./CrmShell";

const noop = () => undefined;

describe("CrmShell", () => {
  it("renders the active workspace and contextual navigation server-side", () => {
    const html = renderToStaticMarkup(
      <CrmShell
        navigationItems={[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        ]}
        activeItemId="dashboard"
        activeItemLabel="Dashboard"
        onItemSelect={noop}
        moduleNavigation={{
          label: "Dashboard views",
          items: [{ id: "recent", label: "Recent", icon: Clock }],
          activeItemId: "recent",
          onItemSelect: noop,
        }}
        userEmail="qa@aquakart.co.in"
        theme="light"
        onToggleTheme={noop}
        onLock={noop}
        onSignOut={noop}
      >
        <p>Dashboard content</p>
      </CrmShell>,
    );

    expect(html).toContain("Aquakart CRM");
    expect(html).toContain("Dashboard views");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="crm-active-panel"');
    expect(html).toContain("Dashboard content");
  });

  it("keeps the mobile drawer closed in the initial render", () => {
    const html = renderToStaticMarkup(
      <CrmShell
        navigationItems={[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        ]}
        activeItemId="dashboard"
        activeItemLabel="Dashboard"
        onItemSelect={noop}
        userEmail="qa@aquakart.co.in"
        theme="dark"
        onToggleTheme={noop}
        onLock={noop}
        onSignOut={noop}
      >
        <p>Dashboard content</p>
      </CrmShell>,
    );

    expect(html).toContain('aria-controls="crm-mobile-navigation"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
  });
});
