import { describe, expect, it } from "vitest";
import type { EasyDraft } from "../services/easyInvoiceDrafts";
import { deviceLabel } from "./deviceInfo";
import {
  editorText,
  listNotices,
  lockedByOther,
  takeoverOfThisDevice,
  timeAgo,
} from "./easyDrafts";

const NOW = new Date("2026-11-27T10:00:00Z").getTime();
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

const editor = (overrides = {}) => ({
  name: "Ravi K",
  deviceLabel: "iPhone · Safari",
  since: ago(120),
  heartbeatAt: ago(5),
  sameStaff: false,
  thisDevice: false,
  ...overrides,
});

const draft = (overrides: Partial<EasyDraft> = {}): EasyDraft => ({
  id: "d1",
  status: "open",
  rev: 1,
  invoiceId: "",
  title: "Hithesh Svsk",
  phone: "",
  itemCount: 1,
  total: 65000,
  createdBy: { name: "Ravi K" },
  updatedBy: { name: "Ravi K" },
  createdAt: ago(600),
  updatedAt: ago(60),
  devices: [],
  lock: { live: false, mine: false, editor: null },
  events: [],
  ...overrides,
});

describe("deviceLabel", () => {
  it("names the platform and browser", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone · Safari");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0",
      ),
    ).toBe("Windows · Edge");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
      ),
    ).toBe("Android phone · Chrome");
    // iPadOS reports itself as a Mac with touch.
    expect(
      deviceLabel(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        5,
      ),
    ).toBe("iPad · Safari");
  });
});

describe("timeAgo", () => {
  it("reads like a person would say it", () => {
    expect(timeAgo(ago(10), NOW)).toBe("just now");
    expect(timeAgo(ago(240), NOW)).toBe("4 min ago");
    expect(timeAgo(ago(2 * 3600), NOW)).toBe("2 h ago");
    expect(timeAgo(ago(30 * 3600), NOW)).toBe("yesterday");
    expect(timeAgo(undefined, NOW)).toBe("");
  });
});

describe("who is editing", () => {
  it("words the editor for other staff and for my other device", () => {
    expect(editorText(editor())).toBe("Ravi K is editing on iPhone · Safari");
    expect(editorText(editor({ sameStaff: true }))).toBe(
      "You're editing this on iPhone · Safari",
    );
    expect(
      lockedByOther(
        draft({ lock: { live: true, mine: false, editor: editor() } }),
      ),
    ).toBe(true);
    expect(
      lockedByOther(
        draft({
          lock: {
            live: true,
            mine: true,
            editor: editor({ thisDevice: true }),
          },
        }),
      ),
    ).toBe(false);
  });

  it("finds a takeover of this device after it opened the draft", () => {
    const events = [
      {
        type: "taken_over" as const,
        name: "Sita",
        deviceLabel: "Windows · Chrome",
        fromName: "Ravi K",
        at: ago(5),
        byThisDevice: false,
        fromThisDevice: true,
      },
    ];
    expect(takeoverOfThisDevice(events, ago(60))?.name).toBe("Sita");
    // An old takeover from before this session doesn't count.
    expect(takeoverOfThisDevice(events, ago(1))).toBeNull();
  });
});

describe("listNotices", () => {
  it("is quiet on the first load", () => {
    expect(listNotices(null, [draft()])).toEqual([]);
  });

  it("tells when someone starts editing a draft", () => {
    const next = draft({ lock: { live: true, mine: false, editor: editor() } });
    expect(listNotices([draft()], [next])).toEqual([
      "Ravi K started editing “Hithesh Svsk” on iPhone · Safari.",
    ]);
  });

  it("tells when a draft is taken over", () => {
    const before = draft({
      lock: { live: true, mine: false, editor: editor() },
    });
    const after = draft({
      lock: {
        live: true,
        mine: false,
        editor: editor({ name: "Sita", deviceLabel: "Windows · Chrome" }),
      },
      events: [
        {
          type: "taken_over",
          name: "Sita",
          deviceLabel: "Windows · Chrome",
          fromName: "Ravi K",
          at: ago(2),
          byThisDevice: false,
          fromThisDevice: false,
        },
      ],
    });
    expect(listNotices([before], [after])).toEqual([
      "Sita took over “Hithesh Svsk” from Ravi K.",
    ]);
  });

  it("ignores this device and unchanged editors", () => {
    const mine = draft({
      lock: {
        live: true,
        mine: true,
        editor: editor({ thisDevice: true, sameStaff: true }),
      },
    });
    expect(listNotices([draft()], [mine])).toEqual([]);
    const editing = draft({
      lock: { live: true, mine: false, editor: editor() },
    });
    expect(listNotices([editing], [editing])).toEqual([]);
  });

  it("tells when a draft someone was editing is finished or discarded", () => {
    const editing = draft({
      lock: { live: true, mine: false, editor: editor() },
    });
    expect(listNotices([editing], [])).toEqual([
      "“Hithesh Svsk” was finished or discarded.",
    ]);
  });
});
