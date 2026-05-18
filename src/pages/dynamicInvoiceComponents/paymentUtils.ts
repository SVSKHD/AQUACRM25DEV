export type PaymentCopyField = "iciciDetails" | "kotakDetails" | "upiDetails";

const paymentTextMap: Record<
  PaymentCopyField,
  { label: string; text: string }
> = {
  iciciDetails: {
    label: "ICICI Details",
    text: "ICICI Bank\nA/c Name: Kundana Enterprises\nA/c No: 8813356673\nIFSC: ICIC0001316",
  },
  kotakDetails: {
    label: "Kotak Details",
    text: "KOTAK Bank\nA/c Name: Kundana Enterprises\nA/c No: 131605003314\nIFSC: KKBK0007463",
  },
  upiDetails: {
    label: "UPI Details",
    text: "UPI\nGPay: 9182119842\nPhonePe: 9182119842",
  },
};

export const getPaymentCopyContent = (field: PaymentCopyField) =>
  paymentTextMap[field];
