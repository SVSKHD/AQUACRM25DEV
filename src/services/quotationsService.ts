import { api } from "./api";

export type QuotationProductPayload = {
  productId?: string;
  productName: string;
  productDescription?: string;
  productSerialNo?: string;
  productQuantity: number;
  productPrice: number;
  productDiscount?: number;
  productTax?: number;
};

export type QuotationPayload = {
  validUntil?: string;
  customer?: string;
  customerDetails: {
    name: string;
    phone: string | number;
    email?: string;
    address?: string;
  };
  gst: boolean;
  gstDetails?: {
    gstName?: string;
    gstNo?: string;
    gstPhone?: string | number;
    gstEmail?: string;
    gstAddress?: string;
  };
  products: QuotationProductPayload[];
  discount?: number;
  tax?: number;
  notes?: string;
  terms?: string;
  status?: string;
};

export type QuotationListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  gst?: string;
  customer?: string;
};

const buildQuery = (params: Record<string, unknown> = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return query ? `?${query}` : "";
};

export const quotationsService = {
  getAll(params: QuotationListParams = {}) {
    return api.get(`/quotations${buildQuery(params)}`);
  },

  getById(id: string) {
    return api.get(`/quotations/${id}`);
  },

  create(payload: QuotationPayload) {
    return api.post("/quotations", payload);
  },

  update(id: string, payload: QuotationPayload) {
    return api.put(`/quotations/${id}`, payload);
  },

  updateStatus(id: string, status: string) {
    return api.patch(`/quotations/${id}/status`, { status });
  },

  delete(id: string) {
    return api.delete(`/quotations/${id}`);
  },
};
