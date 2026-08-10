/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminApi } from "./api";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  pagination?: Pagination;
};
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
};

export const commerceAdminService = {
  permissions: () => adminApi.get<ApiEnvelope<string[]>>("/permissions"),
  roles: () => adminApi.get<ApiEnvelope<any[]>>("/roles"),
  createRole: (body: any) => adminApi.post<ApiEnvelope<any>>("/roles", body),
  updateRole: (id: string, body: any) =>
    adminApi.patch<ApiEnvelope<any>>(`/roles/${id}`, body),
  archiveRole: (id: string) =>
    adminApi.delete<ApiEnvelope<any>>(`/roles/${id}`),

  staff: () => adminApi.get<ApiEnvelope<any[]>>("/staff"),
  createStaff: (body: any) => adminApi.post<ApiEnvelope<any>>("/staff", body),
  updateStaff: (id: string, body: any) =>
    adminApi.patch<ApiEnvelope<any>>(`/staff/${id}`, body),
  setStaffStatus: (id: string, status: "active" | "disabled") =>
    adminApi.patch<ApiEnvelope<any>>(`/staff/${id}/status`, { status }),

  coupons: (page = 1, status = "") =>
    adminApi.get<ApiEnvelope<any[]>>(
      `/coupons${query({ page, limit: 5, status })}`,
    ),
  createCoupon: (body: any) =>
    adminApi.post<ApiEnvelope<any>>("/coupons", body),
  updateCoupon: (id: string, body: any) =>
    adminApi.patch<ApiEnvelope<any>>(`/coupons/${id}`, body),
  archiveCoupon: (id: string) =>
    adminApi.delete<ApiEnvelope<any>>(`/coupons/${id}`),
  couponRedemptions: (id: string) =>
    adminApi.get<ApiEnvelope<any[]>>(`/coupons/${id}/redemptions`),

  campaigns: () => adminApi.get<ApiEnvelope<any[]>>("/campaigns"),
  createCampaign: (body: any) =>
    adminApi.post<ApiEnvelope<any>>("/campaigns", body),
  updateCampaign: (id: string, body: any) =>
    adminApi.patch<ApiEnvelope<any>>(`/campaigns/${id}`, body),
  referrals: () => adminApi.get<ApiEnvelope<any[]>>("/referrals"),
  rewards: () => adminApi.get<ApiEnvelope<any[]>>("/rewards"),
  setRewardStatus: (id: string, status: string, reason?: string) =>
    adminApi.patch<ApiEnvelope<any>>(`/rewards/${id}/status`, {
      status,
      reason,
    }),

  payments: (page = 1) =>
    adminApi.get<ApiEnvelope<any[]>>(`/payments${query({ page, limit: 5 })}`),
  reconcilePayment: (id: string) =>
    adminApi.post<ApiEnvelope<any>>(`/payments/${id}/reconcile`),
  gateways: () => adminApi.get<ApiEnvelope<any[]>>("/payment-gateways"),
  updateGateway: (key: string, body: any) =>
    adminApi.put<ApiEnvelope<any>>(`/payment-gateways/${key}`, body),
  auditLogs: () => adminApi.get<ApiEnvelope<any[]>>("/audit-logs"),
};
