import { Button, Card, Col, Row, Typography } from "antd";
import type { InvoiceData } from "../types";
const { Title, Text, Paragraph } = Typography;
import { DownloadOutlined } from "@ant-design/icons";

export function InvoiceCard({
  inv,
  onDownload,
}: {
  inv: InvoiceData;
  onDownload: (inv: InvoiceData) => void;
}) {
  return (
    <Card
      key={`${inv.authorPubkey}-${inv.invoiceNumber}-${inv.submittedAtISO}`}
      style={{ marginBottom: 12 }}
    >
      <Row gutter={[8, 8]} align="top">
        <Col xs={24} md={20}>
          <Title level={5}>
            {inv.clientName || "(No client)"}{" "}
            {inv.company ? `— ${inv.company}` : ""}
          </Title>
          <Text>Invoice #: {inv.invoiceNumber}</Text>
          <br />
          <Text>
            Date: {inv.invoiceDate} • Due: {inv.dueDate || "-"}
          </Text>
          <br />
          <Text strong>Amount: {inv.totalAmount}</Text>
          {inv.serviceDescription && (
            <Paragraph italic style={{ marginTop: 8 }}>
              {inv.serviceDescription}
            </Paragraph>
          )}
          <Text>Payment: {inv.paymentInfo || "-"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Submitted: {new Date(inv.submittedAtISO).toLocaleString()} • Author:{" "}
            {inv.authorPubkey}
          </Text>
        </Col>
        <Col xs={24} md="auto">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            block
            onClick={() => onDownload(inv)}
          >
            PDF
          </Button>
        </Col>
      </Row>
    </Card>
  );
}
