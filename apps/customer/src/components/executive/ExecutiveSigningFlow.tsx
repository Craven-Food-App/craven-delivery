import React, { useState, useEffect, useRef } from 'react';
import { FileText, Check, ChevronRight, AlertCircle, Download, Mail, Calendar, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { message } from 'antd';

// Component to properly display documents (PDFs, images, HTML)
const DocumentViewer: React.FC<{ url: string; onContentSizeChange?: (width: number, height: number) => void }> = ({ url, onContentSizeChange }) => {
  const [documentUrl, setDocumentUrl] = useState<string>(url);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isHtmlFile = (url: string): boolean => {
    return url.toLowerCase().endsWith('.html') || url.toLowerCase().includes('.html?');
  };

  const fetchHtmlContent = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const html = await response.text();
      return html;
    } catch (error) {
      console.error('Error fetching HTML content:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setHtmlContent(null);

      console.log('DocumentViewer: Loading document from URL:', url);

      try {
        // Handle HTML files - fetch and render content
        if (isHtmlFile(url)) {
          console.log('DocumentViewer: Detected HTML file, fetching content...');
          const html = await fetchHtmlContent(url);
          if (html) {
            console.log('DocumentViewer: HTML content fetched successfully, length:', html.length);
            setHtmlContent(html);
            setLoading(false);
            return;
          } else {
            console.error('DocumentViewer: Failed to fetch HTML content');
            setError('Failed to load HTML document');
            setLoading(false);
            return;
          }
        }

        // Check if it's a storage bucket URL that needs signing
        try {
          const urlObj = new URL(url);
          const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign|private)?\/([^/]+)\/(.+)/);
          
          if (match) {
            const bucket = match[1];
            const path = match[2];
            const { data, error: signError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, 3600);
            
            if (signError) throw signError;
            setDocumentUrl(data?.signedUrl || url);
          } else {
            // Try to parse as "bucket/path" format
            const parts = url.split('/');
            const bucketIndex = parts.findIndex(p => p.includes('storage') || p.includes('bucket'));
            if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
              const bucket = parts[bucketIndex + 1];
              const path = parts.slice(bucketIndex + 2).join('/');
              if (bucket && path) {
                const { data, error: signError } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(path, 3600);
                
                if (!signError && data?.signedUrl) {
                  setDocumentUrl(data.signedUrl);
                }
              }
            }
          }
        } catch (urlError) {
          // If URL parsing fails, use original URL
          console.warn('URL parsing failed, using original URL:', urlError);
        }
      } catch (err: any) {
        console.error('Error loading document:', err);
        setError('Failed to load document. Using original URL.');
        // Keep original URL as fallback
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [url]);

  // Measure content size after render - must be outside conditional
  useEffect(() => {
    if (htmlContent && contentRef.current && onContentSizeChange) {
      const rect = contentRef.current.getBoundingClientRect();
      // Account for padding: 60px top/bottom, 80px left/right (matches DocumentTemplateTagger)
      const contentWidth = rect.width - 160; // 80px padding on each side
      const contentHeight = rect.height - 120; // 60px padding on top/bottom
      onContentSizeChange(contentWidth, contentHeight);
    }
  }, [htmlContent, onContentSizeChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ width: '100%', height: '800px', flexShrink: 0 }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ width: '100%', height: '800px', flexShrink: 0 }}>
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Render HTML content
  if (htmlContent) {
    // Inject styles to override document styles and ensure it fits the container
    // Match DocumentTemplateTagger padding: 60px top/bottom, 80px left/right
    const constrainedHtml = htmlContent.replace(
      /<style>([\s\S]*?)<\/style>/i,
      (match, styles) => {
        const constrainedStyles = `
          <style>
            ${styles}
            @page { margin: 0; }
            body {
              max-width: 100% !important;
              margin: 0 !important;
              padding: 60px 80px !important;
              width: 100% !important;
              height: auto !important;
              box-sizing: border-box !important;
              position: relative !important;
            }
            * {
              box-sizing: border-box !important;
            }
          </style>
        `;
        return constrainedStyles;
      }
    );

    return (
      <div
        ref={contentRef}
        style={{
          width: '100%',
          minHeight: '100%',
          padding: '0',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
          flexShrink: 0,
          position: 'relative',
        }}
        dangerouslySetInnerHTML={{ __html: constrainedHtml }}
      />
    );
  }

  const isPdf = documentUrl.toLowerCase().endsWith('.pdf') || 
                documentUrl.toLowerCase().includes('.pdf?') ||
                documentUrl.toLowerCase().includes('application/pdf');
  
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(documentUrl);

  if (isPdf) {
    return (
      <iframe
        src={documentUrl}
        style={{ 
          width: '100%',
          minHeight: '800px',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        title="Document Preview"
      />
    );
  }

  if (isImage) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '800px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        backgroundColor: '#fff'
      }}>
        <img
          src={documentUrl}
          alt="Document"
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%', 
            objectFit: 'contain',
            display: 'block'
          }}
          onError={() => setError('Failed to load image')}
        />
      </div>
    );
  }

  // Fallback: try to display as PDF or image based on content type
  return (
    <iframe
      src={documentUrl}
      style={{ 
        width: '100%',
        minHeight: '800px',
        height: '100%',
        border: 'none',
        display: 'block'
      }}
      title="Document Preview"
    />
  );
};

interface SignatureField {
  id: string;
  field_type: 'signature' | 'initial' | 'date' | 'text' | 'name' | 'email' | 'company' | 'title';
  signer_role: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  label?: string;
  required: boolean;
}

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  templateId?: string;
  type?: string;
  signature_status?: string;
}

interface FieldState {
  id: string;
  type: string;
  label: string;
  required: boolean;
  page: number;
  completed: boolean;
  value?: string;
  documentId: string;
}

const signatureFonts = [
  { name: 'Dancing Script', value: 'Dancing Script, cursive' },
  { name: 'Great Vibes', value: 'Great Vibes, cursive' },
  { name: 'Allura', value: 'Allura, cursive' },
  { name: 'Satisfy', value: 'Satisfy, cursive' },
  { name: 'Kalam', value: 'Kalam, cursive' },
  { name: 'Caveat', value: 'Caveat, cursive' },
];

interface ExecutiveSigningFlowProps {
  documents: Document[];
  onComplete?: () => void;
}

function ExecutiveSigningFlow({ documents, onComplete }: ExecutiveSigningFlowProps) {
  const [currentStep, setCurrentStep] = useState<'landing' | 'adopt' | 'signing' | 'review' | 'complete'>('landing');
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [signatureData, setSignatureData] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [adoptedSignature, setAdoptedSignature] = useState<string>('');
  const [adoptedInitials, setAdoptedInitials] = useState<string>('');
  const [signatureStyle, setSignatureStyle] = useState<'type' | 'draw' | 'upload'>('type');
  const [tempSignature, setTempSignature] = useState('');
  const [tempInitials, setTempInitials] = useState('');
  const [selectedFont, setSelectedFont] = useState(signatureFonts[0].value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [allFields, setAllFields] = useState<FieldState[]>([]);
  const [signatureFields, setSignatureFields] = useState<Record<string, SignatureField[]>>({});
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [fieldPositions, setFieldPositions] = useState<Record<string, { x_percent: number; y_percent: number }>>({});
  const documentContainerRef = useRef<HTMLDivElement>(null);
  const initialsCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch signature fields function
  const fetchSignatureFields = async () => {
    const fieldsMap: Record<string, SignatureField[]> = {};
    const allFieldStates: FieldState[] = [];

    for (const doc of documents) {
      const { data: docData } = await supabase
        .from('executive_documents')
        .select('template_id')
        .eq('id', doc.id)
        .single();

      const templateId = docData?.template_id;
      
      if (templateId) {
        const { data: fieldsData } = await supabase
          .from('document_template_signature_fields')
          .select('*')
          .eq('template_id', templateId)
          .order('page_number', { ascending: true });

        if (fieldsData) {
          fieldsMap[doc.id] = fieldsData as any;
          
          fieldsData.forEach((f) => {
            allFieldStates.push({
              id: `${doc.id}_${f.id}`,
              type: f.field_type as any,
              label: f.label || `${f.field_type} (Page ${f.page_number})`,
              required: f.required,
              page: f.page_number,
              completed: false,
              documentId: doc.id,
            });
          });
        }
      }
    }

    setSignatureFields(fieldsMap);
    setAllFields(allFieldStates);
  };

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        setUserInfo({
          id: user.id,
          email: user.email,
          name: profile?.full_name || user.email?.split('@')[0] || 'Executive',
        });

        const { data: savedSig } = await supabase
          .from('executive_saved_signatures')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();

        if (savedSig?.signature_data_url) {
          setAdoptedSignature(savedSig.signature_data_url);
        }
      }

      await fetchSignatureFields();
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const completedFields = allFields.filter(f => f.completed).length;
  const totalFields = allFields.filter(f => f.required).length;
  const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  const handleStartSigning = () => {
    if (adoptedSignature) {
      setCurrentStep('signing');
    } else {
      setCurrentStep('adopt');
    }
  };

  const handleFieldComplete = (fieldId: string, value: string) => {
    setSignatureData({ ...signatureData, [fieldId]: value });
    setAllFields(allFields.map(f => 
      f.id === fieldId ? { ...f, completed: true, value } : f
    ));
  };

  const handleAdoptSignature = async () => {
    if (signatureStyle === 'type' && tempSignature && tempInitials) {
      setAdoptedSignature(tempSignature);
      setAdoptedInitials(tempInitials);
      
      if (userInfo?.id) {
        await supabase
          .from('executive_saved_signatures')
          .upsert({
            user_id: userInfo.id,
            signature_name: 'Default Signature',
            signature_data_url: tempSignature,
            is_default: true,
          });
      }
      
      setCurrentStep('signing');
    } else if (signatureStyle === 'draw') {
      const canvas = canvasRef.current;
      const initialsCanvas = initialsCanvasRef.current;
      if (canvas && initialsCanvas) {
        const signatureDataUrl = canvas.toDataURL();
        const initialsDataUrl = initialsCanvas.toDataURL();
        setAdoptedSignature(signatureDataUrl);
        setAdoptedInitials(initialsDataUrl);
        
        if (userInfo?.id) {
          await supabase
            .from('executive_saved_signatures')
            .upsert({
              user_id: userInfo.id,
              signature_name: 'Default Signature',
              signature_data_url: signatureDataUrl,
              is_default: true,
            });
        }
        
        setCurrentStep('signing');
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const clearInitialsCanvas = () => {
    const canvas = initialsCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    if (!isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const goToNextField = () => {
    const currentDoc = documents[currentDocumentIndex];
    const docFields = allFields.filter(f => f.documentId === currentDoc?.id && !f.completed);
    
    if (docFields.length > 0) {
      const nextField = docFields[0];
      setCurrentFieldIndex(allFields.findIndex(f => f.id === nextField.id));
    } else {
      if (currentDocumentIndex < documents.length - 1) {
        setCurrentDocumentIndex(currentDocumentIndex + 1);
        const nextDoc = documents[currentDocumentIndex + 1];
        const nextDocFields = allFields.filter(f => f.documentId === nextDoc.id && !f.completed);
        if (nextDocFields.length > 0) {
          setCurrentFieldIndex(allFields.findIndex(f => f.id === nextDocFields[0].id));
        } else {
          setCurrentStep('review');
        }
      } else {
        setCurrentStep('review');
      }
    }
  };

  const handleFinish = async () => {
    if (completedFields === totalFields && agreedToTerms) {
      // Submit all signatures
      try {
        for (const doc of documents) {
          const docFields = allFields.filter(f => f.documentId === doc.id && f.completed);
          if (docFields.length > 0) {
            // Include updated field positions if any were dragged
            const updatedFieldLayout = (signatureFields[doc.id] || []).map(field => {
              const fieldKey = `${doc.id}_${field.id}`;
              const draggedPosition = fieldPositions[fieldKey];
              if (draggedPosition) {
                return {
                  ...field,
                  x_percent: draggedPosition.x_percent,
                  y_percent: draggedPosition.y_percent,
                };
              }
              return field;
            });
            
            await supabase.functions.invoke('submit-executive-document-signature', {
              body: {
                document_id: doc.id,
                typed_name: userInfo?.name || 'Signed',
                signature_png_base64: adoptedSignature,
                signer_ip: null,
                signer_user_agent: navigator.userAgent,
                signature_token: null,
                signature_field_layout: updatedFieldLayout.length > 0 ? updatedFieldLayout : undefined,
              },
            });
          }
        }
        setCurrentStep('complete');
        if (onComplete) onComplete();
      } catch (err: any) {
        message.error('Failed to complete signing. Please try again.');
      }
    }
  };

  const currentDocument = documents[currentDocumentIndex];
  const currentField = allFields[currentFieldIndex];
  const pendingDocs = documents.filter(d => d.signature_status !== 'signed');

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-600">No documents to sign</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="text-orange-600" size={32} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Crave'n</h1>
                <p className="text-sm text-gray-600">Document Signing</p>
              </div>
            </div>
            {currentStep !== 'landing' && currentStep !== 'complete' && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{completedFields} of {totalFields} Complete</p>
                  <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                    <div 
                      className="h-full bg-orange-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Landing Screen */}
      {currentStep === 'landing' && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 p-8">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="text-white" size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {documents.length === 1 ? documents[0].name : `${documents.length} Documents to Sign`}
                  </h2>
                  <div className="flex items-center gap-6 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <span>From: <strong>Crave'n, Inc.</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Sent: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Message</h3>
              <p className="text-gray-700">Please review and sign the following documents. All fields are required for completion.</p>
            </div>

            <div className="p-8 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Documents to Sign</h3>
              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-600">
                          {allFields.filter(f => f.documentId === doc.id).length} fields
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-orange-600 font-medium">
                      {doc.signature_status === 'signed' ? 'Signed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Document Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Recipient:</span>
                  <p className="font-medium text-gray-900">{userInfo?.name || 'You'}</p>
                  <p className="text-gray-600">{userInfo?.email || ''}</p>
                </div>
                <div>
                  <span className="text-gray-600">Required Fields:</span>
                  <p className="font-medium text-gray-900">{totalFields} fields</p>
                </div>
                <div>
                  <span className="text-gray-600">Documents:</span>
                  <p className="font-medium text-gray-900">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-medium text-orange-600">
                    {pendingDocs.length > 0 ? 'Waiting for you' : 'All signed'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleStartSigning}
                  className="flex-1 bg-orange-600 text-white py-4 px-6 rounded-lg hover:bg-orange-700 font-semibold text-lg flex items-center justify-center gap-2 transition"
                >
                  Review and Sign
                  <ChevronRight size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                By clicking "Review and Sign", you agree to use electronic records and signatures
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Adopt Signature Screen */}
      {currentStep === 'adopt' && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Adopt Your Signature</h2>
              <p className="text-gray-700">Create your signature and initials that will be used for all documents</p>
            </div>

            <div className="p-8">
              <div className="flex gap-4 mb-8 border-b border-gray-200 pb-6">
                <button
                  onClick={() => setSignatureStyle('type')}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                    signatureStyle === 'type' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Type
                </button>
                <button
                  onClick={() => setSignatureStyle('draw')}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                    signatureStyle === 'draw' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Draw
                </button>
                <button
                  onClick={() => setSignatureStyle('upload')}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                    signatureStyle === 'upload' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload
                </button>
              </div>

              {signatureStyle === 'type' && (
                <div className="space-y-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Signature Font Style</label>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {signatureFonts.map((font) => (
                        <button
                          key={font.value}
                          onClick={() => setSelectedFont(font.value)}
                          className={`p-3 border-2 rounded-lg transition ${
                            selectedFont === font.value
                              ? 'border-orange-600 bg-orange-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div style={{ fontFamily: font.value, fontSize: '18px' }}>
                            {tempSignature || 'Sample'}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{font.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Your Signature</label>
                    <input
                      type="text"
                      placeholder="Type your full name"
                      value={tempSignature}
                      onChange={(e) => setTempSignature(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg mb-4"
                    />
                    <div className="border-2 border-gray-300 rounded-lg bg-white p-8 min-h-[160px] flex items-center justify-center">
                      {tempSignature ? (
                        <div className="text-5xl" style={{ fontFamily: selectedFont, fontStyle: 'italic', color: '#111827' }}>
                          {tempSignature}
                        </div>
                      ) : (
                        <span className="text-gray-400">Your signature preview will appear here</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Your Initials</label>
                    <input
                      type="text"
                      placeholder="Type your initials"
                      value={tempInitials}
                      onChange={(e) => setTempInitials(e.target.value)}
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg mb-4"
                    />
                    <div className="border-2 border-gray-300 rounded-lg bg-white p-8 h-[120px] flex items-center justify-center">
                      {tempInitials ? (
                        <div className="text-4xl" style={{ fontFamily: selectedFont, fontStyle: 'italic', color: '#111827' }}>
                          {tempInitials}
                        </div>
                      ) : (
                        <span className="text-gray-400">Your initials preview will appear here</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> This signature and initials will be applied to all required fields in all documents.
                    </p>
                  </div>
                </div>
              )}

              {signatureStyle === 'draw' && (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-900">Draw Your Signature</label>
                      <button
                        onClick={clearCanvas}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={200}
                      onMouseDown={(e) => startDrawing(e, canvasRef.current!)}
                      onMouseMove={(e) => draw(e, canvasRef.current!)}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
                    />
                    <p className="text-xs text-gray-600 mt-2">Click and drag to draw your signature</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-900">Draw Your Initials</label>
                      <button
                        onClick={clearInitialsCanvas}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <canvas
                      ref={initialsCanvasRef}
                      width={300}
                      height={150}
                      onMouseDown={(e) => startDrawing(e, initialsCanvasRef.current!)}
                      onMouseMove={(e) => draw(e, initialsCanvasRef.current!)}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
                    />
                    <p className="text-xs text-gray-600 mt-2">Click and drag to draw your initials</p>
                  </div>
                </div>
              )}

              {signatureStyle === 'upload' && (
                <div className="space-y-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Upload Your Signature</label>
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                      <Upload className="text-gray-400 mb-2" size={48} />
                      <span className="text-sm text-gray-600">Click to upload signature image</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG (recommended: white background)</span>
                      <input type="file" className="hidden" accept="image/*" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Upload Your Initials</label>
                    <label className="flex flex-col items-center justify-center w-64 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                      <Upload className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm text-gray-600">Click to upload initials</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG</span>
                      <input type="file" className="hidden" accept="image/*" />
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep('landing')}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition"
                >
                  Back
                </button>
                <button
                  onClick={handleAdoptSignature}
                  disabled={signatureStyle === 'type' && (!tempSignature || !tempInitials)}
                  className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Continue to Sign Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signing Screen */}
      {currentStep === 'signing' && currentDocument && (
        <div className="flex h-[calc(100vh-89px)] overflow-hidden bg-gray-100">
          {/* Document Preview Area - Left Side */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
            <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Document {currentDocumentIndex + 1} of {documents.length}: {currentDocument.name}
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6" style={{ minHeight: 0, height: '100%' }}>
              <div className="max-w-4xl mx-auto w-full">
                    <div className="bg-white rounded-lg shadow-lg relative w-full" style={{ minHeight: '1000px', position: 'relative', padding: '60px 80px' }}>
                  {currentDocument.fileUrl ? (
                    <div 
                      ref={documentContainerRef}
                      className="relative w-full" 
                      style={{ position: 'relative', width: '100%', height: '100%' }}
                      onMouseMove={(e) => {
                        if (!draggingField || !dragStart || !documentContainerRef.current) return;
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const container = documentContainerRef.current;
                        const rect = container.getBoundingClientRect();
                        const containerWidth = rect.width;
                        const containerHeight = rect.height;
                        
                        const currentX = e.clientX - rect.left;
                        const currentY = e.clientY - rect.top;
                        
                        const deltaX = currentX - dragStart.x;
                        const deltaY = currentY - dragStart.y;
                        
                        const currentPosition = fieldPositions[draggingField] || {
                          x_percent: (signatureFields[currentDocument.id] || []).find(f => `${currentDocument.id}_${f.id}` === draggingField)?.x_percent || 0,
                          y_percent: (signatureFields[currentDocument.id] || []).find(f => `${currentDocument.id}_${f.id}` === draggingField)?.y_percent || 0,
                        };
                        
                        const newXPercent = Math.max(0, Math.min(100, currentPosition.x_percent + (deltaX / containerWidth) * 100));
                        const newYPercent = Math.max(0, Math.min(100, currentPosition.y_percent + (deltaY / containerHeight) * 100));
                        
                        setFieldPositions({
                          ...fieldPositions,
                          [draggingField]: { x_percent: newXPercent, y_percent: newYPercent },
                        });
                        
                        setDragStart({
                          x: currentX,
                          y: currentY,
                        });
                      }}
                      onMouseUp={() => {
                        if (draggingField) {
                          const updatedFields = { ...signatureFields };
                          if (updatedFields[currentDocument.id]) {
                            const fieldId = draggingField.replace(`${currentDocument.id}_`, '');
                            const fieldIndex = updatedFields[currentDocument.id].findIndex(f => f.id === fieldId);
                            if (fieldIndex >= 0 && fieldPositions[draggingField]) {
                              updatedFields[currentDocument.id][fieldIndex] = {
                                ...updatedFields[currentDocument.id][fieldIndex],
                                x_percent: fieldPositions[draggingField].x_percent,
                                y_percent: fieldPositions[draggingField].y_percent,
                              };
                              setSignatureFields(updatedFields);
                            }
                          }
                          setDraggingField(null);
                          setDragStart(null);
                        }
                      }}
                      onMouseLeave={() => {
                        if (draggingField) {
                          const updatedFields = { ...signatureFields };
                          if (updatedFields[currentDocument.id]) {
                            const fieldId = draggingField.replace(`${currentDocument.id}_`, '');
                            const fieldIndex = updatedFields[currentDocument.id].findIndex(f => f.id === fieldId);
                            if (fieldIndex >= 0 && fieldPositions[draggingField]) {
                              updatedFields[currentDocument.id][fieldIndex] = {
                                ...updatedFields[currentDocument.id][fieldIndex],
                                x_percent: fieldPositions[draggingField].x_percent,
                                y_percent: fieldPositions[draggingField].y_percent,
                              };
                              setSignatureFields(updatedFields);
                            }
                          }
                          setDraggingField(null);
                          setDragStart(null);
                        }
                      }}
                    >
                      <div style={{ width: '100%', position: 'relative', overflow: 'visible', height: '100%' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <DocumentViewer url={currentDocument.fileUrl} />
                          
                          {/* Signature field overlays - positioned relative to this content area (percentages are relative to content area, not padded container) */}
                          {(signatureFields[currentDocument.id] || []).map((field) => {
                            const fieldState = allFields.find(f => f.id === `${currentDocument.id}_${field.id}`);
                            const isCompleted = fieldState?.completed || false;
                            const fieldKey = `${currentDocument.id}_${field.id}`;
                            
                            // Use dragged position if available, otherwise use original position
                            const position = fieldPositions[fieldKey] || { 
                              x_percent: field.x_percent, 
                              y_percent: field.y_percent 
                            };
                            
                            const isDragging = draggingField === fieldKey;
                            
                            const handleMouseDown = (e: React.MouseEvent) => {
                              if (!isCompleted) return; // Only allow dragging completed signatures
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingField(fieldKey);
                              const container = documentContainerRef.current;
                              if (container) {
                                const rect = container.getBoundingClientRect();
                                const fieldRect = e.currentTarget.getBoundingClientRect();
                                setDragStart({
                                  x: fieldRect.left - rect.left + (fieldRect.width / 2),
                                  y: fieldRect.top - rect.top + (fieldRect.height / 2),
                                });
                              }
                            };
                            
                            return (
                              <div
                                key={field.id}
                                onMouseDown={handleMouseDown}
                                style={{
                                  position: 'absolute',
                                  left: `${position.x_percent}%`,
                                  top: `${position.y_percent}%`,
                                  width: `${field.width_percent}%`,
                                  height: `${field.height_percent}%`,
                                  border: isCompleted ? '2px solid #10b981' : '2px solid #f59e0b',
                                  backgroundColor: isCompleted ? '#d1fae5' : '#fef3c7',
                                  borderRadius: '4px',
                                  padding: '8px',
                                  pointerEvents: isCompleted ? 'auto' : 'none',
                                  cursor: isCompleted ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                  zIndex: isDragging ? 20 : 10,
                                  transition: isDragging ? 'none' : 'left 0.1s, top 0.1s',
                                  userSelect: 'none',
                                }}
                              >
                                {isCompleted && fieldState?.value && (
                                  <div className="text-sm text-gray-900">
                                    {field.field_type === 'signature' && (
                                      <div style={{ fontFamily: selectedFont, fontStyle: 'italic', fontSize: '16px' }}>
                                        {fieldState.value}
                                      </div>
                                    )}
                                    {field.field_type === 'initial' && (
                                      <div style={{ fontFamily: selectedFont, fontStyle: 'italic', fontSize: '14px' }}>
                                        {fieldState.value}
                                      </div>
                                    )}
                                    {field.field_type !== 'signature' && field.field_type !== 'initial' && (
                                      <div>{fieldState.value}</div>
                                    )}
                                  </div>
                                )}
                                {isCompleted && (
                                  <div className="absolute top-1 right-1 text-xs text-gray-500">
                                    Drag to reposition
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[600px]">
                    <div className="text-center">
                      <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                      <p className="text-gray-600">No document URL available</p>
                      <p className="text-sm text-gray-500 mt-2">Document ID: {currentDocument.id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* Field Completion Sidebar - Right Side */}
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Complete Required Fields</h3>
              <p className="text-sm text-gray-600">{completedFields} of {totalFields} completed</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {currentField && !currentField.completed ? (
                <div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Field {currentFieldIndex + 1} of {totalFields}</span>
                      <span className="text-xs text-gray-500">Page {currentField.page}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">{currentField.label}</h4>
                    {currentField.required && (
                      <span className="text-xs text-red-600 font-medium">Required</span>
                    )}
                  </div>

                  {currentField.type === 'signature' && (
                    <div className="space-y-4">
                      <div className="border-2 border-orange-500 rounded-lg p-6 bg-orange-50 min-h-[120px] flex items-center justify-center">
                        {adoptedSignature.startsWith('data:') ? (
                          <img src={adoptedSignature} alt="Signature" className="max-w-full max-h-20" />
                        ) : (
                          <div className="text-4xl" style={{ fontFamily: selectedFont, fontStyle: 'italic', color: '#111827' }}>
                            {adoptedSignature}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Your adopted signature will be applied</p>
                    </div>
                  )}

                  {currentField.type === 'initial' && (
                    <div className="space-y-4">
                      <div className="border-2 border-orange-500 rounded-lg p-4 bg-orange-50 h-24 flex items-center justify-center">
                        {adoptedInitials.startsWith('data:') ? (
                          <img src={adoptedInitials} alt="Initials" className="max-w-full max-h-16" />
                        ) : (
                          <div className="text-3xl" style={{ fontFamily: selectedFont, fontStyle: 'italic', color: '#111827' }}>
                            {adoptedInitials}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Your adopted initials will be applied</p>
                    </div>
                  )}

                  {currentField.type === 'date' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select date</label>
                      <input
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onChange={(e) => setSignatureData({...signatureData, [currentField.id]: e.target.value})}
                      />
                    </div>
                  )}

                  {(currentField.type === 'name' || currentField.type === 'email' || currentField.type === 'title') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter {currentField.label.toLowerCase()}
                      </label>
                      <input
                        type={currentField.type === 'email' ? 'email' : 'text'}
                        placeholder={
                          currentField.type === 'name' ? 'John Smith' :
                          currentField.type === 'email' ? 'john.smith@example.com' :
                          'Chief Executive Officer'
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onChange={(e) => setSignatureData({...signatureData, [currentField.id]: e.target.value})}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (currentField.type === 'signature') {
                        handleFieldComplete(currentField.id, adoptedSignature);
                        goToNextField();
                      } else if (currentField.type === 'initial') {
                        handleFieldComplete(currentField.id, adoptedInitials);
                        goToNextField();
                      } else if (signatureData[currentField.id]) {
                        handleFieldComplete(currentField.id, signatureData[currentField.id]);
                        goToNextField();
                      }
                    }}
                    disabled={
                      (currentField.type !== 'signature' && currentField.type !== 'initial' && !signatureData[currentField.id])
                    }
                    className="w-full mt-6 bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {currentFieldIndex === totalFields - 1 ? 'Complete' : 'Next Field'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Check className="mx-auto text-green-600 mb-4" size={48} />
                  <h4 className="font-semibold text-gray-900 mb-2">All Fields Complete!</h4>
                  <p className="text-sm text-gray-600 mb-6">Review your entries and finish signing</p>
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 font-semibold transition"
                  >
                    Continue to Review
                  </button>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">All Fields</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allFields.map((field, idx) => (
                    <button
                      key={field.id}
                      onClick={() => setCurrentFieldIndex(idx)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        field.completed 
                          ? 'bg-green-50 border-green-200' 
                          : currentFieldIndex === idx
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{field.label}</span>
                        {field.completed && <Check className="text-green-600" size={16} />}
                      </div>
                      <span className="text-xs text-gray-600">Page {field.page}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Screen */}
      {currentStep === 'review' && (
        <div className="flex h-[calc(100vh-89px)] overflow-hidden bg-gray-100">
          <div className="flex-1 overflow-auto p-8">
            <div className="w-full max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                <div className="bg-orange-50 border-b border-orange-200 p-8 flex-shrink-0">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Before Signing</h2>
                  <p className="text-gray-700">Please review all your entries before finalizing the documents</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  <div className="space-y-4 mb-8">
                    {allFields.map(field => (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{field.label}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {field.type === 'signature' || field.type === 'initial' ? (
                              <span className="italic" style={{ fontFamily: selectedFont }}>
                                {signatureData[field.id]?.startsWith('data:') ? '✓ Signature applied' : signatureData[field.id]}
                              </span>
                            ) : (
                              signatureData[field.id]
                            )}
                          </p>
                        </div>
                        <Check className="text-green-600" size={24} />
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-6 flex-shrink-0">
                    <div className="flex items-start gap-3 mb-6">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm text-gray-700">
                        I agree that by clicking "Finish and Sign", I am electronically signing these documents. 
                        My electronic signature is the legal equivalent of my manual signature on these documents. 
                        I consent to be legally bound by these documents' agreements and to conduct this transaction electronically.
                      </label>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentStep('signing')}
                        className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition"
                      >
                        Back to Edit
                      </button>
                      <button
                        onClick={handleFinish}
                        disabled={!agreedToTerms}
                        className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                      >
                        Finish and Sign
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Screen */}
      {currentStep === 'complete' && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden text-center p-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="text-green-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Documents Signed Successfully!</h2>
            <p className="text-gray-700 mb-2">Thank you for signing all documents</p>
            <p className="text-sm text-gray-600 mb-8">All parties will receive a copy of the signed documents via email.</p>
            
            <div className="border-t border-gray-200 pt-8 mt-8">
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => {
                    if (onComplete) onComplete();
                    setCurrentStep('landing');
                  }}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2 transition"
                >
                  <Download size={20} />
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSigningFlow;

