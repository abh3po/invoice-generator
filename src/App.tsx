import { useEffect, useMemo, useState } from "react";
import { SimplePool } from "nostr-tools";
import type { Event } from "nostr-tools";
import { fetchFormResponses } from "./nostr/formResponses";
import { fetchFormTemplate } from "./nostr/fetchFormTemplate";
import { extractFieldMapFromFormSpec } from "./lib/extractFieldMap";
import { decryptAndParseInvoiceEvent } from "./nostr/decryptAndParse";
import { generateInvoicePDF } from "./lib/pdfGenerator";
import type { InvoiceData, FieldMap } from "./types";

function App() {
  const [pool] = useState(() => new SimplePool());
  const [events, setEvents] = useState<Event[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldMap, setFieldMap] = useState<FieldMap | null>(null);
  const [formId, setFormId] = useState("");
  const [ownerPubkey, setOwnerPubkey] = useState("");
  const [editKeyHex, setEditKeyHex] = useState("");

  // 1. Fetch the form template once on mount
  useEffect(() => {
    fetchFormTemplate(ownerPubkey, formId, pool, editKeyHex, (formSpec) => {
      const map = extractFieldMapFromFormSpec(formSpec);
      console.log("✅ Extracted fieldMap:", map);
      setFieldMap(map);
    });
  }, [pool]);

  // 2. Once we have fieldMap, subscribe for responses
  useEffect(() => {
    if (!fieldMap) return;
    setLoading(true);

    const closer = fetchFormResponses(ownerPubkey, formId, pool, (ev) =>
      setEvents((prev) =>
        prev.some((e) => e.id === ev.id) ? prev : [ev, ...prev]
      )
    );

    return () => closer.close();
  }, [pool, fieldMap]);

  // 3. Decrypt + parse events into invoices
  useEffect(() => {
    if (!fieldMap) return;
    let canceled = false;

    (async () => {
      const parsed: InvoiceData[] = [];
      for (const ev of events) {
        const inv = await decryptAndParseInvoiceEvent(ev, editKeyHex, fieldMap);
        if (inv) parsed.push(inv);
      }
      if (!canceled) {
        setInvoices(parsed);
        setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [events, fieldMap]);

  const rows = useMemo(
    () =>
      invoices.sort((a, b) => b.submittedAtISO.localeCompare(a.submittedAtISO)),
    [invoices]
  );

  const handleDownload = async (inv: InvoiceData) => {
    const bytes = await generateInvoicePDF(inv);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `invoice-${inv.invoiceNumber || inv.submittedAtISO}.pdf`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Invoice Generator (Nostr)</h1>
      <p>
        Form: <code>{formId}</code> • Owner: <code>{ownerPubkey}</code>
      </p>
      {loading ? <p>Loading responses…</p> : null}

      {!rows.length && !loading ? <p>No responses found.</p> : null}

      <div style={{ marginBottom: 20 }}>
        <label>
          Form ID:{" "}
          <input
            type="text"
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            style={{ marginRight: 10 }}
          />
        </label>
        <label>
          Owner Pubkey:{" "}
          <input
            type="text"
            value={ownerPubkey}
            onChange={(e) => setOwnerPubkey(e.target.value)}
            style={{ marginRight: 10 }}
          />
        </label>
        <label>
          Edit Key (hex):{" "}
          <input
            type="text"
            value={editKeyHex}
            onChange={(e) => setEditKeyHex(e.target.value)}
            style={{ marginRight: 10 }}
          />
        </label>
        <button onClick={() => setEvents([])}>Load Responses</button>
      </div>

      {rows.map((inv) => (
        <div
          key={`${inv.authorPubkey}-${inv.invoiceNumber}-${inv.submittedAtISO}`}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {inv.clientName || "(No client)"}{" "}
                {inv.company ? `— ${inv.company}` : ""}
              </div>
              <div>Invoice #: {inv.invoiceNumber}</div>
              <div>
                Date: {inv.invoiceDate} • Due: {inv.dueDate || "-"}
              </div>
              <div>
                Amount: <b>{inv.totalAmount}</b>
              </div>
              {inv.serviceDescription ? (
                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  <i>{inv.serviceDescription}</i>
                </div>
              ) : null}
              <div style={{ marginTop: 6 }}>
                Payment: {inv.paymentInfo || "-"}
              </div>
            </div>
            <div>
              <button onClick={() => handleDownload(inv)}>Download PDF</button>
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            Submitted: {new Date(inv.submittedAtISO).toLocaleString()} • Author:{" "}
            {inv.authorPubkey}
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
