export function extractArrayPayload<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];

  const candidates = [
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.rows,
    payload?.records,
    payload?.products,
    payload?.categories,
    payload?.subcategories,
    payload?.customers,
    payload?.leads,
    payload?.deals,
    payload?.activities,
    payload?.conversations,
    payload?.messages,
    payload?.quotations,
    payload?.invoices,
    payload?.orders,
    payload?.stocks,
    payload?.data?.data,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.rows,
    payload?.data?.records,
    payload?.data?.products,
    payload?.data?.categories,
    payload?.data?.subcategories,
    payload?.data?.customers,
    payload?.data?.leads,
    payload?.data?.deals,
    payload?.data?.activities,
    payload?.data?.conversations,
    payload?.data?.messages,
    payload?.data?.quotations,
    payload?.data?.invoices,
    payload?.data?.orders,
    payload?.data?.stocks,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
}
