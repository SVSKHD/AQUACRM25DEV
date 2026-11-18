import { api, type ApiResponse } from "./api";
import {
  normalizePreInvoice,
  type PreInvoice,
  type PreInvoicePayload,
} from "../utils/preInvoice";
import {
  normalizeLinkState,
  type PaymentLinkState,
} from "../utils/paymentLink";

// /v1/crm/pre-invoices. preinvoices.read: list/get; preinvoices.manage:
// create/update/cancel and moving a quotation. Calls never throw. Totals come
// from the server only.

type Transport = Pick<typeof api, "get" | "post" | "patch">;

export type ServiceResult<T> = Pick<
  ApiResponse<T>,
  "data" | "error" | "status" | "code" | "details"
>;

export type PreInvoiceListParams = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PreInvoiceList = { items: PreInvoice[]; pagination: Pagination };

export type PreInvoiceWithLink = {
  preInvoice: PreInvoice;
  paymentLink: PaymentLinkState | null;
};

export type MovedQuotation = PreInvoiceWithLink & {
  quotationLinksRevoked: number;
};

type Envelope = { success?: boolean; data?: unknown; pagination?: unknown };

export const failure = <T>(
  response: ApiResponse<unknown>,
): ServiceResult<T> => ({
  error: response.error || "Request failed",
  status: response.status,
  code: response.code,
  details: response.details,
});

const query = (params: Record<string, unknown>) => {
  const parts = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return parts.length ? `?${parts.join("&")}` : "";
};

const idPath = (id: string) => `/pre-invoices/${encodeURIComponent(id)}`;

const withLink = (raw: unknown): PreInvoiceWithLink | null => {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const preInvoice = normalizePreInvoice(data.preInvoice);
  if (!preInvoice) return null;
  return { preInvoice, paymentLink: normalizeLinkState(data.paymentLink) };
};

const unexpected = { error: "The server sent an unexpected response." };

export const createPreInvoicesService = (transport: Transport = api) => ({
  async list(
    params: PreInvoiceListParams = {},
  ): Promise<ServiceResult<PreInvoiceList>> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const response = await transport.get<Envelope>(
      `/pre-invoices${query({ ...params, limit })}`,
    );
    if (response.error) return failure(response);
    const body = response.data || {};
    const items = (Array.isArray(body.data) ? body.data : [])
      .map(normalizePreInvoice)
      .filter((item): item is PreInvoice => item !== null);
    const pagination = (body.pagination || {}) as Partial<Pagination>;
    return {
      data: {
        items,
        pagination: {
          page: Number(pagination.page) || params.page || 1,
          limit: Number(pagination.limit) || limit,
          total: Number(pagination.total) || items.length,
          totalPages: Math.max(Number(pagination.totalPages) || 1, 1),
        },
      },
    };
  },

  async get(id: string): Promise<ServiceResult<PreInvoiceWithLink>> {
    const response = await transport.get<Envelope>(idPath(id));
    if (response.error) return failure(response);
    const data = withLink(response.data?.data);
    return data ? { data } : unexpected;
  },

  async create(
    body: PreInvoicePayload,
  ): Promise<ServiceResult<PreInvoiceWithLink>> {
    const response = await transport.post<Envelope>("/pre-invoices", body);
    if (response.error) return failure(response);
    const data = withLink(response.data?.data);
    return data ? { data } : unexpected;
  },

  /** Partial update. Returns the updated pre-invoice and its link state. */
  async update(
    id: string,
    body: PreInvoicePayload,
  ): Promise<ServiceResult<PreInvoiceWithLink>> {
    const response = await transport.patch<Envelope>(idPath(id), body);
    if (response.error) return failure(response);
    const data = withLink(response.data?.data);
    return data ? { data } : unexpected;
  },

  /** Cancels: the server revokes the payment link and frees the quotation. */
  cancel(id: string) {
    return this.update(id, { status: "Cancelled" });
  },

  async moveQuotation(
    quotationId: string,
  ): Promise<ServiceResult<MovedQuotation>> {
    const response = await transport.post<Envelope>(
      `/quotations/${encodeURIComponent(quotationId)}/pre-invoice`,
      {},
    );
    if (response.error) return failure(response);
    const data = withLink(response.data?.data);
    if (!data) return unexpected;
    const raw = (response.data?.data || {}) as Record<string, unknown>;
    return {
      data: {
        ...data,
        quotationLinksRevoked: Number(raw.quotationLinksRevoked) || 0,
      },
    };
  },

  /** false only when the server says 401/403 for preinvoices.read. */
  async probeRead(): Promise<boolean> {
    const response = await transport.get("/pre-invoices?limit=1");
    return response.status !== 401 && response.status !== 403;
  },

  /**
   * POST with an empty body: 403 → no preinvoices.manage. With the permission
   * the server answers 400 VALIDATION_FAILED and creates nothing.
   */
  async probeManage(): Promise<boolean> {
    const response = await transport.post("/pre-invoices", {});
    return response.status === 400;
  },
});

export const preInvoicesService = createPreInvoicesService();
