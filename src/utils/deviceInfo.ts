/*
 * Which device this browser is, for the shared Easy invoice drafts.
 * The id is random and kept per browser; it identifies nothing about the
 * person. The label is read from the user agent, e.g. "iPhone · Safari".
 */

const DEVICE_KEY = "aqua:device-id";

const randomId = () => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto)
      return crypto.randomUUID().replace(/-/g, "");
  } catch {
    /* fall back below */
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

// Used when storage is blocked (private mode): one id for this page load.
let pageDeviceId = "";

/** A stable random id for this browser (8–64 of [A-Za-z0-9_-]). */
export const getDeviceId = () => {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
    const next = randomId();
    localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    pageDeviceId ||= randomId();
    return pageDeviceId;
  }
};

const platformOf = (ua: string, touchPoints: number) => {
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1))
    return "iPad";
  if (/iPhone|iPod/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua))
    return /Mobile/i.test(ua) ? "Android phone" : "Android tablet";
  if (/Windows/i.test(ua)) return "Windows";
  if (/CrOS/i.test(ua)) return "Chromebook";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Device";
};

const browserOf = (ua: string) => {
  if (/Edg(e|A|iOS)?\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Chrome|CriOS|Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Browser";
};

/** "iPhone · Safari", "Windows · Chrome", "Android phone · Chrome"… */
export const deviceLabel = (
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  touchPoints = typeof navigator !== "undefined"
    ? navigator.maxTouchPoints || 0
    : 0,
) => `${platformOf(ua, touchPoints)} · ${browserOf(ua)}`;

export const currentDevice = () => ({
  deviceId: getDeviceId(),
  deviceLabel: deviceLabel(),
});
