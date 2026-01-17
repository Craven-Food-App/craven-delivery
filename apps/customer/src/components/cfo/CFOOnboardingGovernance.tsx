import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Alert, Loader, Center } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { DocumentList } from '@/lib/cfo/components/DocumentList';
import { DocumentViewer } from '@/lib/cfo/components/DocumentViewer';

interface Document {
  key: string;
  title: string;
  category: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
}

export const CFOOnboardingGovernance: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [viewerOpened, setViewerOpened] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load document index
      const indexResponse = await fetch('/lib/cfo/metadata/document_index.json');
      const indexData = await indexResponse.json();
      
      // Get user acknowledgments
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDocuments(indexData.documents.map((doc: any) => ({
          key: doc.key,
          title: doc.title,
          category: doc.category,
          isAcknowledged: false,
        })));
        setLoading(false);
        return;
      }

      const { data: acknowledgments } = await supabase
        .from('cfo_acknowledgments')
        .select('document_key, signed_at')
        .eq('user_id', user.id);

      const ackMap = new Map(
        (acknowledgments || []).map((a: any) => [a.document_key, a.signed_at])
      );

      const docsWithStatus = indexData.documents.map((doc: any) => ({
        key: doc.key,
        title: doc.title,
        category: doc.category,
        isAcknowledged: ackMap.has(doc.key),
        acknowledgedAt: ackMap.get(doc.key),
      }));

      setDocuments(docsWithStatus);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (documentKey: string) => {
    setSelectedDocument(documentKey);
    setViewerOpened(true);
  };

  const handleViewerClose = () => {
    setViewerOpened(false);
    setSelectedDocument(null);
    // Reload to refresh acknowledgment status
    loadDocuments();
  };

  const acknowledgedCount = documents.filter(d => d.isAcknowledged).length;
  const totalCount = documents.length;
  const allAcknowledged = acknowledgedCount === totalCount && totalCount > 0;

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>CFO Onboarding & Governance</Title>
        <Text c="dimmed" size="sm">
          Central hub for CFO role onboarding, governance, policies, workflows, and system access.
        </Text>
      </div>

      {allAcknowledged ? (
        <Alert
          icon={<IconCheck size={16} />}
          title="All Documents Acknowledged"
          color="green"
        >
          You have successfully acknowledged all required CFO governance documents. You have full access to the CFO portal.
        </Alert>
      ) : (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Action Required"
          color="orange"
        >
          You must acknowledge all CFO governance documents before gaining full access to operational tools and dashboards.
          <br />
          <strong>{acknowledgedCount} of {totalCount} documents acknowledged</strong>
        </Alert>
      )}

      <DocumentList
        documents={documents}
        onDocumentClick={handleDocumentClick}
      />

      {selectedDocument && (
        <DocumentViewer
          documentKey={selectedDocument}
          role="cfo"
          opened={viewerOpened}
          onClose={handleViewerClose}
        />
      )}
    </Stack>
  );
};

export default CFOOnboardingGovernance;
