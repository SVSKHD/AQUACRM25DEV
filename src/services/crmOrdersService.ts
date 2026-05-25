import { api } from "./api";

export type CRMOrderProduct = {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
};

export type CRMOrderCustomer = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  pincode?: string;
  gstNumber?: string;
};

export type CRMOrderPayload = {
  orderDate: string;
  deliveryDate?: string | null;
  customer: CRMOrderCustomer;
  products: CRMOrderProduct[];
  discount?: number;
  deliveryCharge?: number;
  paymentStatus?: "pending" | "partial" | "paid" | "refunded";
  orderStatus?:
    | "new"
    | "confirmed"
    | "packed"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  source?: "crm" | "telegram" | "whatsapp" | "website" | "manual";
  notes?: string;
};

export type CRMOrder = CRMOrderPayload & {
  _id: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  invoiceId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CRMOrderListParams = {
  date?: string;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  phone?: string;
  search?: string;
  page?: number;
  limit?: number;
};

const buildQuery = (params: CRMOrderListParams = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const crmOrdersService = {
  getAll(params: CRMOrderListParams = {}) {
    return api.get<{
      status: boolean;
      data: CRMOrder[];
      no: number;
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/orders${buildQuery(params)}`);
  },

  getToday(params: Omit<CRMOrderListParams, "date"> = {}) {
    return api.get<{ status: boolean; data: CRMOrder[]; no: number }>(
      `/orders/today${buildQuery(params)}`,
    );
  },

  getTomorrow(params: Omit<CRMOrderListParams, "date"> = {}) {
    return api.get<{ status: boolean; data: CRMOrder[]; no: number }>(
      `/orders/tomorrow${buildQuery(params)}`,
    );
  },

  getRange(params: { from: string; to: string } & CRMOrderListParams) {
    return api.get<{ status: boolean; data: CRMOrder[]; no: number }>(
      `/orders/range${buildQuery(params)}`,
    );
  },

  getById(id: string) {
    return api.get<{ status: boolean; data: CRMOrder }>(`/orders/${id}`);
  },

  create(payload: CRMOrderPayload) {
    return api.post<{ status: boolean; data: CRMOrder; message: string }>(
      "/orders",
      payload,
    );
  },

  update(id: string, payload: CRMOrderPayload) {
    return api.put<{ status: boolean; data: CRMOrder; message: string }>(
      `/orders/${id}`,
      payload,
    );
  },

  updateStatus(
    id: string,
    payload: Pick<CRMOrderPayload, "orderStatus" | "paymentStatus">,
  ) {
    return api.put<{ status: boolean; data: CRMOrder; message: string }>(
      `/orders/${id}`,
      payload,
    );
  },
};
