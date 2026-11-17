// The one place that picks the backend API origin. Every API module
// (services/api.ts, notify, invoice import, GST report download, AI label)
// builds its URLs from API_ORIGIN.
//
// - `npm run dev` (Vite dev mode): the local backend, http://localhost:5300
//   (AQUAKARTBACKEND's default PORT; start it with `npm start` there).
// - Production builds (`npm run build`, `npm run preview`, deploys): the live
//   API, https://api.aquakart.co.in.
// - VITE_API_ORIGIN overrides both, e.g. to use another local port.
export const PRODUCTION_API_ORIGIN = "https://api.aquakart.co.in";
export const DEV_API_ORIGIN = "http://localhost:5300";

export const resolveApiOrigin = (env: {
  VITE_API_ORIGIN?: string;
  DEV?: boolean;
}): string =>
  (
    env.VITE_API_ORIGIN || (env.DEV ? DEV_API_ORIGIN : PRODUCTION_API_ORIGIN)
  ).replace(/\/+$/, "");

export const API_ORIGIN: string = resolveApiOrigin(import.meta.env);

export const API_BASE_URL = `${API_ORIGIN}/v1/crm`;
export const ECOM_API_BASE_URL = `${API_ORIGIN}/v1/`;
export const ADMIN_API_BASE_URL = `${API_ORIGIN}/v1/admin`;
export const NOTIFY_API_BASE_URL = `${API_ORIGIN}/v1/notify`;

// Public storefront origin (blog/product links). Same setting as
// quotationsService (VITE_ECOM_URL); defaults to production.
export const STOREFRONT_ORIGIN: string = (
  import.meta.env.VITE_ECOM_URL || "https://aquakart.co.in"
).replace(/\/$/, "");
