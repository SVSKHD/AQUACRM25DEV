# Aquakart CRM element reference

Props, behaviour and gotchas for the shared and most-used elements. For where features live, start with [`docs.md`](../docs.md); for contribution rules, [`AGENTS.md`](../AGENTS.md); for control rules, [`UI_COMPONENT_CONSISTENCY.md`](UI_COMPONENT_CONSISTENCY.md).

Checked against branch `port/local-work-onto-main` on 2026-10-25. Line numbers drift; search for the names instead.

**Contents**

1. [Liquid controls](#liquid-controls)
2. [Side panels](#side-panels)
3. [Shared table](#shared-table--aquagenerictable)
4. [Invoices](#invoices)
5. [Dashboard](#dashboard)
6. [Customers detail](#customers-detail)
7. [AI assistant](#ai-assistant)
8. [Scheduled jobs](#scheduled-jobs)
9. [GST report](#gst-report)
10. [WhatsApp templates](#whatsapp-templates)
11. [Hooks and utilities](#hooks-and-utilities)
12. [Known issues](#known-issues)

---

## Liquid controls

All in `src/components/ui/liquid.tsx`; styles in `src/styles/liquidControls.css` and `src/index.css`. The rules for when to use each (and the raw-control audit) are in `UI_COMPONENT_CONSISTENCY.md`; this is only a prop summary.

| Export                       | Renders                                                    | Notable props                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LiquidButton`               | `<button>`                                                 | `variant`: `primary` / `soft` (default) / `danger` / `ghost`. `requestState`: `idle` / `loading` / `error` / `success`, with `loadingLabel` / `errorLabel` / `successLabel`. `loading` disables it and sets `aria-busy`. **No default `type`**: pass `type="button"` inside forms                                                                                                                                                                  |
| `LiquidIconButton`           | `<button class="liquid-icon-button">`                      | Button attributes only. Give it an `aria-label`                                                                                                                                                                                                                                                                                                                                                                                                    |
| `LiquidFileButton`           | `<label>` styled as a button + hidden file input           | Required `id`; `variant`; `disabled` dims the label and blocks clicks                                                                                                                                                                                                                                                                                                                                                                              |
| `LiquidInput`                | `<input>` inside a `<label>`                               | `label`, `wrapperClassName`. No `label` means no accessible name unless you pass `aria-label`                                                                                                                                                                                                                                                                                                                                                      |
| `LiquidTextarea`             | `<textarea>` inside a `<label>`                            | Same as `LiquidInput`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `LiquidCheckbox`             | Checkbox inside a `<label>`                                | `label`, `ariaLabel`, `indeterminate`                                                                                                                                                                                                                                                                                                                                                                                                              |
| `LiquidSelect`               | Native `<select>` with chevron                             | `label`, `wrapperClassName`, `children` (options). Use only when a native select is intended                                                                                                                                                                                                                                                                                                                                                       |
| `LiquidDropdown`             | Custom listbox, menu portalled to `body`                   | `value`, `options` (`{ label, value, disabled? }`), `onChange`, `label`, `ariaLabel`, `placeholder` (`"Select"`), `disabled`, `searchable` (default: on for 7+ options), `searchPlaceholder`. Keyboard: arrows, Home/End, PageUp/PageDown, Enter, type-ahead, Escape (does not reach the host panel). The scrollbar is hidden; up/down arrows appear when the list overflows (hover scrolls, click pages). Flips upward and clamps to the viewport |
| `LiquidMultiSelect`          | Multi-select listbox, same menu as `LiquidDropdown`        | `values`, `options`, `onChange(values)`, `label`, `placeholder`, `allLabel` (trigger text when everything is selected), `searchable`, `disabled`. Menu has **Select all / Deselect all** (applied to the search matches when searching) and a selected count. Keeps option order                                                                                                                                                                   |
| `LiquidPanel`, `LiquidBadge` | `div.liquid-panel`, `span.liquid-badge`                    | Only `children` and `className`; other props are not passed through                                                                                                                                                                                                                                                                                                                                                                                |
| `SidebarRequestBanner`       | Error (`role="alert"`) or success (`role="status"`) banner | `state` (`RequestState`), `message`, `title?`, `onDismiss?`. Renders nothing for `idle`/`loading` or without a message                                                                                                                                                                                                                                                                                                                             |

`RequestState` and `LiquidDropdownOption` are exported types.

---

## Side panels

### `ResizableFloatingSidebar` — `src/components/ui/ResizableFloatingSidebar.tsx`

The panel used for editors, detail views and confirmations across the CRM. Portalled to `document.body`, `role="dialog" aria-modal="true"`.

| Prop                                     | Default                            | Notes                                                                                                                                                          |
| ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`, `onClose`, `title`, `children`   | —                                  | Required                                                                                                                                                       |
| `subtitle`                               | —                                  | Under the title                                                                                                                                                |
| `toolbar`                                | —                                  | Fixed bar between the header and the scroll area (`.aquacrm-dialog-toolbar`), e.g. `SectionNav`. The scroll area itself hides its scrollbar (`scrollbar-hide`) |
| `footer`                                 | —                                  | Fixed action bar below the scroll area (`.aquacrm-dialog-footer`); never covers fields                                                                         |
| `widthStorageKey`                        | `"aquacrm:floating-sidebar-width"` | The resized width is saved in `localStorage` under this key. Give each panel its own key                                                                       |
| `initialWidth` / `minWidth` / `maxWidth` | `480` / `400` / `960`              | Width is clamped to the viewport minus 80 px                                                                                                                   |
| `resizable`                              | `true`                             | Drag handle (`aria-label="Resize sidebar"`); disabled below 768 px                                                                                             |

Behaviour: locks body scroll (compensating for the scrollbar), closes on backdrop `mousedown`, the X button or Escape, and follows `visualViewport` height on mobile. The body scrolls inside `.aquacrm-dialog-scroll`.

Gotchas: the Escape listener is on `window` with no stacking, so Escape closes every open panel at once and also fires while a `LiquidDropdown` inside the panel is open (see [Known issues](#known-issues)). There is no `busy` guard; use `SidebarDialog` for that.

### `SidebarDialog` — `src/components/ui/SidebarDialog.tsx`

A thin adapter over `ResizableFloatingSidebar` used by the jobs screens and the GST report.

- Props: `open`, `onClose`, `title`, `description?` (→ `subtitle`), `footer?`, `busy?`, `size?` (`sm` 420 / `md` 560 / `lg` 720 px initial width; `sm` is not resizable), `widthStorageKey` (required), `children`.
- `busy` makes every close path a no-op and sets `aria-busy` on the body.
- `footer` is passed to `ResizableFloatingSidebar`'s `footer` slot: a fixed bar below the scroll area (right-aligned, wraps), so fields never show through under it. Drawers built on `ResizableFloatingSidebar` directly pass their action bar as `footer` too; never put a `sticky bottom-0` bar inside the scroll content. Submit buttons there need `form="<form id>"`.

### Other

- `src/components/ArrowScrollArea.tsx`: scroll region with arrow buttons. Only `AICatalogSuggestions` uses it.
- `src/components/modular/invoices/invoiceView.tsx` (`AquaInvoiceViewDialog`) uses its own `createPortal` modal rather than the sidebar.

---

## Shared table — `AquaGenericTable`

`src/components/modular/invoices/invoiceTable.tsx`. Generic despite the path. Built from liquid controls, styled with the `--aqua-*` theme tokens (see "Theme tokens" below).

| Prop                                         | Default                       | Notes                                                                           |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `heading`, `columns`, `data`                 | —                             | Required                                                                        |
| `subHeading`                                 | —                             | e.g. a result count                                                             |
| `isLoading`, `emptyMessage`                  | `false`, `"No records found"` |                                                                                 |
| `onRowClick`                                 | —                             | Row and card click                                                              |
| `actions`, `actionsLabel`, `actionsBelowRow` | —, `"Actions"`, `false`       | Per-row `{ label, onClick, icon?, tone? }`; `tone: "danger"` for Delete         |
| `enableFilter`, `filterPlaceholder`          | `false`, `"Filter rows"`      | Client-side filter box                                                          |
| `getRowId`                                   | `row.id`, then index          | Use a stable ID so selection survives refetches                                 |
| `selectedRowIds` + `onSelectionChange`       | —                             | Pass both to show `LiquidCheckbox` selection (with an indeterminate select-all) |
| `pageSizeOptions`                            | `[10, 25, 50]`                | Pagination; the first value is the initial page size                            |
| `headerActions`                              | —                             | Nodes next to the record count (InvoicesTab puts its **Select** button here)    |
| `headerFilters`                              | —                             | Existing filter controls shown in the header before the search box              |
| `emptyHint`                                  | search hint while filtering   | Second line of the empty state                                                  |

`AquaTableColumn<T>`: `key` (dotted paths resolve when there is no `render`), `header`, `className`, `render(row, index)`, `filterValue(row)`, `sortValue(row)`, `wrap`, `headerClassName`, `align` (`"right"` for money and numbers).

- **Filtering** matches `filterValue`, else a `render` result that is a string or number, else the raw key value. A column whose `render` returns JSX is unsearchable without `filterValue`.
- **Sorting**: a column with `sortValue` gets a header button with `aria-sort`; clicks cycle descending → ascending → unsorted. Numbers compare numerically; strings use `localeCompare` with `numeric: true`. Sorting happens before pagination.
- **Pagination** resets to page 1 when the filter, page size, data or sort changes.
- **Selection**: select-all acts on the rows on the current page.
- **Layout**: cards below `md`, table from `md`. Cells are capped at 240 px unless the column sets `wrap`.
- **States**: loading shows skeleton rows (cards on phones); empty shows an icon, `emptyMessage` and `emptyHint`.

### Theme tokens

`src/styles/liquidControls.css` defines `--aqua-*` tokens: the light value under `:root`, the dark value under `.dark` (the class `ThemeContext` toggles, the same place as the `--liquid-*` tokens). Tailwind exposes them as `aqua-*` colours (`text-aqua-tx3`, `bg-aqua-sunk`, `border-aqua-line`), `shadow-aqua-card` and `bg-aqua-grad`, so no `dark:` pair is needed for them. Shared classes in the same file: `aqua-table-card`, `aqua-ctl` / `aqua-ctl-danger` (flat control on `LiquidButton`, `LiquidIconButton` or a `LiquidDropdown` trigger), `aqua-track` + `aqua-seg` (segmented filter with `aria-pressed`), `aqua-tone-{good,warn,bad,info,muted}` (status chips) and `aqua-skeleton`. Phone-only (below 768px): `aqua-m-card`, `aqua-m-hero` (on `LiquidPanel`), `aqua-m-track` (scrolling segmented group) and `aqua-m-ctl`; the dashboard uses them so desktop keeps its look. Shell tokens `--aqua-rail`, `--aqua-drawer`, `--aqua-panelbd`, `--aqua-panelsh` and `--aqua-scrim` style the sidebar rail and mobile drawer in `crmShell.css`.

---

## Invoices

### Mapper — `src/components/modular/invoices/mapInvoice.ts`

`mapInvoiceFromApi(raw)` builds the CRM `Invoice` (`invoice.types.ts`) for both the Invoices tab and the dashboard. Also exports `parseInvoiceDate` (handles `DD/MM/YYYY`, `DD-MM-YY` and anything `Date` parses) and `normalizeNumber`.

| Field                                                       | Source                                                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                        | `resolvePersistedInvoiceId` (`utils/invoiceViews.ts`): the first 24-hex Mongo ID among `_id`, `invoiceId`, `data._id`, `data.invoiceId`, `id`; otherwise `""`        |
| `products[]`                                                | First array among `products`, `items`, `invoice_items`, `invoiceItems`, `order_items`, `orderItems`                                                                  |
| `productPrice`                                              | First value above 0 among `productPrice`, `unit_price`, `unitPrice`, `price`, `mrp`, `rate`, `salePrice`, `selling_price`; else `total / qty` or `total_price / qty` |
| `productSerialNo`                                           | `productSerialNo` → `serial_no` → `sku`                                                                                                                              |
| `total_amount`                                              | `total_amount` → `total` → sum of `productPrice`                                                                                                                     |
| `delivered_by` / `delivery_date`                            | `transport.deliveredBy` / `transport.deliveryDate` → flat fields                                                                                                     |
| `paid_status`                                               | `paid_status` → `paidStatus` → `payment_status` → `"unpaid"`                                                                                                         |
| `invoice_login_linked`                                      | `Boolean(firebaseUid)`                                                                                                                                               |
| `invoice_open_count` / `invoice_last_opened_at`             | `accessMetrics.openCount` (0) / `accessMetrics.lastOpenedAt`                                                                                                         |
| `migrated` / `migration_reviewed` / `migration_reviewed_at` | `migrated` / `migrationReviewed` / `migrationReviewedAt`                                                                                                             |

**`productPrice` is the line value (PR #89).** Totals, the dashboard, the table and the PDF use it as-is. Never multiply it by quantity.

The public invoice page uses a different mapper and type: `src/pages/dynamicInvoiceComponents/invoiceUtils.ts` and `types/invoice.types.ts`.

### Statuses — `src/utils/invoiceStatus.ts`

Pure functions over plain objects, used by the table, chips, view dialog, dashboard and exports.

| Export                                                | Values                                             | Rule                                                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paidStatusOf`                                        | `paid` / `partial` / `unpaid`                      | `paid_status` lower-cased: `paid`, `fully paid`, `complete`, `completed` → paid; `partial*` → partial; anything else → unpaid                                                   |
| `deliveryStatusOf`                                    | `delivered` / `scheduled` / `assigned` / `pending` | `delivery_date` today or earlier → delivered, future → scheduled; no date but `delivered_by` → assigned; else pending ("Not delivered"). `YYYY-MM-DD` is parsed as a local date |
| `enrichmentStatusOf`                                  | `enriched` / `not-enriched`                        | `invoice_login_linked`: the customer opened the public link and linked an account (backend `firebaseUid`)                                                                       |
| `PAID_LABELS`, `DELIVERY_LABELS`, `ENRICHMENT_LABELS` | Display labels                                     | Use them so exports match the UI                                                                                                                                                |

### Invoices tab — `src/components/tabs/InvoicesTab.tsx`

- **Control bar**: global search, an **Export** menu (PDF of the filtered list, Excel of the filtered list, Sales Excel, Import from API), Create. Filters: type (All / GST / non-GST / PO), month, year, opened, and a source switch **Current / Migrated / All** (choosing Migrated clears month and year).
- **Summary panel**: stats strip (Total value, Invoices, Average sale, Profit, **Outstanding** = unpaid + partial, Customer opened, Enriched), scrolling sideways below `xl`; then Paid, Delivery and Enriched chip rows with count and amount per status. Chips are computed on the period set (month/year/type/source/opened) and filter the list; "Clear filters" resets all three.
- **Search** matches one substring against a long text built from each invoice (IDs, number, dates, customer and GST fields, statuses, amounts, product names, serials, slugs). It searches **all loaded invoices and ignores every other filter** while active.
- **Layout**: the table appears from `lg` (1024 px); below that, cards (one column, two from `md`). Table columns: Invoice (sort by date), Customer (name), Items (count), Amount (total), Status (paid), Actions (Download, Admin view, Customer view, Send WhatsApp, Send email, Clone, Edit, Delete).
- **Selection mode**: off by default. The **Select** button or a 450 ms long-press on a card turns it on. A sticky bar offers select-all, Links, Excel, PDF and **Done**. **Esc** exits unless a `[role="dialog"]` is open.
- **Download** (every user; no admin gate) calls `downloadPublicInvoicePdf` from `utils/invoicePdf.ts`, the same generator `InvoicePage` uses. The file is `Aquakart-Invoice-<reference>.pdf`.
- **Drafts**: the create/edit form is kept in `localStorage["invoiceDraft"]`; the Quick tab uses `usePersistentFormDraft`.
- `InvoiceBackfillPanel` previews and runs historical backfill batches (`invoicesService.previewHistoricalBackfill` / `runHistoricalBackfill`).
- Bulk "One Excel"/"One PDF" come from `utils/invoiceBulkExports.ts` (a staff report, not the customer PDF).

### Editor and view

- `AquaInvoiceFormDialog` (`invoiceDialog.tsx`): a `ResizableFloatingSidebar` (`aquacrm:invoice-editor-width`) with **Easy**, **Standard** and **Quick** modes (last mode remembered in `aquacrm:invoice-editor-mode`; editing a GST/PO invoice opens Standard). Sections: Customer, Business (Standard: GST/PO), Products, Invoice & payment. The fixed footer shows the line count, total and Clear / Create. Layout uses container queries on `.invoice-editor` (`styles/invoiceDialogMobile.css`), so it follows the panel width, not the viewport. GST certificate import (Standard) lazy-loads `utils/gstCertificateParser`. All form state lives in `InvoicesTab`.
- **GSTIN autofill** (Standard → Business): when a typed or pasted GSTIN reaches 15 characters, `utils/gstin.ts` `describeGstin` checks the format, state code and check digit and shows the state and PAN, or a hint (it never blocks saving). Optional prop `lookupGstinOnPortal(gstin)` (`services/gstinPortal.ts`, `GET /crm/admin/gstin/:gstin`, backend calls Masters India for the GST portal record): shows "Checking the GST portal…", then legal/trade name, status and registration date (amber warning when not Active), and fills **empty** GST name (legal name) and address. Errors: not found (rose), lookup not set up on the server (503), otherwise a message plus **Try again**. If the typed name/address differs from the portal, **Use portal name & address** replaces them (explicit). Optional prop `findGstDetails(gstin)`: `InvoicesTab` passes `findGstDetails(gstin, invoices, { excludeId })` over the loaded invoices; phone/email (the portal has none) fill immediately from the newest earlier invoice, and name/address fall back to earlier invoices when the portal has no answer. Only **empty** fields are filled; the note names each source; **Undo fill** restores the previous value of fields not edited since. A late answer for an older GSTIN or a closed form is ignored. Runs on input only, not when an existing invoice opens.
- `invoiceFormParts.tsx`: `CustomerFields` (title-cases names, lower-cases emails, tidies addresses on blur), `PhoneInput` (digits only, drops a pasted +91/0), `AmountInput` (₹ with Indian grouping as you type), `ProductsSection` (one composer for every mode; Enter adds the line; a catalog pick sets the line amount to unit price × qty until the amount is edited). `SectionNav` (toolbar jump bar: ↑/↓ arrows, a pill per section with a check once filled, ←/→ between pills, Alt+↑/↓ anywhere in the panel; sections need matching `id`s). Helpers in `invoiceFormat.ts` (`formatINR`, `findCatalogProduct`, `tidyAddress`, and the amount-field helpers `cleanAmount`, `formatAmountText`, `amountCaret`).
- `QuickInvoiceTab`: paste text; the first paste fills empty customer fields with the local parser `utils/parseInvoiceBlock.js` (one-line, labelled and inline-number pastes). **Quick fill** re-runs it; **Format with AI** (`services/invoiceAI.ts`) shows a review card, then Apply. AI unit prices become line values (unit × qty) on Apply, and exact catalog names get their product IDs.
- `AquaInvoiceViewDialog` (`invoiceView.tsx`): props `showModal`, `viewingInvoice`, `setModal`, `onOpenAdmin`, `onOpenCustomer`. Shows paid and delivery badges and the open count.

---

## Dashboard

`src/components/tabs/DashboardOverview.tsx`, with maths in `src/utils/dashboardStats.ts` (tested in `dashboardStats.test.ts`).

- **Periods** (`PERIOD_OPTIONS`): this month, last month, this quarter, this financial year, all time. Quarters and years follow the April–March FY. `periodRanges` returns the current range plus a like-for-like previous span (same elapsed days).
- **Revenue** is `total_amount`, the figure the Invoices tab shows. `computeKpis`, `percentChange`, `monthlyTrend`, `statusShares`, `topProducts` (by summed `productPrice`; units = summed quantity), `topCustomers` (merged by normalised phone, falling back to name), `niceMax`, `formatCompactInr`.
- **Sources** (leads, customers, deals, invoices, products, categories, stock) load with `Promise.allSettled`; a failed source is reported and the rest still render. Counts prefer a server-side `pagination.total`/`total` over the page length.
- Chart bars use `#2a78d6` (dark `#3987e5`) for the selected period and have a "View as table" alternative.

---

## Customers detail

In `src/components/tabs/CustomersTab.tsx`.

- `CustomerDetailModal` is a `ResizableFloatingSidebar` (`aquacrm:customer-details-width`, 680 px, 480–1100). Header: initials, Online/Offline chip, role name and email verification (online), counts. Tabs: Profile, Addresses, Orders, Invoices, Reviews (with counts). Footer: **WhatsApp** and **Edit profile**.
- `ProfileTab`: `DetailSection`/`DetailRow` groups for Contact, Account (online) or Invoice customer (offline), address and GST details, plus a Delete danger zone.
- `RecordCards` lists orders and invoices; invoice status comes from `paidStatusOf`. Invoice lines show `productPrice` without multiplying by quantity.
- `addressText` joins street (or `line1`, `line2`), city, state and PIN/postal code.
- Stars carry `aria-label="N out of 5 stars"`.
- `UserFormModal` (`aquacrm:customer-editor-width`) groups fields in `FormSection`s.
- Drafts: `usePersistentFormDraft` keys `customers:<source>:<id|create>`, `customer-address:<customer>:<address|create>`, `customer-review:<customer>:<review|create>`.

---

## AI assistant

`src/components/tabs/AIAssistantTab.tsx`, `view: "seo" | "autopilot" | "links" | "data" | "chat"` (from `Dashboard.tsx`'s "Assistant views" sub-navigation). Every view calls `useSiteData()`; the chat gets `buildAssistantContext(analysis, readiness.summary)`.

| View        | Component (`modular/ai/`) | Purpose                                                                                                                                                           |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seo`       | `SeoView`                 | Coverage summary, filled/missing checks, keyword and page rankings; uses `CoverageReport`, `KeyphrasePanel`, `KeywordSuggestions`, `PageFixPanel`, `ChangeBanner` |
| `autopilot` | `AutopilotView`           | Plans, drafts with AI and bulk-applies SEO record fixes ranked by predicted gain; reports per-page failures                                                       |
| `links`     | `InterlinkingView`        | Orphans, broken links, taxonomy gaps, unlinked mentions                                                                                                           |
| `data`      | `SiteDataView`            | Every storefront page with its record, readiness and links                                                                                                        |
| `chat`      | `AIChat`                  | Free-form chat grounded in site data                                                                                                                              |

Data path: `useSiteData` (module-level cache; `reload()` refetches) → `utils/siteAnalysis.ts` `analyzeSite` → `seoCoverage.ts` / `seoProjection.ts` / `seoFixes.ts` / `seoAutopilot.ts` / `keyphrases.ts`. Saves go through `services/seoService.ts` (on `ecomApi`). Page readiness comes from the backend; `seoProjection.ts` only predicts it and must stay in step with the backend's `seoReadiness.js`.

The separate **SEO** tab (`SeoTab.tsx`) uses `seoMappingService.ts` on `/v1/admin/seo` and is a different screen.

---

## Scheduled jobs

`src/components/tabs/JobsTab.tsx`. `useJobsAccess()` returns `{ canRead, canManage }` (`undefined` while unknown) from `resolveStaffPermission(user, "jobs.read" | "jobs.manage")`, then an API probe. `Dashboard.tsx` hides the tab when `canRead` is falsy; `JobsTab` also renders a no-access state.

| Element (`modular/jobs/`)                      | Notes                                                                                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JobFormDrawer`                                | `SidebarDialog`. Props `open`, `job` (`null` = create), `actions`, `onClose`, `onSaved(job, created)`. Validates name, action, params, schedule and timeout (10–3600 s) |
| `JobConfirmDialog`                             | `SidebarDialog` confirmation: `open`, `title`, `message`, `confirmLabel`, `tone?` (`danger`/`warning`), `onConfirm`, `onCancel`                                         |
| `JobDetail`, `JobRunsTable`, `JobStatusBadge`  | Summary, run history, status pills                                                                                                                                      |
| `JobParamsForm`, `ChipInput`, `ScheduleEditor` | Param inputs, recipient tokens, cron/interval/once editor with a debounced (400 ms) cron preview                                                                        |
| `jobFormUtils.ts`                              | `normalizeIndianPhone`, `normalizeEmail`, `serializeParams`, `validateParams`, `scheduleStateFromJob`, `schedulePayload`                                                |

`hooks/useJobRunner.ts` `run(job)` starts a run and polls it; `activeJobIds` tracks running jobs.

---

## GST report

`ReportsTab.tsx` toggles between **Sales** and **GST filing (GSTR-1 / GSTR-3B)** (`aria-pressed` buttons). The GST view is `modular/reports/GSTFilingReport.tsx`; its review and GSTR-3B manual-amount panels are `SidebarDialog`s. Engine and workbook rules are summarised in `docs.md` → "GST preparation report".

---

## WhatsApp templates

`modular/notifications/WhatsAppTemplateForm.tsx` picks an approved template and fills its `{{n}}` variables. Used by `NotificationsTab` and `WhatsAppTab`.

- Loads `GET <notify>/whatsapp/templates` and `GET <notify>/status` once per session (a module-level promise, cleared on error).
- `templateUtils.ts`: `fillVariables`, `renderTemplate`, `selectionError`, `EMPTY_SELECTION`.
- `services/notify.ts` is on `NOTIFY_API_BASE_URL` from `config/api.ts` (production unless `VITE_API_ORIGIN` is set; see `docs.md` → "API origins").

---

## Catalog (Products workspace)

`tabs/ProductsTab.tsx` owns data, drafts and saves; the views compose these pieces from `modular/products/`:

| Component / module                                      | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductFormPanel.tsx`                                  | Product editor (sections: basics, description, pricing & stock, photos, Google Merchant). `onSubmit` resolves to an error message (`""` = saved), shown inline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `TaxonomyFormPanel.tsx`                                 | One editor for categories and subcategories; pass `parentOptions` for the subcategory parent picker. Categories allow at most 10 photos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `services/categoryPhotos.ts`                            | `saveCategoryWithPhotos(id?, form)` behind `categoriesService.create/update`. New photos (data URIs in the form) go as binary multipart `photos` files; on update the existing ones go first as `keepPhotos` (backend appends uploads after them, and ignores `keepPhotos` without files). Existing-only edits send JSON `photos` (reorder/remove). A new photo placed before an existing one triggers a second, JSON reorder PUT; if that fails the result is saved with a `warning`. Zero photos is refused (`NO_PHOTOS`): the backend can't clear the last photo. `categorySaveErrorMessage` maps 400/413/502/timeout/network errors and `photoIndex` to the user's photo number. Products, subcategories and blogs still send base64 JSON |
| `productForm.ts`                                        | `emptyProductForm`, `validateProductForm`, `productFormFromProduct`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `productCard.tsx`, `TaxonomyCard.tsx`                   | Animated cards. The product price shown is `effectivePrice` (discount price only when the discount is on). `CatalogCardSkeleton` for loading                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `PhotoUploader.tsx`                                     | Multi-file upload (5MB each), remove, make primary; first photo is primary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `CatalogDeleteDialog.tsx`                               | Confirmation panel for destructive actions (used for products, categories, drafts, blogs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `CatalogEmptyState.tsx`, `CatalogSearchField.tsx`       | Empty/no-results state and the toolbar search field                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `tabInnerContent/BlogCard.tsx`                          | Blog card (grid/list), status badge, quick publish toggle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tabInnerContent/BlogFormDialog.tsx`                    | Create / edit / duplicate (`duplicateOf`) a blog in a `SidebarDialog` (close blocked while saving). Slug follows the title for new blogs, is validated and checked for conflicts against `existingBlogs`. Title image and gallery use `PhotoUploader` (1 and 10 max). Local drafts via `useFormDraftSession`. First section is `BlogSeoPanel`: live SEO score (`utils/blogSeo.ts`, 12 checks, 0–100) and **Auto fix** (Gemini proposes title, short description, slug, keyphrases, keywords, tags, summary, highlights; tick, then _Apply to form_; slug unticked on published blogs; never edits the article body). Field robots open the AI assistant with a field-specific _Suggest_ (category/product pick from the loaded options)       |
| `tabInnerContent/BlogPreviewDialog.tsx`                 | Read-only blog view (sanitized HTML via `utils/sanitizeHtml.ts`) with storefront link copy/open and Edit, Duplicate, Publish/Move to drafts, Delete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `tabInnerContent/ProductInnerBlog.tsx`                  | Blog list: filters, selection with Select all / Deselect all, and bulk Publish / Move to drafts / Delete (sequential; failed items stay selected)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `components/ui/FormSection.tsx`                         | Titled field group inside side-panel forms                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `utils/productList.ts`, `blogList.ts`, `catalogRefs.ts` | Pure filter/sort/count helpers (tested). Category filters store _excluded_ keys so new categories show by default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Hooks and utilities

| Module                                      | Purpose                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/usePersistentFormDraft.ts`           | `{ key, value, onRestore, enabled?, debounceMs? (300) }`. Saves to IndexedDB `aquacrm-form-drafts`, with a `localStorage` fallback (`aquacrm:form-draft:<key>`). Also exports `loadFormDraft`, `listFormDrafts`, `saveFormDraft`, `clearFormDraft`                              |
| `hooks/usePersistentNativeFormDraft.ts`     | `{ key, formRef, enabled?, debounceMs? }` for uncontrolled forms (Commerce Admin)                                                                                                                                                                                               |
| `hooks/useFormDraftSession.ts`              | Panel-form drafts on top of `usePersistentFormDraft`: restores on every open, only when the draft differs from `baseline` (`restoredAt`), saves only while dirty, deletes the draft when the form matches `baseline`; `discard()` reverts. `baseline` must be memoized per open |
| `utils/apiPayload.ts` `extractArrayPayload` | Returns the first array among the payload itself, `data`, `items`, `results`, `rows`, `records` and entity keys, one level deep or under `data`; else `[]`                                                                                                                      |
| `components/CrmPanelErrorBoundary.tsx`      | Wraps each tab in `CrmShell`; shows a retry card and resets when `resetKey` (the tab ID) changes                                                                                                                                                                                |
| `components/ui/RichTextEditor.tsx`          | Rich text for products and blogs                                                                                                                                                                                                                                                |
| `hooks/useSiteData.ts`                      | Catalog + SEO data for the AI views; module-level cache                                                                                                                                                                                                                         |
| `hooks/useAIConfigured.ts`                  | Session-cached AI status; `AIAssist` renders nothing (the robot variant shows a dimmed, non-clickable robot) until it is true                                                                                                                                                   |
| `utils/invoiceViews.ts`                     | `resolvePersistedInvoiceId`, `getAdminInvoicePath`, `getCustomerInvoiceUrl` (`https://aquakart.co.in/invoice/:id`)                                                                                                                                                              |
| `utils/permissions.ts`                      | `SUPER_ADMIN_ROLE`, `isAdminUser` (currently unused), `resolveStaffPermission`                                                                                                                                                                                                  |

---

## Known issues

Verified by reading the code on 2026-10-25. Not fixed unless stated.

**Tooling**

- `npm run typecheck` fails (~41 errors); ESLint reports ~270 errors.
- `npm run build`'s `tsc` checks nothing (solution-style `tsconfig.json`, no `-b`).
- `UI_COMPONENT_CONSISTENCY.md`'s per-tab counts are stale relative to `scripts/ui-consistency-baseline.json`.

**API configuration**

- `ApiService` (`services/api.ts`) error results also carry the backend's `code`, `stage` and `photoIndex` when present, and `code: "TIMEOUT"` / `"NETWORK_ERROR"` when no response arrived. `postForm`/`putForm` send `FormData` without a manual `Content-Type` (the browser adds the boundary) and take `timeoutMs`.

- `services/api.ts` hardcodes production and ignores `config/api.ts`, so `VITE_API_ORIGIN` only moves `notify.ts` and the AI tab label. Further hardcoded production URLs in `InvoicesTab.tsx`, `NotificationsTab.tsx` and `InvoiceReportPage.tsx`.
- `notify.ts` posts free text to `<notify>/send-whatsappp` (three p's). Rename only together with the backend route.

**Invoices and prices**

- `services/invoiceAI.ts` asks the model for **unit** prices, while saved `productPrice` is a line value. `QuickInvoiceTab` converts on Apply (unit × qty); any other caller must do the same.
- `Invoice.customer_phone` is typed `number` but is a string at runtime; the invoice form's `PhoneInput` keeps digits only and stores `Number(value) || 0`, losing a leading `0`.
- `mapInvoiceFromApi` maps `sku` into `productSerialNo`.

**Interaction**

- `ResizableFloatingSidebar` Escape has no stacking: nested panels all close. (Escape on an open `LiquidDropdown` / `LiquidMultiSelect` now closes only the menu.)
- `JobFormDrawer` adds its own `document` Escape listener on top of the sidebar's, so `onClose` can run twice.
- `useJobRunner` sets its duplicate-run guard only after `jobsService.run` resolves, so a quick double-click can start a job twice.
- `ScheduleEditor` doesn't reset `previewLoading` when it leaves cron mode or the cron is empty.
- `PhotoCarousel` doesn't reset its index when `photos` shrinks.
- `LiquidButton` has no default `type`, so inside a `<form>` it submits unless `type="button"` is passed.

**Stock**

- `stockService.sendStockStatus` posts free text to `notify/send-whatsapp` on `ecomApi`; the WhatsApp flow elsewhere uses approved templates. Confirm with the backend before relying on it.

**Dead code**

- `pages/QuotationPage.tsx` and `pages/QuotationPublicPage.tsx` aren't routed; `/quotation/*` uses `QuotationLinkPage`. Kept until the quotation flow is confirmed.

**Accessibility**

- `LockScreen` and `ReLoginScreen` labels aren't linked to their inputs; the lock hint shows only "Cmd + L" although Ctrl+L also works.

**Fixed since the 2026-10-24 reference**

- Toasts now have an `aria-live` region, with `role="alert"`/`"status"` per toast.
- `mapInvoiceFromApi` no longer invents a random `inv-xxxx` ID.
- `StockFormDialog` now waits for `onSave` before reporting success.
- `NotificationsTab` customer totals and the public invoice mapper's fallback total now sum `productPrice` as the line value instead of multiplying by quantity.
- The unused `ResponsiveDialog.tsx` was removed; dialogs use `ResizableFloatingSidebar` / `SidebarDialog`.
