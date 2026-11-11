# Change log (newest first, max 25 entries — older ones move to changes-archive.md)

<!-- entries -->

### 2026-11-11 — Invoice form: GSTIN validation + prefill from past invoices

- What: typing/pasting a complete GSTIN validates format, state code and mod-36 check digit (shows state + PAN, or a hint; never blocks save) and fills only EMPTY GST name/phone/email/address from the newest earlier invoices with that GSTIN, with a source note and "Undo fill". No network; registry lookup was not chosen.
- Files: src/utils/gstin.ts (new: `describeGstin`, `gstinCheckDigit`, `findGstDetails`, `fillEmptyGstFields`), src/utils/gstin.test.ts (new, 12 tests), src/components/modular/invoices/invoiceDialog.tsx (`handleGstinChange()`, `undoGstFill()`, optional prop `findGstDetails`), src/components/tabs/InvoicesTab.tsx (passes lookup over `invoices`, excluding the edited one), docs/ELEMENTS.md
- Why: user asked for GST details to be detected and prefilled when a GSTIN is typed; chose past records + fill-empty-only.
- Watch: reuses `GST_STATES`/`validGSTIN` from utils/gstReport.ts. Customer profiles (also hold gstDetails) are not searched — not loaded in InvoicesTab.

### 2026-11-11 — Category photos upload as multipart files with keepPhotos

- What: category create/update convert data-URI photos to binary Files and send multipart (`photos` files + `keepPhotos` JSON on update); existing-only edits send small JSON; a new photo placed before an existing one triggers a follow-up JSON reorder PUT. Saving with zero photos is blocked (backend can't clear the last photo; create requires one). Errors 400/413 (JSON + HTML)/502/timeout/network → toast + banner with the user's photo number. Saved category is upserted into the list instead of refetching.
- Files: src/services/categoryPhotos.ts (new, `saveCategoryWithPhotos()`), src/services/categoryPhotos.test.ts (new, 31 tests), src/services/api.ts (`request()` no JSON Content-Type for FormData; passes `code`/`stage`/`photoIndex`; `TIMEOUT`/`NETWORK_ERROR`; `postForm`/`putForm`), src/services/apiService.ts (`categoriesService.create/update`), src/components/tabs/ProductsTab.tsx (`handleCategorySubmit()`, `toCategory`), src/components/modular/products/TaxonomyFormPanel.tsx (category `maxPhotos` 10), docs/ELEMENTS.md (Catalog table + ApiService error fields)
- Why: base64 JSON hit the API proxy's 1 MiB limit (nginx HTML 413 without CORS → generic failure); backend db8c049 added multipart keepPhotos.
- Watch: backend contract in AQUAKARTBACKEND `src/controllers/category.js` `updateCategory()` — keepPhotos is ignored without files; uploads always append after kept photos. Reorder PUT is a second request (not atomic; failure = saved + info toast). PhotoUploader itself is unchanged (shared with products/subcategories/blogs).
