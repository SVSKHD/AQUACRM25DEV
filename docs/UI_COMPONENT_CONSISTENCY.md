# AQUACRM25 UI component consistency

AQUACRM25 uses the shared liquid/glass primitives in `src/components/ui/liquid.tsx` as the UI source of truth.

## Rules

1. Reuse before creating. Search the shared UI and modular component folders before adding markup to a page.
2. Forms must use the shared primitives: `LiquidInput`, `LiquidTextarea`, `LiquidDropdown`, `LiquidCheckbox`, and `LiquidButton`.
3. Do not add page-local glass input, select, textarea, checkbox, dropdown, or button implementations. If a reusable capability is missing, extend the shared primitive once and reuse it.
4. Use `LiquidDropdown` when the dropdown menu itself needs the glass treatment. Use `LiquidSelect` only where a native select is intentionally required.
5. Keep domain-specific composition in `src/components/modular` and generic visual primitives in `src/components/ui`.
6. Pages and tabs should own data/state and compose components. They should not duplicate generic control styling.
7. New shared components must support light/dark themes, disabled/focus states, and accessible labels.
8. Repeated visual patterns should become shared components rather than copied class strings.

## Current shared glass primitives

- `LiquidButton` and `LiquidIconButton`
- `LiquidInput`
- `LiquidTextarea`
- `LiquidSelect`
- `LiquidDropdown`
- `LiquidCheckbox`
- `LiquidPanel`
- `LiquidBadge`

The SEO & Indexing Control Center is the reference implementation for composing these form controls consistently.

## Enforcement

Run `npm run ui:audit` to scan every TSX file under `src/components/tabs` and `src/components/modular` for page-local/native `input`, `select`, `textarea`, and `button` controls (including `motion.button`).

The audit is also part of `npm run lint`. It uses `scripts/ui-consistency-baseline.json` as a debt ceiling:

- existing legacy violations may be reduced incrementally;
- a clean file may not introduce a new raw control;
- an existing file may not increase any raw-control count;
- new tab/modular files start with a zero-control allowance;
- `npm run ui:strict` requires the entire scanned surface to reach zero raw controls.

The baseline is not an exemption list. When a file is refactored, lower or remove its baseline values so the improvement becomes permanent.

## Current tab audit

The Stock tab and its stock dialogs are now composed from shared liquid primitives and the shared `AquaGenericTable`. The generic table itself also uses shared liquid inputs, select, buttons, icon buttons, and checkboxes.

| Tab | Raw controls remaining | Status |
| --- | ---: | --- |
| Analytics | 0 | Consistent |
| Dashboard Overview | 0 | Consistent |
| Invoices | 0 | Consistent |
| Orders | 0 | Consistent |
| Quotations | 0 | Consistent |
| Reports | 0 | Consistent |
| SEO | 0 | Consistent |
| Service Reminders | 0 | Consistent |
| Stock | 0 | Consistent |
| Deals | 11 | Follow-up |
| Activities | 13 | Follow-up |
| Leads | 13 | Follow-up |
| Notifications | 18 | Follow-up |
| Products | 48 | Follow-up |
| Customers | 61 | Follow-up |
| Commerce Admin | 72 | Follow-up |

Raw-control totals include `motion.button` and are intended as migration debt, not a recommendation to preserve page-local controls.

