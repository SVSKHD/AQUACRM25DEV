export const AUTH_INVALID_TOKEN_EVENT = "auth:invalid_token";

export const triggerInvalidTokenEvent = () => {
  window.dispatchEvent(new Event(AUTH_INVALID_TOKEN_EVENT));
};

export const onInvalidToken = (callback: () => void) => {
  const handler = () => callback();
  window.addEventListener(AUTH_INVALID_TOKEN_EVENT, handler);
  return () => window.removeEventListener(AUTH_INVALID_TOKEN_EVENT, handler);
};
