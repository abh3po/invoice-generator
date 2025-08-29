import type { Event } from "nostr-tools";
import { SimplePool, getPublicKey, nip44 } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import type { Tag } from "../types";

/**
 * Fetches and decrypts the form template (kind=30168).
 */

const defaultRealys = [
  "wss://relay.damus.ion",
  "wss://relay.primal.net",
  "wss://relay.nos.lol",
];
export const fetchFormTemplate = async (
  pubKey: string,
  formIdentifier: string,
  pool: SimplePool,
  editKey: string | null | undefined, // 🔑 needed for decryption
  onFormSpec: (formSpec: Tag[], event: Event) => void,
  relays?: string[]
): Promise<void> => {
  const relayList = relays?.length ? relays : defaultRealys;
  const ViewKey =
    "bd1d39dbb0e447e4b6075c253df49561f22c8156a3bf320b9e7c6755a5acaea8";

  const filter = {
    kinds: [30168],
    authors: [pubKey],
    "#d": [formIdentifier],
  };

  const subCloser = pool.subscribeMany(relayList, [filter], {
    onevent: (event: Event) => {
      let formSpec: string[][] = [];
      console.log("Got event", event);
      try {
        if (event.content) {
          if (editKey) {
            // 🔓 decrypt
            const conversationKey = nip44.v2.utils.getConversationKey(
              hexToBytes(editKey),
              getPublicKey(hexToBytes(ViewKey))
            );
            const decryptedContent = nip44.v2.decrypt(
              event.content,
              conversationKey
            );
            formSpec = JSON.parse(decryptedContent);
          } else {
            console.warn(
              "Form event has encrypted content but no editKey provided"
            );
          }
        } else {
          // fallback: maybe fields are in tags
          formSpec = event.tags.filter(
            (t): t is string[] => Array.isArray(t) && t[0] === "field"
          ) as string[][];
        }
      } catch (e) {
        console.error("Failed to decrypt/parse form template:", e);
      }

      onFormSpec(formSpec as Tag[], event);
      subCloser.close();
    },
  });
};
