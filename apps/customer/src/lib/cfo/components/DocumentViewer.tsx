import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Modal, Stack, Group, Button, Text, Title, Badge, ScrollArea, Divider } from '@mantine/core';
import { IconDownload, IconFileText, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { AcknowledgementButton } from './AcknowledgementButton';

interface DocumentViewerProps {
  documentKey: string;
  role: 'cfo' | 'cxo' | 'cto';
  opened: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentKey,
  role,
  opened,
  onClose,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useEffect(() => {
    if (opened && documentKey) {
      loadDocument();
      checkAcknowledgement();
    }
  }, [opened, documentKey, role]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      // Load document index to get metadata
      const indexResponse = await fetch(`/lib/${role}/metadata/document_index.json`);
      const indexData = await indexResponse.json();
      const doc = indexData.documents.find((d: any) => d.key === documentKey);
      setDocumentInfo(doc);

      // Load HTML content
      const htmlResponse = await fetch(`/lib/${role}/documents/html/${documentKey}.html`);
      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        setHtmlContent(html);
      } else {
        setHtmlContent('<p>Document not found.</p>');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setHtmlContent('<p>Error loading document.</p>');
    } finally {
      setLoading(false);
    }
  };

  const checkAcknowledgement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from(`${role}_acknowledgments`)
        .select('*')
        .eq('user_id', user.id)
        .eq('document_key', documentKey)
        .single();

      setIsAcknowledged(!!data);
    } catch (error) {
      console.error('Error checking acknowledgement:', error);
    }
  };

  const handleDownloadPDF = () => {
    // In a real implementation, this would generate or fetch a PDF
    window.open(`/lib/${role}/documents/pdf_text/${documentKey}.txt`, '_blank');
  };

  const handleDownloadMarkdown = () => {
    window.open(`/lib/${role}/documents/markdown/${documentKey}.md`, '_blank');
  };

  const handleAcknowledge = () => {
    checkAcknowledgement();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" w="100%">
          <div>
            <Title order={3}>{documentInfo?.title || 'Document'}</Title>
            <Text size="sm" c="dimmed">{documentInfo?.category || ''}</Text>
          </div>
          {isAcknowledged && (
            <Badge color="green" leftSection={<IconCheck size={14} />}>
              Acknowledged
            </Badge>
          )}
        </Group>
      }
      size="xl"
      styles={{
        body: { padding: 0 },
      }}
    >
      <Stack gap="md" p="md">
        <Group justify="space-between">
          <Group>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </Button>
            <Button
              variant="light"
              leftSection={<IconFileText size={16} />}
              onClick={handleDownloadMarkdown}
            >
              Download Markdown
            </Button>
          </Group>
        </Group>

        <Divider />

        <ScrollArea h={600}>
          <div
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
            style={{
              padding: '1rem',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          />
        </ScrollArea>

        <Divider />

        <AcknowledgementButton
          documentKey={documentKey}
          role={role}
          isAcknowledged={isAcknowledged}
          onAcknowledge={handleAcknowledge}
        />
      </Stack>
    </Modal>
  );
};

