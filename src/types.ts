// src/nostr/types.ts

/**
 * A generic Nostr tag. Many tags are arrays where the first element is
 * the tag name. We type common shapes used in your form system.
 *
 * Examples:
 *  - response tag: ["response", "<fieldId>", "<value>", "<metadataJson?>"]
 *  - field tag (form spec): ["field", "<fieldId>", "<type>", "<label?>", "<choicesJson?>"]
 */
export type Tag = [string, string, string?, string?];

/**
 * Field tag from the form specification.
 * Common shape: ["field", fieldId, fieldType, label?, choicesJson?]
 */
export type Field = ["field", string, string, string?, string?, string?];

/**
 * The parsed invoice data used by the PDF generator / UI.
 * Now includes freelancer (issuer) + client (recipient).
 */
export interface InvoiceData {
  // Freelancer (issuer) details
  freelancerName: string;
  freelancerEmail?: string;
  freelancerAddress?: string;

  // Client (recipient) details
  clientName: string;
  company?: string;
  clientEmail?: string;
  clientAddress?: string;

  // Invoice details
  invoiceNumber: string;
  invoiceDate: string; // display string or ISO
  dueDate?: string;
  serviceDescription?: string;
  totalAmount: string; // keep as string (raw), parse to number where needed
  currency?: string;
  paymentInfo?: string;

  // Metadata
  authorPubkey: string;
  submittedAtISO: string;
}

/**
 * Map your form's field IDs to the semantic keys used by the parser.
 */
export interface FieldMap {
  // Freelancer fields (no prefix in form)
  freelancerName: string;
  freelancerEmail?: string;
  freelancerAddress?: string;

  // Client fields
  clientName: string;
  company?: string;
  clientEmail?: string;
  clientAddress?: string;

  // Invoice fields
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  serviceDescription?: string;
  totalAmount: string;
  currency?: string;
  paymentInfo?: string;
}

/**
 * When showing a friendly label for a response (getResponseLabels).
 */
export interface DisplayableAnswerDetail {
  questionLabel: string;
  responseLabel: string;
  fieldId: string;
}
