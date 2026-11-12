# Change log (newest first, max 25 entries — older ones move to changes-archive.md)

<!-- entries -->

### 2026-11-12 — GSTIN portal: a 404 without a code means the backend route isn't deployed, not "GSTIN not found" (src/services/gstinPortal.ts, gstinPortal.test.ts)

### 2026-11-11 — Drawer action bars pinned below the scroll area (all drawers)

- What: `SidebarDialog` and 12 drawers built on `ResizableFloatingSidebar` rendered their action bar as a `sticky bottom-0` div inside the scroll area, so fields scrolled through the 20px scroll padding under it. All now pass the bar as the shell's `footer` prop (fixed `<footer>` below the scroll area). Moved submit buttons got `form=` ids (`customer-form`, `seo-page-form`).
- Files: src/components/ui/SidebarDialog.tsx, src/components/modular/products/{CatalogDeleteDialog,ProductFormPanel,TaxonomyFormPanel}.tsx, src/components/modular/stock/{stockDeleteDialog,stockFormDialog}.tsx, src/components/tabs/{ActivitiesTab,CustomersTab,DealsTab,LeadsTab,OrdersTab,QuotationsTab,SeoTab}.tsx, docs/ELEMENTS.md, AGENTS.md
- Why: user saw the blog drawer's footer floating over fields with content showing beneath it, and asked for a clean pinned footer in every drawer.
- Watch: a button moved out of its `<form>` needs `form="id"` to submit. Footers are now always visible (also when content is short) — don't add new in-scroll sticky bars.

### 2026-11-11 — Clickable AI field robots + blog SEO score with Auto fix

- What: field robots (were `aria-hidden`, `pointer-events: none`) are now 44px buttons. Blog: title, category (AI picks from options), related product (pick), brand, short description, keywords, keyphrases, notes, AI topic. Product: title, brand, keywords. Category/subcategory: title, keywords, description. Quick invoice paste: runs Format with AI. Each opens `AIAssist` with a field-specific Suggest (works on empty fields) plus Improve/Shorten/translate/custom. Blog editor gets a first "SEO score" section: live 0–100 score with check list, and "Auto fix" → Gemini (`aiService.generate`, json) proposes metadata; editor ticks fields, sees projected score, applies to the form; saving is still "Update blog".
- Files: src/components/ai/AIAssist.tsx (`variant`, `suggest`, `options`), src/components/ai/AIFieldAnimation.tsx (`assist`, `action`), src/components/ai/aiFieldWorking.tsx (new; context moved out to avoid a circular import, re-exported), src/index.css (`.ai-field-bot-interactive`, `.ai-field-bot-button`), src/utils/blogSeo.ts (new), src/utils/blogSeo.test.ts (new, 8 tests), src/components/modular/products/tabInnerContent/BlogSeoPanel.tsx (new), BlogFormDialog.tsx (`applySeoFix`, `blogContext`, robots), ProductFormPanel.tsx, TaxonomyFormPanel.tsx, src/components/modular/invoices/QuickInvoiceTab.tsx, docs/ELEMENTS.md
- Why: user reported the robots did nothing and asked for AI actions on them plus an Auto fix that uses the existing Gemini endpoint and shows an SEO score in the drawer.
- Watch: score is local and heuristic (not Google's); content checks (length, intro, headings, links, image) are manual — Auto fix never edits the article HTML. Published blogs: the AI slug starts unticked. Robots without AI configured show dimmed and do nothing.

### 2026-11-11 — Invoice form: fetch GSTIN details from the GST portal (Masters India)

- What: a valid GSTIN now also calls `GET /crm/admin/gstin/:gstin` (new backend route → Masters India, a licensed GSP reading the government GST record). Shows legal/trade name, status, registration date (amber if not Active); fills EMPTY GST name (legal name) + address from the portal; phone/email still come from past invoices (portal has none); past invoices are the fallback for name/address. "Use portal name & address" replaces differing typed values; "Undo fill" restores previous values; "Try again" on provider errors. Stale answers (GSTIN changed / form closed) are ignored.
- Files: src/services/gstinPortal.ts (new, `lookupGstinOnPortal()`), src/services/gstinPortal.test.ts (new, 5 tests), src/utils/gstin.ts (`taxpayerGstDetails`, `differingGstFields`), src/utils/gstin.test.ts (+2), src/components/modular/invoices/invoiceDialog.tsx (`runPortalLookup()`, `usePortalDetails()`, `GstFills` with previous values, status block), src/components/tabs/InvoicesTab.tsx (passes `lookupGstinOnPortal`), docs/ELEMENTS.md. Backend (AQUAKARTBACKEND): src/services/gstinLookup.js, src/controllers/crm/gstinLookup.js, src/routes/crm/invoice.js, src/docs/gstinLookup.js, test/gstinLookup.test.js.
- Why: user wants GST details fetched from the government portal; the portal has no open API (captcha), so a GSP is required; user chose Masters India.
- Watch: backend returns 503 `GSTIN_LOOKUP_DISABLED` until `MASTERS_INDIA_USERNAME/PASSWORD/CLIENT_ID/CLIENT_SECRET` are set on the server; the CRM then shows "isn't set up" and falls back to past invoices. Each lookup is billed (backend caches 24 h in memory).

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
