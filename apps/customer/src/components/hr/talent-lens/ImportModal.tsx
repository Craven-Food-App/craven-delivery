import React, { useState, useRef, useEffect } from 'react';
import { Modal, Upload, Button, Table, message, Space, Typography, Alert, Select } from 'antd';
import { UploadOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { parsePDFResume } from './ResumeParser';
import { Applicant, JobPosting } from './types';
import { supabase } from '@/integrations/supabase/client';

const { Dragger } = Upload;
const { Text } = Typography;

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (applicants: Partial<Applicant>[]) => void;
  jobPostingId?: string;
  mode: 'csv' | 'pdf';
  jobPostings?: JobPosting[];
}

const { Option } = Select;

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onClose,
  onImport,
  jobPostingId: initialJobPostingId,
  mode,
  jobPostings = [],
}) => {
  const [parsedApplicants, setParsedApplicants] = useState<Partial<Applicant>[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedJobPostingId, setSelectedJobPostingId] = useState<string | undefined>(initialJobPostingId);

  useEffect(() => {
    setSelectedJobPostingId(initialJobPostingId);
  }, [initialJobPostingId]);

  const handleCSVUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      setProcessing(true);
      const text = await (file as File).text();
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const applicants: Partial<Applicant>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const applicant: Partial<Applicant> = {
          name: values[headers.indexOf('name')] || '',
          email: values[headers.indexOf('email')] || '',
          phone: values[headers.indexOf('phone')] || undefined,
          linkedinUrl: values[headers.indexOf('linkedin')] || values[headers.indexOf('linkedinurl')] || undefined,
          currentRole: values[headers.indexOf('currentrole')] || values[headers.indexOf('role')] || '',
          currentCompany: values[headers.indexOf('currentcompany')] || values[headers.indexOf('company')] || '',
          yearsExperience: parseInt(values[headers.indexOf('yearsexperience')] || values[headers.indexOf('experience')] || '0', 10) || 0,
          location: values[headers.indexOf('location')] || '',
          skills: values[headers.indexOf('skills')]?.split(';').map((s) => s.trim()).filter(Boolean) || [],
          education: values[headers.indexOf('education')] || '',
          summary: values[headers.indexOf('summary')] || undefined,
          status: 'new',
          source: 'csv',
          jobPostingId: selectedJobPostingId,
        };
        applicants.push(applicant);
      }

      setParsedApplicants(applicants);
      message.success(`Parsed ${applicants.length} applicants from CSV`);
      onSuccess?.(file as any);
    } catch (error: any) {
      message.error(`Error parsing CSV: ${error.message}`);
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const handlePDFUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      setProcessing(true);
      const parsed = await parsePDFResume(file as File);
      
      const applicant: Partial<Applicant> = {
        ...parsed,
        status: 'new',
        source: 'pdf',
        jobPostingId: selectedJobPostingId,
      };
      
      setParsedApplicants([applicant]);
      message.success('Resume parsed successfully');
      onSuccess?.(file as any);
    } catch (error: any) {
      message.error(`Error parsing PDF: ${error.message}`);
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkPDFUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      setProcessing(true);
      console.log('[ImportModal] Starting PDF upload for:', (file as File).name);
      
      const parsed = await parsePDFResume(file as File);
      
      console.log('[ImportModal] PDF parsed, result:', parsed);
      
      // Check if we actually got useful data
      if (!parsed.name || parsed.name === 'Unknown Applicant' || parsed.name === (file as File).name.replace(/\.pdf$/i, '')) {
        console.warn('[ImportModal] Name extraction may have failed, using filename');
      }
      
      if (!parsed.email && !parsed.phone && !parsed.currentRole) {
        message.warning('Limited information extracted from PDF. Please review and edit the applicant details.');
      }
      
      setParsedApplicants((prev) => [...prev, {
        ...parsed,
        status: 'new',
        source: 'pdf',
        jobPostingId: selectedJobPostingId,
      }]);
      
      message.success(`Resume parsed: ${parsed.name || (file as File).name}`);
      onSuccess?.(file as any);
    } catch (error: any) {
      console.error('[ImportModal] Error in PDF upload:', error);
      message.error(`Error parsing PDF: ${error.message}`);
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = () => {
    if (parsedApplicants.length === 0) {
      message.warning('No applicants to import');
      return;
    }
    onImport(parsedApplicants);
    setParsedApplicants([]);
    onClose();
  };

  const handleClose = () => {
    setParsedApplicants([]);
    setSelectedJobPostingId(initialJobPostingId);
    onClose();
  };

  const csvColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'currentRole', key: 'currentRole' },
    { title: 'Company', dataIndex: 'currentCompany', key: 'currentCompany' },
    { title: 'Experience', dataIndex: 'yearsExperience', key: 'yearsExperience' },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Import Applicants {mode === 'csv' ? '(CSV)' : '(PDF Resume)'}</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          onClick={handleImport}
          disabled={parsedApplicants.length === 0}
          loading={loading}
        >
          Import {parsedApplicants.length > 0 && `(${parsedApplicants.length})`}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Job Posting Selection */}
        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Associate with Job Posting (Optional)
          </Typography.Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Select a job posting..."
            value={selectedJobPostingId}
            onChange={setSelectedJobPostingId}
            allowClear
          >
            {jobPostings
              .filter((p) => p.status === 'active')
              .map((posting) => (
                <Option key={posting.id} value={posting.id}>
                  {posting.title} - {posting.department}
                </Option>
              ))}
          </Select>
          {selectedJobPostingId && (
            <Alert
              message={`Applicants will be associated with the selected job posting`}
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        {mode === 'csv' ? (
          <>
            <Alert
              message="CSV Format"
              description="Your CSV should have columns: name, email, phone (optional), linkedin (optional), currentRole, currentCompany, yearsExperience, location, skills (semicolon-separated), education, summary (optional)"
              type="info"
              showIcon
            />
            <Upload
              customRequest={handleCSVUpload}
              accept=".csv"
              showUploadList={false}
              disabled={processing}
            >
              <Button icon={<UploadOutlined />} loading={processing}>
                Upload CSV File
              </Button>
            </Upload>
          </>
        ) : (
          <>
            <Alert
              message="PDF Resume Upload"
              description="Upload one or multiple PDF resumes. The system will automatically extract candidate information."
              type="info"
              showIcon
            />
            <Dragger
              customRequest={handleBulkPDFUpload}
              accept=".pdf"
              multiple
              disabled={processing}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag PDF resumes to this area to upload</p>
              <p className="ant-upload-hint">
                Support for single or bulk upload. The system will parse each resume automatically.
              </p>
            </Dragger>
            {processing && <Text type="secondary">Processing resumes...</Text>}
          </>
        )}

        {parsedApplicants.length > 0 && (
          <div>
            <Text strong>Preview ({parsedApplicants.length} applicants):</Text>
            <Table
              dataSource={parsedApplicants}
              columns={csvColumns}
              pagination={{ pageSize: 5 }}
              size="small"
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default ImportModal;

