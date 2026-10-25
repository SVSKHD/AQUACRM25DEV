# Aquakart CRM element reference

This is the component-level reference for the CRM frontend: props, behaviour and known gotchas for each element. For where features live and the contribution rules, start with [`docs.md`](../docs.md) and `AGENTS.md`.

Line references (`file:line`) were correct on 2026-10-24 but drift as files change. Treat them as search hints.

**Contents**

1. [Tables and invoice statuses](#tables-and-invoice-statuses)
2. [Liquid controls](#liquid-controls)
3. [Dialogs and scrolling](#dialogs-and-scrolling)
4. [Feedback](#feedback)
5. [Layout and shell](#layout-and-shell)
6. [Auth screens](#auth-screens)
7. [AI helpers](#ai-helpers)
8. [Invoices](#invoices)
9. [Customers](#customers)
10. [Jobs](#jobs)
11. [Notifications](#notifications)
12. [Orders](#orders)
13. [Products and blogs](#products-and-blogs)
14. [Quotations](#quotations)
15. [Stock](#stock)
16. [AI assistant and site review](#ai-assistant-and-site-review)
17. [Hooks](#hooks)
18. [SEO and AI utilities](#seo-and-ai-utilities)
19. [Known issues](#known-issues)

---

## Tables and invoice statuses

### `AquaGenericTable` — `src/components/modular/invoices/invoiceTable.tsx`

The shared data table. It provides columns, an optional filter box, sortable headers, row selection, per-row actions, and a card layout on mobile. Invoices, quotations and others use it. The file name is historical; the table is not specific to invoices.

| Prop                                   | Type                                                 | Default                  | Notes                                                                |
| -------------------------------------- | ---------------------------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| `heading`                              | `string`                                             | —                        | **Required.** Card title                                             |
| `subHeading`                           | `string`                                             | —                        | For example a result count                                           |
| `columns`                              | `AquaTableColumn<T>[]`                               | —                        | **Required.** See below                                              |
| `data`                                 | `T[]`                                                | —                        | **Required**                                                         |
| `isLoading`                            | `boolean`                                            | `false`                  | Shows "Loading..." in place of the rows                              |
| `emptyMessage`                         | `string`                                             | `"No records found"`     |                                                                      |
| `onRowClick`                           | `(row: T) => void`                                   | —                        | Row and card click, for example to open a view dialog                |
| `actions`                              | `AquaTableAction<T>[]` (`{ label, onClick, icon? }`) | —                        | Per-row buttons                                                      |
| `actionsLabel`                         | `string`                                             | `"Actions"`              | Label on the toggle button                                           |
| `actionsBelowRow`                      | `boolean`                                            | `false`                  | Shows actions in a strip under each row instead of a trailing column |
| `enableFilter`                         | `boolean`                                            | `false`                  | Shows the filter input                                               |
| `filterPlaceholder`                    | `string`                                             | `"Filter rows"`          |                                                                      |
| `getRowId`                             | `(row, index) => string \| number`                   | `row.id`, then the index | Use a stable id so selection survives refetches                      |
| `selectedRowIds` + `onSelectionChange` | `ReadonlySet` / `(ids: Set) => void`                 | —                        | Pass both to turn on checkboxes and select-all for visible rows      |

`AquaTableColumn<T>`:

| Field             | Type                        | Notes                                                                                                                                                         |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`             | `keyof T \| string`         | Dotted paths such as `"customer.name"` resolve when there is no `render`                                                                                      |
| `header`          | `string`                    |                                                                                                                                                               |
| `className`       | `string`                    | Added to each body cell                                                                                                                                       |
| `render`          | `(row, index) => ReactNode` | Custom cell content                                                                                                                                           |
| `filterValue`     | `(row) => string`           | The text the filter box matches. **Required for a column to be searchable when `render` returns JSX.** Otherwise a JSX cell matches nothing                   |
| `sortValue`       | `(row) => string \| number` | Makes the header a sort button. Clicks cycle descending → ascending → unsorted. Numbers compare numerically; strings use `localeCompare` with `numeric: true` |
| `wrap`            | `boolean`                   | Lets the cell grow and wrap onto several lines instead of being cut at 240 px. Use it for multi-line "at a glance" cells                                      |
| `headerClassName` | `string`                    | Classes for the header cell, for example a `min-w-[10rem]` that stops a wrapping column from collapsing                                                       |

**Behaviour**

- Filtering and sorting are client-side and memoised on `data`, `columns`, the filter text and the sort. Sorted headers set `aria-sort`.
- On mobile (below `md`) each row becomes a card:
  - the first column is the card title;
  - the second column is the subtitle;
  - the remaining columns form a 2-column grid;
  - actions open from a chevron.
- Select-all acts only on the rows currently visible after filtering.

**Gotchas**

- `columns` is usually rebuilt on every parent render. That makes the memo recompute each render, which is fine at current sizes.
- `InvoicesTab` hides this table on mobile and renders its own `InvoiceMobileCard`s instead.

### Invoice status helpers — `src/utils/invoiceStatus.ts`

These derive the statuses shown in the invoices table, the status filters, the view dialog, and the CSV, Excel and PDF exports. They are pure functions over plain objects, so both `Invoice` and `BulkInvoice` work with them.

| Export                                                | Values                                                | Derived from                                                                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paidStatusOf(invoice)`                               | `paid` \| `partial` \| `unpaid`                       | `paid_status`, lowercased. Also accepts `"fully paid"`, `"complete(d)"` and anything starting with `"partial"`. Unknown values count as `unpaid`                                                    |
| `deliveryStatusOf(invoice)`                           | `delivered` \| `scheduled` \| `assigned` \| `pending` | `delivery_date` today or earlier → delivered; a future date → scheduled; no date but `delivered_by` set → assigned; neither → pending ("Not delivered"). `YYYY-MM-DD` is parsed as a **local** date |
| `enrichmentStatusOf(invoice)`                         | `enriched` \| `not-enriched`                          | `invoice.enriched`, which comes from the backend's `firebaseUid`                                                                                                                                    |
| `PAID_LABELS`, `DELIVERY_LABELS`, `ENRICHMENT_LABELS` | `Record<status, string>`                              | Display labels. Use them everywhere so exports match the UI                                                                                                                                         |

**What "enriched" means.** An invoice is enriched once the customer opens the public invoice link and links an account. At that point the backend stores `firebaseUid` on the invoice (see `AQUAKARTBACKEND/src/services/invoiceUserEnrichment.js`). The weekly job `invoice.unenriched_reminder` (`AQUAKARTBACKEND/src/jobs/unenrichedInvoiceReminder.js`) re-sends the link to invoices without a `firebaseUid`. The **Customer link** column also shows `accessMetrics.openCount` ("Opened N×"), with the last-opened time as a tooltip.

**Delivery data.** Delivery date and delivered-by are read from `transport.deliveryDate` and `transport.deliveredBy`. The invoice form does not currently edit them, so they come from orders, migrations or the backend.

### Invoices tab status UI — `src/components/tabs/InvoicesTab.tsx`

- **Layout**, built to keep the invoices on screen on phones and iPads:
  - **Control bar** (one panel):
    - first row: search, an **Export** menu (PDF, Excel and Sales Excel of the filtered list, plus Import) and **Create Invoice** ("New" on phones);
    - second row: the All/GST/PO segmented pills and native month and year selects. Months use 3-letter names, and the selects use the `liquid-select-compact` class.
  - **Summary panel** (one panel): the five stats form a single strip that scrolls sideways below 1024 px, with the status chip rows underneath. Each chip row is one scrollable line below 1024 px and wraps above it.
  - **Below 1024 px**, invoices show as compact cards: one column on phones, **two on iPad**. The table needs about 900 px, so it only appears from 1024 px.
  - The table's actions are inline icon buttons, not an extra "Actions" row under each invoice.
  - **Selection mode.** Checkboxes are hidden by default. A **Select** button (in the table header, and above the cards) or **long-pressing a card** (450 ms, touch or mouse) turns it on.
    - While selecting, a single sticky bar shows select-all (indeterminate when partly selected), the count and total, and Links / Excel / PDF (disabled until something is selected).
    - Clicking a row or tapping a card toggles it instead of opening it, and the card action buttons are hidden.
    - **Done** or **Esc** clears the selection and exits. Esc is ignored while a dialog is open.
    - `AquaGenericTable` shows checkboxes only when `selectedRowIds` and `onSelectionChange` are passed. The `headerActions` prop places the Select button next to the title.
- **Status for this period** panel: one row each for Paid, Delivery and Enriched. Every chip shows a count and an amount, computed on the month, year and type-filtered set. Clicking a chip filters the table; clicking it again clears that filter. "Clear status filters" resets all three.
- **Outstanding** stat: the total of unpaid and partial invoices in the filtered set.
- **Table (1024 px and wider): everything at a glance.** Each row wraps onto several lines, so no field needs a hover, a sideways scroll or opening the invoice. The columns are:

  | Column       | Shows                                                                                        | Sorts by    |
  | ------------ | -------------------------------------------------------------------------------------------- | ----------- |
  | **Invoice**  | Number, date, GST/PO/QUO badges                                                              | Date        |
  | **Customer** | Name, phone (tap to call), email, address (2 lines), plus GST name and GSTIN on GST invoices | Name        |
  | **Items**    | Each product with quantity (`2×`), serial number and price; after 3 items, "+N more"         | Item count  |
  | **Amount**   | Total, base + GST split, payment type                                                        | Total       |
  | **Status**   | Paid; delivery with date and delivered-by; enrichment with link open count                   | Paid status |
  | **Actions**  | A 3×2 icon grid: open, download (admin only), send, clone, edit, delete                      | —           |

  Every column is searchable, including product names and serial numbers. Columns use `wrap` and are tuned to fit at 1024 px (iPad landscape) without scrolling sideways.

- **Cards (below 1024 px)** show the same essentials: amount, date, type badges, name, phone, email, the first three items, and all three status badges.
- The mobile cards show the paid, delivery and enrichment badges.
- **Search all invoices** (top of the tab):
  - Matches customer name, phone, email and invoice number, plus the GST name and email. It searches **every month and year**; the month and year filters are ignored while a search is active. The type and status filters still apply.
  - Every word must match somewhere, so `ravi 98765` works.
  - A query made only of phone characters (`+91 98765 43210`, `(98765) 43210`) is treated as one number. Phone matching ignores spaces, dashes, `+91` and a leading 0.
  - The status chips and the result count reflect the search results.
  - This replaces the table's own filter box, so there is a single search.
- **Download PDF** (admins only, from `isAdminUser` in `utils/permissions.ts`: `role === 1` or the `super-admin` role): every row's actions, and the mobile card's icon row, download **the same PDF the customer gets** from `aquakart.co.in/invoice/:id`, named `Aquakart-Invoice-<invoice no>.pdf`. See [Customer invoice PDF](#customer-invoice-pdf--srcvendorstorefrontinvoice). Other staff don't see the action.

### Customer invoice PDF — `src/vendor/storefrontInvoice/`

There is one invoice PDF design, and it is owned by the storefront. These files are verbatim copies of the storefront's generator, normalizer, catalogue matcher, file-name helper, price helpers, static terms and bank data, `pdfDownload` and the logo. Only the import paths differ.

- `customerInvoicePdf.js` (CRM-owned, typed by `customerInvoicePdf.d.ts`) runs the storefront's steps in the same order:
  1. `mapInvoiceFromApi` on the **raw** backend invoice;
  2. `enrichInvoiceProducts` with the `all-products` catalogue (category, subcategory and product link);
  3. `downloadPublicInvoicePdf`.
- It has two callers:
  - `InvoicesTab`, which keeps the raw list documents and the catalogue response in refs, so it makes no extra request;
  - the CRM's public `/invoice/:id` page (`src/pages/InvoicePage.tsx`). Its old Times-font jsPDF layout was removed.
- Line totals are **unit price × quantity**, the storefront rule. GST is treated as included in the price, and the PDF shows the CGST/SGST split for GST invoices. PO invoices get a payment-instructions page.
- `npm run check:invoice-pdf-sync` fails if the copies drift from `../AQUAKARTECOM` (or `AQUAKARTECOM_DIR`). Never edit the copies directly; see the folder's `README.md`.
- The bulk "One PDF" export (`utils/invoiceBulkExports.ts`) is still a separate staff summary report, not a customer invoice.
- Exports:
  - The CSV export ("Excel") writes `Paid Status`, `Delivery Status`, `Enriched` and `Link Opens`.
  - The PDF export adds Paid, Delivery and Enriched columns.
  - Bulk "One Excel" and "One PDF" (`utils/invoiceBulkExports.ts`) include the same three statuses.

---

## Dashboard ("General Statistics")

`src/components/tabs/DashboardOverview.tsx` gets its numbers from `src/utils/dashboardStats.ts` (pure functions). Invoices go through the shared `mapInvoiceFromApi` (`modular/invoices/mapInvoice.ts`) and the `invoiceStatus` rules, so every figure matches the Invoices tab.

- **Period picker** (one row, scoping everything below): this month, last month, this quarter, this financial year, all time. Quarters and years follow India's **April–March** financial year.
  - The current period is the **whole** month, quarter or year. That makes "This month" equal the Invoices tab's month total and the matching bar in the chart.
  - The comparison is like-for-like, using the **same number of elapsed days** of the previous period ("vs same days last month"). "Last month" compares two complete months.
- **Revenue** is `total_amount`, the figure the Invoices tab shows. On top of it the page shows:
  - **KPIs:** invoices, average invoice, paid value, and outstanding (unpaid + partial, where a rise counts as bad);
  - **12-month revenue chart:** months inside the period are blue `#2a78d6` (dark mode `#3987e5`) and the rest gray. Hovering or focusing a bar shows a tooltip, and "View as table" lists the same numbers;
  - **Invoice health:** 100% bars for payment (by value), delivery and enrichment (by count). Status colors are always paired with an icon and a label;
  - **Top 5 products and customers.** Customers are merged by normalized phone number.
- **Counts strip:** leads, customers (the server's paginated total when available), deals, products, categories, stock items.
- **Failures:** sources are loaded with `Promise.allSettled`. A source that fails is named in an inline warning and its figures are hidden; the rest still show. A refresh keeps the previous figures dimmed instead of flashing a skeleton.
- **Old bugs fixed by this rewrite:** "Total Customers" showed the invoice count; paid and unpaid read a field the backend doesn't send (`payment_status`), so they were always 0; "pending" checked a nonexistent `status`.

## Liquid controls

All of these are in `src/components/ui/liquid.tsx`. They are thin wrappers that add a `liquid-*` class, which is defined in `src/index.css`. A local `joinClasses` helper drops falsy values, so `cond && "x"` is safe in `className`.

### `LiquidButton`

A native `<button>`.

| Prop        | Type                                         | Default    | Notes                                                                    |
| ----------- | -------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `variant`   | `"primary" \| "soft" \| "danger" \| "ghost"` | `"soft"`   | Adds `liquid-button-<variant>`                                           |
| `type`      | button type                                  | `"button"` | Pass `"submit"` explicitly. The default never submits a form by accident |
| `className` | `string`                                     | `""`       |                                                                          |
| `...props`  | `ButtonHTMLAttributes`                       | —          | Passed through                                                           |

There is no loading state (use `disabled` and your own spinner) and no `forwardRef`.

```tsx
<LiquidButton onClick={applyAIDraft} variant="primary">
  Apply to invoice
</LiquidButton>
```

### `LiquidIconButton`

A square button for a single icon (`liquid-icon-button`). It takes the same props as `LiquidButton`, without `variant`. Give it an `aria-label`. The current call sites use only `title`, which works as a fallback name but is weaker.

### `LiquidInput`

An `<input>` wrapped in a `<label>`.

| Prop               | Type                  | Notes                                                                                 |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------- |
| `label`            | `string`              | Rendered as `span.liquid-label`. The wrapping label means no `id`/`htmlFor` is needed |
| `wrapperClassName` | `string`              | Goes on the outer `<label>`                                                           |
| `className`        | `string`              | Goes on `input.liquid-field`                                                          |
| `...props`         | `InputHTMLAttributes` |                                                                                       |

Without `label`, the input has no accessible name. The unlabelled Qty, Price and Serial inputs in `invoiceDialog.tsx` rely on their placeholders.

### `LiquidSelect`

A styled native `<select>` with a chevron overlay. `children` (the `<option>`s) is required. It takes `label`, `wrapperClassName` and `className` like `LiquidInput`. The native picker gives the best keyboard and mobile behaviour, so **prefer it where keyboard users matter.**

### `LiquidDropdown`

A custom listbox. Its menu is portalled to `document.body` so it isn't clipped.

| Prop                             | Type                                                     | Default    | Notes                               |
| -------------------------------- | -------------------------------------------------------- | ---------- | ----------------------------------- |
| `value`                          | `string`                                                 | —          | **Required**                        |
| `options`                        | `LiquidDropdownOption[]` (`{ label, value, disabled? }`) | —          | **Required**                        |
| `onChange`                       | `(value: string) => void`                                | —          | **Required**                        |
| `label`                          | `string`                                                 | —          | A `span`, not linked to the trigger |
| `placeholder`                    | `string`                                                 | `"Select"` |                                     |
| `className` / `wrapperClassName` | `string`                                                 | `""`       |                                     |
| `disabled`                       | `boolean`                                                | `false`    |                                     |

**Behaviour**

- The menu is `position: fixed`. It is placed from the trigger's rect and `visualViewport`, opens upward when there isn't room below, and keeps an 8 px gutter.
- An outside `mousedown` closes it, and so does Escape. Scrolling and resizing reposition it.
- ARIA: the trigger has `aria-haspopup="listbox"` and `aria-expanded`; the menu has `role="listbox"`; options have `role="option"` and `aria-selected`.
- Inside a `ResponsiveDialog`, the first Escape closes the dropdown, not the dialog.

**Gotchas**

- There is no arrow-key, Home/End or typeahead navigation, and focus doesn't move into the menu.
- Inside a `ResponsiveDialog`, the portalled menu sits outside the focus trap, so keyboard users can't reach the options.

### `LiquidPanel` / `LiquidBadge`

A glass card (`div.liquid-panel`) and an inline pill (`span.liquid-badge`). They accept only `children` and `className`; other props such as `id`, `role`, `onClick` and `ref` are **not** passed through.

---

## Dialogs and scrolling

### `ResponsiveDialog` — `src/components/ui/ResponsiveDialog.tsx`

A modal or right-hand drawer, portalled to `document.body`. Every CRM dialog uses it.

| Prop          | Type                           | Default | Notes                                                                                                    |
| ------------- | ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------- |
| `open`        | `boolean`                      | —       | **Required**                                                                                             |
| `onClose`     | `() => void`                   | —       | **Required.** Called by Escape, a backdrop click and the X button                                        |
| `title`       | `string`                       | —       | **Required.** Used for the `<h2>`, `aria-labelledby`, the close button label and the scroll region label |
| `children`    | `ReactNode`                    | —       | **Required.** Rendered inside `ArrowScrollArea` (`.crm-dialog-body`)                                     |
| `description` | `string`                       | —       | Wired to `aria-describedby`                                                                              |
| `header`      | `ReactNode`                    | —       | Rendered under the title, outside the scroll area                                                        |
| `footer`      | `ReactNode`                    | —       | `.crm-dialog-footer`, outside the scroll area                                                            |
| `size`        | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"`  |                                                                                                          |
| `busy`        | `boolean`                      | `false` | Blocks Escape and backdrop close, disables the X button and sets `aria-busy`                             |
| `drawer`      | `boolean`                      | `false` | Docks the dialog to the right on desktop                                                                 |

**Behaviour**

- **Stacking.** A module-level `dialogStack` locks body scroll while any dialog is open. Only the topmost dialog handles keys, so nested confirmations work.
- **Keyboard.** One `keydown` listener handles Escape and Tab, ignoring events from outside the panel. Tab cycles through the visible, enabled focusable elements.
- **Focus.** On open, focus goes to the panel on the next frame. On close, it returns to the element focused before.
- **Mobile keyboard.** It follows `visualViewport` and exposes `--crm-viewport-height`.
- **Motion.** The overlay fades in about 160 ms and the panel lifts 16 px. Both are disabled under `prefers-reduced-motion`.

**Gotchas**

- Escape is ignored while _any_ `[aria-expanded="true"]` element is inside the panel, including an ordinary expanded disclosure.
- If focus has fallen back to `<body>`, Escape does nothing.
- `busy` is the only way to stop a close; there is no `onBeforeClose`.

```tsx
<ResponsiveDialog
  open={open}
  onClose={onClose}
  title="Edit job"
  size="md"
  drawer
  busy={saving}
  footer={
    <>
      <button type="button" onClick={onClose} disabled={saving}>
        Cancel
      </button>
      <button type="submit" form="job-form" disabled={saving}>
        Save
      </button>
    </>
  }
>
  <form id="job-form" onSubmit={handleSubmit}>
    …
  </form>
</ResponsiveDialog>
```

### `ArrowScrollArea` — `src/components/ArrowScrollArea.tsx`

A scroll container with a hidden scrollbar. It shows previous/next arrows only when the content overflows.

| Prop                | Type        | Default     | Notes                                        |
| ------------------- | ----------- | ----------- | -------------------------------------------- |
| `children`          | `ReactNode` | —           | **Required**                                 |
| `className`         | `string`    | `""`        | Outer flex column                            |
| `viewportClassName` | `string`    | `""`        | The scrolling element. Put `max-h-*` here    |
| `contentClassName`  | `string`    | `""`        | For example `flex gap-2` for horizontal rows |
| `label`             | `string`    | `"content"` | Used in the region and arrow labels          |
| `horizontal`        | `boolean`   | `false`     |                                              |

**Behaviour**

- The viewport is `role="region"` with `tabIndex=0`.
- A `ResizeObserver` and the scroll position control the arrows. Each arrow is disabled at its limit.
- Each click scrolls `max(80px, 65%)` of the viewport, instantly under reduced motion.
- The arrow buttons are 44 px touch targets.

**Gotcha:** the viewport is a tab stop even when nothing overflows.

---

## Feedback

### `ToastProvider` / `useToast` — `src/components/Toast.tsx`

Mounted once in `App.tsx`. `useToast()` returns `{ showToast(message, "success" | "error") }`; it throws outside the provider.

- Toasts stack fixed at the top right and dismiss after 5 s or on click.
- There is no `aria-live` region, so screen readers don't announce toasts. Pair form failures with an inline `role="alert"`.
- `showToast` can't emit the `"info"` type that `AquaToast` supports.

### `AquaToast` — `src/components/AquaToast.tsx`

The presentational pill that `ToastProvider` renders. `InvoicePage.tsx` also uses it directly.

| Prop        | Type                             | Default                                               |
| ----------- | -------------------------------- | ----------------------------------------------------- |
| `message`   | `string`                         | **Required**                                          |
| `type`      | `"success" \| "error" \| "info"` | `"info"`                                              |
| `onClose`   | `() => void`                     | —                                                     |
| `showClose` | `boolean`                        | `true`                                                |
| `animate`   | `boolean`                        | `true` (set `false` when the parent already animates) |
| `className` | `string`                         | `""`                                                  |

---

## Layout and shell

### `CrmShell` — `src/components/Layout/CrmShell.tsx`

The authenticated frame: a desktop rail sidebar, a mobile drawer, and an animated tab panel.

| Prop                               | Type                               | Notes                                               |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------- |
| `navigationItems`                  | `CrmNavigationItem[]`              | **Required.** The Workspace list                    |
| `adminNavigationItems`             | `CrmNavigationItem[]`              | The Admin list                                      |
| `activeItemId` / `activeItemLabel` | `string`                           | **Required.** The id also keys the panel cross-fade |
| `onItemSelect`                     | `(id) => void`                     | **Required**                                        |
| `moduleNavigation`                 | `CrmSubNavigation`                 | Per-tab sub-views                                   |
| `theme` / `onToggleTheme`          | `"light" \| "dark"` / `() => void` | **Required**                                        |
| `onLock` / `onSignOut`             | `() => void`                       | **Required**                                        |
| `userEmail`                        | `string`                           |                                                     |
| `children`                         | `ReactNode`                        | **Required**                                        |

**Behaviour**

- A skip link targets `#crm-active-panel`, which has `role="tabpanel"` and is animated with `AnimatePresence`.
- The desktop sidebar is always collapsed.
- The mobile drawer is `role="dialog" aria-modal`. While open it locks scroll, traps focus and closes on Escape. Choosing a navigation item closes it.
- The Ctrl/Cmd+L lock shortcut is registered in `Dashboard.tsx`, not here.

**Gotcha:** `CrmShell` never passes `onToggleExpanded`, so the sidebar's expand toggle never renders.

### `CrmSidebar` — `src/components/Layout/CrmSidebar.tsx`

The sidebar contents. `CrmShell` renders it twice, for desktop and mobile; give each a different `idPrefix`.

- **Required props:** `idPrefix`, `items`, `activeItemId`, `onItemSelect`, `expanded`, `theme`, `onToggleTheme`, `onLock`, `onSignOut`.
- **Optional props:** `adminItems`, `moduleNavigation`, `mobile`, `onToggleExpanded`, `onClose`, `closeButtonRef`, `userEmail`.

Each list is a vertical `role="tablist"` with a roving `tabIndex`. Arrow keys and Home/End move focus and select immediately, and stepper buttons wrap around.

**Gotchas**

- The list that has no active item can't be reached with Tab.
- With nothing active, "next" skips index 0.
- An empty `items` array crashes the stepper (`% 0`).

### `TabInnerContent` — `src/components/Layout/tabInnerlayout.tsx`

A `<section class="crm-tab-content">` with an optional `title` (`<h2>`) and `description`. The header is left out when both are empty.

---

## Auth screens

`App.tsx` chooses what to render in this order:

1. its own spinner while auth is loading;
2. `LockScreen` when `user && isLocked`;
3. the routes, with `/dashboard` wrapped in `ProtectedRoute`;
4. `ReLoginScreen` as an overlay when `isReloginOpen`.

| Element                                                | Props                                                                | Notes / gotchas                                                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LockScreen` (`src/components/LockScreen.tsx`)         | `userEmail` and `onUnlock(code) => Promise<boolean>` (both required) | 4-digit numeric password input. A wrong code clears the input. The label isn't linked to the input, the error has no `role="alert"`, and the hint says "Cmd + L" although Ctrl also works |
| `ReLoginScreen` (`src/components/reLoginScreen.tsx`)   | `userEmail` (required) and `onRelogin?` (never passed)               | Calls `authService.login` directly, then `useRelogin().closeRelogin()`. No dialog semantics or focus trap, and no way to sign out from it                                                 |
| `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) | `children`                                                           | Redirects to `/login` when there's no user. Its loading branch can't be reached because `App.tsx` shows a spinner first                                                                   |

---

## AI helpers

### `AIAssist` — `src/components/ai/AIAssist.tsx`

An "AI" button that opens a writing-assistant popover for one text field.

| Prop        | Type             | Default  | Notes                                                                            |
| ----------- | ---------------- | -------- | -------------------------------------------------------------------------------- |
| `value`     | `string`         | —        | **Required.** The current text, sent as context                                  |
| `onChange`  | `(next) => void` | —        | **Required**                                                                     |
| `context`   | `string`         | `"text"` | Be specific, for example "quotation note for a water purifier/softener customer" |
| `maxChars`  | `number`         | —        | Added to the prompt, and enforced by truncating on Replace and Insert            |
| `label`     | `string`         | `"AI"`   |                                                                                  |
| `className` | `string`         | `""`     |                                                                                  |

**Behaviour**

- It renders nothing until `useAIConfigured()` resolves to true.
- Quick actions: Improve, Shorten, Formal, Telugu and Hindi. A custom instruction also works on an empty field.
- Reply actions are Replace, Insert (appends after a blank line), Copy and Regenerate. Stale replies are dropped.
- The popover is portalled with `role="dialog"`. Escape is captured so an enclosing dialog stays open.
- `useAIFieldWorking` drives the `AIFieldAnimation` frames.

**Gotchas**

- Inside a `ResponsiveDialog`, the popover sits outside the focus trap, so it can't be reached by keyboard.
- Closing the popover doesn't cancel a request that is still running.

### `AIFieldAnimationScope` / `AIFieldAnimation` / `useAIFieldWorking` — `src/components/ai/AIFieldAnimation.tsx`

- `AIFieldAnimationScope` takes `children` and an optional `active` that forces the working state.
- `AIFieldAnimation` wraps a single `input`, `textarea` or `select`. Pass `compact` for checkboxes.
- `useAIFieldWorking(working)` reports in-flight requests to the scope.
- Every frame in the scope animates together. While anything is working, an `sr-only role="status"` message is shown. Animation is off under reduced motion, and outside a scope everything is a no-op.

### `AICatalogSuggestions` — `src/components/ai/AICatalogSuggestions.tsx`

Proofreads product, category and subcategory copy, then lets the user apply corrections per field or all at once.

| Prop      | Type                                                       | Notes                                          |
| --------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `kind`    | `"product" \| "category" \| "subcategory"`                 | **Required**                                   |
| `value`   | `CatalogCopy` (`{ title, description, keywords, brand? }`) | **Required**                                   |
| `onApply` | `(changes: Partial<CatalogCopy>) => void`                  | **Required.** Receives only the changed fields |

**Behaviour**

- Only non-empty text fields are sent. Arrays are joined with `", "`.
- `catalogCorrections` (exported) accepts both a flat reply and one wrapped in `fields`. A field the AI left out counts as "no change". It fails only when none of the fields came back, and it rejects the batch if any field's numbers changed.
- Before applying, each suggestion is checked against the current form value. Fields edited since the suggestion was made are skipped. Applying only fills the form; the user still has to save.

**Gotcha:** unlike `AIAssist`, it doesn't hide itself when AI isn't configured.

---

## Invoices

### `Invoice` type — `src/components/modular/invoices/invoice.types.ts`

The list and editor type, built by `mapInvoiceFromApi` in `InvoicesTab.tsx`. The public invoice page uses a **different** `Invoice` in `src/pages/dynamicInvoiceComponents/types/invoice.types.ts`.

| Field                                                             | Type             | Backend source (first non-null wins)                                                                    |
| ----------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                                                              | `string`         | `id` → `_id` → `invoice_id` → **random** `inv-xxxx` (not stable across refetches)                       |
| `invoice_no`                                                      | `string`         | `invoice_no` → `invoiceNo` → `invoice_number`                                                           |
| `date`                                                            | `string`         | `date` → `issue_date` → `created_at` → `createdAt` → now                                                |
| `customer_name` / `customer_email` / `customer_address`           | `string`         | `customerDetails.*` → the flat `customer_*` fields                                                      |
| `customer_phone`                                                  | `number` (typed) | `customerDetails.phone` → `customer_phone`, then `.toString()`, so it is a **string at runtime**        |
| `gst` / `po` / `quotation`                                        | `boolean`        | Flags                                                                                                   |
| `gst_name` / `gst_no` / `gst_phone` / `gst_email` / `gst_address` | `string \| null` | `gstDetails.*` → flat fields                                                                            |
| `products`                                                        | `Product[]`      | The first array among `products`, `items`, `invoice_items`, `invoiceItems`, `order_items`, `orderItems` |
| `delivered_by` / `delivery_date`                                  | `string \| null` | `transport.deliveredBy` / `transport.deliveryDate`                                                      |
| `paid_status`                                                     | `string`         | `paid_status` → `paidStatus` → `payment_status` → `"unpaid"`. Read it through `paidStatusOf`            |
| `payment_type`                                                    | `string`         | `cash` / `card` / `upi` / `bank_transfer`                                                               |
| `aquakart_online_user` / `aquakart_invoice`                       | `boolean`        |                                                                                                         |
| `total_amount`                                                    | `number`         | `total_amount` → `total` → the sum of `productPrice`                                                    |
| `created_at`                                                      | `string`         |                                                                                                         |
| `enriched`                                                        | `boolean`        | `firebaseUid` is non-empty (see [invoice statuses](#invoice-status-helpers--srcutilsinvoicestatusts))   |
| `open_count`                                                      | `number`         | `accessMetrics.openCount`, or 0                                                                         |
| `last_opened_at`                                                  | `string \| null` | `accessMetrics.lastOpenedAt`                                                                            |

How each `Product` field is normalised:

- **Name**: `productName` → `name` → `product_name` → `title`.
- **Quantity**: `productQuantity` → `quantity` → `qty` → `count`, defaulting to 1.
- **Price**: the first value above 0 among `productPrice`, `unit_price`, `unitPrice`, `price`, `mrp`, `rate`, `salePrice`, `selling_price`. If none is above 0, it falls back to `total / qty`.
- **Serial number**: `productSerialNo` → `serial_no` → **`sku`**.

`DbProduct { id, name, price, dpPrice?, sku }` feeds the product picker and the profit stat (price − `dpPrice`).

### `AquaInvoiceFormDialog` — `src/components/modular/invoices/invoiceDialog.tsx`

A controlled create/edit dialog with three modes: **Easy** (the essentials), **Standard** (adds email, PO/GST, GST details and payment type) and **Quick** (renders `QuickInvoiceTab`). All form state lives in `InvoicesTab`, which also keeps the `localStorage["invoiceDraft"]` draft.

- **Props:**
  - Visibility and draft: `showModal`, `onClose` (keeps the draft), `onClear`, `isDraftDirty`, `editingInvoice` (only switches the labels).
  - Form state: `formData` / `setFormData`, `handleSubmit` (bound to `<form id="invoice-form">`).
  - Product rows: `productForm` / `setProductForm`, `availableProducts`, `handleProductSelect`, `addProduct`, `editProduct`, `removeProduct`, `cancelEditProduct`, `editingProductIndex`, `calculateTotal`.
- **GST PDF import:** lazy-loads `utils/gstCertificateParser` and parses the PDF locally. It fills the GST fields only where the parser returns values.
- **Quick mode:** while the AI is working, the dialog is `busy` and submitting is blocked.

**Gotchas**

- The phone input stores `Number(value) || 0`, so a leading `+` or `0` is lost.
- The delivery date and delivered-by fields aren't editable here.
- `GstPdfUploadButton` is defined inside render, so it remounts on every render.

### `QuickInvoiceTab` — `src/components/modular/invoices/QuickInvoiceTab.tsx`

Paste free text, then **Format with AI** (`services/invoiceAI.formatInvoicePaste`). A review card appears; **Apply** fills only the contact fields that are present and _appends_ product rows.

- Apply refuses if you edited the form after formatting started.
- **Use local parser** (`utils/parseInvoiceBlock`) fills only the contact fields.
- The compact product picker shows up to 40 matches and has quantity shortcuts.
- Props: `formData`, `setFormData`, `availableProducts`, `removeProduct`, `calculateTotal`, `pdfUploadSlot?`, `onBusyChange?`.

**Gotcha:** the placeholder text contains a real-looking name and phone number.

### `AquaInvoiceViewDialog` — `src/components/modular/invoices/invoiceView.tsx`

Read-only details.

- Props: `showModal`, `viewingInvoice`, `setModal`.
- Shows the date, the paid/delivery/enriched badges (the enriched badge's tooltip shows the open count), the customer and GST blocks, products with the base/GST split, and the total.

**Gotcha:** "Item Total" is `productPrice × quantity`, but `calculateTotal` sums `productPrice` alone. See [Known issues](#known-issues).

---

## Customers

### Customer detail view and forms — `src/components/tabs/CustomersTab.tsx`

- **`CustomerDetailModal`:**
  - The header shows initials, a source chip (Online user / Offline customer), the role name (not the raw number), email verification, "Since …", and an orders · invoices · reviews · spent line.
  - Tabs are a compact segmented row with counts, scrollable on phones.
  - The footer always holds **WhatsApp** and **Edit profile**.
- **`ProfileTab`:** grouped `DetailSection`s with labelled rows (`DetailRow`); empty values read "Not set".
  - **Contact:** call, WhatsApp and copy for the phone; mail and copy for the email.
  - **Account** (online users) or **Invoice customer** (offline).
  - **Address**, and **GST details** (GSTIN in monospace, with copy).
  - A **Delete** danger zone that says when the delete also removes an offline customer's matching invoices.
- **`RecordCards`:** orders and invoices as compact records with a status chip. Invoice status goes through `paidStatusOf`, so it matches the Invoices tab.
- **`AddressesTab`:** each address card is marked **Selected** when it matches the selected address.
- **`ReviewsTab`:** stars are accessible (`aria-label="4 out of 5 stars"`).
- **Forms** (customer create/edit, address, review) all use the shared controls: `LiquidInput`, `LiquidSelect` (native picker), a liquid-styled `TextArea`, a `CheckField` row and `LiquidButton`. Each field has proper `type`, `inputMode` and `autoComplete`, and groups use `FormSection` fieldsets with legends. The old local `inputClass` and `Field` are gone.
- **`addressText`** now joins street, city, state and PIN. Before, it returned only the first non-empty part, so addresses showed just the street.

### Unused customer components

`CustomersTab.tsx` renders its own online/offline views. **Nothing imports the files in `modular/customers/`** (`CustomerDetailsDialog.tsx`, `online.tsx`, `offline.tsx`). Treat them as dead code until they are wired up or removed.

- `CustomerDetailsDialog`: a read-only profile with Profile, Orders and Reviews tabs. Props: `open`, `customer`, `orders`, `reviews`, `loading?`, `onClose`, `onCopy`, `onSend`, `initialTab?` (read only on mount). It also exports the `CustomerProfileRecord`, `CustomerOrderRecord` and `CustomerReviewRecord` types.
- `AquaOnlineCustomer` (`online.tsx`): a table of online customers with an activity preview. It takes callback props for lazy-loading details.
- `AquaOfflineCustomer` (`offline.tsx`): offline customers built from invoice rows. **Bug:** it renders keyless fragments, so React warns about missing keys.

---

## Jobs

Every job component uses `jobsService` (`/v1/crm/jobs…`).

| Element                                                    | Purpose                                         | Key props / behaviour                                                                                                                                                                                                                                                                                                            | Gotchas                                                                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `JobFormDrawer` (`modular/jobs/JobFormDrawer.tsx`)         | Create or edit a job in a drawer                | `open`, `job` (`null` = create), `actions`, `onClose`, `onSaved(job, created)`. Create sends `POST /jobs`; edit sends `PATCH` with only the changed fields. Validates the name, action, params (`validateParams`), schedule (`schedulePayload`) and timeout (10–3600). System jobs can only change schedule, timeout and enabled | Has its own Escape listener on top of `ResponsiveDialog`'s, so `onClose` can fire twice. A new `actions` array resets unsaved edits |
| `JobDetail` and `Pager` (`JobDetail.tsx`)                  | Job summary and run history                     | `jobId`, `actionLabel`, `canManage`, `refreshKey`, `runningNow`, `onBack`, `onEdit`, `onRun`, `onDelete`. Polls every 5 s while the job is running                                                                                                                                                                               | When fetching runs fails, the stale runs stay on screen                                                                             |
| `JobRunsTable` and `RunResult` (`JobRunsTable.tsx`)        | Expandable run rows                             | `runs`, `timezone`, `loading?`. `RunResult` collects per-channel `failures[]` into a table                                                                                                                                                                                                                                       | The chevron button relies on the click bubbling up to the row                                                                       |
| `JobStatusBadge` and `BuiltInBadge` (`JobStatusBadge.tsx`) | Status pills                                    | `status: running \| success \| failed \| null`, `title?`                                                                                                                                                                                                                                                                         |                                                                                                                                     |
| `JobParamsForm` and `Switch` (`JobParamsForm.tsx`)         | One input per action param                      | Booleans → `Switch`; `phone[]`/`email[]` → `ChipInput`; text → textarea with `AIAssist`; numbers → number input                                                                                                                                                                                                                  | Number values are stored as strings until `serializeParams`                                                                         |
| `ChipInput` (`ChipInput.tsx`)                              | Token input for recipients                      | `values`, `onChange`, `normalize`, `invalidMessage`, `max?`. Splits on whitespace, `,` or `;`                                                                                                                                                                                                                                    | Entries past `max` are dropped with only a message                                                                                  |
| `ScheduleEditor` (`ScheduleEditor.tsx`)                    | Cron, interval or once schedules with a preview | Cron preview: `POST /jobs/preview-schedule` (debounced 400 ms)                                                                                                                                                                                                                                                                   | Leaving cron mode mid-request leaves the spinner stuck                                                                              |
| `jobFormUtils.ts`                                          | Pure helpers                                    | `normalizeIndianPhone`, `normalizeEmail`, `serializeParams`, `validateParams`, `scheduleStateFromJob`, `schedulePayload` (intervals from 1 min to 366 days)                                                                                                                                                                      | `schedulePayload` doesn't reject a once-time in the past                                                                            |

---

## Notifications

### `WhatsAppTemplateForm` — `src/components/modular/notifications/WhatsAppTemplateForm.tsx`

Picks an approved Fast2SMS template and fills its `{{n}}` variables.

- **Props:** `value: { messageId, variables[] }`, `onChange`, `previewName?`, `onTemplateChange?`.
- **Loading:** fetches `GET /v1/notify/whatsapp/templates` and `/v1/notify/status` once per session. If no templates load, it falls back to manual message-ID entry.
- **Gotchas:** templates approved later in the session need a page reload, and the labels aren't linked to their controls.

### `templateUtils.ts`

- `fillVariables(vars, { name?, phone? })` replaces `{name}` and `{phone}` in each variable.
- `renderTemplate(template, vars)` substitutes the `{{n}}` placeholders.
- `selectionError(selection, template)` returns the first problem, or `null`.
- Also exports `EMPTY_SELECTION`.

---

## Orders

`AquaOrderDeletePromptDialog` (`modular/orders/orderDeletePromptDialog.tsx`) is a generic delete confirmation.

- **It is not imported anywhere.**
- Props: `open`, `title?`, `description?`, `yesLabel?`, `noLabel?`, `yesClick`, `noClick`, and `type?`, which is never used.
- It is one of five near-identical confirmation dialogs; see [Known issues](#known-issues).

---

## Products and blogs

| Element                                                                   | Purpose                                     | Notes / gotchas                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductCard` and the `Product` type (`modular/products/productCard.tsx`) | Catalog card with a photo carousel on hover | Props: `product`, `index` (stagger delay, uncapped), `onEdit`, `onDelete`. It always shows `discountPrice` as the price. The icon buttons have no accessible names                 |
| `PhotoCarousel` and `ProductPhoto` (`PhotoCarousel.tsx`)                  | Fading image carousel                       | `photos` (`{ id, secure_url }[]`), `autoPlay?`. **Bug:** the index isn't reset when `photos` shrinks, so it can index out of range                                                 |
| `AquaInnerProductBlog` (`tabInnerContent/ProductInnerBlog.tsx`)           | Blog list and CRUD                          | `blogService` on `ecomApi` (`all-blogs`, `add-blog`, `update-blog/:id`, `delete-blog/:id`). The card separator renders as `" ? "` (mojibake)                                       |
| `BlogFormDialog` (`BlogFormDialog.tsx`)                                   | Create or edit a blog, with an AI draft     | Props: `show`, `onClose`, `onSubmit` (throw to keep the dialog open), `initialData`. Unknown keys are editable as JSON. **Images are embedded as base64 data URLs** in the payload |
| `BlogDeleteDialog` (`BlogDeleteDialog.tsx`)                               | Delete confirmation                         | `show`, `loading?`, `onClose`, `onConfirm`, `blogTitle`                                                                                                                            |

---

## Quotations

`QuotationsTab.tsx` has its own editor. `modular/quotations/QuotationFormDialog.tsx` and `QuotationDeleteDialog.tsx` are **not imported anywhere**.

If they are revived, two problems need fixing first:

- `QuotationFormDialog` only logs submit errors to the console.
- It reuses the `products-list` datalist id that `invoiceDialog` also uses, so the two would clash if mounted together.

---

## Stock

| Element                                                 | Purpose                                             | Notes / gotchas                                                                                                                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StockFormDialog` (`modular/stock/stockFormDialog.tsx`) | Add or edit a CRM stock count for a catalog product | Props: `open`, `onClose`, `onSave`, `initial` (`null` = add), `productOptions`. Warns when the product already has a stock entry. Resets the form **before** the async save finishes. No validation; negative quantities are allowed        |
| `StockStatusSendDialog` (`StockStatusSendDialog.tsx`)   | Preview a stock summary and send it on WhatsApp     | Props: `open`, `products`, `onClose`, `onSend(phone, message)`, `isSending?`. Posts free text to `notify/send-whatsapp`, which the backend says requires an approved **template**, so the send probably fails. Confirm before relying on it |
| `DeletePrompt` (`stockDeleteDialog.tsx`)                | Delete confirmation                                 | Props: `open`, `title`, `subtitle`, `onYes`, `onNo`. No busy state, so a double-click can fire `onYes` twice                                                                                                                                |

---

## AI assistant and site review

### `AIAssistantTab` — `src/components/tabs/AIAssistantTab.tsx`

The container for the AI workspace.

- **Props:** `view: "seo" | "autopilot" | "links" | "data" | "chat"`.
- **Data:** calls `useSiteData()` for every view, so even the chat view loads the whole catalog. For the chat it builds `buildAssistantContext(...)`.
- **Wiring:** `SeoView` gets `onSeoRecordSaved = replaceSeoRecord` and `onCatalogChanged = reload`. `AutopilotView` gets `replaceSeoRecords`.

| Component                            | Purpose                                                                                                      | Key behaviour                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AIChat`                             | Free-form chat, optionally grounded in site data (`siteContext?`)                                            | Sends the last 30 turns. Enter sends and Shift+Enter adds a line. Nothing is persisted                                                                                        |
| `SeoView`                            | SEO dashboard: coverage summary plus the "Filled & missing", "Keyword rankings" and "Page rankings" sections | Props: `analysis`, `readiness`, `records`, `change`, `seoError`, `onSeoRecordSaved`, `onCatalogChanged`. Saves the coverage baseline automatically on the first complete load |
| `CoverageSummary` / `CoverageReport` | Filled vs missing totals, before/after against the baseline, a "What improved" list, and the per-check table | Read-only. Baseline stored at localStorage key `aquacrm.seoCoverageBaseline.v1`                                                                                               |
| `AutopilotView`                      | Plans, drafts with AI, and bulk-applies SEO record fixes ranked by predicted gain                            | Drafts are at least 2.2 s apart, with one 30 s retry after a 429. Applies with 2 workers using `seoService.patch` / `create`                                                  |
| `InterlinkingView`                   | Interlinking findings, with "Copy link HTML"                                                                 | Read-only                                                                                                                                                                     |
| `SiteDataView`                       | Inventory of every page, its record, readiness and links                                                     | Read-only                                                                                                                                                                     |
| `ChangeBanner`                       | Readiness before → after the last re-score                                                                   |                                                                                                                                                                               |
| `KeyphrasePanel`                     | Keyword gaps per page and suggested phrases. Saves to the SEO record or to product catalog keywords          | Uses `seoService` and `productsService.update`                                                                                                                                |
| `KeywordSuggestions`                 | AI diagnosis, new title and description, link sources for one keyword                                        | Apply patches or creates the SEO record                                                                                                                                       |
| `PageFixPanel`                       | Turns readiness issues into SEO record changes you can tick, with an optional AI rewrite                     | A 403 shows a "seo.manage" toast                                                                                                                                              |
| `SiteParts`                          | `StatCard`, `ScoreBar`, `Pill`, `TypeBadge`, `RouteLink`                                                     | Stateless                                                                                                                                                                     |
| `siteStyles`                         | `scoreTone`, `filterClass`, `segmentClass`                                                                   |                                                                                                                                                                               |

---

## Hooks

| Hook                                         | Returns                                                                                     | Caching / refresh                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSiteData()` (`src/hooks/useSiteData.ts`) | `{ data, analysis, error, loading, change, reload, replaceSeoRecord(s), refreshReadiness }` | Module-level promise cache shared by every view; only `reload()` refetches. A catalog error is fatal; an SEO error becomes the soft `seoError` |
| `useAIConfigured()`                          | `boolean \| undefined`                                                                      | One status promise for the whole session; cleared on error so the next call retries                                                            |
| `useJobRunner(onChange?)`                    | `{ run(job), activeJobIds }`                                                                | Polls a run every 2 s for up to 10 min. A double-click can start the job twice, because the guard is set after the request                     |
| `useJobsAccess()`                            | `{ canRead, canManage }` (`undefined` while unknown)                                        | Checks permissions first, then probes the API. Cached per token and user                                                                       |
| `useKeyboardShortcut(key, cb, enabled?)`     | —                                                                                           | Window `keydown` listener with `preventDefault`                                                                                                |
| `useQuotationsSummary(quotations)`           | `{ count, totalValue }`                                                                     | **Not used anywhere**                                                                                                                          |

---

## SEO and AI utilities

| Module                   | Main exports                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/siteAnalysis.ts`  | `buildPages`, `analyzeInterlinking`, `analyzeKeywords`, `analyzeSite`, `buildAssistantContext`, `containsPhrase`, `normalizeRoute`, `stripHtml`, `STOREFRONT_URL` |
| `utils/seoCoverage.ts`   | `computeCoverage`, `diffCoverage`, `snapshotPercent`, `loadBaseline`, `saveBaseline`, `COVERAGE_GROUPS`, `COVERAGE_CHECKS`, `checkLabel`, `parseSlot`             |
| `utils/seoProjection.ts` | `projectScore` (predicted readiness), `applyToRecord`                                                                                                             |
| `utils/seoFixes.ts`      | `buildFixPlan`, `fixPayload`, `buildSchema`, `fieldLabel`, `DEFAULT_SHARE_IMAGE`                                                                                  |
| `utils/seoAutopilot.ts`  | `buildPagePlans`, `withAICopy`, `buildCopyPrompt`, `projectedSiteScore`, `DEFAULT_OPTIONS`                                                                        |
| `utils/keyphrases.ts`    | `analyzeKeyphrases`, `withCoverage`                                                                                                                               |
| `services/seoService.ts` | `readiness`, `listAll` (pages of 500; stops after page 49), `create`, `patch`                                                                                     |
| `services/aiService.ts`  | `generate`, `status`, `parseAIJsonReply`, `getAIConfigured`, `AI_PROMPT_MAX_CHARS` (20000)                                                                        |

**Keyword score weights** (`siteAnalysis.ts`, `scoreKeyword`):

| Check                                 | Weight |
| ------------------------------------- | ------ |
| Keyword in SEO title                  | 20     |
| Keyword in meta description           | 15     |
| Keyword in URL                        | 10     |
| Keyword in H1                         | 10     |
| Keyword in content                    | 10     |
| Content depth (80+ words, blogs 250+) | 10     |
| Internal links to the page            | 10     |
| Only one page targets it              | 10     |
| Title 30–60 characters                | 5      |
| Description 70–160 characters         | 5      |
| Natural density (0.5–3%)              | 5      |

The score is the earned share of the checks that apply. "Indexable" is a gate: if the page is noindex or its record is disabled, the score is 0.

**Data flow**

1. `useSiteData` fetches the catalog and the SEO data (records and readiness) in parallel.
2. `analyzeSite` builds the pages, the interlinking report and the keyword rows.
3. `SeoView` runs `computeCoverage`, which combines three sources:
   - backend readiness issue codes, for the page-field, content and merchant checks;
   - the interlinking report, for the linking checks;
   - the keyword checks.
4. `diffCoverage` compares the result against the baseline stored in localStorage.
5. A fix panel saves through `seoService` → `replaceSeoRecord(s)` → `refreshReadiness()`. That produces a `ReadinessChange` and re-runs the analysis.

Two kinds of score are involved. **Keyword scores** are computed entirely on the client. **Page readiness** comes from the backend; `seoProjection.ts` only predicts it, and must stay in sync with `AQUAKARTBACKEND/src/services/seoReadiness.js`.

---

## Known issues

These were found while writing this reference and have **not** been fixed unless marked otherwise.

**Invoices**

- Line totals are inconsistent. The customer PDF (storefront rule) and the view dialog treat `productPrice` as a **unit price** and multiply by quantity. `InvoicesTab.calculateTotal` (the saved `total_amount`) and the `computedTotal` fallback sum `productPrice` without quantity. For a quantity above 1, the CRM's stored total disagrees with the PDF. Align `calculateTotal` with the storefront.
- `customer_phone` is typed `number` but is a string at runtime. The form stores `Number(...) || 0`, which loses a leading `+` or `0`.
- The random `id` fallback in `mapInvoiceFromApi` isn't stable across refetches, and `sku` is mapped into `productSerialNo`.
- `services/notify.ts` posts free-text messages to `/v1/notify/send-whatsappp` (three p's). The backend registers that exact path (`AQUAKARTBACKEND/app.js:183`), so it works, but it looks like a typo. Rename both sides together.

**Dead code**

- Nothing imports `modular/customers/*`, `modular/orders/orderDeletePromptDialog.tsx` or `modular/quotations/*`.
- `modular/dialog.tsx` and `modular/promptDialog.tsx` are empty files.
- `hooks/useQuotationsSummary.ts` is not used.
- There are five near-duplicate delete-confirmation dialogs.

**Stock**

- The stock-status WhatsApp send posts free text to a template-only endpoint.
- `StockFormDialog` resets before its save resolves.

**Accessibility**

- Inside dialogs, `LiquidDropdown` options and the `AIAssist` popover can't be reached by keyboard.
- Toasts have no live region.
- `LockScreen` and `ReLoginScreen` labels aren't linked to their inputs, and `ReLoginScreen` has no focus trap.
- The sidebar's inactive tablist can't be reached with Tab.

**Bugs**

- `PhotoCarousel` can index out of range.
- `ScheduleEditor` can leave its spinner stuck.
- `JobFormDrawer` handles Escape twice.
- A double-click can start a job twice in `useJobRunner`.
- `AutopilotView` can't retry failed drafts without a remount.
- `offline.tsx` renders keyless fragments.

**Text and data quality**

- `" ? "` mojibake separators in `ProductInnerBlog.tsx` and `BlogFormDialog.tsx`.
- Blog images are saved as base64 data URLs.
- `computeCoverage` tells category and subcategory reference issues apart by matching message text.

**Fixed**

- 2026-10-24: `AICatalogSuggestions` crashed on keyword arrays in the button's disabled check.
