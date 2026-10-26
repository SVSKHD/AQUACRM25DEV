# Aquakart CRM project map

Use this map to find a feature without scanning the whole repository. Contribution rules are in [`AGENTS.md`](AGENTS.md). Component props, behaviour and gotchas are in [`docs/ELEMENTS.md`](docs/ELEMENTS.md). UI control rules are in [`docs/UI_COMPONENT_CONSISTENCY.md`](docs/UI_COMPONENT_CONSISTENCY.md).

Stack: React 19, TypeScript 5.9, Vite 8, Tailwind 3, Framer Motion 12, Lucide, React Router 7, fetch and Axios, Vitest 4. Node 22 or newer. The dev server runs on port 4000 (`vite.config.ts`). Live data needs the separate backend.

## Runtime and entry points

| Concern              | Source                                                 | Notes                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap, CSS order | `src/main.tsx`                                         | StrictMode. `/quotation/*` renders `QuotationLinkPage` instead of `App`. Imports `index.css`, then `styles/liquidControls.css`, `dashboardTabs.css`, `crmShell.css`, `crmTabViewport.css`, `invoiceDialogMobile.css` |
| Routing, providers   | `src/App.tsx`                                          | See [Routes](#routes)                                                                                                                                                                                                |
| Workspace selection  | `src/pages/Dashboard.tsx`                              | Tab IDs, sub-navigation, `?tab=` / `?view=` URL sync, `localStorage["activeTab"]`, Ctrl/Cmd+L lock                                                                                                                   |
| Shell                | `src/components/Layout/CrmShell.tsx`, `CrmSidebar.tsx` | Desktop rail and mobile drawer. Each tab panel is wrapped in `CrmPanelErrorBoundary` (reset when the tab changes)                                                                                                    |
| Tab content          | `src/components/Layout/tabInnerlayout.tsx`             | `TabInnerContent`: centred title and description, then children                                                                                                                                                      |
| Shared UI            | `src/components/ui/`                                   | `liquid.tsx`, `ResizableFloatingSidebar.tsx`, `SidebarDialog.tsx`, `RichTextEditor.tsx`                                                                                                                              |

### Routes

| Path                                 | Element                      | Auth                                                                         |
| ------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------- |
| `/invoices/report/:month/:year?`     | `InvoiceReportPage`          | Public (outside `AuthProvider`)                                              |
| `/service`, `/service/invoice/:id`   | `ServicePage`, `InvoicePage` | Public; the service page asks for a PIN (`invoicesService.verifyServicePin`) |
| `/quotation/*`                       | `QuotationLinkPage`          | Public; chosen in `main.tsx`                                                 |
| `/login`, `/register`                | `Login`, `Register`          | Redirect to `/dashboard` when signed in                                      |
| `/dashboard`                         | `Dashboard`                  | `ProtectedRoute`                                                             |
| `/invoice/:id`, `/admin/invoice/:id` | `InvoicePage`                | `ProtectedRoute`                                                             |
| `/needs-seo`, `/needs-seo/:pageKey`  | `NeedsSeoPage`               | `ProtectedRoute`                                                             |
| `/invoice`                           | `InvoiceRedirect`            | Public (phone lookup)                                                        |
| `/ui`                                | `ComponentGallery`           | Public; renders `src/data/component-docs.json`                               |

`AppContent` shows a spinner while auth loads, then `LockScreen` when the user is locked, otherwise the routes, plus `ReLoginScreen` as an overlay when a token expires.

## Workspaces (`Dashboard.tsx` tab IDs)

| Tab ID                | Main source                                         | Supporting code                                                                                                                                                                                     |
| --------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard`           | `tabs/DashboardOverview.tsx`                        | `utils/dashboardStats.ts` (+ `dashboardStats.test.ts`), invoices mapped by `modular/invoices/mapInvoice.ts`                                                                                         |
| `analytics`           | `tabs/AnalyticsTab.tsx`                             | `services/analyticsService.ts` (`GET /v1/analytics/live`)                                                                                                                                           |
| `leads`               | `tabs/LeadsTab.tsx`                                 | Sub-views pending / cod / paid / all. `leadsService` in `services/apiService.ts`                                                                                                                    |
| `customers`           | `tabs/CustomersTab.tsx`                             | Sub-views online / offline. Detail view and forms in `ResizableFloatingSidebar`; drafts via `usePersistentFormDraft`; `customerProfilesService.ts`                                                  |
| `deals`, `activities` | `tabs/DealsTab.tsx`, `ActivitiesTab.tsx`            | `ResizableFloatingSidebar` forms with persistent drafts                                                                                                                                             |
| `invoices`            | `tabs/InvoicesTab.tsx`                              | `modular/invoices/*` (dialog, view, table, Quick tab, `InvoiceBackfillPanel`, `mapInvoice.ts`), `utils/invoiceStatus.ts`, `invoicePdf.ts`, `invoiceBulkExports.ts`, `invoiceViews.ts`               |
| `quotations`          | `tabs/QuotationsTab.tsx`                            | `services/quotationsService.ts`; public pages `pages/Quotation*Page.tsx`                                                                                                                            |
| `stocks`              | `tabs/StockTab.tsx`                                 | `modular/stock/*`. CRM stock is separate from ecommerce stock                                                                                                                                       |
| `products`            | `tabs/ProductsTab.tsx`                              | Sub-views products / categories / subcategories / blogs (`?tab=blogs` maps to the blogs view). `modular/products/*`, `RichTextEditor`, `services/blogAI.ts`, `blogTypes.ts`, `utils/blogPrefill.ts` |
| `orders`              | `tabs/OrdersTab.tsx`                                | `services/crmOrdersService.ts`                                                                                                                                                                      |
| `notifications`       | `tabs/NotificationsTab.tsx`                         | `modular/notifications/WhatsAppTemplateForm.tsx` (template picker), `templateUtils.ts`, `services/notify.ts`                                                                                        |
| `whatsapp`            | `tabs/WhatsAppTab.tsx`                              | WhatsApp inbox (`whatsappCrmService` in `apiService.ts`); replies are sent through approved templates via `WhatsAppTemplateForm`                                                                    |
| `service-reminders`   | `tabs/ServiceRemindersTab.tsx`                      | `serviceRemindersService` in `apiService.ts`                                                                                                                                                        |
| `reports`             | `tabs/ReportsTab.tsx`                               | Sales / GST toggle. GST: `modular/reports/GSTFilingReport.tsx`, `utils/gstReport.ts`, `gstReportExport.ts`                                                                                          |
| `seo`                 | `tabs/SeoTab.tsx` ("SEO & Indexing Control Center") | `services/seoMappingService.ts` (`/v1/admin/seo`, catalog, merchant products); `pages/NeedsSeoPage.tsx`                                                                                             |
| `ai`                  | `tabs/AIAssistantTab.tsx`                           | Views seo / autopilot / links / data / chat. `modular/ai/*`, `hooks/useSiteData.ts`, `services/seoService.ts`, `utils/siteAnalysis.ts`, `seo*.ts`, `keyphrases.ts`                                  |
| `jobs`                | `tabs/JobsTab.tsx`                                  | Hidden from navigation unless `useJobsAccess().canRead` (`jobs.read`). `modular/jobs/*`, `services/jobsService.ts`, `hooks/useJobRunner.ts`, `utils/jobSchedule.ts`                                 |
| `commerce-admin`      | `tabs/CommerceAdminTab.tsx`                         | Sub-views roles / staff / coupons / referrals / payments / audit. `services/commerceAdminService.ts` (`/v1/admin`); `usePersistentNativeFormDraft`                                                  |

## Shared building blocks

| Need                                                                                        | Use                                                                                                             |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Buttons, inputs, textareas, selects, dropdowns, checkboxes, panels, badges, request banners | `src/components/ui/liquid.tsx` (see `docs/UI_COMPONENT_CONSISTENCY.md`)                                         |
| Side panel, editor or detail view                                                           | `ui/ResizableFloatingSidebar.tsx`                                                                               |
| Side panel with sticky footer and busy-guarded close                                        | `ui/SidebarDialog.tsx` (jobs, GST report)                                                                       |
| Table with search, sort, pagination, selection and mobile cards                             | `modular/invoices/invoiceTable.tsx` (`AquaGenericTable`; generic despite the path)                              |
| Form drafts that survive reloads                                                            | `hooks/usePersistentFormDraft.ts` (controlled state), `usePersistentNativeFormDraft.ts` (uncontrolled `<form>`) |
| List responses in any envelope                                                              | `utils/apiPayload.ts` `extractArrayPayload`                                                                     |
| Rich text (blogs, products)                                                                 | `ui/RichTextEditor.tsx`                                                                                         |
| Toasts                                                                                      | `useToast` from `components/Toast.tsx`                                                                          |
| AI text help                                                                                | `components/ai/AIAssist.tsx`, `AICatalogSuggestions.tsx`, `AIFieldAnimation.tsx`; `services/aiService.ts`       |
| Invoice → CRM shape                                                                         | `modular/invoices/mapInvoice.ts` `mapInvoiceFromApi`, `parseInvoiceDate`                                        |
| Invoice statuses                                                                            | `utils/invoiceStatus.ts`                                                                                        |
| Customer invoice PDF                                                                        | `utils/invoicePdf.ts` `downloadPublicInvoicePdf` (+ `pdfDownload.ts`, `invoicePdfPriceUtils.ts`)                |

## Conventions

- **`productPrice` is the line value** (PR #89): the amount for the whole line, not a unit price. Totals sum it once per line. Never multiply it by quantity. See `mapInvoice.ts`, `dashboardStats.ts` and the PDF (`invoicePdf.ts`, "Quantity is displayed for reference only").
- **Controls**: compose from the liquid primitives. `scripts/check-ui-consistency.cjs` counts raw `<input>`, `<select>`, `<textarea>` and `<button>` (including `motion.*`) in `src/components/tabs` and `src/components/modular` against `scripts/ui-consistency-baseline.json`; a file may not exceed its baseline, and new files start at zero.
- **Dialogs**: there is no modal-dialog system for screens. Use `ResizableFloatingSidebar`, or `SidebarDialog` when you need a sticky footer or a busy flag.
- **API results**: `services/api.ts` resolves to `{ data?, error?, errors?, status? }` and does not throw on HTTP errors. Check `error` before showing success or closing a form. Pass list payloads through `extractArrayPayload`.
- **Auth**: requests send `localStorage["auth_token"]` as a bearer token; a "Token is not valid" reply fires `utils/authEvents.ts`, which opens `ReLoginScreen`. Staff permissions go through `utils/permissions.ts` (`resolveStaffPermission`).
- Never hardcode backend IDs or put provider keys in frontend code.

## API origins

Every request goes to production (`https://api.aquakart.co.in`) by default, including under `npm run dev`.

| Module                | Origin                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/api.ts` | **Hardcoded** `https://api.aquakart.co.in`. Exports `api` (`/v1/crm`), `ecomApi` (`/v1/`), `adminApi` (`/v1/admin`)                                                                    |
| `src/config/api.ts`   | `VITE_API_ORIGIN` if set, otherwise `https://api.aquakart.co.in`. Exports `API_ORIGIN`, `API_BASE_URL` (`/v1/crm`), `ECOM_API_BASE_URL` (`/v1/`), `NOTIFY_API_BASE_URL` (`/v1/notify`) |

Only `services/notify.ts` (base URL) and `AIAssistantTab.tsx` (the "Data from …" label) read `config/api.ts`, so `VITE_API_ORIGIN` moves only those; to point the whole CRM at a local backend, `services/api.ts` must be changed too. Hardcoded production URLs also remain in `InvoicesTab.tsx` and `NotificationsTab.tsx` (`/v1/crm/admin/all-invoices`) and `pages/InvoiceReportPage.tsx` (`/v1/invoices/report/...`). `quotationsService.ts` reads `VITE_ECOM_URL` for the storefront origin (default `https://aquakart.co.in`). There is no `.env` file in the repo.

`ecomApi`/`adminApi` endpoints may be written with or without a leading slash; `ApiService.request` joins base and endpoint with exactly one `/`. `services/apiService.ts` groups feature operations and still imports `mockData.ts`.

## Validation

| Command                    | What it does                                                            | State on this branch (checked 2026-10-25)                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ui:audit`         | Raw-control audit against the baseline                                  | **Fails**: `CommerceAdminTab.tsx` has 33 buttons vs a baseline of 28 (from commit 7f24ae4)                                                                |
| `npm run ui:strict`        | Same audit, requires zero raw controls everywhere                       | Fails (legacy debt)                                                                                                                                       |
| `npm run lint`             | `ui:audit`, then `eslint .`                                             | Fails (the audit above; ESLint also reports ~270 errors)                                                                                                  |
| `npm run typecheck`        | `tsc --noEmit -p tsconfig.app.json`                                     | Fails with ~41 errors (suggestedProducts, ProductsTab, AuthContext, StockTab and others)                                                                  |
| `npm test`                 | `vitest run`                                                            | Passes: 4 files, 28 tests (`dashboardStats`, `invoiceViews`, `parseInvoiceBlock`, `CrmShell`)                                                             |
| `npm run check:gst`        | GST working-paper fixtures (`scripts/check-gst-report.cjs`)             | Passes                                                                                                                                                    |
| `npm run check:invoice-ai` | Offline AI invoice-extraction fixtures (`scripts/check-invoice-ai.cjs`) | Passes                                                                                                                                                    |
| `npm run build`            | `tsc && vite build`                                                     | Passes, but **`tsc` type-checks nothing**: `tsconfig.json` is a solution file with `files: []` and is run without `-b`. Use `npm run typecheck` for types |
| `npm run docs:scan`        | Regenerates `src/data/component-docs.json` (used by `/ui`)              | Run only when the inventory needs refreshing                                                                                                              |

On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`.

Git hooks: `prepare` runs Husky, which sets `core.hooksPath` to `.husky/_`. `.husky/pre-commit` runs `lint-staged` (Prettier on staged files) and `scripts/bump-version.mjs`, then stages `package.json`/`package-lock.json`. `.githooks/pre-commit` (enabled only by `npm run setup:hooks`) runs the full `npm run lint` instead.

## GST preparation report

Reports → **GST filing (GSTR-1 / GSTR-3B)**. An accountant working paper, not a return submission or portal JSON.

- Engine: `utils/gstReport.ts` (pure, paise rounding, dates in Asia/Kolkata, April–March FY). B2CL threshold is INR 100,000 for invoices from 2024-08-01 and INR 250,000 before.
- Source: `invoicesService.getAll()`. Line amounts are `productPrice` (the line value).
- UI: `GSTFilingReport.tsx`, whose invoice-review and GSTR-3B manual-amount panels are `SidebarDialog`s. Review overrides stay in the report screen and never update invoices.
- Workbook: `utils/gstReportExport.ts`, lazy-loading `write-excel-file/browser` and calling `writeXlsxFile(sheets).toFile(...)`.
- Tests: `npm run check:gst` (synthetic data only).

Recheck the official GSTR-1/GSTR-3B guidance before adding portal-upload schemas or filing sections.

## Other references

`README.md` (older feature table, partly stale), `docs/CRM25_ARCHITECTURE_IMPROVEMENTS.md`, `docs/UI_COMPONENT_CONSISTENCY.md` (its per-tab counts lag the baseline file). Update this map when you add a workspace, move a shared component or change API configuration.
