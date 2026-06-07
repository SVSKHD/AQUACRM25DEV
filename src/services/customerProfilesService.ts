import { api } from "./api";

export type CustomerSource = "online" | "offline" | "all";

const buildQuery = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
};

const safeKey = (key: string) => encodeURIComponent(key);

export const customerProfilesService = {
  list(params: { source?: CustomerSource; search?: string; page?: number; limit?: number } = {}) {
    return api.get(`/customer-profiles${buildQuery(params)}`);
  },

  getOnline(id: string) {
    return api.get(`/customer-profiles/online/${safeKey(id)}`);
  },

  createOnline(data: any) {
    return api.post("/customer-profiles/online", data);
  },

  updateOnline(id: string, data: any) {
    return api.put(`/customer-profiles/online/${safeKey(id)}`, data);
  },

  patchOnline(id: string, data: any) {
    return api.patch(`/customer-profiles/online/${safeKey(id)}`, data);
  },

  deleteOnline(id: string) {
    return api.delete(`/customer-profiles/online/${safeKey(id)}`);
  },

  replaceOnlineAddresses(id: string, addresses: any[]) {
    return api.put(`/customer-profiles/online/${safeKey(id)}/addresses`, { addresses });
  },

  createOnlineAddress(id: string, data: any) {
    return api.post(`/customer-profiles/online/${safeKey(id)}/addresses`, data);
  },

  updateOnlineAddress(id: string, addressId: string, data: any) {
    return api.put(`/customer-profiles/online/${safeKey(id)}/addresses/${safeKey(addressId)}`, data);
  },

  patchOnlineAddress(id: string, addressId: string, data: any) {
    return api.patch(`/customer-profiles/online/${safeKey(id)}/addresses/${safeKey(addressId)}`, data);
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
    return api.post("/customer-profiles/offline", data);
  },

  updateOffline(key: string, data: any) {
    return api.put(`/customer-profiles/offline/${safeKey(key)}`, data);
  },

  patchOffline(key: string, data: any) {
    return api.patch(`/customer-profiles/offline/${safeKey(key)}`, data);
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
