// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Select, Button, Card, Row, Col, message } from "antd";
import { docsAPI } from "./api";
import { renderHtml } from "@/lib/templates";

type Template = { id: string; title: string; placeholders: string[] };

interface DocumentGeneratorProps {
  onGenerated: (payload: any) => void;
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

export default function DocumentGenerator({ onGenerated }: DocumentGeneratorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // Fetch templates from edge function
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
        console.error("Error fetching templates, using fallback:", err);
        setTemplates(FALLBACK_TEMPLATES);
        message.error("Failed to load templates. Please try again.");
      });
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  const placeholders = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId)?.placeholders ?? [];
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

      // Generate HTML on the client side
      const html_content = renderHtml(values.template_id, data);

      const resp = await docsAPI.post("/documents/generate", {
        template_id: values.template_id,
        officer_name: values.officer_name || data.full_name || "",
        role: values.role || data.role || "",
        equity: values.equity_percentage ? Number(values.equity_percentage) : undefined,
        data,
        html_content,
      });

      onGenerated(resp);
      message.success("Document generated");
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

  return (
    <Card title="Generate Executive Document">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="template_id" label="Template" rules={[{ required: true }]}>
              <Select
                options={templates.map((t) => ({ label: t.title, value: t.id }))}
                placeholder="Select a template"
                onChange={(value) => {
                  setSelectedTemplateId(value);
                  // Reset form fields when template changes
                  form.setFieldsValue({
                    officer_name: "",
                    role: "",
                    equity_percentage: undefined,
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="officer_name" label="Officer Full Name" rules={[{ required: true }]}>
              <Input placeholder="e.g., Torrance A. Stroman" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="role" label="Role">
              <Select
                options={[
                  { value: "CEO", label: "CEO" },
                  { value: "CFO", label: "CFO" },
                  { value: "COO", label: "COO" },
                  { value: "CTO", label: "CTO" },
                  { value: "CXO", label: "CXO" },
                ]}
                placeholder="Select role"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="equity_percentage" label="Equity %">
              <InputNumber min={0} max={100} style={{ width: "100%" }} placeholder="e.g., 25" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="effective_date" label="Effective Date">
              <Input placeholder="November 2, 2025" />
            </Form.Item>
          </Col>
        </Row>

        {/* Dynamic placeholder fields */}
        <Row gutter={16}>
          {placeholders
            .filter(
              (p) =>
                !["role", "equity_percentage", "effective_date", "company_name", "full_name"].includes(p)
            )
            .map((p) => (
              <Col key={p} span={12}>
                <Form.Item name={p} label={formatLabel(p)}>
                  {p.includes("_html") || p.includes("table") ? (
                    <Input.TextArea rows={4} placeholder={`Enter ${formatLabel(p).toLowerCase()}`} />
                  ) : (
                    <Input placeholder={`Enter ${formatLabel(p).toLowerCase()}`} />
                  )}
                </Form.Item>
              </Col>
            ))}
        </Row>

        {/* Ensure required common fields exist */}
        <Form.Item name="company_name" label="Company Name" initialValue="Crave'n, Inc.">
          <Input />
        </Form.Item>

        <Form.Item
          name="full_name"
          label="(Auto) Full Name for Template"
          dependencies={["officer_name"]}
          initialValue=""
        >
          <Input placeholder="Auto-filled from Officer Name" disabled />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Generate PDF
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

