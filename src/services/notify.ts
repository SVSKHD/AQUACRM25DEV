import axios from "axios";

import { NOTIFY_API_BASE_URL as BASE } from "../config/api";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

export interface WhatsAppTemplate {
  messageId: string;
  name: string;
  body: string;
  status: string;
  /** Number of {{n}} placeholders in the body. */
  variableCount: number;
}

export interface WhatsAppStatus {
  configured: boolean;
  missing: string[];
}

export type SendResult = { ok: true } | { ok: false; error: string };

const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      { message?: string; missingConfiguration?: string[] } | undefined;
    if (data?.missingConfiguration?.length) {
      return `WhatsApp isn't configured on the server (missing ${data.missingConfiguration.join(", ")})`;
    }
    return data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

type RawTemplate = Record<string, unknown>;

const firstArray = (value: unknown): RawTemplate[] => {
  if (Array.isArray(value)) return value as RawTemplate[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["data", "templates", "template", "result", "message"]) {
    const found = firstArray(record[key]);
    if (found.length) return found;
  }
  return [];
};

const text = (...values: unknown[]) => {
  const found = values.find(
    (value) => typeof value === "string" || typeof value === "number",
  );
  return found === undefined ? "" : String(found);
};

const templateBody = (raw: RawTemplate) => {
  const components = Array.isArray(raw.components)
    ? (raw.components as RawTemplate[])
    : [];
  const bodyComponent = components.find(
    (component) => String(component.type).toUpperCase() === "BODY",
  );
  return text(
    raw.message,
    raw.body,
    raw.content,
    raw.text,
    raw.template,
    bodyComponent?.text,
  );
};

/** Fast2SMS returns its raw template listing, so read the common field names defensively. */
const toTemplate = (raw: RawTemplate): WhatsAppTemplate | null => {
  const messageId = text(
    raw.message_id,
    raw.messageId,
    raw.id,
    raw.template_id,
  );
  if (!messageId) return null;
  const body = templateBody(raw);
  const indexes = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((match) =>
    Number(match[1]),
  );
  return {
    messageId,
    name:
      text(raw.template_name, raw.name, raw.elementName, raw.title) ||
      `Template ${messageId}`,
    body,
    status: text(raw.status, raw.template_status).toUpperCase(),
    variableCount: indexes.length ? Math.max(...indexes) : 0,
  };
};

const NotifyOperations = {
  /** Free-text send. The backend now requires approved templates, so prefer sendTemplate. */
  sendWhatsApp: async (no: number, message: string) => {
    try {
      const response = await axios.post(
        `${BASE}/send-whatsappp`,
        { no, message },
        { headers: getHeaders() },
      );
      return response.data;
    } catch (error) {
      return error;
    }
  },

  getStatus: async (): Promise<WhatsAppStatus> => {
    try {
      const response = await axios.get(`${BASE}/status`, {
        headers: getHeaders(),
      });
      const status = response.data?.whatsapp || {};
      return {
        configured: Boolean(status.configured ?? status.available),
        missing: status.missing || [],
      };
    } catch {
      return { configured: false, missing: [] };
    }
  },

  getTemplates: async (): Promise<{
    templates: WhatsAppTemplate[];
    error?: string;
  }> => {
    try {
      const response = await axios.get(`${BASE}/whatsapp/templates`, {
        headers: getHeaders(),
      });
      const templates = firstArray(response.data)
        .map(toTemplate)
        .filter((template): template is WhatsAppTemplate => Boolean(template))
        .filter(
          (template) => !template.status || template.status === "APPROVED",
        );
      return { templates };
    } catch (error) {
      return {
        templates: [],
        error: errorMessage(error, "Failed to load WhatsApp templates"),
      };
    }
  },

  /** Sends an approved template; variables fill {{1}}, {{2}}, … in order. */
  sendTemplate: async (
    to: string,
    messageId: string,
    variables: string[],
  ): Promise<SendResult> => {
    try {
      const response = await axios.post(
        `${BASE}/send-whatsapp`,
        { to, messageId, variables },
        { headers: getHeaders() },
      );
      return response.data?.status === false
        ? { ok: false, error: response.data?.message || "WhatsApp send failed" }
        : { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error, "WhatsApp send failed") };
    }
  },
};

export default NotifyOperations;
