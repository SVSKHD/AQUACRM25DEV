# Plan: Invoice form — typing a GSTIN validates it and prefills GST details from past invoices

Status: done

## Target (scope)

- `src/utils/gstin.ts` (new) → `gstinCheckDigit`, `describeGstin`, `findGstDetails`, `fillEmptyGstFields`
- `src/utils/gstin.test.ts` (new)
- `src/components/modular/invoices/invoiceDialog.tsx` → new optional prop `findGstDetails`; GSTIN `onChange`; status line + Undo under the GSTIN field
- `src/components/tabs/InvoicesTab.tsx` → pass a lookup over the loaded `invoices` (excluding the one being edited)
- `docs/ELEMENTS.md`, `.claude/changes.md`

## Approach

1. Pure util: reuse `GST_STATES` / `validGSTIN` from `utils/gstReport.ts`; add the GSTIN mod-36 check digit; `describeGstin` → state, PAN, or a specific error.
2. Lookup: all loaded invoices with the same GSTIN (case/space-insensitive), newest first (`parseInvoiceDate`); each field (name, phone, email, address) takes the newest non-empty value; returns the source invoice no/date.
3. Dialog: when the typed/pasted GSTIN reaches 15 chars and is valid, fill only empty GST fields; show "Filled name, address from invoice #… · Undo"; invalid → inline hint (does not block save); no match → "New GSTIN — enter details". Runs only on user input, not when opening an existing invoice.
4. Undo restores only fields still holding the filled value.

## Out of scope

- Live GST registry lookup (needs paid API on backend) and customer-profile lookup (not loaded in InvoicesTab).
- Blocking save on an invalid checksum; GST certificate PDF flow; Quick/Easy modes.

## Tests

- `gstin.test.ts`: check digit on known-valid GSTINs, typo detection, state/PAN, unknown state, short input; lookup newest-first per field, excludes current invoice, normalises case/spaces, no match; fill-empty never overwrites.
- Full `npm test`, typecheck vs 32-error baseline, `ui:audit`, `build`.

## Risks

- Large invoice lists: lookup is a linear scan on a 15-char input only (once per completed GSTIN) — negligible.
- Dialog is generic over `F`; new prop is optional so other callers are unaffected.
