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
const PINCODE_REGEX = /\b\d{6}\b/;

const ADDRESS_KEYWORDS = [
  "villa",
  "apartment",
  "appartment",
  "apt",
  "flat",
  "plot",
  "road",
  "street",
  "lane",
  "nagar",
  "colony",
  "residency",
  "tower",
  "society",
  "building",
  "block",
  "sector",
  "phase",
  "complex",
  "mansion",
  "house",
  "enclave",
  "avenue",
  "gardens",
  "heights",
  "estate",
  "cross",
  "opposite",
  "opp.",
  "near",
  "behind",
  "beside",
  "main",
  "floor",
  "h.no",
  "d.no",
  "layout",
  "circle",
  "junction",
  "hyderabad",
  "bangalore",
  "bengaluru",
  "chennai",
  "mumbai",
  "delhi",
  "pune",
  "kolkata",
];

const isLikelyAddressLine = (line: string): boolean => {
  if (/\d/.test(line)) return true;
  const lower = line.toLowerCase();
  return ADDRESS_KEYWORDS.some((k) => {
    const re = new RegExp(`\\b${k.replace(/\./g, "\\.")}\\b`, "i");
    return re.test(lower);
  });
};

const isLikelyNameLine = (line: string): boolean => {
  if (/\d/.test(line)) return false;
  if (isLikelyAddressLine(line)) return false;
  const words = line.trim().split(/\s+/);
  if (words.length === 0 || words.length > 4) return false;
  return words.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w));
};

const hasInitialPattern = (line: string): boolean => {
  const words = line.trim().split(/\s+/);
  if (words.length < 2) return false;
  const last = words[words.length - 1];
  const first = words[0];
  return (
    (last.replace(/\./g, "").length <= 2 && /^[A-Za-z]/.test(last)) ||
    (first.replace(/\./g, "").length <= 2 && /^[A-Za-z]/.test(first))
  );
};

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
    if (phone && line.replace(/\D/g, "").includes(phone)) return false;
    if (gstNo && line.toUpperCase().includes(gstNo)) return false;
    return true;
  });

  let nameIndex = -1;

  for (let i = 0; i < remaining.length; i++) {
    if (isLikelyNameLine(remaining[i]) && hasInitialPattern(remaining[i])) {
      nameIndex = i;
      break;
    }
  }

  if (nameIndex === -1) {
    for (let i = 0; i < remaining.length; i++) {
      if (isLikelyNameLine(remaining[i])) {
        nameIndex = i;
        break;
      }
    }
  }

  if (nameIndex === -1 && remaining.length > 0) {
    nameIndex = 0;
  }

  const name = nameIndex >= 0 ? remaining[nameIndex] : "";
  const addressLines = remaining.filter((_, i) => i !== nameIndex);
  const address = addressLines.join(", ").replace(PINCODE_REGEX, (m) => m);

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
