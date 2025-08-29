import { SimplePool } from "nostr-tools";
import type { Event, Filter } from "nostr-tools";
import type { SubCloser } from "nostr-tools/abstract-pool";

export const getDefaultRelays = (): string[] => [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

export const fetchFormResponses = (
  pubKey: string,
  formId: string,
  pool: SimplePool,
  handleResponseEvent: (event: Event) => void,
  allowedPubkeys?: string[],
  relays?: string[]
): SubCloser => {
  const relayList = Array.from(
    new Set([...(relays || []), ...getDefaultRelays()])
  );
  const filter: Filter = {
    kinds: [1069],
    "#a": [`30168:${pubKey}:${formId}`],
  };
  if (allowedPubkeys?.length) filter.authors = allowedPubkeys;

  return pool.subscribeMany(relayList, [filter], {
    onevent: handleResponseEvent,
  });
};
