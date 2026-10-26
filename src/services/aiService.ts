import { api } from "./api";

export type AIChatRole = "user" | "assistant";

export interface AIHistoryTurn {
  role: AIChatRole;
  text: string;
}

export interface AIGenerateRequest {
  prompt: string;
  history?: AIHistoryTurn[];
  systemInstruction?: string;
  temperature?: number;
  json?: boolean;
}

export interface AIGenerateResult {
  reply: string;
  model: string;
  finishReason: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface AIResult<T> {
  data?: T;
  error?: string;
  status?: number;
}

export const AI_PROMPT_MAX_CHARS = 20000;

type Envelope<T> = { success: boolean; data: T };

const friendlyAIError = (error?: string, status?: number) => {
  if (status === 429)
    return error || "Too many AI requests. Please try again shortly.";
  if (status && status >= 502 && status <= 504) {
    return (
      error || "The AI service is unavailable right now. Please try again."
    );
  }
  return error || "AI request failed";
};

export const aiService = {
  async status(): Promise<AIResult<{ configured: boolean }>> {
    const { data, error, status } =
      await api.get<Envelope<{ configured: boolean }>>("/ai/status");
    if (error || !data)
      return { error: error || "Failed to load AI status", status };
    return { data: data.data };
  },

  async generate(body: AIGenerateRequest): Promise<AIResult<AIGenerateResult>> {
    const { data, error, status } = await api.post<Envelope<AIGenerateResult>>(
      "/ai/generate",
      body,
    );
    if (error || !data)
      return { error: friendlyAIError(error, status), status };
    return { data: data.data };
  },
};

/** Parses a `json: true` reply; returns undefined if the model sent invalid JSON. */
export const parseAIJsonReply = <T = unknown>(reply: string): T | undefined => {
  try {
    return JSON.parse(reply) as T;
  } catch {
    return undefined;
  }
};

// The status rarely changes during a session, so share one request between
// every AI entry point (assist buttons, chat tab, sidebar).
let statusPromise: Promise<boolean> | null = null;

export const getAIConfigured = (): Promise<boolean> => {
  if (!statusPromise) {
    statusPromise = aiService.status().then(({ data, error }) => {
      if (error) statusPromise = null;
      return Boolean(data?.configured);
    });
  }
  return statusPromise;
};
