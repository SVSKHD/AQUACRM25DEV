# Working in Aquakart CRM

## Start here

Read [`docs.md`](docs.md) first: project map, routes, API origins and validation commands. Component details are in [`docs/ELEMENTS.md`](docs/ELEMENTS.md); UI control rules are in [`docs/UI_COMPONENT_CONSISTENCY.md`](docs/UI_COMPONENT_CONSISTENCY.md). Open only the files the task touches; use targeted searches when the map is incomplete.

React 19 + TypeScript + Vite 8 frontend; the backend is a separate service. `src/pages/Dashboard.tsx` selects workspaces and their sub-views; `src/components/Layout/CrmShell.tsx` supplies the shell.

## Preserve work and scope

- Run `git status --short` before editing. The workspace may hold uncommitted work, sometimes from another agent; leave changes unrelated to your task alone.
- Keep API contracts, public links, authentication, permissions and the CRM/ecommerce stock split intact.
- Don't send WhatsApp messages or emails, create live records, run jobs or deploy just to check UI work. Use fixtures.
- Never put secrets or tokens in source, docs, screenshots or logs.

## Money rule

`productPrice` on an invoice line is the **line value** (PR #89), not a unit price. Totals sum it once per line. **Never multiply `productPrice` by quantity.** Map raw invoices with `mapInvoiceFromApi` (`src/components/modular/invoices/mapInvoice.ts`) and derive statuses with `src/utils/invoiceStatus.ts` so every screen agrees. Don't change invoice or PDF calculations as a side effect of other work.

## Reuse before creating

- **Controls**: `LiquidButton`, `LiquidIconButton`, `LiquidInput`, `LiquidTextarea`, `LiquidSelect`, `LiquidDropdown`, `LiquidCheckbox`, `LiquidFileButton`, `LiquidPanel`, `LiquidBadge`, `SidebarRequestBanner` from `src/components/ui/liquid.tsx`. Don't add raw `<input>`, `<select>`, `<textarea>` or `<button>` (including `motion.button`) in `src/components/tabs` or `src/components/modular`; if a capability is missing, extend the primitive once. `LiquidButton` has no default `type`: pass `type="button"` unless it submits.
- **Panels and dialogs**: `src/components/ui/ResizableFloatingSidebar.tsx`, or `SidebarDialog.tsx` when you need a sticky footer or a busy flag that blocks closing. Give each panel its own `widthStorageKey`. Don't build another overlay system.
- **Tables**: `AquaGenericTable` (`src/components/modular/invoices/invoiceTable.tsx`). Pass `getRowId`; give JSX columns a `filterValue` (search) and `sortValue` (sorting).
- **Drafts**: `usePersistentFormDraft` / `usePersistentNativeFormDraft`. Clear the draft only after a confirmed save.
- **API lists**: `extractArrayPayload` (`src/utils/apiPayload.ts`). Service calls resolve to `{ data?, error? }` and don't throw on HTTP errors; check `error` before claiming success or closing a form.
- **Feedback**: `useToast` (`src/components/Toast.tsx`); inline `SidebarRequestBanner` for errors inside a panel.
- **AI**: `AIAssist`, `AICatalogSuggestions`, `AIFieldAnimation` in `src/components/ai/`; `services/aiService.ts`. AI fills drafts for review; an explicit Save persists them. Never invent IDs, images, prices, ratings or reviews.
- **API origins**: `services/api.ts` is hardcoded to production; `config/api.ts` is production unless `VITE_API_ORIGIN` is set. Read `docs.md` → "API origins" before touching either, and don't add new hardcoded origins.

## Responsive UI

- One form column first; add columns from `sm` up. Set `min-width: 0` on shrinking content.
- Touch targets of at least 44 px; long labels wrap instead of overlapping.
- Support light and dark themes, visible focus, reduced motion, and clear loading, error and empty states. Give icon-only buttons an `aria-label`.
- Check 320 px, 390 px, tablet (around 1024 px, where the invoices table switches to cards), desktop, and the on-screen keyboard. If no browser is available, say so; builds and audits are not visual QA.

## Validate

Run, and report the real outcome of each:

```sh
npm run ui:audit      # raw-control audit; part of npm run lint
npm run typecheck     # the only command that type-checks (npm run build's tsc checks nothing)
npm test              # vitest run
npm run build
```

Add `npm run check:gst` for GST report work and `npm run check:invoice-ai` for AI invoice extraction. Several of these already fail on this branch for reasons unrelated to most tasks (see `docs.md` → "Validation"); compare against that baseline and don't add new failures. When you reduce a file's raw controls, lower its entry in `scripts/ui-consistency-baseline.json`. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

The Husky pre-commit hook bumps the package version and stages `package.json`; don't fight it or skip hooks.

## Keep the docs current

Update `docs.md` when you add a workspace or route, move a shared component, or change API configuration; update `docs/ELEMENTS.md` when a shared component's props or behaviour change or a known issue is fixed. Keep this file short and link to those.
