import { triggerInvalidTokenEvent } from "../utils/authEvents";

const API_BASE_URL = "https://api.aquakart.co.in/v1/crm";
const ECOM_API_BASE_URL = "https://api.aquakart.co.in/v1/";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  constructor(private baseUrl: string) {}

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
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
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message === "Token is not valid") {
          triggerInvalidTokenEvent();
        }
        throw new Error(errorData.message || "Request failed");
      }

      const data = await response.json();
      if (data && (data as any).message === "Token is not valid") {
        triggerInvalidTokenEvent();
      }
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
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

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiService(API_BASE_URL);
export const ecomApi = new ApiService(ECOM_API_BASE_URL);
