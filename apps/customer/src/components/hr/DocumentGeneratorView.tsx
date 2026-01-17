// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { 
  Form, Input, InputNumber, Select, Button, Card, Row, Col, message, 
  Steps, Statistic, Divider, Typography, Space, Tag, Alert, Badge
} from "antd";
import { 
  FileTextOutlined, FileAddOutlined, EyeOutlined, PrinterOutlined, 
  DownloadOutlined, CheckCircleOutlined, EditOutlined, FileOutlined,
  SignatureOutlined, ThunderboltOutlined
} from "@ant-design/icons";
import { docsAPI } from "./api";
import DocumentPreview from "./DocumentPreview";
import SignaturePad from "./SignaturePad";
import SendCSuiteDocs from "../board/GenerateOfficerDocuments";

const { Title, Text } = Typography;
const { TextArea } = Input;

type Template = { id: string; title: string; placeholders: string[] };

interface DocumentGeneratorViewProps {
  onGenerated?: (payload: any) => void;
}

// Fallback templates list (matches server/templates/index.ts)
const FALLBACK_TEMPLATES: Template[] = [
  { 
    id: "employment_agreement", 
    title: "Executive Employment Agreement", 
    placeholders: ["company_name", "full_name", "role", "equity_percentage", "effective_date", "funding_trigger", "governing_law"]
  },
  { 
    id: "board_resolution", 
    title: "Board Resolution – Appointment of Officers", 
    placeholders: ["company_name", "date", "directors", "ceo_name", "cfo_name", "cxo_name", "equity_ceo", "equity_cfo", "equity_cxo", "funding_trigger"]
  },
  { 
    id: "founders_agreement", 
    title: "Founders' / Shareholders' Agreement", 
    placeholders: ["company_name", "founders_table_html", "vesting_years", "cliff_months", "governing_law"]
  },
  { 
    id: "stock_issuance", 
    title: "Stock Subscription / Issuance Agreement", 
    placeholders: ["company_name", "full_name", "role", "share_count", "class_name", "par_value", "consideration", "vesting_schedule"]
  },
  { 
    id: "confidentiality_ip", 
    title: "Confidentiality & IP Assignment Agreement", 
    placeholders: ["company_name", "full_name", "role", "effective_date", "governing_law"]
  },
  { 
    id: "deferred_comp_addendum", 
    title: "Deferred Compensation Addendum", 
    placeholders: ["company_name", "full_name", "role", "funding_trigger", "effective_date", "governing_law"]
  },
  { 
    id: "offer_letter", 
    title: "Executive Offer Letter", 
    placeholders: ["company_name", "full_name", "role", "equity_percentage", "effective_date", "funding_trigger"]
  },
  { 
    id: "bylaws_officers_excerpt", 
    title: "Bylaws – Officers (Excerpt)", 
    placeholders: ["company_name", "funding_trigger", "officer_roles_html", "governing_law"]
  },
  { 
    id: "irs_83b", 
    title: "IRS Form 83(b) – Info Sheet", 
    placeholders: ["taxpayer_name", "taxpayer_address", "company_name", "date_of_transfer", "stock_class", "number_of_shares", "fair_market_value", "amount_paid"]
  }
];

export default function DocumentGeneratorView({ onGenerated }: DocumentGeneratorViewProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [generated, setGenerated] = useState<any>(null);

  useEffect(() => {
    // Try to fetch from server first
    docsAPI
      .get("/documents/templates")
      .then((res) => {
        console.log("Templates response:", res);
        const templatesList = Array.isArray(res) ? res : [];
        if (templatesList.length > 0) {
          setTemplates(templatesList);
        } else {
          console.warn("Server returned empty templates, using fallback");
          setTemplates(FALLBACK_TEMPLATES);
        }
      })
      .catch((err) => {
        console.error("Error fetching templates from server, using fallback:", err);
        setTemplates(FALLBACK_TEMPLATES);
        message.warning("Document server not available. Templates shown but document generation requires the Express server to be running.");
      });
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  const placeholders = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId)?.placeholders ?? [];
  }, [templates, selectedTemplateId]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data: Record<string, any> = {};

      placeholders.forEach((k: string) => {
        data[k] = values[k] || "";
      });

      // Signature HTML placeholders empty for now (filled during signing)
      data.signature_company_html = "";
      data.signature_executive_html = "";
      data.signature_exec_html = "";
      data.signature_holder_html = "";
      data.signature_f1_html = "";
      data.signature_f2_html = "";
      data.signature_director1_html = "";
      data.signature_director2_html = "";

      // Auto-fill full_name from officer_name if not provided
      if (!data.full_name && values.officer_name) {
        data.full_name = values.officer_name;
      }

      const resp = await docsAPI.post("/documents/generate", {
        template_id: values.template_id,
        officer_name: values.officer_name || data.full_name || "",
        role: values.role || data.role || "",
        equity: values.equity_percentage ? Number(values.equity_percentage) : undefined,
        data,
      });

      setGenerated(resp);
      setCurrentStep(1);
      onGenerated?.(resp);
      message.success("Document generated successfully!");
    } catch (e: any) {
      message.error(e?.error || e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (s) => s.toUpperCase());
  };

  const steps = [
    {
      title: 'Select Template',
      icon: <FileTextOutlined />,
    },
    {
      title: 'Preview & Sign',
      icon: <SignatureOutlined />,
    },
    {
      title: 'Complete',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Available Templates"
              value={templates.length}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Documents Generated"
              value={generated ? 1 : 0}
              prefix={<FileAddOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Ready to Sign"
              value={currentStep >= 1 ? 1 : 0}
              prefix={<ThunderboltOutlined style={{ color: '#ff7a45' }} />}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Steps */}
      <Card>
        <Steps
          current={currentStep}
          items={steps}
          size="small"
        />
      </Card>

      {/* Send C-Suite Docs Section */}
      <div style={{ marginBottom: 24 }}>
        <SendCSuiteDocs />
      </div>

      <Divider />

      {/* Document Generation Form */}
      {currentStep === 0 && (
        <Card 
          title={
            <Space>
              <FileAddOutlined style={{ color: '#ff7a45' }} />
              <Title level={4} style={{ margin: 0 }}>Generate Executive Document</Title>
            </Space>
          }
          extra={
            selectedTemplate && (
              <Tag color="blue" icon={<FileOutlined />}>
                {selectedTemplate.title}
              </Tag>
            )
          }
        >
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item 
                  name="template_id" 
                  label={<Text strong>Document Template</Text>}
                  rules={[{ required: true, message: 'Please select a template' }]}
                >
                  <Select
                    size="large"
                    placeholder="Select a document template"
                    onChange={(value) => {
                      setSelectedTemplateId(value);
                      form.setFieldsValue({
                        officer_name: "",
                        role: "",
                        equity_percentage: undefined,
                      });
                    }}
                    options={templates.map((t) => ({ 
                      label: (
                        <Space>
                          <FileTextOutlined />
                          {t.title}
                        </Space>
                      ), 
                      value: t.id 
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item 
                  name="officer_name" 
                  label={<Text strong>Officer Full Name</Text>}
                  rules={[{ required: true, message: 'Please enter officer name' }]}
                >
                  <Input 
                    size="large"
                    placeholder="e.g., Torrance A. Stroman" 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Executive Details</Divider>

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="role" label={<Text strong>Role</Text>}>
                  <Select
                    size="large"
                    placeholder="Select role"
                    options={[
                      { value: "CEO", label: "Chief Executive Officer (CEO)" },
                      { value: "CFO", label: "Chief Financial Officer (CFO)" },
                      { value: "COO", label: "Chief Operating Officer (COO)" },
                      { value: "CTO", label: "Chief Technology Officer (CTO)" },
                      { value: "CXO", label: "Chief Executive (CXO)" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="equity_percentage" label={<Text strong>Equity %</Text>}>
                  <InputNumber 
                    size="large"
                    min={0} 
                    max={100} 
                    style={{ width: "100%" }} 
                    placeholder="e.g., 25"
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="effective_date" label={<Text strong>Effective Date</Text>}>
                  <Input 
                    size="large"
                    placeholder="November 2, 2025" 
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Dynamic placeholder fields */}
            {placeholders.length > 0 && (
              <>
                <Divider orientation="left">Additional Information</Divider>
                <Row gutter={16}>
                  {placeholders
                    .filter(
                      (p) =>
                        !["role", "equity_percentage", "effective_date", "company_name", "full_name"].includes(p)
                    )
                    .map((p) => (
                      <Col key={p} xs={24} md={12}>
                        <Form.Item name={p} label={<Text>{formatLabel(p)}</Text>}>
                          {p.includes("_html") || p.includes("table") ? (
                            <TextArea 
                              rows={4} 
                              placeholder={`Enter ${formatLabel(p).toLowerCase()}`}
                              showCount
                            />
                          ) : (
                            <Input 
                              size="large"
                              placeholder={`Enter ${formatLabel(p).toLowerCase()}`} 
                            />
                          )}
                        </Form.Item>
                      </Col>
                    ))}
                </Row>
              </>
            )}

            {/* Hidden common fields */}
            <Form.Item name="company_name" initialValue="Crave'n, Inc." hidden>
              <Input />
            </Form.Item>

            <Form.Item
              name="full_name"
              dependencies={["officer_name"]}
              initialValue=""
              hidden
            >
              <Input />
            </Form.Item>

            <Divider />

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  size="large"
                  htmlType="submit" 
                  loading={loading}
                  icon={<ThunderboltOutlined />}
                  style={{ backgroundColor: '#ff7a45', borderColor: '#ff7a45' }}
                >
                  Generate Document
                </Button>
                <Button size="large" onClick={() => form.resetFields()}>
                  Clear Form
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Preview and Signature Section */}
      {currentStep >= 1 && generated && (
        <>
          <Card
            title={
              <Space>
                <EyeOutlined style={{ color: '#ff7a45' }} />
                <Title level={4} style={{ margin: 0 }}>Document Preview & Actions</Title>
              </Space>
            }
            extra={
              <Badge status="success" text="Generated" />
            }
          >
            <DocumentPreview html={generated.htmlPreview} fileUrl={generated.file_url} />
          </Card>

          {generated?.document?.id && (
            <Card
              title={
                <Space>
                  <SignatureOutlined style={{ color: '#ff7a45' }} />
                  <Title level={4} style={{ margin: 0 }}>E-Signature</Title>
                </Space>
              }
            >
              <SignaturePad
                documentId={generated.document.id}
                originalData={generated.data || generated.document}
                onSigned={(url) => {
                  message.success(`Signed PDF saved: ${url}`);
                  setGenerated((prev: any) => ({ ...prev, signed_file_url: url }));
                  setCurrentStep(2);
                }}
              />
            </Card>
          )}

          {currentStep === 2 && (
            <Alert
              message="Document Complete"
              description="Your document has been generated and signed successfully. You can download it from the preview section above."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          )}

          <Card>
            <Space>
              <Button 
                onClick={() => {
                  setCurrentStep(0);
                  setGenerated(null);
                  form.resetFields();
                }}
              >
                Generate New Document
              </Button>
            </Space>
          </Card>
        </>
      )}
    </div>
  );
}

