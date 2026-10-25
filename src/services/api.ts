import { triggerInvalidTokenEvent } from "../utils/authEvents";

import { API_BASE_URL, ECOM_API_BASE_URL } from "../config/api";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  /** HTTP status of a failed request (undefined for network errors). */
  status?: number;
}

class ApiService {
  constructor(private baseUrl: string) {}

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    let status: number | undefined;
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        status = response.status;
        const errorData = await response.json().catch(() => ({}));
        // Staff endpoints answer 401 for any expired/invalid session.
        if (
          errorData.message === "Token is not valid" ||
          (response.status === 401 && token)
        ) {
          triggerInvalidTokenEvent();
        }
        // Validation responses put the specific reason in errors[0].message.
        const detail = errorData.errors?.[0]?.message;
        throw new Error(
          detail && detail !== errorData.message
            ? `${errorData.message ? `${errorData.message}: ` : ""}${detail}`
            : errorData.message || "Request failed",
        );
      }

      const data = await response.json();
      if (data && (data as any).message === "Token is not valid") {
        triggerInvalidTokenEvent();
      }
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status,
      };
    }
  }

  async get<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", ...(options || {}) });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    data?: any,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    data?: any,
  ): Promise<ApiResponse<T>> {
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
}

export const api = new ApiService(API_BASE_URL);
export const ecomApi = new ApiService(ECOM_API_BASE_URL);
