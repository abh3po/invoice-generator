import { Button, Col, Row, Space, Typography } from "antd";
import { Header } from "antd/es/layout/layout";
const { Title, Text, Paragraph } = Typography;
import { CopyOutlined } from "@ant-design/icons";

export function HeaderBar({
  formId,
  ownerPubkey,
  formUrl,
  onCopy,
}: {
  formId: string;
  ownerPubkey: string;
  formUrl: string | null;
  onCopy: () => void;
}) {
  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 16px",
        borderBottom: "1px solid #eee",
      }}
    >
      <Row gutter={[8, 8]} align="middle">
        <Col xs={24} md={12}>
          <Title level={3} style={{ margin: 0 }}>
            Invoice Generator (Nostr)
          </Title>
        </Col>
        {formId && ownerPubkey && (
          <Col xs={24} md="auto">
            <Space>
              <Paragraph
                ellipsis={{ rows: 1, tooltip: formUrl || "No URL" }}
                style={{
                  margin: 0,
                  maxWidth: 220, // ✅ constrain width
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {formUrl ? (
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", maxWidth: "100%" }}
                  >
                    {formUrl}
                  </a>
                ) : (
                  <Text type="secondary">(No FormStr URL)</Text>
                )}
              </Paragraph>
              {formUrl && (
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={onCopy}
                />
              )}
            </Space>
          </Col>
        )}
      </Row>
    </Header>
  );
}
