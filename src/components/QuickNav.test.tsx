import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import QuickNav from "./QuickNav";
import { QUICK_ACTIONS } from "../config/quickActions";

// No DOM in this test setup: render to markup. Effects (shortcuts, drag)
// don't run here; they need a browser.
const render = (path = "/dashboard") =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <QuickNav />
    </MemoryRouter>,
  );

const setPointer = (fine: boolean) => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      matchMedia: () => ({
        matches: fine,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    },
  });
};

afterEach(() => {
  // @ts-expect-error test cleanup of the window stub
  delete globalThis.window;
});

describe("QuickNav", () => {
  it("offers Quick invoice → /invoice/easy with Alt+Q", () => {
    expect(QUICK_ACTIONS[0]).toMatchObject({
      label: "Quick invoice",
      to: "/invoice/easy",
      key: "q",
    });
  });

  it("desktop: right-edge dock with tooltips and the shortcut", () => {
    setPointer(true);
    const html = render();
    expect(html).toContain('class="qn-dock"');
    expect(html).toContain('aria-label="Quick actions"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("<strong>Quick invoice</strong>");
    expect(html).toContain("Paste details and create an invoice");
    expect(html).toContain("<kbd>Alt+Q</kbd>");
    // Collapsed until hovered or clicked.
    expect(html).toMatch(/role="menu" hidden=""/);
  });

  it("touch: draggable bubble with visible labels instead of tooltips", () => {
    setPointer(false);
    const html = render();
    expect(html).toContain("qn-touch");
    expect(html).toContain('class="qn-bubble"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("<strong>Quick invoice</strong>");
    expect(html).not.toContain('role="tooltip"');
  });

  it("marks the current page", () => {
    setPointer(false);
    const html = render("/invoice/easy");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("You&#x27;re here");
  });
});
