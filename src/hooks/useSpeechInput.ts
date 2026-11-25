import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictation with the browser's own speech recognition (Chrome, Edge, Android,
 * Safari). Nothing is sent to our servers. `onFinal` gets each finished
 * phrase; `interim` is the phrase still being spoken.
 */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

const getRecognition = (): RecognitionConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition || scope.webkitSpeechRecognition;
};

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone blocked. Allow it in the browser's site settings.",
  "service-not-allowed":
    "Microphone blocked. Allow it in the browser's site settings.",
  "audio-capture": "No microphone found.",
  network: "Voice typing needs an internet connection.",
};

export function useSpeechInput({
  lang = "en-IN",
  onFinal,
  onStop,
}: {
  lang?: string;
  onFinal: (text: string) => void;
  /** Called once listening ends; `heard` is true if any phrase was finished. */
  onStop?: (heard: boolean) => void;
}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const heardRef = useRef(false);
  const callbacks = useRef({ onFinal, onStop });
  useEffect(() => {
    callbacks.current = { onFinal, onStop };
  });
  const supported = Boolean(getRecognition());

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    heardRef.current = false;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;
        if (result.isFinal) {
          heardRef.current = true;
          callbacks.current.onFinal(text);
        } else pending += `${text} `;
      }
      setInterim(pending.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(ERRORS[event.error] || "Voice typing stopped. Try again.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
      callbacks.current.onStop?.(heardRef.current);
    };
    setError("");
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Try again.");
    }
  }, [lang]);

  // Release the microphone when the form closes.
  useEffect(
    () => () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onend = null;
      recognition.abort();
    },
    [],
  );

  return { supported, listening, interim, error, start, stop };
}
