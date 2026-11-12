# Project: Aquakart CRM (AquakartCrm)

Staff CRM for Aquakart: invoices, customers, catalog (products/categories/blogs), stock, jobs, GST reports, AI/SEO tools. Rules: `AGENTS.md`; project map: `docs.md`; components: `docs/ELEMENTS.md`.

## How to navigate this repo (read before opening files)

1. Pick the component from the index below or the routing table in `.claude/map.md`.
2. Read only that component's section of `.claude/map.md`.
3. Grep for the symbol, then open just those lines. Do not scan the whole repo.

## Stack

- React 19 + TypeScript + Vite 8, Tailwind, framer-motion, vitest 4. Backend is the separate AQUAKARTBACKEND repo (`https://api.aquakart.co.in/v1`).

## Commands

- Install: `npm install`
- Run: `npm run dev`
- Test: `npm test`
- Also: `npm run typecheck` (only real type check; ~32 baseline errors), `npm run ui:audit`, `npm run build`. Windows PowerShell: `npm.cmd`.

## Conventions

- Follow `AGENTS.md`: Liquid controls only, `ResizableFloatingSidebar`/`SidebarDialog`, `AquaGenericTable`, service calls return `{ data?, error? }` (never throw), `useToast` + `SidebarRequestBanner`.
- Never multiply invoice `productPrice` by quantity (it is the line value).

## Gotchas

- `services/api.ts` hardcodes production origins; don't add new ones. Don't hit production to test UI work — use fixtures/mocks.
- Category photos are sent as multipart files (`services/categoryPhotos.ts`); products/subcategories/blogs still send base64 JSON.
- `.claude/hooks/review_changes.py` crashes on Windows paths (`NotADirectoryError`); review the diff manually.

## Component index

<!-- map-index:start -->

Details per component: `.claude/map.md` (read only the section you need).

| Component                              | Files | Purpose |
| -------------------------------------- | ----- | ------- |
| `public`                               | 1     | TODO    |
| `scripts`                              | 6     | TODO    |
| `src`                                  | 4     | TODO    |
| `src/components`                       | 7     | TODO    |
| `src/components/Layout`                | 4     | TODO    |
| `src/components/ai`                    | 4     | TODO    |
| `src/components/modular/ai`            | 12    | TODO    |
| `src/components/modular/invoices`      | 10    | TODO    |
| `src/components/modular/jobs`          | 9     | TODO    |
| `src/components/modular/notifications` | 2     | TODO    |
| `src/components/modular/products`      | 16    | TODO    |
| `src/components/modular/reports`       | 1     | TODO    |
| `src/components/modular/stock`         | 3     | TODO    |
| `src/components/tabs`                  | 19    | TODO    |
| `src/components/ui`                    | 5     | TODO    |
| `src/config`                           | 1     | TODO    |
| `src/contexts`                         | 3     | TODO    |
| `src/hooks`                            | 8     | TODO    |
| `src/pages`                            | 12    | TODO    |
| `src/pages/dynamicInvoiceComponents`   | 9     | TODO    |
| `src/services`                         | 20    | TODO    |
| `src/styles`                           | 5     | TODO    |
| `src/utils`                            | 38    | TODO    |
| `(root)`                               | 10    | TODO    |

<!-- map-index:end -->

## Recent changes

Logged automatically, newest first. Older history: `.claude/changes-archive.md`.
@.claude/changes.md
