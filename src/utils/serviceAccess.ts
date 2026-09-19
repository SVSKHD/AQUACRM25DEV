export const SERVICE_ACCESS_CODE = "2607";

export const isValidServiceAccessCode = (value: string) =>
  String(value || "").trim() === SERVICE_ACCESS_CODE;
