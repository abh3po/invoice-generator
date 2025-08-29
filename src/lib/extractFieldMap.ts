// src/nostr/extractFieldMap.ts
import type { FieldMap } from "../types";
import type { Tag, Field } from "../types";

export function extractFieldMapFromFormSpec(formSpec: Tag[]): FieldMap {
  const map: FieldMap = {
    clientName: "",
    company: "",
    clientEmail: "",
    clientAddress: "",
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    serviceDescription: "",
    totalAmount: "",
    paymentInfo: "",
    freelancerName: "",
    freelancerEmail: "",
    freelancerAddress: "",
  };

  const unmapped: { label: string; id: string }[] = [];

  for (const tag of formSpec) {
    if (tag[0] !== "field") continue;
    const [, fieldId, , labelRaw] = tag as string[];
    if (!labelRaw) continue;

    const norm = labelRaw.toLowerCase();
    let matched = false;

    // --- CLIENT fields (must explicitly say "client")
    if (!map.clientName && norm.includes("client") && norm.includes("name")) {
      map.clientName = fieldId;
      matched = true;
    } else if (
      !map.clientEmail &&
      norm.includes("client") &&
      norm.includes("email")
    ) {
      map.clientEmail = fieldId;
      matched = true;
    } else if (
      !map.clientAddress &&
      norm.includes("client") &&
      norm.includes("address")
    ) {
      map.clientAddress = fieldId;
      matched = true;
    } else if (!map.company && norm.includes("company")) {
      map.company = fieldId;
      matched = true;
    }

    // --- INVOICE meta
    else if (
      !map.invoiceNumber &&
      norm.includes("invoice") &&
      norm.includes("number")
    ) {
      map.invoiceNumber = fieldId;
      matched = true;
    } else if (
      !map.invoiceDate &&
      norm.includes("invoice") &&
      norm.includes("date")
    ) {
      map.invoiceDate = fieldId;
      matched = true;
    } else if (
      !map.dueDate &&
      (norm.includes("due date") ||
        (norm.includes("due") && norm.includes("date")))
    ) {
      map.dueDate = fieldId;
      matched = true;
    }

    // --- SERVICES / AMOUNT / PAYMENT
    else if (
      !map.serviceDescription &&
      (norm.includes("service") || norm.includes("description"))
    ) {
      map.serviceDescription = fieldId;
      matched = true;
    } else if (
      !map.totalAmount &&
      (norm.includes("amount") ||
        norm.includes("total") ||
        norm.includes("final"))
    ) {
      map.totalAmount = fieldId;
      matched = true;
    } else if (
      !map.paymentInfo &&
      (norm.includes("payment") ||
        norm.includes("bank") ||
        norm.includes("account") ||
        norm.includes("upi") ||
        norm.includes("paypal"))
    ) {
      map.paymentInfo = fieldId;
      matched = true;
    }

    // --- FREELANCER / ISSUER fields (the generics)
    else if (!map.freelancerName && norm.includes("name")) {
      map.freelancerName = fieldId;
      matched = true;
    } else if (!map.freelancerEmail && norm.includes("email")) {
      map.freelancerEmail = fieldId;
      matched = true;
    } else if (!map.freelancerAddress && norm.includes("address")) {
      map.freelancerAddress = fieldId;
      matched = true;
    }

    if (!matched) {
      unmapped.push({ label: labelRaw, id: fieldId });
    }
  }

  if (unmapped.length > 0) {
    console.info("extractFieldMapFromFormSpec: unmapped fields →", unmapped);
  }

  return map;
}
