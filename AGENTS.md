# Working in Aquakart CRM

## Start here

Read `docs.md` first. It is the project map, UI reuse guide, API guide, and validation checklist. Use its paths to open only the files involved in the task. Avoid re-enumerating the whole repository; use targeted `rg` searches when the map is incomplete or stale.

This is a React 18 + TypeScript + Vite application. The backend is a separate service. `src/pages/Dashboard.tsx` selects workspaces and passes their view modes. `src/components/Layout/CrmShell.tsx` supplies navigation and the app shell.

## Preserve work and scope

- Inspect `git status --short` before edits. This workspace may contain substantial uncommitted work; retain changes unrelated to your task.
- Follow existing API contracts and preserve invoice calculations, public links, authentication, permissions, and CRM/ecommerce stock separation.
- Do not send WhatsApp messages, create live records, or publish/deploy changes just to verify UI work. Use fixtures for layout checks.
- Do not store secrets or tokens in source, documentation, screenshots, or logs.

## Reuse before creating

- Dialogs and drawers: `src/components/ui/ResponsiveDialog.tsx`. Use its `header`, `footer`, `busy`, `size`, and `drawer` props. Do not create another fixed overlay/body-scroll/focus-trap implementation.
- Inputs, selects, buttons, badges, panels: `src/components/ui/liquid.tsx`. Action buttons default to `type="button"`; submit buttons must specify `type="submit"` and a matching `form` when placed in a footer.
- Scrolling: `src/components/ArrowScrollArea.tsx`. Dialogs already provide one scroll region; avoid nesting a second whole-form scroll area. Keep wheel, touch, keyboard, and arrow scrolling.
- Tables/mobile record cards: `src/components/modular/invoices/invoiceTable.tsx` (`AquaGenericTable`). Reuse across modules despite its invoice directory.
- Tabs: `src/components/Layout/tabInnerlayout.tsx` (`TabInnerContent`). It supplies the shared `.crm-tab-content` scope.
- AI proofreading: `src/components/ai/AICatalogSuggestions.tsx`; field writing: `AIAssist.tsx`; bot status: `AIFieldAnimation.tsx` in the same directory.
- Feedback: `useToast` from `src/components/Toast.tsx`. Check API `error` results before claiming success or closing a form.

## Responsive UI contract

- Start with one form column; opt into two columns at `sm` or above. Set `min-width: 0` on shrinking content.
- Keep the dialog header and footer outside the scrolling body. Respect dynamic viewport height, keyboard resizing and device safe areas.
- Give controls at least 44px touch targets. Long action labels must wrap without overlapping adjacent buttons.
- Keep input bot indicators in the shared side rail. Do not place icons using field-specific absolute offsets.
- Use shared CSS hooks in `src/styles/invoiceDialogMobile.css`. The filename is historical: it contains shared dialog rules. Never override generic Tailwind grid classes globally or infer dialog structure from `nth-child` selectors.
- Keep visible focus indicators, Escape behavior, focus return, reduced-motion support, light/dark colors, and clear loading/error/empty states.
- AI suggestions update drafts for review; explicit Save/Create persists them. Do not invent IDs, images, prices, ratings, or reviews.

## Validate and maintain the map

Run `npm run check:ui`, `npm run typecheck`, and `npm exec vite build` for shared UI changes. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. Run focused tests for changed business logic. See `docs.md` for existing typecheck/test-runner limitations.

Use an available browser to check 320px, 390px, tablet, desktop, short landscape, keyboard open, long labels, and light/dark appearance. If a browser is unavailable, report that limitation; structural checks are not visual QA.

Update `docs.md` when adding/moving reusable components, changing API modes/contracts, or introducing a new workspace. Keep this file concise and link detailed guidance there.
