import { API_BASE_URL } from "../config/api";
import { currentDevice } from "../utils/deviceInfo";
import { api, type ApiResponse } from "./api";

/*
 * Shared Easy invoice drafts (/v1/crm/easy-invoice-drafts, backend
 * AQUAKARTBACKEND feat/easy-invoice-drafts). One editor at a time; the lock
 * is kept alive by heartbeats and is free after 45 s without one.
 * Calls resolve to { data?, error?, code?, details? } and never throw.
 */

export const DRAFTS_PATH = "/easy-invoice-drafts";

export interface DraftEditor {
  name: string;
  deviceLabel: string;
  since: string;
  heartbeatAt: string;
  sameStaff: boolean;
  thisDevice: boolean;
}

export interface DraftDevice {
  label: string;
  name: string;
  firstSeenAt: string;
  lastSeenAt: string;
  thisDevice: boolean;
}

export type DraftEventType =
  "created" | "claimed" | "taken_over" | "released" | "completed" | "discarded";

export interface DraftEvent {
  type: DraftEventType;
  name: string;
  deviceLabel: string;
  fromName: string;
  at: string;
  byThisDevice: boolean;
  fromThisDevice: boolean;
}

export interface EasyDraft<C = unknown> {
  id: string;
  status: "open" | "done" | "discarded";
  rev: number;
  invoiceId: string;
  title: string;
  phone: string;
  itemCount: number;
  total: number;
  createdBy: { name: string };
  updatedBy: { name: string };
  createdAt: string;
  updatedAt: string;
  devices: DraftDevice[];
  lock: { live: boolean; mine: boolean; editor: DraftEditor | null };
  events: DraftEvent[];
  content?: C;
}

type Reply<T> = { success?: boolean; data?: T };

/** Unwraps { data } and explains a missing backend route. */
const unwrap = <T>(response: ApiResponse<Reply<T>>): ApiResponse<T> => {
  if (response.status === 404 && !response.code)
    return {
      ...response,
      data: undefined,
      error:
        "Shared drafts aren't available on the server yet. Deploy the backend update; work is kept on this device meanwhile.",
      code: "DRAFTS_UNAVAILABLE",
    };
  if (response.status === 403)
    return {
      ...response,
      data: undefined,
      error: "You need the invoices.manage permission for shared drafts.",
    };
  if (response.error) return { ...response, data: undefined };
  return { data: response.data?.data };
};

type Transport = Pick<typeof api, "get" | "post" | "put" | "delete">;
type Device = { deviceId: string; deviceLabel: string };

const path = (id: string, suffix = "") =>
  `${DRAFTS_PATH}/${encodeURIComponent(id)}${suffix}`;

/** Factory, so tests can pass a mocked transport and device. */
export function createEasyDraftsService(
  transport: Transport = api,
  device: () => Device = currentDevice,
) {
  const deviceQuery = () => {
    const current = device();
    return `deviceId=${encodeURIComponent(current.deviceId)}&deviceLabel=${encodeURIComponent(current.deviceLabel)}`;
  };

  return {
    list: async () =>
      unwrap(
        await transport.get<Reply<EasyDraft[]>>(
          `${DRAFTS_PATH}?${deviceQuery()}`,
        ),
      ),

    get: async <C>(id: string) =>
      unwrap(
        await transport.get<Reply<EasyDraft<C>>>(
          `${path(id)}?${deviceQuery()}`,
        ),
      ),

    create: async <C>(content: C) =>
      unwrap(
        await transport.post<Reply<EasyDraft<C>>>(DRAFTS_PATH, {
          ...device(),
          content,
        }),
      ),

    save: async <C>(id: string, content: C) =>
      unwrap(
        await transport.put<Reply<EasyDraft<C>>>(path(id), {
          ...device(),
          content,
        }),
      ),

    heartbeat: async <C>(id: string, knownRev?: number) =>
      unwrap(
        await transport.post<Reply<EasyDraft<C>>>(path(id, "/heartbeat"), {
          ...device(),
          ...(knownRev === undefined ? {} : { knownRev }),
        }),
      ),

    claim: async <C>(id: string, force = false) =>
      unwrap(
        await transport.post<Reply<EasyDraft<C>>>(path(id, "/claim"), {
          ...device(),
          force,
        }),
      ),

    release: async (id: string) =>
      unwrap(
        await transport.post<Reply<EasyDraft>>(path(id, "/release"), device()),
      ),

    complete: async (id: string, invoiceId: string) =>
      unwrap(
        await transport.post<Reply<EasyDraft>>(path(id, "/complete"), {
          ...device(),
          invoiceId,
        }),
      ),

    discard: async (id: string) =>
      unwrap(
        await transport.delete<Reply<EasyDraft>>(
          `${path(id)}?${deviceQuery()}`,
        ),
      ),

    /**
     * Best-effort release while the page closes: a keepalive fetch survives
     * the unload (sendBeacon can't send the Authorization header). If it is
     * lost, the lock frees itself after 45 s.
     */
    releaseOnExit: (id: string) => {
      try {
        const token = localStorage.getItem("auth_token");
        void fetch(
          `${API_BASE_URL.replace(/\/+$/, "")}${path(id, "/release")}`,
          {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(device()),
          },
        ).catch(() => undefined);
      } catch {
        /* the lock expires on its own */
      }
    },
  };
}

export const easyDraftsService = createEasyDraftsService();
