import { api, type ApiResponse } from "./api";
import {
  normalizeEnvStatus,
  normalizeEnvVariable,
  type EnvSaveBody,
  type EnvStatus,
  type EnvVariable,
} from "../utils/aquaEnv";

// /v1/crm/env — runtime configuration stored encrypted in "aqua-env".
// settings.read: list/get; settings.manage: save/remove. Calls never throw.
// Values travel only in request bodies (never URLs) and are never logged.

type Transport = Pick<typeof api, "get" | "put" | "delete">;

type Envelope = {
  success?: boolean;
  data?: unknown;
  status?: unknown;
  restartNote?: string;
};

type Result<T> = Pick<ApiResponse<T>, "data" | "error" | "status" | "code">;

export type EnvList = { variables: EnvVariable[]; status: EnvStatus };
export type EnvSaveResult = { variable: EnvVariable; restartNote: string };
export type EnvDeleteResult = {
  key: string;
  fallback: "server-env" | "none";
  restartNote: string;
};

const keyPath = (key: string) => `/env/${encodeURIComponent(key)}`;

const failure = <T>(response: ApiResponse<unknown>): Result<T> => ({
  error: response.error,
  status: response.status,
  code: response.code,
});

export const createAquaEnvService = (transport: Transport = api) => ({
  async list(): Promise<Result<EnvList>> {
    const response = await transport.get<Envelope>("/env");
    if (response.error) return failure(response);
    const body = response.data || {};
    const variables = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeEnvVariable)
      .filter((item): item is EnvVariable => item !== null);
    return {
      data: { variables, status: normalizeEnvStatus(body.status) },
    };
  },

  async save(key: string, body: EnvSaveBody): Promise<Result<EnvSaveResult>> {
    const response = await transport.put<Envelope>(keyPath(key), body);
    if (response.error) return failure(response);
    const variable = normalizeEnvVariable(response.data?.data);
    if (!variable) return { error: "The server sent an unexpected response." };
    return {
      data: { variable, restartNote: response.data?.restartNote || "" },
    };
  },

  async remove(key: string): Promise<Result<EnvDeleteResult>> {
    const response = await transport.delete<Envelope>(keyPath(key));
    if (response.error) return failure(response);
    const data = (response.data?.data || {}) as {
      key?: string;
      fallback?: string;
    };
    return {
      data: {
        key: data.key || key,
        fallback: data.fallback === "server-env" ? "server-env" : "none",
        restartNote: response.data?.restartNote || "",
      },
    };
  },

  /** true unless the server says 401/403 for settings.read. */
  async probeRead(): Promise<boolean> {
    const { status } = await transport.get("/env");
    return status !== 403 && status !== 401;
  },

  /**
   * settings.manage check that can't write anything: the permission
   * middleware answers 403 first; with permission the invalid key name is
   * refused with 400 INVALID_KEY before any lookup or write.
   */
  async probeManage(): Promise<boolean> {
    const { status } = await transport.put("/env/__probe", {});
    return status !== 403 && status !== 401;
  },
});

export const aquaEnvService = createAquaEnvService();
