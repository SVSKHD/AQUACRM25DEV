# Aquakart CRM project map

Use this guide to locate a feature without scanning the entire repository. Read `AGENTS.md` for contribution rules. For each component's props, behaviour and gotchas, see [`docs/ELEMENTS.md`](docs/ELEMENTS.md).

## Runtime and entry points

| Concern                     | Source                                                 | Notes                                                             |
| --------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| App bootstrap and CSS order | `src/main.tsx`                                         | React StrictMode; special quotation-link entry                    |
| Routing and providers       | `src/App.tsx`                                          | Theme, authentication, relogin, toast, protected dashboard        |
| Workspace selection         | `src/pages/Dashboard.tsx`                              | Main tab IDs and module subnavigation; agents reuse product views |
| Shell and navigation        | `src/components/Layout/CrmShell.tsx`, `CrmSidebar.tsx` | Desktop sidebar and mobile navigation drawer                      |
| Tab content                 | `src/components/Layout/tabInnerlayout.tsx`             | `TabInnerContent`, optional title/description                     |
| Base styling                | `src/index.css`                                        | Tailwind, glass utilities, AI icon rail and working animations    |
| Controls                    | `src/styles/liquidControls.css`                        | Liquid buttons, fields, dropdowns and panels                      |
| Shell and tab styling       | `src/styles/crmShell.css`, `dashboardTabs.css`         | Navigation, content layout, module tabs                           |
| Shared responsive surfaces  | `src/styles/invoiceDialogMobile.css`                   | Explicit `.crm-dialog-*` rules; historical filename               |

The app uses React 18, TypeScript, Vite 5, Tailwind 3, Framer Motion, Lucide, fetch, and Axios. Frontend dev server port is 4000. Backend and authentication providers must be available for live data.

## Feature lookup

| Workspace                                      | Main source                                                            | Supporting components/services                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview ("General Statistics")                | `src/components/tabs/DashboardOverview.tsx`                            | Period KPIs with like-for-like change, 12-month revenue chart, invoice health, top products and customers; maths in `utils/dashboardStats.ts`, invoices mapped by `modular/invoices/mapInvoice.ts` (shared with the Invoices tab)                                      |
| Leads                                          | `src/components/tabs/LeadsTab.tsx`                                     | `leadsService` in `apiService.ts`                                                                                                                                                                                                                                      |
| Customers                                      | `src/components/tabs/CustomersTab.tsx`                                 | Online/offline user forms, profile/address/order/invoice/review tabs. `modular/customers/*` (including `CustomerDetailsDialog.tsx`) is currently unused                                                                                                                |
| Deals / activities                             | `src/components/tabs/DealsTab.tsx`, `ActivitiesTab.tsx`                | Shared responsive forms                                                                                                                                                                                                                                                |
| Invoices                                       | `src/components/tabs/InvoicesTab.tsx`                                  | Invoice CRUD, list actions, exports, draft state; paid, delivery and enriched status chips and filters (`utils/invoiceStatus.ts`); all-time search by name, phone or email; admin customer-PDF download (`vendor/storefrontInvoice/`, identical to the storefront PDF) |
| Invoice creation                               | `src/components/modular/invoices/invoiceDialog.tsx`                    | Easy, Standard and Quick modes; `QuickInvoiceTab.tsx` (AI paste preview); `invoice.types.ts`                                                                                                                                                                           |
| Invoice viewing                                | `src/components/modular/invoices/invoiceView.tsx`                      | Read-only details; public rendering lives under `src/pages/`                                                                                                                                                                                                           |
| Invoice output                                 | `src/utils/invoiceBulkExports.ts`, `priceUtils.ts`, `dateUtils.ts`     | Export/share helpers; GST PDF import uses `gstCertificateParser.ts`                                                                                                                                                                                                    |
| Quotations                                     | `src/components/tabs/QuotationsTab.tsx`                                | Active quotation editor/viewer. `modular/quotations/QuotationFormDialog.tsx` and `QuotationDeleteDialog.tsx` are currently unused                                                                                                                                      |
| Products / categories / subcategories / agents | `src/components/tabs/ProductsTab.tsx`                                  | `viewMode`; `modular/products/productCard.tsx` exports `Product`; `PhotoCarousel.tsx` exports photo types                                                                                                                                                              |
| Blogs                                          | `src/components/modular/products/tabInnerContent/ProductInnerBlog.tsx` | `BlogFormDialog.tsx`, `BlogDeleteDialog.tsx`; `services/blogTypes.ts`, `blogAI.ts`                                                                                                                                                                                     |
| Orders                                         | `src/components/tabs/OrdersTab.tsx`                                    | Order cards/details, invoice creation and status messaging                                                                                                                                                                                                             |
| CRM stock                                      | `src/components/tabs/StockTab.tsx`                                     | `modular/stock/stockFormDialog.tsx`, `StockStatusSendDialog.tsx`; separate from ecommerce stock                                                                                                                                                                        |
| Notifications / WhatsApp                       | `src/components/tabs/NotificationsTab.tsx`                             | `modular/notifications/WhatsAppTemplateForm.tsx`, `templateUtils.ts`; `services/notify.ts`                                                                                                                                                                             |
| Reports / GST preparation                      | `src/components/tabs/ReportsTab.tsx`                                   | Sales analytics and `components/modular/reports/GSTFilingReport.tsx`; `utils/gstReport.ts` calculations and `gstReportExport.ts` workbook                                                                                                                              |
| AI assistant / site review                     | `src/components/tabs/AIAssistantTab.tsx`                               | `components/modular/ai/`, `hooks/useSiteData.ts`, `services/seoService.ts`, `utils/seo*.ts` and `siteAnalysis.ts`                                                                                                                                                      |
| Scheduled jobs                                 | `src/components/tabs/JobsTab.tsx`                                      | `modular/jobs/`, `services/jobsService.ts`, `hooks/useJobRunner.ts`, `useJobsAccess.ts`, `utils/jobSchedule.ts`                                                                                                                                                        |

## Reusable UI contracts

### Dialogs and drawers

`ResponsiveDialog` portals to `document.body`, so it is not clipped by transformed cards or tab containers. It supplies an accessible heading/close button, header/body/footer sections, arrow scrolling, Escape handling, focus cycling/return, stacked body scroll locks, safe areas and visual viewport updates for the mobile keyboard. Set `busy` while saving or generating to block accidental dismissal. `drawer` docks the same surface to the right on desktop.

```tsx
<ResponsiveDialog
  open={open}
  onClose={closeForm}
  title="Edit record"
  size="md"
  busy={saving}
  footer={
    <>
      <LiquidButton onClick={closeForm} disabled={saving}>
        Cancel
      </LiquidButton>
      <LiquidButton
        type="submit"
        form="record-form"
        variant="primary"
        disabled={saving}
      >
        Save
      </LiquidButton>
    </>
  }
>
  <form
    id="record-form"
    onSubmit={save}
    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
  >
    {/* Fields; no second whole-form scroll container. */}
  </form>
</ResponsiveDialog>
```

Use `size="sm"` for confirmations, `md` for catalog editors, `lg`/`xl` for invoice and detailed record flows. `header` adds mode controls or profile navigation below the shared heading. A three-action mobile footer can mark its main action with `crm-dialog-primary` to span both columns. Use `crm-dialog-footer-stack` for a summary plus action row.

### Controls and records

- `LiquidButton`, `LiquidIconButton`, `LiquidInput`, `LiquidSelect`, `LiquidDropdown`, `LiquidPanel`, `LiquidBadge`: `src/components/ui/liquid.tsx`. Give icon-only controls an accessible name. Explicitly link external footer submit buttons to their form ID.
- `ArrowScrollArea`: keyboard-focusable region, hidden scrollbar, arrows visible only when content overflows, directions disabled at their limits. `horizontal` handles photo rows. Do not disable ordinary scrolling.
- `AquaGenericTable`: shared columns, actions, search, sorting, selection and mobile cards. Pass `getRowId` for stable selection. Give JSX-rendered columns a `filterValue` so search can match them, and a `sortValue` to make the header sortable. Preserve mobile action labels rather than truncating them.
- `useToast`: success/error feedback. Show an inline `role="alert"` for form-specific failures. Keep drafts open when APIs fail.
- `TabInnerContent`: consistent content scope, headings and focus styling. Use `crm-tab-toolbar` for wrapping filter/action rows.

### AI

- `services/aiService.ts`: `/ai/status`, `/ai/generate`, JSON parsing, friendly error handling and shared configured-status caching.
- `AIAssist.tsx`: per-field text improvement and custom instructions with review/insert/replace controls.
- `AICatalogSuggestions.tsx`: title/description/keywords/brand proofreading. It sends only non-empty fields and accepts flat or `fields`-wrapped replies. It rejects numerical specification changes and detects stale drafts before applying corrections.
- `AIFieldAnimation.tsx`: wrap the form in `AIFieldAnimationScope`; wrap visible controls with `AIFieldAnimation` (`compact` for checkboxes). `useAIFieldWorking` reports actual requests. The icon has a separate aligned rail; animation honors reduced motion.
- `services/invoiceAI.ts`: Quick invoice paste extraction through the existing AI service. A preview must be applied explicitly; missing contacts preserve current values and valid product rows append. Ambiguous/missing unit prices or quantities are flagged and skipped. Phone/email must match the source. No invoice is saved by AI. The local `utils/parseInvoiceBlock.js` parser remains available as a fallback.
- `services/blogAI.ts`: topic-based complete blog drafts; loads the real catalog, validates selected IDs, reuses product images, initializes reviews/ratings to zero. It does not save the blog. Missing images require user uploads.

## API and environment modes

`src/config/api.ts` is the single API-origin configuration:

| Command / mode                                             | Origin                       |
| ---------------------------------------------------------- | ---------------------------- |
| `npm run dev` (development) or `npm run dev -- --mode dev` | `http://localhost:5300`      |
| `npm run dev -- --mode prod`                               | `https://api.aquakart.co.in` |
| `npm run build` (production)                               | Existing production origin   |
| `npm run build -- --mode dev`                              | Local origin                 |

`services/api.ts` exports `api` (`/v1/crm`) and `ecomApi` (`/v1/`). Ecommerce endpoint arguments must omit the leading slash because its base already ends in `/`. Notifications use `/v1/notify`. `apiService.ts` groups feature operations and has mock-data branches (normally disabled). Fetch results use `{ data?, error?, status? }`; an HTTP failure can resolve with `error` rather than throw. Check it before updating UI success state.

`AuthContext.tsx` manages sessions; API requests read `auth_token` and broadcast invalid-token events through `utils/authEvents.ts`. Respect role/permission helpers; see `utils/permissions.ts` and module-specific access hooks. Never hardcode backend IDs or put provider keys in frontend code.

## Validation and maintenance

- `npm run check:ui`: installed-runtime regression checks in `scripts/check-responsive-ui.cjs`. Covers invoice Easy/Standard/Quick submit linkage and footer placement, shared dialog semantics, keyboard focus, Escape, nested busy dialogs, scroll locks, viewport listener cleanup, button defaults and CSS parsing. No backend writes or browser required.
- `npm run check:invoice-ai`: offline fixture checks for AI invoice extraction, missing/invalid amounts, source-grounded contacts, malformed replies and API failures.
- `npm run check:invoice-pdf-sync`: verifies `src/vendor/storefrontInvoice/` still matches the storefront's invoice PDF code, so CRM and customer PDFs stay identical. It needs `../AQUAKARTECOM` or `AQUAKARTECOM_DIR`.
- `npm run typecheck`: TypeScript app checks. Existing unrelated failures remain in overview, stock, auth, invoice/public-product code and unused declarations. Do not describe this command as passing until those are fixed.
- `npm exec vite build`: production bundling and CSS compilation independent of the full typecheck. `npm run build` runs TypeScript first and may stop at the existing errors.
- `npm test -- <path>`: focused Vitest tests. The currently installed Vitest 4/Vite 5 combination has a known startup failure for `vite/module-runner`; do not assume a failed startup means tests ran.
- `npm run lint`: repository ESLint. Avoid unrelated formatting or lockfile churn.
- On Windows use `npm.cmd` if execution policy blocks PowerShell's `npm.ps1`.

Mobile visual QA: inspect 320px and 390px widths, tablet/desktop, short landscape, keyboard open, light/dark themes, long titles/addresses/prices, validation errors, disabled/busy actions and nested dropdowns. Confirm body content scrolls while footer actions stay reachable; arrows, touch, wheel and keyboard should all work. Browser layout QA was unavailable during this shared-dialog update; structural checks and bundling do not prove pixel alignment.

Additional references: `README.md`, `docs/AGENTS_TAB_API_APP_DOCUMENTATION.md`, `docs/CRM25_ARCHITECTURE_IMPROVEMENTS.md`, and `src/data/component-docs.json` (generated inventory; may lag source). Run `npm run docs:scan` only when regenerating the inventory is needed. Update this guide when features or shared contracts move.

## Indian GST preparation reports

Open Reports > GST filing (GSTR-1 / GSTR-3B). This is an accountant working paper, not a return submission or GST Portal JSON upload. Invoice prices are GST-inclusive, as confirmed by the business. The existing invoice total sums `productPrice` once per line, so report setup defaults to saved line amounts; users must confirm the price basis and tax setup. Unit-price mode multiplies by quantity and still requires reconciliation with the saved invoice total. Do not change the legacy invoice/PDF tax calculations as part of report work.

- Engine: `src/utils/gstReport.ts`. Pure calculations with paise rounding. Invoice dates are used, with timestamp boundaries interpreted in Asia/Kolkata; never use payment status to exclude unpaid sales. Financial years run April-March.
- Source: `invoicesService.getAll()`; supports array/enveloped responses and rejects known truncated datasets. No new backend endpoints or schema changes are assumed.
- Required setup: business GSTIN, confirmed rates/price basis, HSN digit requirement. Missing/invalid invoice numbers, dates, recipient GSTIN, actual place of supply, HSN/UQC, quantities, rates or total mismatches keep invoices out of totals. Duplicate invoice numbers are checked across the financial year. GSTIN validation checks format/state only, not registration status.
- Review overrides live in this report screen only and do not update invoice records. Refresh resets invoice reviews. Leaving the GST view discards review/manual state; export first. GSTR-3B manual inputs are scoped by supplier and period to avoid carrying ITC into another month.
- Regular domestic sales only: B2B, B2CL and B2CS. B2CL applies to interstate unregistered invoices over INR 100,000 from August 2024, and over INR 250,000 before then. Missing place of supply is never inferred from a recipient GSTIN or customer address. HSN summaries separate B2B and B2C.
- GSTR-3B working totals cover reviewed 3.1(a) sales plus explicit ledger adjustments, 3.1(b)-(e), manual ITC 4(A), reversals 4(B), net ITC 4(C), informational 4(D), and unregistered interstate CRM sales for 3.2. ITC is not inferred from product DP/cost prices. Reclaimed/ineligible informational values are not added again to eligible ITC.
- Credit/debit notes, amendments, advances, export/SEZ, nil/exempt/non-GST supplies, reverse charge and special documents need separate reconciliation; explicitly tagged special documents cannot be forced into regular domestic sales. The user may confirm a PO-tagged record is an actual regular sales invoice.
- Remaining filing sections need ledger/portal reconciliation: GSTR-1 document series/counts (13), ECO 3.1.1, composition/UIN in 3.2, inward exempt supplies (5), interest/late fees (5.1), and payment/offset (6). Net tax payment/cross-utilisation is not calculated. Manual zero inputs must be expressly confirmed against books/GSTR-2B.
- Workbook: `src/utils/gstReportExport.ts`, using `writeXlsxFile(sheets).toFile(filename)` (installed library API). Sheets include setup/limitations, sales, B2B/B2CL working rows, B2CS, HSN, GSTR-3B, manual inputs, interstate unregistered supplies, documents and review issues. Tax totals include reviewed valid records only; unresolved/excluded documents remain in review sheets.
- Tests: `npm run check:gst` covers inclusive intra/interstate calculations, historical thresholds, mixed rates, HSN grouping, missing metadata, duplicates, cancellations, PO/special documents, line-total reconciliation, IST/FY boundaries, ITC and workbook structure. Tests use synthetic data; no filings or live records are created.

Official guidance checked 24 October 2026: [GSTR-1 portal guide](https://tutorial.gst.gov.in/userguide/returns/Creation_of_Outward_Supplies_Return_in_GSTR-1.htm) (B2CL threshold and B2B/B2C HSN split) and [GSTR-3B portal FAQ](https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm) (outward liabilities, GSTR-2B and ITC). Recheck current official requirements before adding portal-upload schemas or additional filing sections.
