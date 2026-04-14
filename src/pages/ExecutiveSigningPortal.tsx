import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, ChevronLeft, ChevronRight, CheckCircle2, PartyPopper, Shield } from 'lucide-react';
import { message } from 'antd';
import { ElectronicSignatureAcknowledgment } from '@/components/executive/ElectronicSignatureAcknowledgment';
import { sanitizeExecutiveDocumentHtml } from '@/utils/executiveDocumentHtml';

interface ExecutiveDocument {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  created_at: string;
}

interface DocumentSignature {
  documentId: string;
  signatureName: string;
  signedAt: string;
  auditData: {
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    documentVersion: string;
  };
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
  
  // Signature modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [documentSignatures, setDocumentSignatures] = useState<Record<string, DocumentSignature>>({});
  const [signingComplete, setSigningComplete] = useState(false);
  const [completionTimestamp, setCompletionTimestamp] = useState<string | null>(null);
  
  const documentViewerRef = useRef<HTMLDivElement>(null);

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

  // Signature modal handlers
  const handleOpenSignatureModal = () => {
    setShowSignatureModal(true);
  };

  const handleCloseSignatureModal = () => {
    setShowSignatureModal(false);
  };

  const handleSignDocument = (signatureName: string, auditData: {
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    documentVersion: string;
  }) => {
    if (!currentDocument) return;

    const signature: DocumentSignature = {
      documentId: currentDocument.id,
      signatureName,
      signedAt: new Date().toISOString(),
      auditData,
    };

    setDocumentSignatures(prev => ({
      ...prev,
      [currentDocument.id]: signature,
    }));

    setShowSignatureModal(false);
    message.success('Document signed successfully');
  };

  // Document navigation
  const currentDocument = documents[currentDocIndex];
  const currentDocumentSigned = currentDocument ? documentSignatures[currentDocument.id] : null;

  const viewerSrcDoc = useMemo(() => {
    const id = currentDocument?.id;
    const raw = id ? documentHtmlCache[id] : '';
    return sanitizeExecutiveDocumentHtml(raw || '<p>Loading...</p>');
  }, [currentDocument?.id, documentHtmlCache]);

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

  // Submit all signatures
  const handleFinishSigning = async () => {
    // Check if all documents are signed
    const unsignedDocuments = documents.filter(doc => !documentSignatures[doc.id]);
    if (unsignedDocuments.length > 0) {
      message.error(`Please sign all ${unsignedDocuments.length} remaining document(s) before finishing`);
      return;
    }

    if (Object.keys(documentSignatures).length === 0) {
      message.error('Please sign at least one document');
      return;
    }

    try {
      setLoading(true);
      // Get IP address (will be captured server-side, but include in payload)
      const { data, error } = await supabase.functions.invoke('submit-executive-signatures', {
        body: {
          token,
          documentSignatures: Object.values(documentSignatures),
          typedName: userInfo?.officer_name || userInfo?.name || Object.values(documentSignatures)[0]?.signatureName || '',
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to submit signatures');
      }

      if (data && !data.ok) {
        throw new Error(data.error || 'Failed to submit signatures');
      }

      setCompletionTimestamp(new Date().toLocaleString());
      setSigningComplete(true);
      message.success('All documents signed successfully!');
    } catch (err: any) {
      console.error('Submit error:', err);
      const errorMessage = err.message || err.error || 'Failed to submit signatures. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }


  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar - Document list and status */}
      <div className="w-80 flex-shrink-0 border-r bg-card p-4 flex flex-col gap-4 overflow-hidden">
        <div>
          <h2 className="font-bold text-lg mb-2">Documents</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {documents.length} document(s) to sign
          </p>
          
          <div className="space-y-2 mb-6">
            {documents.map((doc, index) => {
              const isSigned = documentSignatures[doc.id];
              const isCurrent = index === currentDocIndex;
              return (
                <div
                  key={doc.id}
                  onClick={() => setCurrentDocIndex(index)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isCurrent ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Document {index + 1}
                      </p>
                    </div>
                    {isSigned && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm">
            <p className="text-muted-foreground mb-2">
              Signed: {Object.keys(documentSignatures).length} / {documents.length}
            </p>
            {Object.keys(documentSignatures).length === documents.length && documents.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <p className="text-sm text-green-700 font-medium">
                  All documents signed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Document Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="border-b bg-card p-4 flex-shrink-0">
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

        {/* Document Viewer */}
        <div className="flex-1 overflow-auto p-6 bg-muted/30">
          <div
            ref={documentViewerRef}
            className="relative mx-auto max-w-[9in] min-h-[800px] rounded-sm border border-border bg-zinc-100 p-4 shadow-xl"
          >
            {/* Full HTML documents with <style> must render in iframe — DOMPurify-sanitized div strips or breaks head/body */}
            <iframe
              title={currentDocument?.title || 'Executive document'}
              srcDoc={viewerSrcDoc}
              className="h-[min(85vh,1100px)] w-full border-0 bg-white shadow-inner"
              sandbox="allow-same-origin"
            />

            {/* Signature Status Overlay */}
            {currentDocumentSigned && (
              <div className="absolute bottom-4 right-4 bg-green-50 border-2 border-green-500 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">Signed</p>
                    <p className="text-xs text-green-600">
                      {currentDocumentSigned.signatureName}
                    </p>
                    <p className="text-xs text-green-600">
                      {new Date(currentDocumentSigned.signedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Section */}
          <div className="mt-6 max-w-4xl mx-auto">
            {currentDocumentSigned ? (
              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  This document has been signed. You can review it or proceed to the next document.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Please review the document above, then click the button below to sign and acknowledge.
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              {!currentDocumentSigned && (
                <Button
                  onClick={handleOpenSignatureModal}
                  className="flex-1"
                >
                  Sign & Acknowledge Document
                </Button>
              )}
              
              {currentDocIndex < documents.length - 1 && (
                <Button
                  variant="outline"
                  onClick={goToNextDocument}
                  className="flex-1"
                >
                  Next Document
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              
              {Object.keys(documentSignatures).length === documents.length && documents.length > 0 && (
                <Button
                  onClick={handleFinishSigning}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Finish & Submit All Documents'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Electronic Signature Modal */}
      {currentDocument && (
        <ElectronicSignatureAcknowledgment
          isOpen={showSignatureModal}
          onClose={handleCloseSignatureModal}
          onSign={handleSignDocument}
          documentTitle={currentDocument.title}
          documentVersion={currentDocument.document_type || "1.0"}
        />
      )}
    </div>
  );
}
