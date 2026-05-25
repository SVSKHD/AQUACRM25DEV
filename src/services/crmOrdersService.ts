import { api } from "./api";

export type CRMOrderProduct = {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  image?: string;
  productSlug?: string;
  productLink?: string;
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
  paymentStatus?: "pending" | "partial" | "paid" | "refunded" | "failed" | "processing";
  orderStatus?:
    | "new"
    | "pending"
    | "confirmed"
    | "processing"
    | "packed"
    | "shipped"
    | "out_for_delivery"
    | "completed"
    | "delivered"
    | "cancelled";
  source?: "crm" | "telegram" | "whatsapp" | "website" | "manual";
  notes?: string;
};

export type CRMOrder = CRMOrderPayload & {
  _id: string;
  sourceCollection?: "AquaOrder" | "AquaCRMOrder";
  orderNumber: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  grandTotal: number;
  invoiceId?: string | null;
  invoiceUrl?: string;
  invoiceCreated?: boolean;
  aquakartOnlineUser?: boolean;
  invoiceCreatedAt?: string | null;
  paymentMethod?: string;
  transactionId?: string;
  rawOrderStatus?: string;
  rawPaymentStatus?: string;
  raw?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type CRMOrderListParams = {
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  phone?: string;
  search?: string;
  page?: number;
  limit?: number;
};

const BASE_PATH = "/ecom-orders";

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
      success?: boolean;
      sourceCollection?: string;
      data: CRMOrder[];
      no: number;
      rawCount?: number;
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`${BASE_PATH}${buildQuery(params)}`);
  },

  getToday(params: Omit<CRMOrderListParams, "date"> = {}) {
    return api.get<{ status: boolean; data: CRMOrder[]; no: number }>(
      `${BASE_PATH}/today${buildQuery(params)}`,
    );
  },

  getTomorrow(params: Omit<CRMOrderListParams, "date"> = {}) {
    return api.get<{ status: boolean; data: CRMOrder[]; no: number }>(
      `${BASE_PATH}/tomorrow${buildQuery(params)}`,
    );
  },

  getRange(params: { from: string; to: string } & CRMOrderListParams) {
    return api.get<{ status: boolean; data: CRMOrder[]; no: number }>(
      `${BASE_PATH}${buildQuery(params)}`,
    );
  },

  getById(id: string) {
    return api.get<{ status: boolean; data: CRMOrder }>(`${BASE_PATH}/${id}`);
  },

  create(payload: CRMOrderPayload) {
    return api.post<{ status: boolean; data: CRMOrder; message: string }>(
      "/orders",
      payload,
    );
  },

  update(id: string, payload: CRMOrderPayload) {
    return api.put<{ status: boolean; data: CRMOrder; message: string }>(
      `${BASE_PATH}/${id}`,
      payload,
    );
  },

  updateStatus(
    id: string,
    payload: Pick<CRMOrderPayload, "orderStatus" | "paymentStatus" | "notes" | "deliveryDate">,
  ) {
    return api.put<{ status: boolean; data: CRMOrder; message: string }>(
      `${BASE_PATH}/${id}/status`,
      payload,
    );
  },

  createInvoice(orderId: string) {
    return api.post<{
      status: boolean;
      success?: boolean;
      alreadyCreated?: boolean;
      message: string;
      data: any;
      invoiceId: string;
      invoiceUrl: string;
    }>(`${BASE_PATH}/${orderId}/create-invoice`, {});
  },
};
