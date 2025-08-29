import { nip44 } from "nostr-tools";
import type { Event } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import type { InvoiceData, FieldMap } from "../types";

type Tag = string[];

function extractResponseTagsFromDecryptedJSON(parsed: any): Tag[] {
  if (Array.isArray(parsed)) {
    return parsed.filter((t: Tag) => Array.isArray(t) && t[0] === "response");
  }
  return [];
}

export function getResponseRelays(formEvent: Event): string[] {
  let formRelays = formEvent.tags
    .filter((t) => t[0] === "relay")
    .map((t) => t[1]);
  if (!formRelays.length) formRelays = [];
  return Array.from(new Set(formRelays));
}

/**
 * Decrypts a single response event (kind 1069) using NIP-44 v2.
 * - editKeyHex: your "Edit/View key" in hex (private key)
 * - fieldMap: mapping from field IDs -> semantic keys we need for invoices
 */
export async function decryptAndParseInvoiceEvent(
  responseEvent: Event,
  editKeyHex: string | null | undefined,
  fieldMap: FieldMap
): Promise<InvoiceData | null> {
  let responseTags: Tag[] = [];

  if (responseEvent.content === "") {
    // Unencrypted responses—rare but supported
    responseTags = responseEvent.tags.filter(
      (tag): tag is Tag => Array.isArray(tag) && tag[0] === "response"
    );
  } else if (editKeyHex) {
    try {
      const conversationKey = nip44.v2.utils.getConversationKey(
        hexToBytes(editKeyHex),
        responseEvent.pubkey
      );
      const decrypted = nip44.v2.decrypt(
        responseEvent.content,
        conversationKey
      );
      const parsed = JSON.parse(decrypted);
      responseTags = extractResponseTagsFromDecryptedJSON(parsed);
    } catch (e) {
      console.error("Failed to decrypt/parse response:", e);
      return null;
    }
  } else {
    console.warn("Cannot decrypt: editKey is not provided.");
    return null;
  }

  // Convert responseTags => { [fieldId]: value }
  const byFieldId: Record<string, string> = {};
  for (const tag of responseTags) {
    // ["response", fieldId, answerValue, metadata?]
    const [, fieldId, value] = tag;
    if (fieldId) byFieldId[fieldId] = value ?? "";
  }
  console.log("BY FIELD ID", byFieldId);

  // Map to InvoiceData using your field IDs
  const now = new Date(responseEvent.created_at * 1000);

  return {
    // --- Freelancer (issuer) ---
    freelancerName: byFieldId[fieldMap.freelancerName] || "",
    freelancerEmail: fieldMap.freelancerEmail
      ? byFieldId[fieldMap.freelancerEmail]
      : "",
    freelancerAddress: fieldMap.freelancerAddress
      ? byFieldId[fieldMap.freelancerAddress]
      : "",

    // --- Client (recipient) ---
    clientName: byFieldId[fieldMap.clientName] || "",
    company: fieldMap.company ? byFieldId[fieldMap.company] : "",
    clientEmail: fieldMap.clientEmail ? byFieldId[fieldMap.clientEmail] : "",
    clientAddress: fieldMap.clientAddress
      ? byFieldId[fieldMap.clientAddress]
      : "",

    // --- Invoice meta ---
    invoiceNumber:
      byFieldId[fieldMap.invoiceNumber] || responseEvent.id.slice(0, 8),
    invoiceDate: byFieldId[fieldMap.invoiceDate] || now.toLocaleDateString(),
    dueDate: fieldMap.dueDate ? byFieldId[fieldMap.dueDate] : "",

    // --- Content ---
    serviceDescription: fieldMap.serviceDescription
      ? byFieldId[fieldMap.serviceDescription]
      : "",
    totalAmount: byFieldId[fieldMap.totalAmount] || "0",
    currency: fieldMap.currency ? byFieldId[fieldMap.currency] : "",
    paymentInfo: fieldMap.paymentInfo ? byFieldId[fieldMap.paymentInfo] : "",

    // --- Metadata ---
    authorPubkey: responseEvent.pubkey,
    submittedAtISO: now.toISOString(),
  };
}
