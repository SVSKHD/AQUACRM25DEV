# Storefront invoice PDF (vendored)

These files are copied from the storefront repo (`AQUAKARTECOM`). The CRM uses them so that an invoice PDF downloaded from the CRM is identical to the one a customer downloads at `aquakart.co.in/invoice/:id`.

| File here                     | Source in `AQUAKARTECOM/src`                |
| ----------------------------- | ------------------------------------------- |
| `generatePublicInvoicePdf.js` | `utils/invoice/generatePublicInvoicePdf.js` |
| `normalizeInvoice.js`         | `utils/invoice/normalizeInvoice.js`         |
| `matchInvoiceProducts.js`     | `utils/invoice/matchInvoiceProducts.js`     |
| `invoiceFileName.js`          | `utils/invoice/invoiceFileName.js`          |
| `pdfDownload.js`              | `utils/pdfDownload.js`                      |
| `priceUtils.js`               | `utils/priceUtils.js`                       |
| `invoiceStaticData.js`        | `constants/invoiceStaticData.js`            |
| `logo.png`                    | `assests/logo.png`                          |

**Do not edit these copies.** Change the storefront file first, then copy it here. The only allowed difference is the `@/…` import paths, which are rewritten to `./…`.

Run this to check the copies still match:

```sh
npm run check:invoice-pdf-sync
```

The script expects the storefront repo at `../AQUAKARTECOM`; set `AQUAKARTECOM_DIR` to use another location. It exits non-zero if any file differs.

`customerInvoicePdf.js` (with its `.d.ts`) is owned by the CRM. It runs the storefront pipeline in the same order:

1. `mapInvoiceFromApi`
2. `enrichInvoiceProducts` with the product catalogue
3. `downloadPublicInvoicePdf`

The CRM's catalogue request (`all-products?query=crm`) returns the same populated category and subcategory titles as the storefront's `?query=ecom`.
