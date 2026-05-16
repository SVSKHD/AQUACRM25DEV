export interface ParsedInvoiceBlock {
  name: string;
  address: string;
  phone: string;
  pincode: string;
  email: string;
}

export function parseInvoiceBlock(text: string): ParsedInvoiceBlock;

declare const _default: typeof parseInvoiceBlock;
export default _default;
