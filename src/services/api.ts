import { triggerInvalidTokenEvent } from "../utils/authEvents";

const API_BASE_URL = "https://api.aquakart.co.in/v1/crm";
const ECOM_API_BASE_URL = "https://api.aquakart.co.in/v1/";
const ADMIN_API_BASE_URL = "https://api.aquakart.co.in/v1/admin";

interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: ApiErrorDetail[];
  status?: number;
  /** Backend error code (e.g. IMAGE_TOO_LARGE), or TIMEOUT / NETWORK_ERROR when no response arrived. */
  code?: string;
  /** Backend error stage (request, validation, cloudinary_upload, database, server). */
  stage?: string;
  /** Index of the failing photo in the order the request sent them. */
  photoIndex?: number;
}

class ApiService {
  constructor(private baseUrl: string) {}

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    try {
      const token = localStorage.getItem("auth_token");
      // FormData: the browser sets multipart/form-data with its boundary.
      const isForm =
        typeof FormData !== "undefined" && options?.body instanceof FormData;
      const headers: HeadersInit = {
        ...(!isForm && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      };

      const requestUrl = `${this.baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

      const response = await fetch(requestUrl, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message === "Token is not valid") {
          triggerInvalidTokenEvent();
        }

        const rawErrors = errorData.errors;
        const errors = Array.isArray(rawErrors)
          ? rawErrors
              .map((item: any) => ({
                field: item?.field ? String(item.field) : undefined,
                message: String(item?.message || "").trim(),
              }))
              .filter((item: ApiErrorDetail) => item.message)
          : rawErrors && typeof rawErrors === "object"
            ? Object.entries(rawErrors)
                .map(([field, message]) => ({
                  field,
                  message: String(message || "").trim(),
                }))
                .filter((item: ApiErrorDetail) => item.message)
            : undefined;

        return {
          error:
            errorData.message || `Request failed (HTTP ${response.status})`,
          errors,
          status: response.status,
          ...(typeof errorData.code === "string" && { code: errorData.code }),
          ...(typeof errorData.stage === "string" && {
            stage: errorData.stage,
          }),
          ...(Number.isInteger(errorData.photoIndex) && {
            photoIndex: errorData.photoIndex,
          }),
        };
      }

      const data = await response.json();
      if (
        data &&
        (data as { message?: string }).message === "Token is not valid"
      ) {
        triggerInvalidTokenEvent();
      }
      return { data };
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      // No response: an aborted/timed-out request, or fetch's TypeError for a
      // network/CORS failure.
      const code =
        name === "TimeoutError" || name === "AbortError"
          ? "TIMEOUT"
          : error instanceof TypeError
            ? "NETWORK_ERROR"
            : undefined;
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        ...(code && { code }),
      };
    }
  }

  async get<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", ...(options || {}) });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  /** multipart/form-data POST; aborts after timeoutMs. */
  async postForm<T>(
    endpoint: string,
    form: FormData,
    { timeoutMs }: { timeoutMs?: number } = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: form,
      ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }),
    });
  }

  /** multipart/form-data PUT; aborts after timeoutMs. */
  async putForm<T>(
    endpoint: string,
    form: FormData,
    { timeoutMs }: { timeoutMs?: number } = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: form,
      ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }),
    });
  }
}

export const api = new ApiService(API_BASE_URL);
export const ecomApi = new ApiService(ECOM_API_BASE_URL);
export const adminApi = new ApiService(ADMIN_API_BASE_URL);
