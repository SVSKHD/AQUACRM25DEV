import { api } from "./api";
import { failure, type ServiceResult } from "./preInvoicesService";
import {
  normalizeLinkState,
  type PaymentLinkSourceKind,
  type PaymentLinkState,
} from "../utils/paymentLink";

// Payment links (payments.link.manage) on pre-invoices and quotations, plus
// reconcile (payments.reconcile). The CRM never sends an amount: the server
// takes it from the document. The `url` from create() is the only copy of
// the token; callers keep it in dialog state and never log or store it.

type Transport = Pick<typeof api, "get" | "post" | "delete">;

/**
 * What the backend did about WhatsApp when the link was created:
 * queued (sent automatically), not_configured (template unset on the
 * server), disabled (notifyCustomer: false), null (older backend).
 */
export type CustomerNotification =
  "queued" | "not_configured" | "disabled" | null;

export type CreatedPaymentLink = {
  link: PaymentLinkState;
  url: string;
  customerNotification: CustomerNotification;
};

export type SentPaymentLink = {
  channel: string;
  sentAt: string | null;
  link: PaymentLinkState | null;
};

const NOTIFICATIONS: readonly string[] = [
  "queued",
  "not_configured",
  "disabled",
];

const SEGMENT: Record<PaymentLinkSourceKind, string> = {
  pre_invoice: "pre-invoices",
  quotation: "quotations",
};

const linkPath = (kind: PaymentLinkSourceKind, id: string) =>
  `/${SEGMENT[kind]}/${encodeURIComponent(id)}/payment-link`;

type Envelope = { success?: boolean; data?: unknown };

const unexpected = { error: "The server sent an unexpected response." };

// A made-up id that can't exist: the probe answers 404 with the permission
// and 403 without it, and never creates anything.
const PROBE_ID = "000000000000000000000000";

export const createPaymentLinksService = (transport: Transport = api) => ({
  /** Latest link (without its URL), or null when none was ever made. */
  async get(
    kind: PaymentLinkSourceKind,
    id: string,
  ): Promise<ServiceResult<PaymentLinkState | null>> {
    const response = await transport.get<Envelope>(linkPath(kind, id));
    if (response.error) return failure(response);
    const data = (response.data?.data || {}) as { link?: unknown };
    return { data: normalizeLinkState(data.link) };
  },

  /**
   * Creates or regenerates (the previous link is revoked). No body, no
   * amount. The backend sends the new link to the customer on WhatsApp.
   */
  async create(
    kind: PaymentLinkSourceKind,
    id: string,
  ): Promise<ServiceResult<CreatedPaymentLink>> {
    const response = await transport.post<Envelope>(linkPath(kind, id));
    if (response.error) return failure(response);
    const raw = (response.data?.data || {}) as Record<string, unknown>;
    const link = normalizeLinkState(raw);
    const url = typeof raw.url === "string" ? raw.url : "";
    const notification = String(raw.customerNotification || "");
    const customerNotification = (
      NOTIFICATIONS.includes(notification) ? notification : null
    ) as CustomerNotification;
    return link && url
      ? { data: { link, url, customerNotification } }
      : unexpected;
  },

  /** "Send": the server re-sends the active link on WhatsApp (no url here). */
  async send(
    kind: PaymentLinkSourceKind,
    id: string,
  ): Promise<ServiceResult<SentPaymentLink>> {
    const response = await transport.post<Envelope>(
      `${linkPath(kind, id)}/send`,
    );
    if (response.error) return failure(response);
    const raw = (response.data?.data || {}) as Record<string, unknown>;
    if (raw.sent !== true) return unexpected;
    return {
      data: {
        channel: typeof raw.channel === "string" ? raw.channel : "whatsapp",
        sentAt: typeof raw.sentAt === "string" ? raw.sentAt : null,
        link: normalizeLinkState(raw.link),
      },
    };
  },

  async revoke(
    kind: PaymentLinkSourceKind,
    id: string,
  ): Promise<ServiceResult<{ revoked: number }>> {
    const response = await transport.delete<Envelope>(linkPath(kind, id));
    if (response.error) return failure(response);
    const data = (response.data?.data || {}) as { revoked?: unknown };
    return { data: { revoked: Number(data.revoked) || 0 } };
  },

  /** Retries verification and invoice creation for a payment attempt. */
  async reconcile(attemptId: string): Promise<ServiceResult<unknown>> {
    const response = await transport.post<Envelope>(
      `/payments/${encodeURIComponent(attemptId)}/reconcile`,
    );
    if (response.error) return failure(response);
    return { data: response.data?.data ?? null };
  },

  async probeManage(): Promise<boolean> {
    const response = await transport.get(linkPath("pre_invoice", PROBE_ID));
    return response.status !== 401 && response.status !== 403;
  },
});

export const paymentLinksService = createPaymentLinksService();
