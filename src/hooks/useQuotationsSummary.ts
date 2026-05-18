import { useMemo } from "react";

export type QuotationStatus = "Sent" | "Draft" | "Accepted";

export interface Quotation {
  id: string;
  customer: string;
  date: string;
  items: number;
  total: number;
  status: QuotationStatus;
}

export interface QuotationSummary {
  count: number;
  totalValue: number;
}

export const getQuotationSummary = (
  quotations: Quotation[],
): QuotationSummary => {
  const totalValue = quotations.reduce(
    (sum, quotation) => sum + quotation.total,
    0,
  );
  return { count: quotations.length, totalValue };
};

export const getQuotationStatusClassName = (
  status: QuotationStatus,
): string => {
  if (status === "Accepted") {
    return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400";
  }

  if (status === "Sent") {
    return "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400";
  }

  return "bg-slate-100 dark:bg-white/10 text-black dark:text-white/60";
};

export const useQuotationsSummary = (
  quotations: Quotation[],
): QuotationSummary => {
  return useMemo(() => getQuotationSummary(quotations), [quotations]);
};
