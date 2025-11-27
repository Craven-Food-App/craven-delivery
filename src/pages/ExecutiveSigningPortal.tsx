import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Check, ChevronRight, AlertCircle, Download, Mail, Calendar, Clock, X, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { message } from 'antd';

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
  sender?: string;
  senderEmail?: string;
  sentDate?: string;
  expiryDate?: string;
  message?: string;
  recipient?: string;
  recipientEmail?: string;
  signature_status?: string;
  signed_file_url?: string;
  signing_stage?: number;
  signing_order?: number;
  depends_on_document_id?: string;
}

interface DocumentStage {
  id: number;
  name: string;
  description: string;
  documents: Document[];
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

const ExecutiveSigningPortal = () => {
  const location = useLocation();
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
  const [documentStages, setDocumentStages] = useState<DocumentStage[]>([]);
  const [allFields, setAllFields] = useState<FieldState[]>([]);
  const [signatureFields, setSignatureFields] = useState<Record<string, SignatureField[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [documentHtmlCache, setDocumentHtmlCache] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialsCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const initializeSession = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('Missing authentication token');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-executive-documents-by-token', {
          body: { token },
        });

        if (fnError) {
          console.error('Edge function error:', fnError);
          // Handle different error types
          if (fnError.message?.includes('404') || fnError.message?.includes('Invalid')) {
            setError('Invalid or expired signing link. Please request a new signing link.');
          } else if (fnError.message?.includes('410')) {
            setError('This signing link has expired. Please request a new signing link.');
          } else {
            setError(fnError.message || 'Failed to load signing session. Please check your signing link.');
          }
          setLoading(false);
          return;
        }

        if (!data || !data.ok) {
          console.error('Edge function returned error:', data);
          if (data?.error?.includes('expired')) {
            setError('This signing link has expired. Please request a new signing link.');
          } else if (data?.error?.includes('Invalid')) {
            setError('Invalid signing link. Please check your link and try again.');
          } else {
            setError(data?.error || 'Failed to load signing session. Please check your signing link.');
          }
          setLoading(false);
          return;
        }

        setAuthToken(token);
        setUserInfo(data.user);
        setDocumentStages(data.documentFlow || []);
        
        // Fetch signature fields for all documents with templates
        const allDocs: Document[] = [];
        (data.documentFlow || []).forEach((stage: DocumentStage) => {
          stage.documents.forEach((doc: Document) => {
            allDocs.push(doc);
          });
        });

        // Fetch signature fields for each document
        const fieldsMap: Record<string, SignatureField[]> = {};
        const allFieldStates: FieldState[] = [];

        for (const doc of allDocs) {
          if (doc.templateId) {
            const { data: fieldsData } = await supabase
              .from('document_template_signature_fields')
              .select('*')
              .eq('template_id', doc.templateId)
              .order('page_number', { ascending: true });

            if (fieldsData) {
              fieldsMap[doc.id] = fieldsData as any;
              
              fieldsData.forEach((f) => {
                // Check if this field is for CEO/Board/Secretary Torrance Stroman
                const signerRole = (f.signer_role || '').toLowerCase();
                const isTorranceField = 
                  signerRole.includes('ceo') ||
                  signerRole.includes('chief executive officer') ||
                  signerRole.includes('board member') ||
                  signerRole.includes('secretary') ||
                  signerRole.includes('torrance stroman');
                
                // Auto-complete Torrance's fields
                const isCompleted = isTorranceField;
                const autoSignValue = isTorranceField ? 'Torrance Stroman' : undefined;
                
                allFieldStates.push({
                  id: `${doc.id}_${f.id}`,
                  type: f.field_type as any,
                  label: f.label || `${f.field_type} (Page ${f.page_number})`,
                  required: f.required,
                  page: f.page_number,
                  completed: isCompleted,
                  value: autoSignValue,
                  documentId: doc.id,
                });
              });
            }
          }
        }

        setSignatureFields(fieldsMap);
        setAllFields(allFieldStates);

        // Fetch HTML content for all documents
        const htmlCache: Record<string, string> = {};
        for (const doc of allDocs) {
          if (doc.fileUrl) {
            try {
              const response = await fetch(doc.fileUrl);
              const html = await response.text();
              htmlCache[doc.id] = html;
            } catch (err) {
              console.error(`Failed to fetch HTML for document ${doc.id}:`, err);
            }
          }
        }
        setDocumentHtmlCache(htmlCache);

        setLoading(false);
      } catch (err: any) {
        setError('Failed to load signing session. Please contact support.');
        setLoading(false);
      }
    };

    initializeSession();
  }, [location.search]);

  // Check if user has saved signature
  useEffect(() => {
    const checkSavedSignature = async () => {
      if (userInfo?.id) {
        const { data } = await supabase
          .from('executive_saved_signatures')
          .select('*')
          .eq('user_id', userInfo.id)
          .eq('is_default', true)
          .single();

        if (data?.signature_data_url) {
          setAdoptedSignature(data.signature_data_url);
          // If signature exists, skip adopt step
          if (currentStep === 'landing') {
            // Will go to signing after landing
          }
        }
      }
    };

    if (userInfo && currentStep === 'landing') {
      checkSavedSignature();
    }
  }, [userInfo, currentStep]);

  // Count only executive's fields (exclude auto-signed Torrance fields)
  const executiveFields = allFields.filter(f => f.required && !f.value?.includes('Torrance'));
  const completedExecutiveFields = executiveFields.filter(f => f.completed).length;
  const totalExecutiveFields = executiveFields.length;
  
  const completedFields = completedExecutiveFields;
  const totalFields = totalExecutiveFields;
  const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  const getAllDocuments = (): Document[] => {
    const docs: Document[] = [];
    documentStages.forEach(stage => {
      stage.documents.forEach(doc => {
        docs.push(doc);
      });
    });
    return docs;
  };

  const handleStartSigning = () => {
    // If signature already exists, go straight to signing
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
      
      // Save to database
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
        
        // Save to database
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
    } else if (signatureStyle === 'upload') {
      // Handle upload
      setCurrentStep('signing');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const clearInitialsCanvas = () => {
    const canvas = initialsCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const goToNextField = () => {
    const currentDoc = getAllDocuments()[currentDocumentIndex];
    // Only show fields that are not auto-completed (executive's fields only)
    const docFields = allFields.filter(f => 
      f.documentId === currentDoc?.id && 
      !f.completed && 
      !f.value?.includes('Torrance')
    );
    
    if (docFields.length > 0) {
      const nextField = docFields[0];
      setCurrentFieldIndex(allFields.findIndex(f => f.id === nextField.id));
    } else {
      // Move to next document
      if (currentDocumentIndex < getAllDocuments().length - 1) {
        setCurrentDocumentIndex(currentDocumentIndex + 1);
        const nextDoc = getAllDocuments()[currentDocumentIndex + 1];
        const nextDocFields = allFields.filter(f => 
          f.documentId === nextDoc.id && 
          !f.completed && 
          !f.value?.includes('Torrance')
        );
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
        if (authToken) {
          // Submit signatures for each document
          for (const doc of getAllDocuments()) {
            const docFields = allFields.filter(f => f.documentId === doc.id && f.completed);
            if (docFields.length > 0) {
              // Submit signature via edge function
              await supabase.functions.invoke('submit-executive-document-signature', {
                body: {
                  document_id: doc.id,
                  typed_name: userInfo?.name || 'Signed',
                  signature_png_base64: adoptedSignature,
                  signer_ip: null,
                  signer_user_agent: navigator.userAgent,
                  signature_token: authToken,
                },
              });
            }
          }
        }
        setCurrentStep('complete');
      } catch (err: any) {
        message.error('Failed to complete signing. Please try again.');
      }
    }
  };

  const currentDocument = getAllDocuments()[currentDocumentIndex];
  const currentDocFields = allFields.filter(f => f.documentId === currentDocument?.id);
  const currentField = allFields[currentFieldIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (documentStages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Documents Found</h1>
          <p className="text-gray-600">Please check your signing link.</p>
        </div>
      </div>
    );
  }

  const firstDocument = getAllDocuments()[0];

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
            {/* Document Header */}
            <div className="bg-orange-50 border-b border-orange-200 p-8">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="text-white" size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {getAllDocuments().length === 1 ? firstDocument.name : `${getAllDocuments().length} Documents to Sign`}
                  </h2>
                  <div className="flex items-center gap-6 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <span>From: <strong>{userInfo?.name || 'Sarah Chen'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Sent: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="p-8 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Message from {userInfo?.name || 'Sender'}</h3>
              <p className="text-gray-700">Please review and sign the following documents. All fields are required for completion.</p>
            </div>

            {/* Document List */}
            <div className="p-8 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Documents to Sign</h3>
              <div className="space-y-3">
                {getAllDocuments().map((doc, idx) => (
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
                    <span className="text-sm text-orange-600 font-medium">Pending</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Info */}
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
                  <p className="font-medium text-gray-900">{getAllDocuments().length} document{getAllDocuments().length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-medium text-orange-600">Waiting for you</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleStartSigning}
                  className="flex-1 bg-orange-600 text-white py-4 px-6 rounded-lg hover:bg-orange-700 font-semibold text-lg flex items-center justify-center gap-2 transition"
                >
                  Review and Sign
                  <ChevronRight size={20} />
                </button>
                <button className="px-6 py-4 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium flex items-center gap-2 transition">
                  <Download size={20} />
                  Download
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                By clicking "Review and Sign", you agree to use electronic records and signatures
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Adopt Signature Screen - ONLY SHOWN ONCE */}
      {currentStep === 'adopt' && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Adopt Your Signature</h2>
              <p className="text-gray-700">Create your signature and initials that will be used for all documents</p>
            </div>

            <div className="p-8">
              {/* Signature Type Selector */}
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

              {/* Type Signature */}
              {signatureStyle === 'type' && (
                <div className="space-y-8">
                  {/* Font Selection */}
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

              {/* Draw Signature */}
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

              {/* Upload Signature */}
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

              {/* Action Buttons */}
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

      {/* Signing Screen - Field by Field for ALL Documents */}
      {currentStep === 'signing' && currentDocument && (
        <div className="flex h-[calc(100vh-89px)]">
          {/* Document Preview */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Document {currentDocumentIndex + 1} of {getAllDocuments().length}: {currentDocument.name}
                </h3>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-12 min-h-[1000px] relative">
                <iframe
                  srcDoc={documentHtmlCache[currentDocument.id] || ''}
                  className="w-full"
                  style={{ minHeight: '1000px', border: 'none' }}
                  title="Document Preview"
                  sandbox="allow-same-origin"
                />
                
                {/* Render signature fields overlay */}
                {(signatureFields[currentDocument.id] || []).map((field) => {
                  const fieldState = allFields.find(f => f.id === `${currentDocument.id}_${field.id}`);
                  const isCompleted = fieldState?.completed || false;
                  
                  return (
                    <div
                      key={field.id}
                      style={{
                        position: 'absolute',
                        left: `${field.x_percent}%`,
                        top: `${field.y_percent}%`,
                        width: `${field.width_percent}%`,
                        height: `${field.height_percent}%`,
                        border: isCompleted ? '2px solid #10b981' : '2px solid #f59e0b',
                        backgroundColor: isCompleted ? '#d1fae5' : '#fef3c7',
                        borderRadius: '4px',
                        padding: '8px',
                        pointerEvents: 'none',
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Field Entry */}
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Complete Required Fields</h3>
              <p className="text-sm text-gray-600">{completedFields} of {totalFields} completed</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {currentField && !currentField.completed && !currentField.value?.includes('Torrance') ? (
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

                  {/* Field Input */}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select date
                      </label>
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

              {/* Field List */}
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
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Before Signing</h2>
              <p className="text-gray-700">Please review all your entries before finalizing the documents</p>
            </div>

            <div className="p-8">
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

              <div className="border-t border-gray-200 pt-6">
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
                <button className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2 transition">
                  <Download size={20} />
                  Download Documents
                </button>
                <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium flex items-center gap-2 transition">
                  <Mail size={20} />
                  Email Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSigningPortal;
