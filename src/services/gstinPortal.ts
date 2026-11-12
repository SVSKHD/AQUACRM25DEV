import { api, type ApiResponse } from "./api";

/** A taxpayer record from the GST portal (via the backend's Masters India lookup). */
export interface GstTaxpayer {
  gstin: string;
  legalName: string;
  tradeName: string;
  /** e.g. "Active", "Cancelled", "Suspended". */
  status: string;
  constitution: string;
  taxpayerType: string;
  registeredOn: string;
  cancelledOn: string;
  address: string;
  state: string;
  pincode: string;
  source: string;
  fetchedAt: string;
  cached?: boolean;
}

type Transport = Pick<typeof api, "get">;

/**
 * GET /v1/crm/admin/gstin/:gstin. Never throws: returns `{ data }` or
 * `{ error, code }` where code is one of GSTIN_INVALID, GSTIN_NOT_FOUND,
 * GSTIN_LOOKUP_DISABLED, GSTIN_PROVIDER_* , TIMEOUT or NETWORK_ERROR.
 */
export const lookupGstinOnPortal = async (
  gstin: string,
  transport: Transport = api,
): Promise<ApiResponse<GstTaxpayer>> => {
  const response = await transport.get<{
    success?: boolean;
    data?: GstTaxpayer;
    message?: string;
  }>(`/admin/gstin/${encodeURIComponent(gstin)}`, {
    signal: AbortSignal.timeout(25000),
  });
  if (response.error) {
    const code =
      response.code ||
      (response.status === 404 ? "GSTIN_NOT_FOUND" : undefined);
    return {
      error:
        code === "TIMEOUT"
          ? "The GST portal took too long to answer."
          : code === "NETWORK_ERROR"
            ? "Couldn't reach the server for the GST portal lookup."
            : response.error,
      status: response.status,
      ...(code && { code }),
    };
  }
  const taxpayer = response.data?.data;
  if (!taxpayer || !(taxpayer.legalName || taxpayer.tradeName))
    return {
      error: "The GST portal returned no details for this GSTIN.",
      code: "GSTIN_NOT_FOUND",
    };
  return { data: taxpayer };
};
