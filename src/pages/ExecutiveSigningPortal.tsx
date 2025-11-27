import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, ChevronLeft, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { message } from 'antd';
import SignaturePad from 'react-signature-canvas';
import { SignatureTag } from '@/components/executive/SignatureTag';
import { PlacedSignatureItem } from '@/components/executive/PlacedSignatureItem';

interface ExecutiveDocument {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  created_at: string;
}

interface PlacedSignature {
  id: string;
  type: 'signature' | 'initial';
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  dataUrl: string;
  isLocked: boolean;
  placedAt: string;
  documentId: string;
}

export default function ExecutiveSigningPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // State management
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ExecutiveDocument[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [documentHtmlCache, setDocumentHtmlCache] = useState<Record<string, string>>({});
  const [userInfo, setUserInfo] = useState<any>(null);
  const [ceoSignatureDataUrl, setCeoSignatureDataUrl] = useState<string>('');
  
  // Signature adoption
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [adoptedSignature, setAdoptedSignature] = useState<string>('');
  const [adoptedInitials, setAdoptedInitials] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState<string>('Brush Script MT');
  const [typedName, setTypedName] = useState<string>('');
  const [typedInitials, setTypedInitials] = useState<string>('');
  const [adoptionMethod, setAdoptionMethod] = useState<'type' | 'draw'>('type');
  
  // Drag and drop
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemType, setDraggedItemType] = useState<'signature' | 'initial' | null>(null);
  
  const signaturePadRef = useRef<SignaturePad>(null);
  const initialsPadRef = useRef<SignaturePad>(null);
  const documentViewerRef = useRef<HTMLDivElement>(null);

  const fonts = [
    'Brush Script MT',
    'Lucida Handwriting',
    'Freestyle Script',
    'Segoe Script',
    'Vladimir Script'
  ];

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      if (!token) {
        message.error('No token provided');
        return;
      }

      try {
        // Fetch documents by token
        const { data: docsData, error: docsError } = await supabase.functions.invoke(
          'get-executive-documents-by-token',
          { body: { token } }
        );

        if (docsError) throw docsError;
        
        // Extract all documents from documentFlow stages
        const allDocuments: ExecutiveDocument[] = [];
        if (docsData?.documentFlow) {
          for (const stage of docsData.documentFlow) {
            if (stage.documents) {
              for (const doc of stage.documents) {
                allDocuments.push({
                  id: doc.id,
                  title: doc.name,
                  document_type: doc.name,
                  file_url: doc.fileUrl,
                  created_at: new Date().toISOString()
                });
              }
            }
          }
        }

        if (allDocuments.length === 0) {
          message.error('No documents found');
          return;
        }

        setDocuments(allDocuments);
        setUserInfo(docsData.user);

        // Fetch CEO signature
        const { data: ceoSigData } = await supabase
          .from('ceo_system_settings')
          .select('setting_value')
          .eq('setting_key', 'ceo_signature')
          .maybeSingle();

        const ceoSig = (ceoSigData?.setting_value as any)?.signature_png_base64 || '';
        setCeoSignatureDataUrl(ceoSig);

        // Fetch HTML for all documents
        const htmlCache: Record<string, string> = {};
        for (const doc of allDocuments) {
          try {
            const response = await fetch(doc.file_url);
            const html = await response.text();
            htmlCache[doc.id] = html;
          } catch (err) {
            console.error(`Failed to load HTML for ${doc.id}:`, err);
          }
        }
        setDocumentHtmlCache(htmlCache);
        setLoading(false);
      } catch (err: any) {
        console.error('Session init error:', err);
        message.error(err.message || 'Failed to load documents');
        setLoading(false);
      }
    };

    initSession();
  }, [token]);

  // Signature adoption handlers
  const handleAdoptSignature = () => {
    if (adoptionMethod === 'type') {
      if (!typedName.trim()) {
        message.error('Please enter your name');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 400, 100);
        ctx.fillStyle = 'black';
        ctx.font = `40px ${selectedFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 200, 50);
      }
      setAdoptedSignature(canvas.toDataURL());
    } else {
      if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
        message.error('Please draw your signature');
        return;
      }
      setAdoptedSignature(signaturePadRef.current.toDataURL());
    }
    message.success('Signature adopted successfully');
  };

  const handleAdoptInitials = () => {
    if (adoptionMethod === 'type') {
      if (!typedInitials.trim()) {
        message.error('Please enter your initials');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 100);
        ctx.fillStyle = 'black';
        ctx.font = `40px ${selectedFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedInitials, 100, 50);
      }
      setAdoptedInitials(canvas.toDataURL());
    } else {
      if (!initialsPadRef.current || initialsPadRef.current.isEmpty()) {
        message.error('Please draw your initials');
        return;
      }
      setAdoptedInitials(initialsPadRef.current.toDataURL());
    }
    message.success('Initials adopted successfully');
  };

  const handleDoneAdopting = () => {
    if (!adoptedSignature || !adoptedInitials) {
      message.error('Please adopt both signature and initials');
      return;
    }
    setShowAdoptModal(false);
  };

  // Drag and drop handlers
  const handleDragStart = (type: 'signature' | 'initial') => {
    setIsDragging(true);
    setDraggedItemType(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!draggedItemType) return;
    if (!documentViewerRef.current) return;

    const rect = documentViewerRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const dataUrl = draggedItemType === 'signature' ? adoptedSignature : adoptedInitials;
    
    const newSignature: PlacedSignature = {
      id: crypto.randomUUID(),
      type: draggedItemType,
      pageNumber: currentDocIndex + 1,
      xPercent: Math.max(0, Math.min(95, xPercent)),
      yPercent: Math.max(0, Math.min(95, yPercent)),
      dataUrl,
      isLocked: false,
      placedAt: new Date().toISOString(),
      documentId: currentDocument?.id || '',
    };

    setPlacedSignatures([...placedSignatures, newSignature]);
    setDraggedItemType(null);
    message.success(`${draggedItemType === 'signature' ? 'Signature' : 'Initial'} placed`);
  };

  const handleLockSignature = (signatureId: string) => {
    setPlacedSignatures(prev =>
      prev.map(sig =>
        sig.id === signatureId ? { ...sig, isLocked: true } : sig
      )
    );
    message.success('Signature locked in place permanently');
  };

  const handleDeleteSignature = (signatureId: string) => {
    setPlacedSignatures(prev => prev.filter(sig => sig.id !== signatureId));
    message.info('Signature removed');
  };

  // Document navigation
  const currentDocument = documents[currentDocIndex];
  const currentDocSignatures = placedSignatures.filter(
    sig => sig.documentId === currentDocument?.id
  );

  const goToNextDocument = () => {
    if (currentDocIndex < documents.length - 1) {
      setCurrentDocIndex(currentDocIndex + 1);
    }
  };

  const goToPreviousDocument = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(currentDocIndex - 1);
    }
  };

  // Submit signatures
  const handleFinishSigning = async () => {
    const unlockedSignatures = placedSignatures.filter(s => !s.isLocked);
    if (unlockedSignatures.length > 0) {
      message.error(`Please lock all ${unlockedSignatures.length} placed signature(s) before finishing`);
      return;
    }

    if (placedSignatures.length === 0) {
      message.error('Please place at least one signature');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('submit-executive-signatures', {
        body: {
          token,
          placedSignatures,
          typedName: userInfo?.officer_name || typedName,
        }
      });

      if (error) throw error;

      message.success('Documents signed successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      console.error('Submit error:', err);
      message.error(err.message || 'Failed to submit signatures');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!adoptedSignature || !adoptedInitials || showAdoptModal) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-4xl mx-auto p-8">
          <h1 className="text-2xl font-bold mb-6">Adopt Your Signature & Initials</h1>
          
          <div className="mb-6">
            <div className="flex gap-4 mb-4">
              <Button
                variant={adoptionMethod === 'type' ? 'default' : 'outline'}
                onClick={() => setAdoptionMethod('type')}
              >
                Type
              </Button>
              <Button
                variant={adoptionMethod === 'draw' ? 'default' : 'outline'}
                onClick={() => setAdoptionMethod('draw')}
              >
                Draw
              </Button>
            </div>

            {adoptionMethod === 'type' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Choose Font</label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full border rounded p-2"
                >
                  {fonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Full Signature</h3>
                {adoptionMethod === 'type' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full border rounded p-2 mb-2"
                    />
                    <div 
                      className="border rounded p-4 bg-white h-24 flex items-center justify-center"
                      style={{ fontFamily: selectedFont, fontSize: '32px' }}
                    >
                      {typedName || 'Your signature'}
                    </div>
                  </>
                ) : (
                  <div className="border rounded bg-white">
                    <SignaturePad
                      ref={signaturePadRef}
                      canvasProps={{ className: 'w-full h-32' }}
                    />
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleAdoptSignature} className="flex-1">
                    Adopt Signature
                  </Button>
                  {adoptionMethod === 'draw' && (
                    <Button
                      variant="outline"
                      onClick={() => signaturePadRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {adoptedSignature && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Signature adopted</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Initials</h3>
                {adoptionMethod === 'type' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Enter initials (e.g., JS)"
                      value={typedInitials}
                      onChange={(e) => setTypedInitials(e.target.value)}
                      className="w-full border rounded p-2 mb-2"
                      maxLength={4}
                    />
                    <div 
                      className="border rounded p-4 bg-white h-24 flex items-center justify-center"
                      style={{ fontFamily: selectedFont, fontSize: '32px' }}
                    >
                      {typedInitials || 'Initials'}
                    </div>
                  </>
                ) : (
                  <div className="border rounded bg-white">
                    <SignaturePad
                      ref={initialsPadRef}
                      canvasProps={{ className: 'w-full h-32' }}
                    />
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleAdoptInitials} className="flex-1">
                    Adopt Initials
                  </Button>
                  {adoptionMethod === 'draw' && (
                    <Button
                      variant="outline"
                      onClick={() => initialsPadRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {adoptedInitials && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Initials adopted</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleDoneAdopting}
            disabled={!adoptedSignature || !adoptedInitials}
            className="w-full"
          >
            Continue to Document Signing
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card p-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="font-bold text-lg mb-2">Your Signatures</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Drag these to the document to place them
          </p>
          
          <div className="space-y-4 mb-6">
            <SignatureTag
              type="signature"
              dataUrl={adoptedSignature}
              label="Your Signature"
              onDragStart={handleDragStart}
            />
            <SignatureTag
              type="initial"
              dataUrl={adoptedInitials}
              label="Your Initials"
              onDragStart={handleDragStart}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Placed Signatures</h3>
          {currentDocSignatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signatures placed yet</p>
          ) : (
            <div className="space-y-2">
              {currentDocSignatures.map(sig => (
                <PlacedSignatureItem
                  key={sig.id}
                  signature={sig}
                  onLock={handleLockSignature}
                  onDelete={handleDeleteSignature}
                  onReposition={(id) => {}}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-auto">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-sm text-blue-800">
              <Lock className="w-4 h-4 inline mr-1" />
              Lock all signatures before submitting
            </p>
          </div>
          <Button
            onClick={handleFinishSigning}
            className="w-full"
            disabled={placedSignatures.some(s => !s.isLocked)}
          >
            Finish & Submit All Documents
          </Button>
        </div>
      </div>

      {/* Main Document Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-bold text-lg">{currentDocument?.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Document {currentDocIndex + 1} of {documents.length}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goToPreviousDocument}
                disabled={currentDocIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNextDocument}
                disabled={currentDocIndex === documents.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Document Drop Zone */}
        <div className="flex-1 overflow-auto p-6">
          <div
            ref={documentViewerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative bg-white shadow-lg mx-auto max-w-4xl min-h-[800px] border-2 ${
              isDragging ? 'border-primary border-dashed' : 'border-border'
            }`}
          >
            {/* Document HTML */}
            <div 
              dangerouslySetInnerHTML={{ 
                __html: documentHtmlCache[currentDocument?.id] || '<p>Loading...</p>' 
              }}
              className="p-8"
            />

            {/* Placed Signatures Overlay */}
            {currentDocSignatures.map(sig => (
              <div
                key={sig.id}
                style={{
                  position: 'absolute',
                  left: `${sig.xPercent}%`,
                  top: `${sig.yPercent}%`,
                  cursor: sig.isLocked ? 'default' : 'move',
                  zIndex: 10,
                }}
                className={`${sig.isLocked ? 'border-2 border-green-500' : 'border-2 border-orange-500 border-dashed'}`}
              >
                <img
                  src={sig.dataUrl}
                  alt={sig.type}
                  className="max-w-[200px] bg-white p-1"
                />
                {sig.isLocked && (
                  <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">
                    Drop to place {draggedItemType}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
