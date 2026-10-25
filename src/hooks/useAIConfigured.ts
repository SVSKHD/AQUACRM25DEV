import { useEffect, useState } from "react";
import { getAIConfigured } from "../services/aiService";

/** undefined while loading, then whether the backend has an AI provider configured. */
export function useAIConfigured(): boolean | undefined {
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getAIConfigured().then((value) => {
      if (active) setConfigured(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return configured;
}
