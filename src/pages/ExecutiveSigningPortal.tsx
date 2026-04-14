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
  signature_status?: string;
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

const buildDocumentsFromResponse = (docsData: any): ExecutiveDocument[] => {
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
            created_at: new Date().toISOString(),
            signature_status: doc.signature_status,
          });
        }
      }
    }
  }

  return allDocuments;
};

const buildPersistedSignatures = (
  docsData: any,
  allDocuments: ExecutiveDocument[],
  fallbackName?: string,
): Record<string, DocumentSignature> => {
  const persisted: Record<string, DocumentSignature> = {};

  if (docsData?.alreadySigned) {
    for (const [docId, info] of Object.entries(docsData.alreadySigned as Record<string, any>)) {
      persisted[docId] = {
        documentId: docId,
        signatureName: info?.signature || fallbackName || 'Signed',
        signedAt: info?.timestamp || new Date().toISOString(),
        auditData: {
          timestamp: info?.timestamp || new Date().toISOString(),
          ipAddress: 'recorded',
          userAgent: 'recorded',
          documentVersion: '1.0',
        },
      };
    }
  }

  for (const doc of allDocuments) {
    if (doc.signature_status === 'signed' && !persisted[doc.id]) {
      persisted[doc.id] = {
        documentId: doc.id,
        signatureName: fallbackName || 'Signed',
        signedAt: doc.created_at,
        auditData: {
          timestamp: doc.created_at,
          ipAddress: 'recorded',
          userAgent: 'recorded',
          documentVersion: '1.0',
        },
      };
    }
  }

  return persisted;
};

export default function ExecutiveSigningPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ExecutiveDocument[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [documentHtmlCache, setDocumentHtmlCache] = useState<Record<string, string>>({});
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [documentSignatures, setDocumentSignatures] = useState<Record<string, DocumentSignature>>({});
  const [signingComplete, setSigningComplete] = useState(false);
  const [completionTimestamp, setCompletionTimestamp] = useState<string | null>(null);
  const [preSignedDocIds, setPreSignedDocIds] = useState<Set<string>>(new Set());
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);

  const documentViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSession = async () => {
      if (!token) {
        message.error('No token provided');
        setLoading(false);
        return;
      }

      try {
        const { data: docsData, error: docsError } = await supabase.functions.invoke(
          'get-executive-documents-by-token',
          { body: { token } }
        );

        if (docsError) throw docsError;

        const allDocuments = buildDocumentsFromResponse(docsData);

        if (allDocuments.length === 0) {
          message.error('No documents found');
          setLoading(false);
          return;
        }

        const persistedSignatures = buildPersistedSignatures(
          docsData,
          allDocuments,
          docsData?.user?.officer_name || docsData?.user?.name,
        );
        const persistedSignedIds = new Set(Object.keys(persistedSignatures));

        setDocuments(allDocuments);
        setUserInfo(docsData.user);
        setDocumentSignatures(persistedSignatures);
        setPreSignedDocIds(persistedSignedIds);

        const firstUnsignedIndex = allDocuments.findIndex((doc) => !persistedSignedIds.has(doc.id));
        if (firstUnsignedIndex >= 0) {
          setCurrentDocIndex(firstUnsignedIndex);
        }

        if (allDocuments.length > 0 && persistedSignedIds.size === allDocuments.length) {
          setCompletionTimestamp(new Date().toLocaleString());
          setSigningComplete(true);
        }

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
      } catch (err: any) {
        console.error('Session init error:', err);
        message.error(err.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token]);

  const currentDocument = documents[currentDocIndex];
  const currentDocumentSigned = currentDocument ? documentSignatures[currentDocument.id] : null;

  const isDocumentCompleted = (doc: ExecutiveDocument) =>
    doc.signature_status === 'signed' || Boolean(documentSignatures[doc.id]);

  const remainingCount = documents.filter((doc) => !isDocumentCompleted(doc)).length;
  const signedCount = documents.length - remainingCount;

  const getAdjacentUnsignedIndex = (direction: 'next' | 'previous') => {
    if (documents.length <= 1) return -1;

    const indexes = direction === 'next'
      ? Array.from({ length: documents.length - currentDocIndex - 1 }, (_, i) => currentDocIndex + i + 1)
      : Array.from({ length: currentDocIndex }, (_, i) => currentDocIndex - i - 1);

    for (const index of indexes) {
      const doc = documents[index];
      if (doc && !isDocumentCompleted(doc)) {
        return index;
      }
    }

    return -1;
  };

  const nextUnsignedIndex = getAdjacentUnsignedIndex('next');
  const previousUnsignedIndex = getAdjacentUnsignedIndex('previous');

  const viewerSrcDoc = useMemo(() => {
    const id = currentDocument?.id;
    const raw = id ? documentHtmlCache[id] : '';
    return sanitizeExecutiveDocumentHtml(raw || '<p>Loading...</p>');
  }, [currentDocument?.id, documentHtmlCache]);

  const handleOpenSignatureModal = () => {
    if (!currentDocument || isDocumentCompleted(currentDocument) || savingDocumentId) return;
    setShowSignatureModal(true);
  };

  const handleCloseSignatureModal = () => {
    if (savingDocumentId) return;
    setShowSignatureModal(false);
  };

  const goToNextDocument = () => {
    if (nextUnsignedIndex >= 0) {
      setCurrentDocIndex(nextUnsignedIndex);
    }
  };

  const goToPreviousDocument = () => {
    if (previousUnsignedIndex >= 0) {
      setCurrentDocIndex(previousUnsignedIndex);
    }
  };

  const handleSignDocument = async (
    signatureName: string,
    auditData: {
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      documentVersion: string;
    },
  ) => {
    if (!currentDocument || !token || savingDocumentId) return;

    const signature: DocumentSignature = {
      documentId: currentDocument.id,
      signatureName,
      signedAt: new Date().toISOString(),
      auditData,
    };

    const activeDocId = currentDocument.id;
    const activeDocIndex = currentDocIndex;

    try {
      setSavingDocumentId(activeDocId);
      message.loading({ content: 'Saving signature...', key: 'executive-signature-save', duration: 0 });

      const { data, error } = await supabase.functions.invoke('submit-executive-signatures', {
        body: {
          token,
          documentSignatures: [signature],
          typedName: userInfo?.officer_name || userInfo?.name || signatureName,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to save signature');
      }

      if (data && !data.ok) {
        throw new Error(data.error || 'Failed to save signature');
      }

      setDocumentSignatures((prev) => ({
        ...prev,
        [activeDocId]: signature,
      }));

      setPreSignedDocIds((prev) => {
        const next = new Set(prev);
        next.add(activeDocId);
        return next;
      });

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === activeDocId
            ? { ...doc, signature_status: 'signed' }
            : doc,
        ),
      );

      setShowSignatureModal(false);
      message.success({ content: 'Document signed and saved.', key: 'executive-signature-save' });

      const nextIndex = documents.findIndex((doc, index) => {
        if (index === activeDocIndex || doc.id === activeDocId) return false;
        return doc.signature_status !== 'signed' && !documentSignatures[doc.id];
      });

      if (nextIndex >= 0) {
        setCurrentDocIndex(nextIndex);
      }
    } catch (err: any) {
      console.error('Document sign error:', err);
      message.error({
        content: err.message || 'Failed to save this signature. Please try again.',
        key: 'executive-signature-save',
      });
    } finally {
      setSavingDocumentId(null);
    }
  };

  const handleFinishSigning = async () => {
    const unsignedDocuments = documents.filter((doc) => !isDocumentCompleted(doc));
    if (unsignedDocuments.length > 0) {
      message.error(`Please sign all ${unsignedDocuments.length} remaining document(s) before finishing`);
      return;
    }

    if (!token) {
      message.error('Missing signing token');
      return;
    }

    try {
      setLoading(true);

      const { data: docsData, error: docsError } = await supabase.functions.invoke(
        'get-executive-documents-by-token',
        { body: { token } }
      );

      if (docsError) {
        throw docsError;
      }

      const persistedDocuments = buildDocumentsFromResponse(docsData);
      const persistedSignatures = buildPersistedSignatures(
        docsData,
        persistedDocuments,
        userInfo?.officer_name || userInfo?.name,
      );
      const persistedSignedIds = new Set(Object.keys(persistedSignatures));

      setDocuments(persistedDocuments);
      setDocumentSignatures(persistedSignatures);
      setPreSignedDocIds(persistedSignedIds);

      if (persistedSignedIds.size !== persistedDocuments.length) {
        const firstUnsignedIndex = persistedDocuments.findIndex((doc) => !persistedSignedIds.has(doc.id));
        if (firstUnsignedIndex >= 0) {
          setCurrentDocIndex(firstUnsignedIndex);
        }

        message.error(`Only ${persistedSignedIds.size} of ${persistedDocuments.length} documents are saved.`);
        return;
      }

      setCompletionTimestamp(new Date().toLocaleString());
      setSigningComplete(true);
      message.success('All documents signed successfully!');
    } catch (err: any) {
      console.error('Submit error:', err);
      const errorMessage = err.message || err.error || 'Failed to verify signatures. Please try again.';
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

  if (signingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-lg w-full p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <PartyPopper className="w-6 h-6 text-primary" />
              All Documents Signed
            </h1>
            <p className="text-muted-foreground">
              Congratulations! You have successfully signed all {documents.length} required document{documents.length !== 1 ? 's' : ''}.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Legally Binding Signatures</p>
                <p className="text-xs text-muted-foreground">
                  Your electronic signatures have been recorded with full audit trail including timestamp, IP address, and document versioning.
                </p>
              </div>
            </div>
            <div className="border-t pt-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Signed by:</span> {userInfo?.officer_name || userInfo?.name || 'Executive'}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Completed at:</span> {completionTimestamp}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Documents signed:</span> {signedCount} of {documents.length}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your appointment will now proceed to Corporate Secretary review and final validation.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
              size="lg"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="w-80 flex-shrink-0 border-r bg-card p-4 flex flex-col gap-4 overflow-hidden">
        <div>
          <h2 className="font-bold text-lg mb-2">Documents</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {remainingCount} document(s) remaining to sign
          </p>

          <div className="space-y-2 mb-6">
            {documents.map((doc, index) => {
              const isCompleted = isDocumentCompleted(doc);
              const isCurrent = index === currentDocIndex;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (!isCompleted) setCurrentDocIndex(index);
                  }}
                  className={`p-3 rounded-lg border transition-colors ${
                    isCompleted
                      ? 'border-green-200 bg-green-50/50 opacity-60 cursor-default'
                      : isCurrent
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'border-border hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isCompleted ? 'Completed' : `Document ${index + 1}`}
                      </p>
                    </div>
                    {isCompleted && (
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
              Signed: {signedCount} / {documents.length}
            </p>
            {signedCount === documents.length && documents.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <p className="text-sm text-green-700 font-medium">
                  All documents signed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
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
                disabled={previousUnsignedIndex < 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNextDocument}
                disabled={nextUnsignedIndex < 0}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-muted/30">
          <div
            ref={documentViewerRef}
            className="relative mx-auto max-w-[9in] min-h-[800px] rounded-sm border border-border bg-zinc-100 p-4 shadow-xl"
          >
            <iframe
              title={currentDocument?.title || 'Executive document'}
              srcDoc={viewerSrcDoc}
              className="h-[min(85vh,1100px)] w-full border-0 bg-white shadow-inner"
              sandbox="allow-same-origin"
            />

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

          <div className="mt-6 max-w-4xl mx-auto">
            {currentDocumentSigned ? (
              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  This document has been signed and saved.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Please review the document above, then click the button below to sign and save it.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {!currentDocumentSigned && (
                <Button
                  onClick={handleOpenSignatureModal}
                  className="flex-1"
                  disabled={Boolean(savingDocumentId)}
                >
                  {savingDocumentId === currentDocument?.id ? 'Saving...' : 'Sign & Save Document'}
                </Button>
              )}

              {nextUnsignedIndex >= 0 && (
                <Button
                  variant="outline"
                  onClick={goToNextDocument}
                  className="flex-1"
                >
                  Next Document
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}

              {documents.length > 0 && signedCount === documents.length && (
                <Button
                  onClick={handleFinishSigning}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={loading || Boolean(savingDocumentId)}
                >
                  {loading ? 'Verifying...' : 'Finish & Submit All Documents'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {currentDocument && (
        <ElectronicSignatureAcknowledgment
          isOpen={showSignatureModal}
          onClose={handleCloseSignatureModal}
          onSign={handleSignDocument}
          documentTitle={currentDocument.title}
          documentVersion={currentDocument.document_type || '1.0'}
        />
      )}
    </div>
  );
}
