import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import {
  CopyOutlined,
  PrinterOutlined,
  SendOutlined,
  FilePdfOutlined,
  CodeOutlined,
  EyeOutlined,
  EditOutlined,
  SyncOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

type EditorMode = 'html' | 'preview' | 'live';

interface IboeTemplate {
  id: string;
  name: string;
  template_key: string;
  html_content: string;
  is_default: boolean;
}

type IboeFormValues = {
  payeeName: string;
  payeeEmail: string;
  draweeName: string;
  drawerName: string;
  drawerEmail: string;
  drawerTitle: string;
  amount: number;
  currency: string;
  issueDate?: Dayjs;
  effectiveDate?: Dayjs;
  maturityDate?: Dayjs;
  reference: string;
  governingLaw: string;
  issuerCity: string;
  issuerSignatureName: string;
  issuerSignatureTitle: string;
  additionalTerms?: string;
  notes?: string;
};

const defaultValues: IboeFormValues = {
  payeeName: '',
  payeeEmail: '',
  draweeName: 'Chase Bank, N.A.',
  drawerName: "Crave'n Corporate Treasury",
  drawerEmail: 'corporate.treasury@cravenusa.com',
  drawerTitle: 'Authorized Signatory',
  amount: 100000000,
  currency: 'USD',
  issueDate: dayjs(),
  effectiveDate: dayjs(),
  maturityDate: dayjs().add(90, 'day'),
  reference: `IBOE-${dayjs().format('YYYYMMDD-HHmm')}`,
  governingLaw: 'State of Ohio, United States',
  issuerCity: 'Toledo, Ohio',
  issuerSignatureName: "Crave'n Corporate Treasury",
  issuerSignatureTitle: 'Authorized Governmental Authority',
  additionalTerms:
    'This International Bill of Exchange is payable upon presentation and is subject to the Uniform Commercial Code (UCC) and the Uniform Rules for Collections.',
  notes: "Please contact Crave'n Corporate Treasury for questions or amendments.",
};

const DEFAULT_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>International Bill of Exchange</title>
  <style>
    body { font-family: 'Times New Roman', serif; color: #1f2937; line-height: 1.6; }
    h1, h2 { text-align: center; margin-bottom: 0; }
    .section { margin: 24px 0; }
    .meta { display: flex; justify-content: space-between; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 10px; border: 1px solid #d1d5db; }
    th { background: #f3f4f6; text-align: left; text-transform: uppercase; letter-spacing: 1px; font-size: 13px; }
    .signature { margin-top: 48px; text-align: center; }
    .signature-line { border-bottom: 1px solid #111827; padding-bottom: 4px; display: inline-block; min-width: 260px; }
    .footer { margin-top: 32px; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div style="border: 4px double #4b5563; padding: 32px; max-width: 820px; margin: auto; background: #fdfbf5;">
    <h1>International Bill of Exchange</h1>
    <h2>Amount: {{amount_numeric}}</h2>

    <div class="section meta">
      <div>
        <strong>Reference:</strong> {{drawer_reference}}<br/>
        <strong>Issue Date:</strong> {{issue_date}}<br/>
        <strong>Effective Date:</strong> {{effective_date}}<br/>
        <strong>Maturity Date:</strong> {{maturity_date}}
      </div>
      <div>
        <strong>Governing Law:</strong><br/>{{governing_law}}
      </div>
    </div>

    <table>
      <tr>
        <th>Drawer</th>
        <td>{{drawer_name}} &lt;{{drawer_email}}&gt;</td>
      </tr>
      <tr>
        <th>Drawer Title</th>
        <td>{{drawer_title}}</td>
      </tr>
      <tr>
        <th>Drawee</th>
        <td>{{drawee_name}}</td>
      </tr>
      <tr>
        <th>Payee</th>
        <td>{{payee_name}} &lt;{{payee_email}}&gt;</td>
      </tr>
      <tr>
        <th>Amount (Words)</th>
        <td>{{amount_words}}</td>
      </tr>
    </table>

    <div class="section">
      <p>This International Bill of Exchange (IBOE) is issued as an unconditional promise to pay the above amount to the payee listed herein, subject to the terms and conditions defined in the governing law and accompanying instructions.</p>
      <p>Additional Terms:</p>
      <p>{{additional_terms}}</p>
    </div>

    <div class="section">
      <p><strong>Notes:</strong> {{notes}}</p>
    </div>

    <div class="signature">
      <div class="signature-line">{{issuer_signature_name}}</div>
      <div>{{issuer_signature_title}}</div>
      <div style="margin-top: 4px;">{{issuer_city}}</div>
    </div>

    <div class="footer">
      Generated on {{generated_date}} • Crave'n Corporate Treasury
    </div>
  </div>
</body>
</html>`;

const BELOW_TWENTY = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const THOUSANDS = ['', ' thousand', ' million', ' billion', ' trillion'];

const sanitize = (value?: string | null): string => (value ?? '').toString();

const formatMultiline = (value?: string) => sanitize(value).replace(/\r?\n/g, '<br/>');

const formatDate = (value?: Dayjs) => (value ? value.format('MMMM D, YYYY') : '');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const convertHundreds = (num: number): string => {
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  const parts: string[] = [];

  if (hundred > 0) {
    parts.push(`${BELOW_TWENTY[hundred]} hundred`);
  }

  if (rest > 0) {
    if (rest < 20) {
      parts.push(BELOW_TWENTY[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const unit = rest % 10;
      parts.push(unit ? `${TENS[ten]}-${BELOW_TWENTY[unit]}` : TENS[ten]);
    }
  }

  return parts.join(' ');
};

const numberToWords = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  const absolute = Math.floor(Math.abs(value));
  if (absolute === 0) return BELOW_TWENTY[0];

  let remaining = absolute;
  let chunkIndex = 0;
  const chunks: string[] = [];

  while (remaining > 0 && chunkIndex < THOUSANDS.length) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = convertHundreds(chunk);
      chunks.unshift(`${chunkWords}${THOUSANDS[chunkIndex]}`.trim());
    }
    remaining = Math.floor(remaining / 1000);
    chunkIndex += 1;
  }

  return chunks.join(' ').trim();
};

const formatAmountNumeric = (amount: number, currency: string): string => {
  const normalizedCurrency = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${normalizedCurrency.toUpperCase()} ${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

const formatAmountWords = (amount: number, currency: string): string => {
  if (!Number.isFinite(amount)) return '';
  const major = Math.floor(amount);
  const minor = Math.round((amount - major) * 100);
  const majorWords = numberToWords(Math.max(0, major)).toUpperCase();
  const currencyWord = currency ? currency.toUpperCase() : 'USD';
  let response = `${majorWords} ${currencyWord} DOLLARS`;
  if (minor > 0) {
    response += ` AND ${minor.toString().padStart(2, '0')}/100`;
  }
  return response;
};

const applyPlaceholders = (template: string, values: IboeFormValues): string => {
  const amount = Number(values.amount ?? 0);
  const currency = sanitize(values.currency) || 'USD';
  const replacements: Record<string, string> = {
    '{{payee_name}}': sanitize(values.payeeName),
    '{{payee_email}}': sanitize(values.payeeEmail),
    '{{drawee_name}}': sanitize(values.draweeName),
    '{{drawer_name}}': sanitize(values.drawerName),
    '{{drawer_email}}': sanitize(values.drawerEmail),
    '{{drawer_title}}': sanitize(values.drawerTitle),
    '{{drawer_reference}}': sanitize(values.reference),
    '{{amount_numeric}}': formatAmountNumeric(amount, currency),
    '{{amount_words}}': formatAmountWords(amount, currency),
    '{{issue_date}}': formatDate(values.issueDate),
    '{{effective_date}}': formatDate(values.effectiveDate ?? values.issueDate),
    '{{maturity_date}}': formatDate(values.maturityDate),
    '{{governing_law}}': sanitize(values.governingLaw),
    '{{additional_terms}}': formatMultiline(values.additionalTerms),
    '{{notes}}': formatMultiline(values.notes),
    '{{issuer_signature_name}}': sanitize(values.issuerSignatureName),
    '{{issuer_signature_title}}': sanitize(values.issuerSignatureTitle),
    '{{issuer_city}}': sanitize(values.issuerCity),
    '{{generated_date}}': dayjs().format('MMMM D, YYYY'),
  };

  let output = template;
  Object.entries(replacements).forEach(([token, replacement]) => {
    output = output.replace(new RegExp(escapeRegExp(token), 'g'), replacement ?? '');
  });

  return output.replace(/{{\s*[\w]+\s*}}/g, '');
};

const IBOESender: React.FC = () => {
  const [form] = Form.useForm<IboeFormValues>();
  const [mode, setMode] = useState<EditorMode>('html');
  const [templateHtml, setTemplateHtml] = useState<string>(DEFAULT_TEMPLATE_HTML);
  const [htmlContent, setHtmlContent] = useState<string>(() => applyPlaceholders(DEFAULT_TEMPLATE_HTML, defaultValues));
  const [liveHtml, setLiveHtml] = useState<string>(() => applyPlaceholders(DEFAULT_TEMPLATE_HTML, defaultValues));
  const [sending, setSending] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const liveEditRef = useRef<HTMLDivElement | null>(null);
  const [templates, setTemplates] = useState<IboeTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const syncHtmlWithForm = useCallback(
    (overrides?: Partial<IboeFormValues>, options?: { force?: boolean; template?: string }) => {
      const { force = false, template } = options ?? {};
      if (!force && mode === 'live') {
        return htmlContent;
      }

      const currentValues = form.getFieldsValue() as Partial<IboeFormValues>;
      const mergedValues: IboeFormValues = {
        ...defaultValues,
        ...currentValues,
        ...overrides,
      };

      const sourceTemplate = template ?? templateHtml;
      const nextHtml = applyPlaceholders(sourceTemplate, mergedValues);
      setHtmlContent(nextHtml);
      if (force || mode !== 'live') {
        setLiveHtml(nextHtml);
      }
      setPreviewKey(Date.now());
      return nextHtml;
    },
    [form, mode, templateHtml, htmlContent],
  );

  const loadTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const supabaseClient = supabase as any;
      const { data, error } = await supabaseClient
        .from('iboe_templates')
        .select('id, name, template_key, html_content, is_default, is_active, created_at')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = ((data as Array<{
        id: string;
        name: string;
        template_key: string;
        html_content: string;
        is_default: boolean;
        is_active: boolean | null;
      }>) ?? []);

      if (!rows.length) {
        setTemplates([]);
        setSelectedTemplateId(null);
        setTemplateHtml(DEFAULT_TEMPLATE_HTML);
        syncHtmlWithForm(undefined, { force: true, template: DEFAULT_TEMPLATE_HTML });
        message.warning('No IBOE templates found. Using built-in default.');
        return;
      }

      const availableRows = rows.filter((tpl) => tpl.is_active !== false);

      const sourceRows = availableRows.length > 0 ? availableRows : rows;

      if (availableRows.length === 0) {
        message.warning('All saved IBOE templates are inactive. Showing archived templates instead.');
      }

      const available: IboeTemplate[] = sourceRows.map((tpl) => ({
        id: tpl.id,
        name: tpl.name,
        template_key: tpl.template_key,
        html_content: tpl.html_content,
        is_default: tpl.is_default,
      }));

      setTemplates(available);

      if (available.length > 0) {
        const preferred = available.find((tpl) => tpl.is_default) ?? available[0];
        setSelectedTemplateId(preferred.id);
        setTemplateHtml(preferred.html_content);
        syncHtmlWithForm(undefined, { force: true, template: preferred.html_content });
      } else {
        setSelectedTemplateId(null);
        setTemplateHtml(DEFAULT_TEMPLATE_HTML);
        syncHtmlWithForm(undefined, { force: true, template: DEFAULT_TEMPLATE_HTML });
      }
    } catch (error: any) {
      console.error('Failed to load IBOE templates:', error);
      message.error('Unable to load IBOE templates.');
    } finally {
      setTemplateLoading(false);
    }
  }, [syncHtmlWithForm]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    form.setFieldsValue(defaultValues);
    syncHtmlWithForm(defaultValues, { force: true, template: DEFAULT_TEMPLATE_HTML });
    loadTemplates();
  }, [form, loadTemplates, syncHtmlWithForm]);

  const activeHtml = useMemo(() => {
    if (mode === 'live') return liveHtml;
    return htmlContent;
  }, [mode, liveHtml, htmlContent]);

  const handleGenerateHtml = () => {
    syncHtmlWithForm(undefined, { force: true });
    message.success('HTML regenerated from form values using template placeholders.');
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      message.success('HTML copied to clipboard');
    } catch (error) {
      message.error('Unable to copy HTML');
    }
  };

  const handleApplyLiveEdits = () => {
    if (!liveEditRef.current) return;
    const updated = liveEditRef.current.innerHTML;
    setLiveHtml(updated);
    setHtmlContent(updated);
    setPreviewKey(Date.now());
    message.success('Live edits applied to HTML source');
  };

  const handleResetHtml = () => {
    Modal.confirm({
      title: 'Reset HTML to Current Template? ',
      content: 'This will overwrite any manual edits with the template populated from form values.',
      onOk: () => {
        syncHtmlWithForm(undefined, { force: true });
      },
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      message.error('Unable to open print window. Please allow pop-ups for this site.');
      return;
    }
    printWindow.document.write(activeHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-10000px';
      container.style.left = '-10000px';
      container.style.width = '612px';
      container.style.padding = '24px';
      container.innerHTML = activeHtml;
      document.body.appendChild(container);

      await doc.html(container, {
        callback: (docInstance) => {
          docInstance.save(`${form.getFieldValue('reference') || 'IBOE'}.pdf`);
          document.body.removeChild(container);
        },
        margin: [24, 24, 24, 24],
        html2canvas: { scale: 0.6 },
      });
    } catch (error) {
      console.error('PDF export failed', error);
      message.error('Unable to export to PDF.');
    }
  };

  const handleSend = async () => {
    const { payeeEmail, payeeName } = form.getFieldsValue();
    if (!payeeEmail || !payeeName) {
      message.warning('Payee name and email are required to send the IBOE.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-iboe', {
        body: {
          to: payeeEmail,
          subject: `${form.getFieldValue('reference') || 'International Bill of Exchange'}`,
          html: htmlContent,
          metadata: {
            payeeName,
            reference: form.getFieldValue('reference'),
            amount: form.getFieldValue('amount'),
            currency: form.getFieldValue('currency'),
          },
        },
      });

      if (error) throw error;
      message.success('International Bill of Exchange sent successfully.');
    } catch (error: any) {
      console.error('Failed to send IBOE:', error);
      message.error(error?.message || 'Failed to send IBOE email');
    } finally {
      setSending(false);
    }
  };

  const handleTemplateChange = (templateId?: string) => {
    if (!templateId) {
      setSelectedTemplateId(null);
      setTemplateHtml(DEFAULT_TEMPLATE_HTML);
      syncHtmlWithForm(undefined, { force: true, template: DEFAULT_TEMPLATE_HTML });
      message.info('Reverted to default IBOE template.');
      return;
    }

    const tpl = templates.find((item) => item.id === templateId);
    if (tpl) {
      setSelectedTemplateId(templateId);
      setTemplateHtml(tpl.html_content);
      syncHtmlWithForm(undefined, { force: true, template: tpl.html_content });
      message.success(`Loaded template "${tpl.name}".`);
    }
  };

  return (
    <Card title="International Bill of Exchange (IBOE)" bordered={false} className="shadow-lg">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          type="info"
          message="Prepare, review, and send international bills of exchange."
          description="Use the form to populate placeholders, fine-tune the HTML, preview the document, and optionally download or print a PDF copy before sending to the payee."
          showIcon
        />

        <Space wrap align="center">
          <Text strong>Select Template:</Text>
          <Select
            style={{ minWidth: 240 }}
            placeholder="Select IBOE template"
            loading={templateLoading}
            value={selectedTemplateId ?? undefined}
            onChange={handleTemplateChange}
            allowClear
            options={templates.map((tpl) => ({
              value: tpl.id,
              label: tpl.is_default ? `${tpl.name} (Default)` : tpl.name,
            }))}
          />
          <Button icon={<SyncOutlined spin={templateLoading} />} onClick={loadTemplates}>
            Refresh Templates
          </Button>
          {templateLoading && <Spin size="small" />}
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={defaultValues}
          onValuesChange={(_, allValues) => syncHtmlWithForm(allValues)}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="payeeName"
                label="Payee Name"
                rules={[{ required: true, message: 'Payee name is required' }]}
              >
                <Input placeholder="Enter payee name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="payeeEmail"
                label="Payee Email"
                rules={[{ type: 'email', message: 'Enter a valid email address' }]}
              >
                <Input placeholder="payee@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="draweeName"
                label="Drawee"
                rules={[{ required: true, message: 'Drawee is required' }]}
              >
                <Input placeholder="Chase Bank, N.A." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="drawerName"
                label="Drawer Name"
                rules={[{ required: true, message: 'Drawer name is required' }]}
              >
                <Input placeholder="Crave'n Authorized Signatory" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="drawerEmail"
                label="Drawer Email"
                rules={[{ type: 'email', message: 'Enter a valid email address' }]}
              >
                <Input placeholder="corporate.treasury@cravenusa.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="drawerTitle" label="Drawer Title">
                <Input placeholder="Authorized Signatory" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Amount is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0 as number}
                  step={100 as number}
                  placeholder="100000000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="currency" label="Currency" rules={[{ required: true }]}> <Input placeholder="USD" /> </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="reference" label="Reference" rules={[{ required: true }]}> <Input placeholder="IBOE-2025-001" /> </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item name="issueDate" label="Issue Date"> <DatePicker style={{ width: '100%' }} /> </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="effectiveDate" label="Effective Date"> <DatePicker style={{ width: '100%' }} /> </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="maturityDate" label="Maturity Date"> <DatePicker style={{ width: '100%' }} /> </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="issuerSignatureName" label="Signer Name">
                <Input placeholder="Crave'n Corporate Treasury" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="issuerSignatureTitle" label="Signer Title">
                <Input placeholder="Authorized Governmental Authority" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="issuerCity" label="Signer City">
                <Input placeholder="Toledo, Ohio" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="governingLaw" label="Governing Law">
                <Input placeholder="State of Ohio, United States" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item name="additionalTerms" label="Additional Terms">
                <TextArea rows={3} placeholder="Custom obligations, banking instructions, or regulatory notes." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={2} placeholder="Internal notes for the payee." />
              </Form.Item>
            </Col>
          </Row>

          <Space wrap>
            <Button icon={<CodeOutlined />} onClick={handleGenerateHtml}>Regenerate HTML from Form</Button>
            <Button icon={<CopyOutlined />} onClick={handleCopyHtml}>Copy HTML</Button>
            <Button icon={<EyeOutlined />} onClick={() => setMode('preview')}>Preview</Button>
            <Tooltip title="Restore the template populated from the current form values">
              <Button onClick={handleResetHtml}>Reset HTML</Button>
            </Tooltip>
          </Space>
        </Form>

        <Divider />

        <div>
          <Space align="baseline" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>HTML Editor</Title>
            <Segmented
              options={[
                { label: 'HTML', value: 'html', icon: <CodeOutlined /> },
                { label: 'Preview', value: 'preview', icon: <EyeOutlined /> },
                { label: 'Live Edit', value: 'live', icon: <EditOutlined /> },
              ]}
              value={mode}
              onChange={(value) => {
                const nextMode = value as EditorMode;
                setMode(nextMode);
                if (nextMode === 'live') {
                  setLiveHtml(htmlContent);
                }
              }}
            />
          </Space>

          {mode === 'html' && (
            <TextArea
              value={htmlContent}
              autoSize={{ minRows: 16 }}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                setPreviewKey(Date.now());
              }}
              spellCheck={false}
            />
          )}

          {mode === 'preview' && (
            <Card key={previewKey} bordered className="shadow-inner" style={{ minHeight: 300 }}>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
            </Card>
          )}

          {mode === 'live' && (
            <div>
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="Live edits are not applied automatically"
                description="Use the 'Apply Live Edits' button to sync changes back to the HTML source."
              />
              <div
                ref={liveEditRef}
                key={previewKey + 1}
                contentEditable
                suppressContentEditableWarning
                className="border border-dashed border-slate-300 rounded-md p-4 min-h-[300px]"
                style={{ outline: 'none' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(liveHtml) }}
                onInput={(event) => {
                  const target = event.currentTarget as HTMLDivElement;
                  setLiveHtml(target.innerHTML);
                }}
              />
              <Space style={{ marginTop: 12 }}>
                <Button type="primary" onClick={handleApplyLiveEdits}>Apply Live Edits</Button>
                <Button onClick={() => {
                  setLiveHtml(htmlContent);
                  setPreviewKey(Date.now());
                }}>Discard Changes</Button>
              </Space>
            </div>
          )}
        </div>

        <Divider />

        <Space wrap>
          <Button icon={<SendOutlined />} type="primary" loading={sending} onClick={handleSend}>
            Send IBOE to Payee
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handleDownloadPdf}>Download PDF</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
        </Space>

        <Card bordered className="bg-slate-50">
          <Title level={5}>Tips</Title>
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li>Templates now keep their design untouched; placeholders are filled from the form.</li>
            <li>Use the form for fast population, then make final tweaks in HTML or Live Edit mode.</li>
            <li>Preview mode renders the exact email recipients will see.</li>
            <li>The Send button delivers the IBOE via the secure Google Workspace integration configured in Supabase Functions.</li>
          </ul>
        </Card>
      </Space>
    </Card>
  );
};

export default IBOESender;
