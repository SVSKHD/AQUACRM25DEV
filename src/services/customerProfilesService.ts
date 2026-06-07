import { api } from "./api";

export type CustomerSource = "online" | "offline" | "all";

const buildQuery = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
};

const safeKey = (key: string) => encodeURIComponent(key);

const splitName = (name = "") => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const toSchemaAddress = (input: any = {}) => {
  if (typeof input === "string") {
    return { street: input, city: "", state: "", postalCode: "" };
  }

  return {
    street: input.street || input.address || input.line1 || input.addressLine1 || input.fullAddress || "",
    city: input.city || "",
    state: input.state || "",
    postalCode: input.postalCode || input.pincode || input.pinCode || input.zip || "",
  };
};

const cleanObject = (object: Record<string, any>) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== ""));

const toOnlineUserSchemaPayload = (data: any = {}) => {
  const fallbackName = splitName(data.name || data.contact_name || data.company_name);
  const selectedAddress = data.selectedAddress ?? data.address;

  return cleanObject({
    firstName: data.firstName ?? fallbackName.firstName,
    lastName: data.lastName ?? fallbackName.lastName,
    email: data.email,
    phone: data.phone,
    alternativeEmail: data.alternativeEmail,
    dob: data.dob,
    role: data.role,
    isEmailVerfied: data.isEmailVerfied,
    ismobileLoginConfirmation: data.ismobileLoginConfirmation,
    selectedAddress: selectedAddress !== undefined ? toSchemaAddress(selectedAddress) : undefined,
    addresses: Array.isArray(data.addresses) ? data.addresses.map(toSchemaAddress) : undefined,
    gstDetails: data.gstDetails
      ? cleanObject({
          gstEmail: data.gstDetails.gstEmail,
          gstNo: data.gstDetails.gstNo,
          gstPhone: data.gstDetails.gstPhone,
          gstAddres: data.gstDetails.gstAddres,
        })
      : undefined,
  });
};

const toOfflineInvoiceCustomerPayload = (data: any = {}) => ({
  name: data.name || [data.firstName, data.lastName].filter(Boolean).join(" "),
  email: data.email,
  phone: data.phone,
  address:
    data.address ||
    data.selectedAddress?.street ||
    [data.selectedAddress?.city, data.selectedAddress?.state, data.selectedAddress?.postalCode]
      .filter(Boolean)
      .join(", "),
  customerDetails: {
    name: data.name || [data.firstName, data.lastName].filter(Boolean).join(" "),
    email: data.email,
    phone: data.phone,
    address:
      data.address ||
      data.selectedAddress?.street ||
      [data.selectedAddress?.city, data.selectedAddress?.state, data.selectedAddress?.postalCode]
        .filter(Boolean)
        .join(", "),
  },
});

export const customerProfilesService = {
  list(params: { source?: CustomerSource; search?: string; page?: number; limit?: number } = {}) {
    return api.get(`/customer-profiles${buildQuery(params)}`);
  },

  getOnline(id: string) {
    return api.get(`/customer-profiles/online/${safeKey(id)}`);
  },

  createOnline(data: any) {
    return api.post("/customer-profiles/online", toOnlineUserSchemaPayload(data));
  },

  updateOnline(id: string, data: any) {
    return api.put(`/customer-profiles/online/${safeKey(id)}`, toOnlineUserSchemaPayload(data));
  },

  patchOnline(id: string, data: any) {
    return api.patch(`/customer-profiles/online/${safeKey(id)}`, toOnlineUserSchemaPayload(data));
  },

  deleteOnline(id: string) {
    return api.delete(`/customer-profiles/online/${safeKey(id)}`);
  },

  replaceOnlineAddresses(id: string, addresses: any[]) {
    return api.put(`/customer-profiles/online/${safeKey(id)}/addresses`, { addresses: addresses.map(toSchemaAddress) });
  },

  createOnlineAddress(id: string, data: any) {
    return api.post(`/customer-profiles/online/${safeKey(id)}/addresses`, toSchemaAddress(data));
  },

  updateOnlineAddress(id: string, addressId: string, data: any) {
    return api.put(`/customer-profiles/online/${safeKey(id)}/addresses/${safeKey(addressId)}`, toSchemaAddress(data));
  },

  patchOnlineAddress(id: string, addressId: string, data: any) {
    return api.patch(`/customer-profiles/online/${safeKey(id)}/addresses/${safeKey(addressId)}`, toSchemaAddress(data));
  },

  deleteOnlineAddress(id: string, addressId: string) {
    return api.delete(`/customer-profiles/online/${safeKey(id)}/addresses/${safeKey(addressId)}`);
  },

  createOnlineReview(id: string, data: any) {
    return api.post(`/customer-profiles/online/${safeKey(id)}/reviews`, data);
  },

  updateOnlineReview(id: string, reviewId: string, data: any) {
    return api.put(`/customer-profiles/online/${safeKey(id)}/reviews/${safeKey(reviewId)}`, data);
  },

  patchOnlineReview(id: string, reviewId: string, data: any) {
    return api.patch(`/customer-profiles/online/${safeKey(id)}/reviews/${safeKey(reviewId)}`, data);
  },

  deleteOnlineReview(id: string, reviewId: string) {
    return api.delete(`/customer-profiles/online/${safeKey(id)}/reviews/${safeKey(reviewId)}`);
  },

  getOffline(key: string) {
    return api.get(`/customer-profiles/offline/${safeKey(key)}`);
  },

  createOffline(data: any) {
    return api.post("/customer-profiles/offline", toOfflineInvoiceCustomerPayload(data));
  },

  updateOffline(key: string, data: any) {
    return api.put(`/customer-profiles/offline/${safeKey(key)}`, toOfflineInvoiceCustomerPayload(data));
  },

  patchOffline(key: string, data: any) {
    return api.patch(`/customer-profiles/offline/${safeKey(key)}`, toOfflineInvoiceCustomerPayload(data));
  },

  deleteOffline(key: string) {
    return api.delete(`/customer-profiles/offline/${safeKey(key)}?confirm=true`);
  },

  createOfflineReview(key: string, data: any) {
    return api.post(`/customer-profiles/offline/${safeKey(key)}/reviews`, data);
  },

  updateOfflineReview(key: string, invoiceId: string, data: any) {
    return api.put(`/customer-profiles/offline/${safeKey(key)}/reviews/${safeKey(invoiceId)}`, data);
  },

  patchOfflineReview(key: string, invoiceId: string, data: any) {
    return api.patch(`/customer-profiles/offline/${safeKey(key)}/reviews/${safeKey(invoiceId)}`, data);
  },

  deleteOfflineReview(key: string, invoiceId: string) {
    return api.delete(`/customer-profiles/offline/${safeKey(key)}/reviews/${safeKey(invoiceId)}`);
  },
};