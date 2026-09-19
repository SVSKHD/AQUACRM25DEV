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
