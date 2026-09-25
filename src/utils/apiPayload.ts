export function extractArrayPayload<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];

  const candidates = [
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.rows,
    payload?.records,
    payload?.data?.data,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.rows,
    payload?.data?.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
}
