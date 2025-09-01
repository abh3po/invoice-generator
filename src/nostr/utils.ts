import { naddrEncode } from "nostr-tools/nip19";
import type { Event } from "nostr-tools";

const FORMS_KEY = "forms";

export function saveFormToLocalStorage(formEvent: Event, editKeyHex: string) {
  const existing = JSON.parse(localStorage.getItem(FORMS_KEY) || "[]");
  existing.push({ ...formEvent, editKeyHex });
  localStorage.setItem(FORMS_KEY, JSON.stringify(existing));
}

export function loadFormsFromLocalStorage(): any[] {
  return JSON.parse(localStorage.getItem(FORMS_KEY) || "[]");
}

export function generateFormUrl(
  pubkey: string,
  formId: string,
  viewKey?: string
) {
  const naddr = naddrEncode({ pubkey, identifier: formId, kind: 30168 });
  return `https://formstr.app/f/${naddr}${
    viewKey ? `?viewKey=${viewKey}` : ""
  }`;
}
