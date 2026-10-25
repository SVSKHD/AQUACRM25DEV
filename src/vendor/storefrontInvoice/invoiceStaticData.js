import {
  CalendarCheck,
  CreditCard,
  Plug,
  RefreshCcw,
  Truck,
  Undo2,
  UserCheck,
  Wrench,
} from "lucide-react";

export const termsAndConditions = [
  {
    icon: Truck,
    title: "Transport and Site Handling",
    description:
      "Transportation, unloading and lifting charges, where applicable, shall be borne by the customer. Any additional charge will be communicated before dispatch or installation for prior acknowledgement.",
  },
  {
    icon: Wrench,
    title: "Site Plumbing Readiness",
    description:
      "The customer is responsible for ensuring that basic plumbing arrangements are ready before installation. Assistance from an authorised plumbing partner may be arranged at an additional, pre-communicated cost.",
  },
  {
    icon: Plug,
    title: "Materials and Utility Connections",
    description:
      "Standard plumbing materials, electrical points and utility connections are to be provided at site by the customer. Special requirements, including booster-pump connections, will be quoted separately before work begins.",
  },
  {
    icon: CalendarCheck,
    title: "Delivery and Installation Schedule",
    description:
      "Delivery and installation are ordinarily completed within seven working days of confirmed order receipt, subject to product availability, site readiness and safe accessibility.",
  },
  {
    icon: CreditCard,
    title: "Payment and Order Confirmation",
    description:
      "Full advance payment together with the applicable purchase order is required to confirm processing, dispatch and installation scheduling. Work commences after payment realisation and order verification.",
  },
  {
    icon: Undo2,
    title: "Sales and Returns",
    description:
      "Products cannot be returned after unboxing, use or commencement of installation. Customers are requested to verify the model, capacity, specifications and site suitability before authorising installation.",
  },
  {
    icon: RefreshCcw,
    title: "Transit Damage and Replacement",
    description:
      "Manufacturing defects or visible transit damage must be reported within 48 hours of delivery with supporting photographs and invoice details. Eligible replacements will be processed after inspection in accordance with company policy.",
  },
  {
    icon: UserCheck,
    title: "Commissioning and Service Handover",
    description:
      "Authorised service engineers will verify plumbing, commission the system, explain operating procedures and facilitate warranty registration to support safe and reliable product performance.",
  },
];

export const customerCare = [
  {
    name: "Grundfos Customer Care",
    description: "For Grundfos product and service-related assistance",
    phone: "18001022535",
  },
  {
    name: "Crompton Customer Care",
    description: "For Crompton product and service-related assistance",
    phone: "+919228880505",
  },
  {
    name: "Kent Customer Care",
    description: "For Kent product and service-related assistance",
    phone: "+919278912345",
  },
];

export const bankPaymentMethods = [
  {
    key: "iciciDetails",
    type: "bank",
    name: "ICICI Bank",
    accountName: "Kundana Enterprises",
    accountNumber: "8813356673",
    ifsc: "ICIC0001316",
  },
  {
    key: "kotakDetails",
    type: "bank",
    name: "Kotak Mahindra Bank",
    accountName: "Kundana Enterprises",
    accountNumber: "131605003314",
    ifsc: "KKBK0007463",
  },
  {
    key: "upiDetails",
    type: "upi",
    name: "UPI Payment",
    gpay: "9182119842",
    phonePe: "9182119842",
  },
];

export const bankCopyDetails = {
  iciciDetails:
    "ICICI Bank\nA/c Name: Kundana Enterprises\nA/c No: 8813356673\nIFSC: ICIC0001316",
  kotakDetails:
    "Kotak Mahindra Bank\nA/c Name: Kundana Enterprises\nA/c No: 131605003314\nIFSC: KKBK0007463",
  upiDetails: "UPI\nGPay: 9182119842\nPhonePe: 9182119842",
};
