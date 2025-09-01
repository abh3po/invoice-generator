import { useEffect, useMemo, useState } from "react";
import { nip19, SimplePool } from "nostr-tools";
import type { Event } from "nostr-tools";
import { fetchFormResponses } from "./nostr/formResponses";
import { fetchFormTemplate } from "./nostr/fetchFormTemplate";
import { extractFieldMapFromFormSpec } from "./lib/extractFieldMap";
import { decryptAndParseInvoiceEvent } from "./nostr/decryptAndParse";
import { generateInvoicePDF } from "./lib/pdfGenerator";
import type { InvoiceData, FieldMap } from "./types";
import {
  loadFormsFromLocalStorage,
  saveFormToLocalStorage,
} from "./nostr/utils";
import { createDefaultFormEvent } from "./nostr/createFormEvent";
import { naddrEncode, type DecodedNaddr } from "nostr-tools/nip19";
import { bytesToHex } from "nostr-tools/utils";

// --- Ant Design
import {
  Button,
  Card,
  Input,
  Layout,
  List,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { InvoiceCard } from "./components/InvoiceCard";
import { HeaderBar } from "./components/HeaderBar";

const { Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

//
// --- SetupForm Component
//
function SetupForm({
  urlInput,
  setUrlInput,
  onCreateDefaultForm,
  onEnterUrl,
}: {
  urlInput: string;
  setUrlInput: (v: string) => void;
  onCreateDefaultForm: () => void;
  onEnterUrl: () => void;
}) {
  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Content style={{ padding: 20 }}>
        <Title level={2}>Setup Invoice Form</Title>
        <Paragraph>No invoice form found in local storage.</Paragraph>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateDefaultForm}
          >
            Create Default Invoice Form
          </Button>
          <Input
            placeholder="Enter Formstr URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPressEnter={onEnterUrl}
          />
          <Button onClick={onEnterUrl}>Load Formstr URL</Button>
        </Space>
      </Content>
    </Layout>
  );
}

//
// --- Main App
//
function App() {
  const [pool] = useState(() => new SimplePool());
  const [events, setEvents] = useState<Event[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldMap, setFieldMap] = useState<FieldMap | null>(null);

  const [formId, setFormId] = useState("");
  const [ownerPubkey, setOwnerPubkey] = useState("");
  const [editKeyHex, setEditKeyHex] = useState("");

  const [needsFormSetup, setNeedsFormSetup] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [formUrl, setFormUrl] = useState<string | null>(null);

  // --- 0. Check localStorage on mount
  useEffect(() => {
    const savedForms = loadFormsFromLocalStorage();
    if (savedForms.length > 0) {
      const form = savedForms[0];
      setFormId(form.tags.find((t: string[]) => t[0] === "d")?.[1] || "");
      setOwnerPubkey(form.pubkey);
      setEditKeyHex(form.editKeyHex);
    } else {
      setNeedsFormSetup(true);
    }
  }, []);

  // --- 1. Fetch the form template
  useEffect(() => {
    if (ownerPubkey && formId && editKeyHex)
      fetchFormTemplate(ownerPubkey, formId, pool, editKeyHex, (formSpec) => {
        const map = extractFieldMapFromFormSpec(formSpec);
        setFieldMap(map);
      });
  }, [pool, ownerPubkey, formId, editKeyHex]);

  // --- 2. Subscribe to responses
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

  // --- 3. Decrypt and parse events
  useEffect(() => {
    if (!fieldMap) return;
    let canceled = false;

    (async () => {
      const parsed: InvoiceData[] = [];
      for (const ev of events) {
        try {
          const inv = await decryptAndParseInvoiceEvent(
            ev,
            editKeyHex,
            fieldMap
          );
          if (inv) parsed.push(inv);
        } catch (err) {
          console.error("Decrypt failed:", err);
        }
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

  // --- 4. Derive formUrl whenever we have enough info
  useEffect(() => {
    if (formId && ownerPubkey && editKeyHex) {
      try {
        const naddr = naddrEncode({
          identifier: formId,
          pubkey: ownerPubkey,
          kind: 30168,
          relays: [
            "wss://relay.damus.io",
            "wss://relay.primal.net",
            "wss://nos.lol",
          ],
        });
        setFormUrl(`https://formstr.app/f/${naddr}#${editKeyHex}`);
      } catch (e) {
        console.error("Could not generate FormStr URL:", e);
      }
    }
  }, [formId, ownerPubkey, editKeyHex]);

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

  const handleCopyUrl = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      message.success("FormStr URL copied to clipboard!");
    }
  };

  const handleCreateDefaultForm = async () => {
    const defaultFormId = "invoice-form";
    const { event, secretKey } = await createDefaultFormEvent(defaultFormId);
    const editKeyHex = bytesToHex(secretKey);
    saveFormToLocalStorage(event, editKeyHex);

    setFormId(defaultFormId);
    setEditKeyHex(editKeyHex);
    setNeedsFormSetup(false);
  };

  const handleEnterResponseUrl = () => {
    try {
      const parsedUrl = new URL(urlInput);
      const [, naddr] = parsedUrl.pathname.split("/s/");
      const editKeyHex = parsedUrl.hash.replace("#", "");
      const { data } = nip19.decode(naddr) as DecodedNaddr;
      const { pubkey, identifier: formId } = data;

      setFormId(formId);
      setOwnerPubkey(pubkey);
      setEditKeyHex(editKeyHex);
      setNeedsFormSetup(false);
    } catch (e) {
      message.error("Invalid responses URL");
    }
  };

  // --- Setup mode
  if (needsFormSetup) {
    return (
      <SetupForm
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onCreateDefaultForm={handleCreateDefaultForm}
        onEnterUrl={handleEnterResponseUrl}
      />
    );
  }

  // --- Regular mode
  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <HeaderBar
        formId={formId}
        ownerPubkey={ownerPubkey}
        formUrl={formUrl}
        onCopy={handleCopyUrl}
      />

      <Content style={{ padding: "clamp(8px, 4vw, 16px)" }}>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>Form ID:</Text>{" "}
          <Text style={{ wordBreak: "break-all" }}>{formId}</Text>
          <br />
          <Text strong>Owner:</Text>{" "}
          <Text style={{ wordBreak: "break-all" }}>{ownerPubkey}</Text>
        </Card>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin size="large" />
            <div>Loading responses…</div>
          </div>
        ) : !rows.length ? (
          <Paragraph>No responses found.</Paragraph>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={rows}
            renderItem={(inv) => (
              <InvoiceCard inv={inv} onDownload={handleDownload} />
            )}
          />
        )}
      </Content>

      <Footer style={{ textAlign: "center" }}>
        <Text type="secondary">Invoice Generator powered by Nostr</Text>
      </Footer>
    </Layout>
  );
}

export default App;
