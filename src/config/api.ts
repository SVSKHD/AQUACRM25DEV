const isDevMode = ["dev", "development"].includes(import.meta.env.MODE);

export const API_ORIGIN = isDevMode
  ? "http://localhost:5300"
  : "https://api.aquakart.co.in";

export const API_BASE_URL = `${API_ORIGIN}/v1/crm`;
export const ECOM_API_BASE_URL = `${API_ORIGIN}/v1/`;
export const NOTIFY_API_BASE_URL = `${API_ORIGIN}/v1/notify`;
