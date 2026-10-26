// API origin for the modules that read it (notify service, AI assistant label).
// Defaults to production, matching src/services/api.ts, which hardcodes the
// production API. Set VITE_API_ORIGIN (e.g. http://localhost:5300) to point
// these at a local backend.
export const API_ORIGIN: string =
  import.meta.env.VITE_API_ORIGIN || "https://api.aquakart.co.in";

export const API_BASE_URL = `${API_ORIGIN}/v1/crm`;
export const ECOM_API_BASE_URL = `${API_ORIGIN}/v1/`;
export const NOTIFY_API_BASE_URL = `${API_ORIGIN}/v1/notify`;
