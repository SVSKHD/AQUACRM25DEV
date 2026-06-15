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

const isMongoObjectId = (value?: string) => Boolean(value && /^[a-f\d]{24}$/i.test(value));

const sanitizeQuotationPayload = (payload: QuotationPayload): QuotationPayload => ({
  ...payload,
  products: payload.products.map((product) => {
    const cleanedProduct: QuotationProductPayload = {
      ...product,
      productName: product.productName?.trim() || "",
      productDescription: product.productDescription?.trim() || undefined,
      productSerialNo: product.productSerialNo?.trim() || undefined,
      productQuantity: Number(product.productQuantity) || 1,
      productPrice: Number(product.productPrice) || 0,
      productDiscount: Number(product.productDiscount) || 0,
      productTax: Number(product.productTax) || 0,
    };

    if (isMongoObjectId(product.productId)) {
      cleanedProduct.productId = product.productId;
    } else {
      delete cleanedProduct.productId;
    }

    return cleanedProduct;
  }),
});

export const quotationsService = {
  getAll(params: QuotationListParams = {}) {
    return api.get(`/quotations${buildQuery(params)}`);
  },

  getById(id: string) {
    return api.get(`/quotations/${id}`);
  },

  getPublicById(id: string) {
    return api.get(`/quotations/public/${id}`);
  },

  create(payload: QuotationPayload) {
    return api.post("/quotations", sanitizeQuotationPayload(payload));
  },

  update(id: string, payload: QuotationPayload) {
    return api.put(`/quotations/${id}`, sanitizeQuotationPayload(payload));
  },

  updateStatus(id: string, status: string) {
    return api.put(`/quotations/${id}`, { status });
  },

  delete(id: string) {
    return api.delete(`/quotations/${id}`);
  },
};
