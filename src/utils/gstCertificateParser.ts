import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ParsedGstCertificate {
  gstNo: string;
  legalName: string;
  tradeName: string;
  address: string;
  pinCode: string;
  state: string;
  city: string;
  district: string;
}

const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Zz][A-Z0-9]\b/;

const FIELD_LABELS = [
  "Legal Name",
  "Trade Name, if any",
  "Additional trade names, if any",
  "Constitution of Business",
  "Address of Principal Place of Business",
  "Building No./Flat No.",
  "Name Of Premises/Building",
  "Road/Street",
  "Locality/Sub Locality",
  "City/Town/Village",
  "District",
  "State",
  "PIN Code",
  "Date of Liability",
  "Date of Validity",
  "Type of Registration",
  "Particulars of Approving",
  "Signature",
  "Name",
  "Designation",
  "Jurisdictional Office",
  "Date of issue of Certificate",
];

const extractField = (text: string, label: string): string => {
  const idx = text.indexOf(label);
  if (idx === -1) return "";
  const after = text.slice(idx + label.length).replace(/^[:\s]+/, "");
  let end = after.length;
  for (const other of FIELD_LABELS) {
    if (other === label) continue;
    const otherIdx = after.indexOf(other);
    if (otherIdx !== -1 && otherIdx < end) end = otherIdx;
  }
  return after.slice(0, end).trim();
};

const cleanValue = (value: string): string =>
  value
    .replace(/[\s ]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();

export async function parseGstCertificatePdf(
  file: File,
): Promise<ParsedGstCertificate> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    for (const item of content.items as Array<{
      str: string;
      transform: number[];
    }>) {
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
        parts.push("\n");
      }
      parts.push(item.str);
      if (y !== undefined) lastY = y;
    }
    parts.push("\n");
  }

  const fullText = parts.join(" ").replace(/[ \t]+/g, " ");
  const flat = fullText.replace(/\s+/g, " ");

  const gstNo = (flat.match(GSTIN_REGEX)?.[0] ?? "").toUpperCase();

  const legalName = cleanValue(extractField(flat, "Legal Name"));
  const tradeName = cleanValue(extractField(flat, "Trade Name, if any"));
  const building = cleanValue(extractField(flat, "Building No./Flat No."));
  const premises = cleanValue(extractField(flat, "Name Of Premises/Building"));
  const road = cleanValue(extractField(flat, "Road/Street"));
  const locality = cleanValue(extractField(flat, "Locality/Sub Locality"));
  const city = cleanValue(extractField(flat, "City/Town/Village"));
  const district = cleanValue(extractField(flat, "District"));
  const state = cleanValue(extractField(flat, "State"));
  const pinCode = cleanValue(extractField(flat, "PIN Code"));

  const address = [
    building,
    premises,
    road,
    locality,
    city,
    district,
    state,
    pinCode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    gstNo,
    legalName,
    tradeName,
    address,
    pinCode,
    state,
    city,
    district,
  };
}
