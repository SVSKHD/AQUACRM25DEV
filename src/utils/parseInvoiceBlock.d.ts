export interface ParsedInvoiceBlock {
  name: string;
  address: string;
  phone: string;
  pincode: string;
  email: string;
}

export function parseInvoiceBlock(text: string): ParsedInvoiceBlock;

/** Title-case text typed in one case; mixed-case text is kept as typed. */
export function toTitleCase(value: string): string;

declare const _default: typeof parseInvoiceBlock;
export default _default;
