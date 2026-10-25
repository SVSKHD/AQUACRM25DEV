const getBrowserInfo = () => {
  if (typeof navigator === "undefined") {
    return {
      isIos: false,
      isAndroid: false,
      isEmbeddedBrowser: false,
      needsPreparedTarget: false,
    };
  }

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIos =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  // Android WebViews and common in-app browsers are much less reliable with
  // blob: URL downloads and often ignore the HTML download attribute.
  const isEmbeddedBrowser =
    /;\s*wv\)/i.test(userAgent) ||
    /\bwv\b/i.test(userAgent) ||
    /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|GSA\//i.test(userAgent);

  return {
    isIos,
    isAndroid,
    isEmbeddedBrowser,
    needsPreparedTarget: isIos || (isAndroid && isEmbeddedBrowser),
  };
};

const isIosBrowser = () => getBrowserInfo().isIos;

export const normalizePdfFileName = (fileName) => {
  const safeName = String(fileName || "Aquakart-Invoice.pdf")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/-+/g, "-");

  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
};

/**
 * Some mobile browsers lose the original user gesture while the PDF is being
 * generated. Open a same-origin target synchronously for those browsers so the
 * finished file always has a user-visible Save/Open/Share fallback.
 */
export const preparePdfDownloadTarget = () => {
  if (typeof window === "undefined") return null;

  const { needsPreparedTarget } = getBrowserInfo();
  if (!needsPreparedTarget) return null;

  let target = null;

  try {
    target = window.open("", "_blank");
    if (!target) return null;

    target.document.title = "Preparing Aquakart invoice";
    target.document.body.innerHTML =
      '<p style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:24px;color:#0f172a">Preparing your Aquakart invoice...</p>';

    return target;
  } catch {
    closePdfDownloadTarget(target);
    return null;
  }
};

export const closePdfDownloadTarget = (target) => {
  if (!target || target.closed) return;

  try {
    target.close();
  } catch {
    // Ignore browser restrictions while cleaning up a failed download target.
  }
};

const createPdfFile = (doc, fileName) => {
  // Use an explicit PDF MIME type rather than relying on browser/jsPDF blob
  // inference. This improves handling in Android download managers/WebViews.
  const arrayBuffer = doc.output("arraybuffer");
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });

  if (typeof File === "function") {
    try {
      return new File([blob], fileName, {
        type: "application/pdf",
        lastModified: Date.now(),
      });
    } catch {
      // Older browsers may expose File but reject construction.
    }
  }

  return blob;
};

const renderMobileFallback = ({
  target,
  objectUrl,
  pdfFile,
  fileName,
  revokeObjectUrl,
}) => {
  const targetDocument = target.document;
  targetDocument.title = fileName;
  targetDocument.body.innerHTML = "";
  targetDocument.body.style.margin = "0";
  targetDocument.body.style.background = "#f8fafc";

  const container = targetDocument.createElement("div");
  container.style.cssText =
    "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:18px;color:#0f172a;max-width:980px;margin:0 auto";

  const heading = targetDocument.createElement("p");
  heading.textContent = fileName;
  heading.style.cssText =
    "font-weight:800;margin:0 0 12px;font-size:16px;word-break:break-word";

  const help = targetDocument.createElement("p");
  help.textContent =
    "If the download does not start automatically, use Save PDF or Save / Share below.";
  help.style.cssText =
    "margin:0 0 14px;color:#475569;font-size:14px;line-height:1.5";

  const actions = targetDocument.createElement("div");
  actions.style.cssText =
    "display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px";

  const saveLink = targetDocument.createElement("a");
  saveLink.href = objectUrl;
  saveLink.download = fileName;
  saveLink.textContent = "Save PDF";
  saveLink.style.cssText =
    "display:inline-block;padding:11px 16px;border-radius:10px;background:#047857;color:white;text-decoration:none;font-weight:700";

  const openLink = targetDocument.createElement("a");
  openLink.href = objectUrl;
  openLink.target = "_blank";
  openLink.rel = "noopener";
  openLink.textContent = "Open PDF";
  openLink.style.cssText =
    "display:inline-block;padding:11px 16px;border-radius:10px;background:#e2e8f0;color:#0f172a;text-decoration:none;font-weight:700";

  actions.appendChild(saveLink);

  const targetNavigator = target.navigator;
  if (
    typeof File === "function" &&
    pdfFile instanceof File &&
    typeof targetNavigator?.share === "function"
  ) {
    let canShareFile = true;
    if (typeof targetNavigator.canShare === "function") {
      try {
        canShareFile = targetNavigator.canShare({ files: [pdfFile] });
      } catch {
        canShareFile = false;
      }
    }

    if (canShareFile) {
      const shareButton = targetDocument.createElement("button");
      shareButton.type = "button";
      shareButton.textContent = "Save / Share";
      shareButton.style.cssText =
        "border:0;padding:11px 16px;border-radius:10px;background:#0f172a;color:white;font-weight:700;cursor:pointer";
      shareButton.addEventListener("click", async () => {
        try {
          await targetNavigator.share({
            files: [pdfFile],
            title: fileName,
          });
        } catch (error) {
          if (error?.name !== "AbortError") {
            saveLink.click();
          }
        }
      });
      actions.appendChild(shareButton);
    }
  }

  actions.appendChild(openLink);

  const preview = targetDocument.createElement("iframe");
  preview.src = objectUrl;
  preview.title = fileName;
  preview.style.cssText =
    "display:block;width:100%;height:calc(100vh - 160px);min-height:520px;border:0;border-radius:10px;background:white";

  container.appendChild(heading);
  container.appendChild(help);
  container.appendChild(actions);
  container.appendChild(preview);
  targetDocument.body.appendChild(container);

  // Start a normal named download immediately. Browsers/WebViews that ignore
  // this still retain the explicit Save/Open/Share controls above.
  try {
    saveLink.click();
  } catch {
    // The fallback controls remain available.
  }

  window.setTimeout(revokeObjectUrl, 10 * 60_000);
};

/**
 * Save a jsPDF document with progressive fallbacks:
 * 1. Standard named browser download.
 * 2. Mobile prepared-tab named download.
 * 3. Explicit Save/Open controls.
 * 4. Native Web Share file flow where supported.
 *
 * No browser can be forced to write to disk when its security policy forbids
 * automatic downloads, so the fallback page guarantees the user still has a
 * direct path to save the generated PDF.
 */
export const savePdfDocument = (doc, fileName, preparedTarget = null) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("PDF downloads are only available in the browser");
  }

  if (!doc?.output) {
    throw new Error("Invalid PDF document");
  }

  const normalizedFileName = normalizePdfFileName(fileName);
  const pdfFile = createPdfFile(doc, normalizedFileName);
  const objectUrl = URL.createObjectURL(pdfFile);

  const revokeObjectUrl = () => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Revocation is best-effort only.
    }
  };

  if (preparedTarget && !preparedTarget.closed) {
    try {
      renderMobileFallback({
        target: preparedTarget,
        objectUrl,
        pdfFile,
        fileName: normalizedFileName,
        revokeObjectUrl,
      });
      return { mode: "viewer", fileName: normalizedFileName };
    } catch {
      closePdfDownloadTarget(preparedTarget);
    }
  }

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = normalizedFileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  if (isIosBrowser()) {
    anchor.target = "_blank";
  }

  document.body.appendChild(anchor);

  try {
    anchor.click();
  } catch {
    // As a last-resort browser fallback, keep the PDF reachable rather than
    // failing the operation completely.
    try {
      window.open(objectUrl, "_blank", "noopener");
    } catch {
      revokeObjectUrl();
      throw new Error("This browser blocked the PDF download");
    }
  } finally {
    anchor.remove();
    // Mobile download managers may keep reading the object URL after click.
    window.setTimeout(revokeObjectUrl, 10 * 60_000);
  }

  return {
    mode: isIosBrowser() ? "viewer" : "download",
    fileName: normalizedFileName,
  };
};
