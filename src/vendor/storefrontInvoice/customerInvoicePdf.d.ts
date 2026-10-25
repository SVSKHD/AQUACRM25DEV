export interface CustomerInvoicePdfResult {
  mode: "download" | "viewer";
  fileName: string;
}

/** Normalized public invoice (storefront shape), with catalogue product links. */
export type CustomerInvoice = Record<string, unknown> & {
  id: string;
  invoice_no: string;
  products: Record<string, unknown>[];
  total_amount: number;
};

export function toCustomerInvoice(
  rawInvoice: unknown,
  cataloguePayload?: unknown,
): CustomerInvoice;

export function downloadCustomerInvoicePdf(
  rawInvoice: unknown,
  cataloguePayload?: unknown,
): Promise<CustomerInvoicePdfResult>;
