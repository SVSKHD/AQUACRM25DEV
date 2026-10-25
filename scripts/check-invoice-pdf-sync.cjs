#!/usr/bin/env node
/*
 * Verifies src/vendor/storefrontInvoice matches the storefront (AQUAKARTECOM)
 * so CRM and customer invoice PDFs stay identical. The only allowed difference
 * is the "@/..." import paths, which are rewritten to "./...".
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const vendorDir = path.join(root, "src", "vendor", "storefrontInvoice");
const storefrontSrc = path.join(
  path.resolve(process.env.AQUAKARTECOM_DIR || path.join(root, "..", "AQUAKARTECOM")),
  "src",
);

const FILES = {
  "generatePublicInvoicePdf.js": "utils/invoice/generatePublicInvoicePdf.js",
  "normalizeInvoice.js": "utils/invoice/normalizeInvoice.js",
  "matchInvoiceProducts.js": "utils/invoice/matchInvoiceProducts.js",
  "invoiceFileName.js": "utils/invoice/invoiceFileName.js",
  "pdfDownload.js": "utils/pdfDownload.js",
  "priceUtils.js": "utils/priceUtils.js",
  "invoiceStaticData.js": "constants/invoiceStaticData.js",
  "logo.png": "assests/logo.png",
};

const IMPORT_REWRITES = [
  ['"@/constants/invoiceStaticData"', '"./invoiceStaticData"'],
  ['"@/utils/priceUtils"', '"./priceUtils"'],
  ['"@/utils/pdfDownload"', '"./pdfDownload"'],
  ['"@/utils/invoice/invoiceFileName"', '"./invoiceFileName"'],
  ['"@/assests/logo.png"', '"./logo.png"'],
];

if (!fs.existsSync(storefrontSrc)) {
  console.error(`Storefront source not found at ${storefrontSrc}. Set AQUAKARTECOM_DIR.`);
  process.exit(2);
}

const normalize = (text) =>
  IMPORT_REWRITES.reduce((value, [from, to]) => value.split(from).join(to), text).replace(/\r\n/g, "\n");
const hash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const drifted = Object.entries(FILES).filter(([local, source]) => {
  const localPath = path.join(vendorDir, local);
  const sourcePath = path.join(storefrontSrc, source);
  if (!fs.existsSync(localPath) || !fs.existsSync(sourcePath)) return true;
  if (local.endsWith(".png")) return hash(fs.readFileSync(localPath)) !== hash(fs.readFileSync(sourcePath));
  return normalize(fs.readFileSync(sourcePath, "utf8")) !== fs.readFileSync(localPath, "utf8").replace(/\r\n/g, "\n");
});

if (drifted.length) {
  console.error("Invoice PDF files differ from the storefront:");
  drifted.forEach(([local, source]) => console.error(`  src/vendor/storefrontInvoice/${local}  <-  AQUAKARTECOM/src/${source}`));
  console.error("Copy the storefront versions (rewriting @/ imports to ./) so CRM and customer PDFs match.");
  process.exit(1);
}
console.log(`Invoice PDF files match the storefront (${Object.keys(FILES).length} files).`);
