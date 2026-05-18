// src/constants/invoiceStaticData.ts

import {
  Truck,
  Wrench,
  Plug,
  CalendarCheck,
  CreditCard,
  Undo2,
  RefreshCcw,
  UserCheck,
} from "lucide-react";

export const termsAndConditions = [
  {
    icon: Truck,
    title: "Transport & Handling",
    description:
      "Transportation and lifting charges, if applicable, are to be borne by the customer. Any such charges will be clearly communicated in advance for complete transparency.",
  },
  {
    icon: Wrench,
    title: "Plumbing Support",
    description:
      "Basic plumbing arrangements should be made by the customer. If required, our authorized plumbing partners can assist at an additional cost.",
  },
  {
    icon: Plug,
    title: "Plumbing & Electrical Materials",
    description:
      "Standard plumbing and electrical connections are to be provided by the customer. Additional requirements such as pressure booster pump connections may involve extra charges, which will be informed prior to installation.",
  },
  {
    icon: CalendarCheck,
    title: "Delivery & Installation Timeline",
    description:
      "Delivery and installation are typically completed within 7 working days from order confirmation, subject to site readiness and accessibility.",
  },
  {
    icon: CreditCard,
    title: "Payment Terms",
    description:
      "Full payment is required in advance along with the purchase order to ensure timely processing, dispatch, and installation scheduling.",
  },
  {
    icon: Undo2,
    title: "Sales & Returns Policy",
    description:
      "Once the product is unboxed or installation has commenced, returns are not applicable. We recommend reviewing product specifications carefully before installation.",
  },
  {
    icon: RefreshCcw,
    title: "Replacement Policy",
    description:
      "In the unlikely event of manufacturing defects or transit damage, replacement requests must be reported within 48 hours of delivery. Our support team will assist after verification as per company policy.",
  },
  {
    icon: UserCheck,
    title: "Installation Verification & Support",
    description:
      "Our trained service engineers will handle plumbing verification, system configuration, user guidance, and warranty registration to ensure optimal performance.",
  },
];

export const customerCare = [
  {
    name: "Grundfos Customer care",
    description: "For Grundfos product related queries:",
    phone: "18001022535",
  },
  {
    name: "Crompton Customer care",
    description: "For Crompton product related queries:",
    phone: "+919228880505",
  },
  {
    name: "Kent Customer care",
    description: "For Kent product related queries:",
    phone: "+919278912345",
  },
];

export const bankCopyDetails = {
  iciciDetails:
    "ICICI Bank\nA/c Name: Kundana Enterprises\nA/c No: 8813356673\nIFSC: ICIC0001316",

  kotakDetails:
    "KOTAK Bank\nA/c Name: Kundana Enterprises\nA/c No: 131605003314\nIFSC: KKBK0007463",

  upiDetails: "UPI\nGPay: 9182119842\nPhonePe: 9182119842",
} as const;

export type BankCopyKey = keyof typeof bankCopyDetails;
