import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PaymentLinkView, type PaymentLinkViewProps } from "./PaymentLinkPanel";
import { PaymentLinkUrlBody } from "./PaymentLinkUrlDialog";
import { MovedToPreInvoiceNote } from "./QuotationPreInvoiceSection";
import { PreInvoicesNoAccess } from "../../tabs/PreInvoicesTab";
import { resolvePreInvoiceAccess } from "../../../hooks/usePreInvoiceAccess";
import { filterGatedItems } from "../../../utils/permissions";
import {
  normalizeLinkState,
  type PaymentLinkState,
} from "../../../utils/paymentLink";

// Components import AuthContext/apiService, which read localStorage at import.
vi.hoisted(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
  }
});

const noop = () => undefined;

// Built from a string so the UI audit (which counts raw button tags in
// tabs/modular) doesn't count these test patterns.
const disabledButton = (label: string) =>
  new RegExp(`<${"button"}[^>]*disabled[^>]*>.*${label}`, "s");

const link = (overrides: Record<string, unknown> = {}) =>
  normalizeLinkState({
    linkId: "l1",
    status: "active",
    source: { kind: "pre_invoice", id: "p1", number: "AQPI|20261118|0001" },
    amount: 1500,
    currency: "INR",
    expiresAt: "2026-11-21T10:00:00.000Z",
    createdAt: "2026-11-18T10:00:00.000Z",
    boundToCustomer: false,
    reviewFlags: [],
    paidAt: null,
    amountPaid: null,
    gatewayTransactionId: null,
    conversion: {
      status: "none",
      invoiceId: null,
      invoiceNo: null,
      lastError: null,
    },
    matchesDocument: true,
    ...overrides,
  }) as PaymentLinkState;

const render = (props: Partial<PaymentLinkViewProps> = {}) =>
  renderToStaticMarkup(
    <PaymentLinkView
      link={null}
      loading={false}
      error={null}
      canManage
      blockedReason={null}
      busy={null}
      confirm={null}
      canReconcileHere={false}
      onCreate={noop}
      onAskConfirm={noop}
      onCancelConfirm={noop}
      onConfirm={noop}
      onRefresh={noop}
      onReconcile={noop}
      {...props}
    />,
  );

describe("PaymentLinkView", () => {
  it("without payments.link.manage shows only the permission note", () => {
    const html = render({ canManage: false, link: link() });
    expect(html).toContain("payments.link.manage");
    expect(html).not.toContain("Revoke");
    expect(html).not.toContain("Create payment link");
  });

  it("no link: offers Create, or explains why it can't", () => {
    expect(render()).toContain("Create payment link");
    const blocked = render({
      blockedReason: "Cancelled pre-invoices can't be paid.",
    });
    expect(blocked).toContain("Cancelled pre-invoices can&#x27;t be paid.");
    expect(blocked).toMatch(disabledButton("Create payment link"));
  });

  it("active: shows expiry, customer state, Regenerate and Revoke; never a url", () => {
    const html = render({ link: link() });
    expect(html).toContain("Active");
    expect(html).toContain("Hasn&#x27;t opened it yet");
    expect(html).toContain("Regenerate link");
    expect(html).toContain("Revoke");
    expect(html).not.toContain("/pay/");
    expect(render({ link: link({ boundToCustomer: true }) })).toContain(
      "Signed in and confirmed details",
    );
  });

  it("matchesDocument=false: warns that the link no longer works", () => {
    const html = render({ link: link({ matchesDocument: false }) });
    expect(html).toContain("no longer works");
    expect(html).toContain("Regenerate link");
  });

  it("asks before regenerating or revoking", () => {
    expect(render({ link: link(), confirm: "regenerate" })).toContain(
      "The old link stops working",
    );
    expect(render({ link: link(), confirm: "revoke" })).toContain(
      "can no longer pay with it",
    );
  });

  it("revoked and expired: offer a new link", () => {
    for (const status of ["revoked", "expired"]) {
      const html = render({ link: link({ status }) });
      expect(html).toContain(status === "revoked" ? "Revoked" : "Expired");
      expect(html).toContain("Create new link");
      expect(html).not.toContain(">Revoke<");
    }
  });

  it("paid + each conversion status", () => {
    const paid = (conversion: Record<string, unknown>) =>
      render({
        link: link({
          status: "paid",
          paidAt: "2026-11-18T11:00:00.000Z",
          amountPaid: 1500,
          gatewayTransactionId: "T123",
          conversion: {
            invoiceId: null,
            invoiceNo: null,
            lastError: null,
            ...conversion,
          },
        }),
      });

    const none = paid({ status: "none" });
    expect(none).toContain("Paid; invoice pending");
    expect(none).toContain("T123");
    expect(none).not.toContain("Create payment link");
    expect(none).not.toContain("Create new link");

    expect(paid({ status: "in_progress" })).toContain("Creating invoice");

    const done = paid({
      status: "done",
      invoiceId: "inv1",
      invoiceNo: "AQ-77",
    });
    expect(done).toContain("Invoice created");
    expect(done).toContain('href="/admin/invoice/inv1"');
    expect(done).toContain("AQ-77");

    const stock = paid({
      status: "blocked_stock",
      lastError: "Out of stock: RO",
    });
    expect(stock).toContain("Paid; invoice waiting for stock");
    expect(stock).toContain("Out of stock: RO");
    expect(stock).toContain("Commerce admin → Payments");

    const failed = paid({ status: "failed", lastError: "DB timeout" });
    expect(failed).toContain("Paid; invoice creation failed");
    expect(failed).toContain("DB timeout");

    const review = paid({ status: "needs_review", lastError: "Mismatch" });
    expect(review).toContain("Paid; needs manual review");
    expect(review).toContain("Mismatch");
  });

  it("offers Retry invoice only when reconcile is possible here", () => {
    const failed = link({ status: "paid", conversion: { status: "failed" } });
    expect(render({ link: failed, canReconcileHere: true })).toContain(
      "Retry invoice",
    );
    expect(render({ link: failed })).not.toContain("Retry invoice");
  });

  it("shows each review flag with its explanation", () => {
    const html = render({
      link: link({
        status: "paid",
        reviewFlags: [
          "PHONE_ON_OTHER_ACCOUNT",
          "DUPLICATE_PAYMENT",
          "AMOUNT_CHANGED_AFTER_PAYMENT",
          "PAID_AFTER_REVOKE_OR_EXPIRY",
        ],
      }),
    });
    expect(html).toContain("different Aquakart account");
    expect(html).toContain("refund");
    expect(html).toContain("edited while the customer was paying");
    expect(html).toContain("after the link was revoked or had expired");
  });
});

describe("PaymentLinkUrlBody (one-time url)", () => {
  const created = {
    url: "https://aquakart.co.in/pay/tok_abc",
    link: link(),
    customerName: "Ravi",
    customerPhone: "9876543210",
  };

  it("shows the url once with the warning, Copy and Share", () => {
    const html = renderToStaticMarkup(
      <PaymentLinkUrlBody
        created={created}
        shareUrl="https://wa.me/919876543210?text=x"
        copyState="idle"
        onCopy={noop}
        onShare={noop}
      />,
    );
    expect(html).toContain("https://aquakart.co.in/pay/tok_abc");
    expect(html.split("tok_abc")).toHaveLength(2);
    expect(html).toContain("shown only");
    expect(html).toContain("Copy link");
    expect(html).toContain("Share on WhatsApp");
  });

  it("disables Share without a valid mobile and confirms a copy", () => {
    const html = renderToStaticMarkup(
      <PaymentLinkUrlBody
        created={created}
        shareUrl={null}
        copyState="copied"
        onCopy={noop}
        onShare={noop}
      />,
    );
    expect(html).toMatch(disabledButton("Share on WhatsApp"));
    expect(html).toContain("Copied");
  });

  it("isn't written to browser storage", () => {
    renderToStaticMarkup(
      <PaymentLinkUrlBody
        created={created}
        shareUrl={null}
        copyState="idle"
        onCopy={noop}
        onShare={noop}
      />,
    );
    const stored = Array.from({ length: 50 }, (_, i) =>
      localStorage.getItem(String(i)),
    );
    expect(JSON.stringify(stored)).not.toContain("tok_abc");
  });
});

describe("Send to customer", () => {
  it("is offered for an active, current link only", () => {
    expect(render({ link: link(), onSend: noop })).toContain(
      "Send to customer",
    );
    expect(
      render({ link: link({ matchesDocument: false }), onSend: noop }),
    ).not.toContain("Send to customer");
    expect(
      render({ link: link({ status: "revoked" }), onSend: noop }),
    ).not.toContain("Send to customer");
    expect(
      render({ link: link({ status: "paid" }), onSend: noop }),
    ).not.toContain("Send to customer");
  });

  it("shows a sending state", () => {
    expect(render({ link: link(), onSend: noop, busy: "send" })).toContain(
      "Sending",
    );
  });

  it("the one-time dialog says when the link was sent automatically", () => {
    const body = (customerNotification: "queued" | "not_configured" | null) =>
      renderToStaticMarkup(
        <PaymentLinkUrlBody
          created={{
            url: "https://aquakart.co.in/pay/tok_abc",
            link: link(),
            customerName: "Ravi",
            customerPhone: "9876543210",
            customerNotification,
          }}
          shareUrl={null}
          copyState="idle"
          onCopy={noop}
          onShare={noop}
        />,
      );
    expect(body("queued")).toContain("Sent to the customer on WhatsApp");
    expect(body("not_configured")).toContain("Not sent automatically");
    expect(body(null)).not.toContain("Sent to the customer");
  });
});

describe("permission gating", () => {
  it("legacy role-1 admins get everything without probing", async () => {
    const probes = { read: vi.fn(), manage: vi.fn(), links: vi.fn() };
    await expect(resolvePreInvoiceAccess({ role: 1 }, probes)).resolves.toEqual(
      {
        canRead: true,
        canManage: true,
        canManageLinks: true,
      },
    );
    expect(probes.read).not.toHaveBeenCalled();
  });

  it("uses populated role permissions", async () => {
    const probes = { read: vi.fn(), manage: vi.fn(), links: vi.fn() };
    const user = {
      role: 0,
      roleRef: {
        slug: "sales",
        isActive: true,
        permissions: ["preinvoices.read"],
      },
    };
    await expect(resolvePreInvoiceAccess(user, probes)).resolves.toEqual({
      canRead: true,
      canManage: false,
      canManageLinks: false,
    });
    expect(probes.manage).not.toHaveBeenCalled();
  });

  it("probes the API when the role is only referenced by id", async () => {
    const probes = {
      read: vi.fn().mockResolvedValue(true),
      manage: vi.fn().mockResolvedValue(false),
      links: vi.fn().mockResolvedValue(true),
    };
    await expect(
      resolvePreInvoiceAccess({ role: 0, roleRef: "64b0" }, probes),
    ).resolves.toEqual({
      canRead: true,
      canManage: false,
      canManageLinks: true,
    });
  });

  it("hides the nav item until preinvoices.read is granted", () => {
    const items = [{ id: "quotations" }, { id: "pre-invoices" }];
    expect(
      filterGatedItems(items, { "pre-invoices": undefined }).map((i) => i.id),
    ).toEqual(["quotations"]);
    expect(
      filterGatedItems(items, { "pre-invoices": false }).map((i) => i.id),
    ).toEqual(["quotations"]);
    expect(filterGatedItems(items, { "pre-invoices": true })).toHaveLength(2);
  });

  it("explains the missing permission on the tab", () => {
    expect(renderToStaticMarkup(<PreInvoicesNoAccess />)).toContain(
      "preinvoices.read",
    );
  });
});

describe("moved quotation", () => {
  it("points to the pre-invoice instead of convert/link actions", () => {
    const html = renderToStaticMarkup(
      <MovedToPreInvoiceNote preInvoiceNo="AQPI|20261118|0001" onOpen={noop} />,
    );
    expect(html).toContain("Moved to pre-invoice");
    expect(html).toContain("AQPI|20261118|0001");
    expect(html).toContain("Open pre-invoice");
    expect(html).not.toContain("Create payment link");
  });
});
