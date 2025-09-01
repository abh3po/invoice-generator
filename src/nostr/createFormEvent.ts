import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  SimplePool,
  type Event,
  type EventTemplate,
} from "nostr-tools";
import type { Field, Tag } from "../types";

const defaultInvoiceFormSpec: Field[] = [
  ["field", "clientName", "text", "Client Name", "", "{}"],
  ["field", "company", "text", "Company", "", "{}"],
  ["field", "clientEmail", "text", "Client Email", "", "{}"],
  ["field", "clientAddress", "text", "Client Address", "", "{}"],

  ["field", "invoiceNumber", "text", "Invoice Number", "", "{}"],
  ["field", "invoiceDate", "text", "Invoice Date", "", "{}"],
  ["field", "dueDate", "text", "Due Date", "", "{}"],

  ["field", "serviceDescription", "text", "Service Description", "", "{}"],
  ["field", "totalAmount", "text", "Total Amount", "", "{}"],

  [
    "field",
    "currency",
    "option",
    "Currency",
    JSON.stringify([
      ["usd", "USD"],
      ["eur", "EUR"],
      ["jpy", "JPY"],
      ["inr", "INR"],
      ["gbp", "GBP"],
    ]),
    "{}",
  ],

  ["field", "paymentInfo", "text", "Payment Info", "", "{}"],

  ["field", "issuerName", "text", "Name", "", "{}"],
  ["field", "issuerEmail", "text", "Email", "", "{}"],
  ["field", "issuerAddress", "text", "Address", "", "{}"],
];
const defaultRealys = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
];
export async function createDefaultFormEvent(
  formId: string,
  name = "Invoice Form"
): Promise<{ event: Event; secretKey: Uint8Array }> {
  const secretKey = generateSecretKey();
  const baseEvent = {
    kind: 30168,
    pubkey: getPublicKey(secretKey),
    content: "", // public form → no encryption
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["d", formId],
      ["name", name],
      ["settings", JSON.stringify({ description: "Standard invoice form" })],
      ...defaultInvoiceFormSpec,
    ],
  } as EventTemplate;
  const fullEvent = finalizeEvent(baseEvent, secretKey);
  const pool = new SimplePool();
  await Promise.any(pool.publish(defaultRealys, fullEvent));
  return { event: fullEvent, secretKey: secretKey };
}
