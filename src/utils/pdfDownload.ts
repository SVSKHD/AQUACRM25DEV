const isIosBrowser = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

export const preparePdfDownloadTarget = () => {
  if (typeof window === "undefined" || !isIosBrowser()) return null;

  let target: Window | null = null;

  try {
    target = window.open("", "_blank");
    if (!target) return null;
    target.document.title = "Preparing Aquakart invoice";
    target.document.body.innerHTML =
      '<p style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:24px;color:#0f172a">Preparing your Aquakart invoice...</p>';
    return target;
  } catch {
    try {
      target?.close();
    } catch {
      // Best-effort cleanup only.
    }
    return null;
  }
};

export const closePdfDownloadTarget = (target: Window | null) => {
  if (!target || target.closed) return;
  try {
    target.close();
  } catch {
    // Browser may refuse cleanup; safe to ignore.
  }
};

export const savePdfDocument = (
  doc: any,
  fileName: string,
  preparedTarget: Window | null = null,
) => {
  const blob = doc.output("blob");
  const objectUrl = URL.createObjectURL(blob);
  const safeName = String(fileName || "Aquakart-Invoice.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\.pdf$/i, "") + ".pdf";

  const revoke = () => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Best-effort cleanup only.
    }
  };

  if (preparedTarget && !preparedTarget.closed) {
    try {
      preparedTarget.location.replace(objectUrl);
      window.setTimeout(revoke, 60_000);
      return;
    } catch {
      closePdfDownloadTarget(preparedTarget);
    }
  }

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeName;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  if (isIosBrowser()) anchor.target = "_blank";

  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(revoke, 60_000);
  }
};
