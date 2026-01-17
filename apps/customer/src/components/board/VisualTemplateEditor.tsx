import React, { useRef, useState, useMemo } from 'react';
import { Row, Col, Button, Dropdown, Space, Typography, Divider, Tabs, Card, Alert, Input } from 'antd';
import {
  CodeOutlined,
  EyeOutlined,
  PlusOutlined,
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  BankOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './VisualTemplateEditor.css';

const { Text } = Typography;

// Categorized placeholder definitions
export const PLACEHOLDER_CATEGORIES = {
  executive: {
    label: 'Executive Information',
    icon: <UserOutlined />,
    placeholders: [
      { key: 'full_name', label: 'Full Name', description: 'Executive full name' },
      { key: 'executive_name', label: 'Executive Name', description: 'Alternative name field' },
      { key: 'name', label: 'Name', description: 'Simple name field' },
      { key: 'officer_name', label: 'Officer Name', description: 'Officer name' },
      { key: 'executive_email', label: 'Email', description: 'Executive email address' },
      { key: 'executive_first_name', label: 'First Name', description: 'First name only' },
      { key: 'executive_address', label: 'Address', description: 'Executive address' },
    ],
  },
  role: {
    label: 'Role & Position',
    icon: <FileTextOutlined />,
    placeholders: [
      { key: 'role', label: 'Role', description: 'Executive role (e.g., CEO)' },
      { key: 'position', label: 'Position', description: 'Position title' },
      { key: 'title', label: 'Title', description: 'Job title' },
      { key: 'position_title', label: 'Position Title', description: 'Full position title' },
      { key: 'executive_title', label: 'Executive Title', description: 'Executive title' },
      { key: 'officer_title', label: 'Officer Title', description: 'Officer title' },
      // Executive Role Codes
      { key: 'ceo_name', label: 'CEO Name', description: 'Chief Executive Officer name' },
      { key: 'cfo_name', label: 'CFO Name', description: 'Chief Financial Officer name' },
      { key: 'coo_name', label: 'COO Name', description: 'Chief Operating Officer name' },
      { key: 'cto_name', label: 'CTO Name', description: 'Chief Technology Officer name' },
      { key: 'cxo_name', label: 'CXO Name', description: 'Chief Experience Officer name' },
      // Executive Equity by Role
      { key: 'equity_ceo', label: 'CEO Equity %', description: 'CEO equity percentage' },
      { key: 'equity_cfo', label: 'CFO Equity %', description: 'CFO equity percentage' },
      { key: 'equity_coo', label: 'COO Equity %', description: 'COO equity percentage' },
      { key: 'equity_cto', label: 'CTO Equity %', description: 'CTO equity percentage' },
      { key: 'equity_cxo', label: 'CXO Equity %', description: 'CXO equity percentage' },
      // Full Role Names
      { key: 'chief_executive_officer', label: 'Chief Executive Officer', description: 'Full CEO title' },
      { key: 'chief_financial_officer', label: 'Chief Financial Officer', description: 'Full CFO title' },
      { key: 'chief_operating_officer', label: 'Chief Operating Officer', description: 'Full COO title' },
      { key: 'chief_technology_officer', label: 'Chief Technology Officer', description: 'Full CTO title' },
      { key: 'chief_experience_officer', label: 'Chief Experience Officer', description: 'Full CXO title' },
      // Other Roles
      { key: 'board_member', label: 'Board Member', description: 'Board member role' },
      { key: 'advisor', label: 'Advisor', description: 'Advisor role' },
      { key: 'department', label: 'Department', description: 'Executive department' },
      { key: 'reporting_to_title', label: 'Reporting To Title', description: 'Who they report to' },
      { key: 'work_location', label: 'Work Location', description: 'Work location' },
      { key: 'ceo_email', label: 'CEO Email', description: 'Chief Executive Officer email' },
      { key: 'cfo_email', label: 'CFO Email', description: 'Chief Financial Officer email' },
      { key: 'cxo_email', label: 'CXO Email', description: 'Chief Experience Officer email' },
      { key: 'founders_cfo_name', label: 'Founders: CFO Name', description: 'Founders table CFO name' },
      { key: 'founders_cfo_role', label: 'Founders: CFO Role', description: 'Founders CFO role title' },
      { key: 'founders_cfo_equity', label: 'Founders: CFO Equity', description: 'Founders CFO equity percentage' },
      { key: 'founders_cfo_shares', label: 'Founders: CFO Shares', description: 'Founders CFO shares issued' },
      { key: 'founders_cfo_vesting', label: 'Founders: CFO Vesting', description: 'Founders CFO vesting schedule' },
      { key: 'founders_ceo_name', label: 'Founders: CEO Name', description: 'Founders table CEO name' },
      { key: 'founders_ceo_role', label: 'Founders: CEO Role', description: 'Founders CEO role title' },
      { key: 'founders_ceo_equity', label: 'Founders: CEO Equity', description: 'Founders CEO equity percentage' },
      { key: 'founders_ceo_shares', label: 'Founders: CEO Shares', description: 'Founders CEO shares issued' },
      { key: 'founders_ceo_vesting', label: 'Founders: CEO Vesting', description: 'Founders CEO vesting schedule' },
      { key: 'founders_cxo_name', label: 'Founders: CXO Name', description: 'Founders table CXO name' },
      { key: 'founders_cxo_role', label: 'Founders: CXO Role', description: 'Founders CXO role title' },
      { key: 'founders_cxo_equity', label: 'Founders: CXO Equity', description: 'Founders CXO equity percentage' },
      { key: 'founders_cxo_shares', label: 'Founders: CXO Shares', description: 'Founders CXO shares issued' },
      { key: 'founders_cxo_vesting', label: 'Founders: CXO Vesting', description: 'Founders CXO vesting schedule' },
    ],
  },
  equity: {
    label: 'Equity & Shares',
    icon: <DollarOutlined />,
    placeholders: [
      { key: 'equity_percentage', label: 'Equity Percentage', description: 'Equity % (e.g., 15%)' },
      { key: 'equity_percent', label: 'Equity %', description: 'Alternative equity %' },
      { key: 'ownership_percent', label: 'Ownership %', description: 'Ownership percentage' },
      { key: 'share_count', label: 'Share Count', description: 'Number of shares (formatted)' },
      { key: 'shares_issued', label: 'Shares Issued', description: 'Shares issued' },
      { key: 'shares_total', label: 'Total Shares', description: 'Total shares' },
      { key: 'price_per_share', label: 'Price per Share', description: 'Price per share ($0.0001)' },
      { key: 'strike_price', label: 'Strike Price', description: 'Strike price' },
      { key: 'total_purchase_price', label: 'Total Purchase Price', description: 'Total purchase price' },
      { key: 'share_class', label: 'Share Class', description: 'Share class (e.g., Common Stock)' },
    ],
  },
  dates: {
    label: 'Dates',
    icon: <CalendarOutlined />,
    placeholders: [
      { key: 'effective_date', label: 'Effective Date', description: 'Effective date of agreement' },
      { key: 'appointment_date', label: 'Appointment Date', description: 'Date of appointment' },
      { key: 'grant_date', label: 'Grant Date', description: 'Equity grant date' },
      { key: 'offer_date', label: 'Offer Date', description: 'Offer letter date' },
      { key: 'start_date', label: 'Start Date', description: 'Start date' },
      { key: 'date', label: 'Date', description: 'Generic date field' },
      { key: 'execution_date', label: 'Execution Date', description: 'Execution date' },
    ],
  },
  compensation: {
    label: 'Compensation',
    icon: <DollarOutlined />,
    placeholders: [
      { key: 'annual_salary', label: 'Annual Salary', description: 'Annual base salary (formatted)' },
      { key: 'annual_base_salary', label: 'Annual Base Salary', description: 'Base salary' },
      { key: 'base_salary', label: 'Base Salary', description: 'Base salary amount' },
      { key: 'salary', label: 'Salary', description: 'Salary amount' },
      { key: 'funding_trigger', label: 'Funding Trigger', description: 'Salary activation trigger' },
      { key: 'funding_trigger_amount', label: 'Funding Trigger Amount', description: 'Funding amount' },
      { key: 'deferral_trigger', label: 'Deferral Trigger', description: 'Deferral trigger text' },
    ],
  },
  vesting: {
    label: 'Vesting',
    icon: <CalendarOutlined />,
    placeholders: [
      { key: 'vesting_schedule', label: 'Vesting Schedule', description: 'Full vesting schedule' },
      { key: 'vesting_terms', label: 'Vesting Terms', description: 'Vesting terms' },
      { key: 'vesting_period', label: 'Vesting Period', description: 'Vesting period (years)' },
      { key: 'vesting_cliff', label: 'Vesting Cliff', description: 'Cliff period' },
      { key: 'vesting', label: 'Vesting', description: 'Generic vesting field' },
    ],
  },
  company: {
    label: 'Company Information',
    icon: <BankOutlined />,
    placeholders: [
      { key: 'company_name', label: 'Company Name', description: 'Company name' },
      { key: 'company', label: 'Company', description: 'Alternative company name' },
      { key: 'company_address', label: 'Company Address', description: 'Company address' },
      { key: 'state_of_incorporation', label: 'State of Incorporation', description: 'State of incorporation' },
      { key: 'governing_law', label: 'Governing Law', description: 'Governing law state' },
      { key: 'governing_law_state', label: 'Governing Law State', description: 'Governing state' },
    ],
  },
  other: {
    label: 'Other',
    icon: <FileTextOutlined />,
    placeholders: [
      { key: 'consideration_type', label: 'Consideration Type', description: 'Type of consideration' },
      { key: 'consideration_value', label: 'Consideration Value', description: 'Consideration value' },
      { key: 'currency', label: 'Currency', description: 'Currency code (USD)' },
      { key: 'salary_status', label: 'Salary Status', description: 'Salary status (deferred/active)' },
    ],
  },
};

const PLACEHOLDER_CATEGORY_KEYS = Object.keys(PLACEHOLDER_CATEGORIES) as Array<
  keyof typeof PLACEHOLDER_CATEGORIES
>;

interface VisualTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export const VisualTemplateEditor: React.FC<VisualTemplateEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter HTML template...',
  height = 500,
}) => {
  const quillRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('code'); // Default to code tab to avoid ReactQuill issues
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [isPlaceholderDropdownOpen, setIsPlaceholderDropdownOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<keyof typeof PLACEHOLDER_CATEGORIES>(
    PLACEHOLDER_CATEGORY_KEYS[0] ?? 'executive'
  );
  const [placeholderSearch, setPlaceholderSearch] = useState('');

  // Generate sample preview data
  useMemo(() => {
    setPreviewData({
      // Executive info
      full_name: 'John Doe',
      executive_name: 'John Doe',
      name: 'John Doe',
      officer_name: 'John Doe',
      employee_name: 'John Doe',
      recipient_name: 'John Doe',
      subscriber_name: 'John Doe',
      counterparty_name: 'John Doe',
      executive_email: 'john.doe@company.com',
      executive_first_name: 'John',
      executive_address: '123 Main St, Cleveland, OH 44101',
      // Role
      role: 'CEO',
      position: 'Chief Executive Officer',
      title: 'CEO',
      position_title: 'Chief Executive Officer',
      executive_title: 'CEO',
      officer_title: 'Chief Executive Officer',
      // Executive Role Names
      ceo_name: 'John Doe',
      cfo_name: '',
      coo_name: '',
      cto_name: '',
      cxo_name: '',
      // Executive Equity by Role
      equity_ceo: '15',
      equity_cfo: '0',
      equity_coo: '0',
      equity_cto: '0',
      equity_cxo: '0',
      ceo_email: 'ceo@cravenusa.com',
      cfo_email: 'finance@cravenusa.com',
      cxo_email: 'experience@cravenusa.com',
      // Full Role Names
      chief_executive_officer: 'Chief Executive Officer',
      chief_financial_officer: 'Chief Financial Officer',
      chief_operating_officer: 'Chief Operating Officer',
      chief_technology_officer: 'Chief Technology Officer',
      chief_experience_officer: 'Chief Experience Officer',
      // Other Roles
      board_member: 'Board Member',
      advisor: 'Advisor',
      department: 'Executive',
      reporting_to_title: 'Board of Directors',
      work_location: 'Cleveland, Ohio',
      // Equity
      equity_percentage: '15',
      equity_percent: '15',
      ownership_percent: '15',
      equity: '15',
      share_count: '1,500,000',
      shares_issued: '1,500,000',
      shares_total: '1,500,000',
      shares: '1,500,000',
      price_per_share: '0.0001',
      strike_price: '0.0001',
      share_price: '0.0001',
      total_purchase_price: '150.00',
      share_class: 'Common Stock',
      // Dates
      effective_date: 'January 1, 2025',
      appointment_date: 'January 1, 2025',
      grant_date: 'January 1, 2025',
      offer_date: 'January 1, 2025',
      start_date: 'January 1, 2025',
      date: 'January 1, 2025',
      execution_date: 'January 1, 2025',
      closing_date: 'January 1, 2025',
      board_resolution_date: 'January 1, 2025',
      adoption_date: 'January 1, 2025',
      // Compensation
      annual_salary: '120,000',
      annual_base_salary: '120,000',
      base_salary: '120,000',
      salary: '120,000',
      funding_trigger: 'Upon Series A funding',
      funding_trigger_amount: '500000',
      deferral_trigger: 'Series A funding',
      // Vesting
      vesting_schedule: '4 years with 1 year cliff',
      vesting_terms: '4 years with 1 year cliff',
      vesting_period: '4',
      vesting_cliff: '1 year',
      vesting: '4 years with 1 year cliff',
      // Company
      company_name: "Crave'n, Inc.",
      company: "Crave'n, Inc.",
      corporation: "Crave'n, Inc.",
      company_address: '123 Main St, Cleveland, OH 44101',
      state_of_incorporation: 'Ohio',
      governing_law: 'State of Ohio',
      governing_law_state: 'Ohio',
      // Other
      consideration_type: 'Services Rendered',
      consideration_value: '0',
      currency: 'USD',
      salary_status: 'deferred',
    });
  }, []);

  // Insert placeholder at cursor position
  const insertPlaceholder = (placeholderKey: string) => {
    if (activeTab === 'code') {
      // For code view, insert into textarea
      const textarea = document.querySelector('textarea[placeholder="Enter HTML template..."], textarea[placeholder="Enter HTML document template..."]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + `{{${placeholderKey}}}` + text.substring(end);
        onChange(newText);
        // Set cursor position after inserted text
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + placeholderKey.length + 4, start + placeholderKey.length + 4);
        }, 0);
      }
    } else {
      // For visual editor (Quill)
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, `{{${placeholderKey}}}`, 'user');
        quill.setSelection(range.index + placeholderKey.length + 4);
      } else {
        // If no selection, append at end
        const length = quill.getLength();
        quill.insertText(length - 1, `{{${placeholderKey}}}`, 'user');
        quill.setSelection(length + placeholderKey.length + 3);
      }
    }
  };

  const selectedCategory = PLACEHOLDER_CATEGORIES[selectedCategoryKey];

  const filteredPlaceholders = useMemo(() => {
    if (!selectedCategory) return [];
    const search = placeholderSearch.trim().toLowerCase();
    if (!search) return selectedCategory.placeholders;
    return selectedCategory.placeholders.filter((ph) => {
      const labelMatch = ph.label.toLowerCase().includes(search);
      const keyMatch = ph.key.toLowerCase().includes(search);
      const descriptionMatch = ph.description?.toLowerCase().includes(search);
      return labelMatch || keyMatch || descriptionMatch;
    });
  }, [selectedCategory, placeholderSearch]);

  const placeholderOverlay = (
    <div
      style={{
        width: 760,
        maxHeight: 440,
        display: 'flex',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e6eb',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
      }}
    >
      <div
        style={{
          width: 220,
          borderRight: '1px solid #f0f0f0',
          padding: '12px 0',
          overflowY: 'auto',
        }}
      >
        {PLACEHOLDER_CATEGORY_KEYS.map((key) => {
          const category = PLACEHOLDER_CATEGORIES[key];
          const isActive = key === selectedCategoryKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedCategoryKey(key);
                setPlaceholderSearch('');
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: isActive ? '#f0f5ff' : 'transparent',
                border: 'none',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#1f3b99' : '#1f2937',
              }}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
        <Input
          placeholder="Search placeholders..."
          prefix={<SearchOutlined />}
          value={placeholderSearch}
          onChange={(e) => setPlaceholderSearch(e.target.value)}
          allowClear
        />
        <div
          style={{
            marginTop: 16,
            overflowY: 'auto',
            paddingRight: 4,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {filteredPlaceholders.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
              No placeholders found.
            </div>
          ) : (
            filteredPlaceholders.map((ph) => (
              <Card
                key={ph.key}
                hoverable
                onClick={() => {
                  insertPlaceholder(ph.key);
                  setIsPlaceholderDropdownOpen(false);
                  setPlaceholderSearch('');
                }}
                style={{ borderRadius: 8 }}
                bodyStyle={{ padding: 12 }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{ph.label}</div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  {ph.description}
                </Text>
                <Text code style={{ fontSize: 11 }}>
                  {`{{${ph.key}}}`}
                </Text>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Replace placeholders in HTML for preview
  const getPreviewHtml = () => {
    let html = value;
    Object.entries(previewData).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, String(val));
    });
    // Replace any remaining placeholders with [PLACEHOLDER]
    html = html.replace(/\{\{[\w_]+\}\}/g, '[PLACEHOLDER]');
    return html;
  };

  // Custom toolbar
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'align',
    'link',
    'image',
  ];

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}>
      <div
        style={{
          borderBottom: '1px solid #d9d9d9',
          padding: '8px 12px',
          background: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Dropdown
            trigger={['click']}
            open={isPlaceholderDropdownOpen}
            onOpenChange={(open) => {
              setIsPlaceholderDropdownOpen(open);
              if (!open) {
                setPlaceholderSearch('');
              }
            }}
            placement="bottomLeft"
            dropdownRender={() => placeholderOverlay}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              Insert Placeholder
            </Button>
          </Dropdown>
          <Divider type="vertical" />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Click where you want to insert a dynamic field, then select from the dropdown
          </Text>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'visual' | 'code' | 'preview')}
        type="card"
        size="small"
        style={{ margin: 0 }}
      >
        <Tabs.TabPane
          key="visual"
          tab={
            <span>
              <CodeOutlined />
              Visual Editor
            </span>
          }
        >
          <div style={{ minHeight: `${height}px` }}>
            {(() => {
              try {
                return (
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                    style={{ height: `${height - 42}px` }}
                  />
                );
              } catch (error) {
                console.error('ReactQuill error:', error);
                return (
                  <Alert
                    message="Visual Editor Error"
                    description="The visual editor failed to load. Please use the HTML Code tab instead."
                    type="error"
                    showIcon
                    style={{ margin: '16px' }}
                  />
                );
              }
            })()}
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane
          key="code"
          tab={
            <span>
              <CodeOutlined />
              HTML Code
            </span>
          }
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              height: `${height}px`,
              padding: '12px',
              border: 'none',
              fontFamily: 'monospace',
              fontSize: '13px',
              resize: 'none',
              outline: 'none',
            }}
          />
        </Tabs.TabPane>

        <Tabs.TabPane
          key="preview"
          tab={
            <span>
              <EyeOutlined />
              Preview
            </span>
          }
        >
          <div
            style={{
              padding: '24px',
              minHeight: `${height}px`,
              maxHeight: `${height}px`,
              overflow: 'auto',
              background: '#fff',
            }}
            dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

