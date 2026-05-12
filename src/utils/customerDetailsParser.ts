export interface ParsedCustomerDetails {
  customerDetails: {
    name: string;
    phone: string;
    address: string;
  };
  gst: boolean;
  gstDetails: {
    gstNo: string;
  };
  missingFields: string[];
}

const GST_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Zz][A-Z0-9]\b/;
const PHONE_REGEX = /(?:\+?91[-\s]?)?([6-9]\d{9})\b/;

export function parseCustomerDetails(input: string): ParsedCustomerDetails {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const joined = lines.join(" ");
  const gstMatch = joined.match(GST_REGEX);
  const phoneMatch = joined.match(PHONE_REGEX);

  const phone = phoneMatch?.[1] ?? "";
  const gstNo = gstMatch?.[0]?.toUpperCase() ?? "";

  const remaining = lines.filter((line) => {
    if (phone && line.includes(phone)) return false;
    if (gstNo && line.toUpperCase().includes(gstNo)) return false;
    return true;
  });

  const name = remaining[0] ?? "";
  const address = remaining.slice(1).join(", ");

  const missingFields: string[] = [];
  if (!name) missingFields.push("customerDetails.name");
  if (!phone) missingFields.push("customerDetails.phone");
  if (!address) missingFields.push("customerDetails.address");

  return {
    customerDetails: { name, phone, address },
    gst: Boolean(gstNo),
    gstDetails: { gstNo },
    missingFields,
  };
}
