import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Alert,
  Button,
  Card,
  Divider,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { EnhancedSignaturePad } from '@/components/common/EnhancedSignaturePad';

const { Title, Paragraph, Text } = Typography;

interface ExecutiveDocument {
  id: string;
  officer_name: string;
  role: string;
  type: string;
  status: string | null;
  signature_status: string | null;
  file_url: string;
  signed_file_url?: string | null;
  packet_id?: string | null;
  signing_stage?: number | null;
  signing_order?: number | null;
  required_signers?: string[] | null;
  signer_roles?: Record<string, boolean> | null;
}

const ExecutiveDocumentSign = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = params.get('token')?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<ExecutiveDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [documentHtml, setDocumentHtml] = useState<string>('');

  useEffect(() => {
    const fetchDocument = async () => {
      if (!token) {
        setError('This signing link is invalid.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('get-executive-document-by-token', {
        body: { token },
      });

      if (fnError || !data?.ok) {
        setError(data?.error || fnError?.message || 'Unable to load the document for signing.');
        setLoading(false);
        return;
      }

      const doc = data.document as ExecutiveDocument;
      setDocument(doc);
      setTypedName(doc.officer_name || '');

      // Fetch the HTML content from the file_url
      if (doc.file_url) {
        try {
          const response = await fetch(doc.file_url);
          const html = await response.text();
          setDocumentHtml(html);
        } catch (err) {
          console.error('Failed to fetch document HTML:', err);
          setError('Failed to load document content');
        }
      }

      setLoading(false);
    };

    fetchDocument();
  }, [token]);

  const handleSubmitSignature = async (signatureDataUrl: string, signatureId?: string, typedNameValue?: string) => {
    if (!document) return;

    setIsSigning(true);
    setSuccessMessage(null);

    // Use fetch directly for better error handling
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/submit-executive-document-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        document_id: document.id,
        typed_name: typedNameValue?.trim() || typedName.trim() || document.officer_name || null,
        signature_png_base64: signatureDataUrl,
        signer_user_agent: window.navigator.userAgent,
        signature_token: token,
      }),
    });

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      message.error('Failed to parse server response');
      setIsSigning(false);
      return;
    }

    if (!response.ok) {
      const errorMessage = data?.error || `Server error: ${response.status} ${response.statusText}`;
      console.error('Signature submission error:', { status: response.status, data });
      message.error(errorMessage);
      setIsSigning(false);
      return;
    }

    if (!data?.ok) {
      message.error(data?.error || 'Failed to submit signature. Please try again.');
      setIsSigning(false);
      return;
    }

    setSuccessMessage('Document signed successfully. Thank you! You may close this window.');
    setDocument((prev) => prev ? { ...prev, signature_status: 'signed', signed_file_url: data.signed_pdf_url } : prev);
    setIsSigning(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spin size="large" tip="Loading document..." />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Alert
          message="Invalid link"
          description="This signing link is missing a token. Please use the link that was emailed to you."
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Space direction="vertical" size="large" style={{ maxWidth: 480 }}>
          <Alert
            message="Unable to load document"
            description={error}
            type="error"
            showIcon
          />
          <Button onClick={() => navigate('/')}>Return to Homepage</Button>
        </Space>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const isAlreadySigned = document.signature_status === 'signed';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card bordered={false} className="shadow-sm">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={3} style={{ marginBottom: 4 }}>
                Executive Document Signature
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Review the agreement below and complete the signature to finalize your appointment.
              </Paragraph>
            </Space>
          </Card>

          {successMessage && (
            <Alert type="success" message={successMessage} showIcon />
          )}

          <Card title="Document Details" className="shadow-sm">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>Document:</Text>
                <br />
                <Text>{document.type?.replace(/_/g, ' ').toUpperCase()}</Text>
              </div>
              <div>
                <Text strong>Recipient:</Text>
                <br />
                <Text>{document.officer_name}</Text>
              </div>
              <div>
                <Text strong>Status:</Text>
                <br />
                <Text>{isAlreadySigned ? 'Signed' : 'Pending Signature'}</Text>
              </div>
              <Divider style={{ margin: '16px 0' }} />
              <iframe
                title="Document Preview"
                srcDoc={documentHtml}
                style={{ width: '100%', minHeight: '600px', border: '1px solid #d9d9d9', borderRadius: 8 }}
                sandbox="allow-same-origin"
              />
              {document.signed_file_url && (
                <Button
                  icon={<DownloadOutlined />}
                  type="default"
                  href={document.signed_file_url}
                  target="_blank"
                >
                  Download Signed Copy
                </Button>
              )}
            </Space>
          </Card>

          {!isAlreadySigned && (
            <Card title="Sign Document" className="shadow-sm">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <EnhancedSignaturePad
                  onSave={handleSubmitSignature}
                  width={600}
                  height={300}
                  showTypedName={true}
                  typedNameLabel="Your Full Legal Name"
                  documentId={document.id}
                  saveToDatabase={true}
                  storageBucket="documents"
                  storagePath={`executive_signatures/${document.id}`}
                  title="Draw Your Signature"
                  description="Use your finger or stylus to sign"
                  required={true}
                  disabled={isSigning}
                />
              </Space>
            </Card>
          )}
        </Space>
      </div>
    </div>
  );
};

export default ExecutiveDocumentSign;
