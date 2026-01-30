import React, { useState, useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Table,
  Badge,
  Group,
  Button,
  Loader,
  Alert,
  Tabs,
} from '@mantine/core';
import { IconFileText, IconDownload, IconEye } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface BoardDocument {
  id: string;
  title: string;
  type: string;
  resolution_number?: string;
  pdf_url?: string;
  html_template?: string;
  signing_status: string;
  created_at: string;
}

const BoardDocumentsTab: React.FC = () => {
  const [documents, setDocuments] = useState<BoardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'all' | 'resolutions' | 'minutes'>('all');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('board_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
        return;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      board_resolution: 'blue',
      board_minutes: 'green',
      officer_appointment_resolution: 'purple',
      stock_issuance_resolution: 'orange',
    };
    return (
      <Badge color={colors[type] || 'gray'} variant="light">
        {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  const getSigningBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'green',
      partially_signed: 'yellow',
      pending: 'gray',
    };
    return (
      <Badge color={colors[status] || 'gray'} variant="light">
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    if (activeView === 'resolutions') {
      return doc.type.includes('resolution');
    }
    if (activeView === 'minutes') {
      return doc.type.includes('minutes');
    }
    return true;
  });

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading documents...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Board Documents</Title>
        <Text c="dimmed">Access board resolutions, minutes, and governance documents</Text>
      </div>

      <Tabs value={activeView} onChange={(v) => setActiveView(v as 'all' | 'resolutions' | 'minutes')}>
        <Tabs.List>
          <Tabs.Tab value="all">All Documents ({documents.length})</Tabs.Tab>
          <Tabs.Tab value="resolutions">
            Resolutions ({documents.filter(d => d.type.includes('resolution')).length})
          </Tabs.Tab>
          <Tabs.Tab value="minutes">
            Minutes ({documents.filter(d => d.type.includes('minutes')).length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="all" pt="xl">
          <DocumentList documents={filteredDocuments} getTypeBadge={getTypeBadge} getSigningBadge={getSigningBadge} />
        </Tabs.Panel>

        <Tabs.Panel value="resolutions" pt="xl">
          <DocumentList documents={filteredDocuments} getTypeBadge={getTypeBadge} getSigningBadge={getSigningBadge} />
        </Tabs.Panel>

        <Tabs.Panel value="minutes" pt="xl">
          <DocumentList documents={filteredDocuments} getTypeBadge={getTypeBadge} getSigningBadge={getSigningBadge} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

interface DocumentListProps {
  documents: BoardDocument[];
  getTypeBadge: (type: string) => React.ReactNode;
  getSigningBadge: (status: string) => React.ReactNode;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, getTypeBadge, getSigningBadge }) => {
  if (documents.length === 0) {
    return (
      <Alert color="blue">
        No documents found. Board documents will appear here once they are generated.
      </Alert>
    );
  }

  return (
    <Card padding={0} radius="md" withBorder>
      <Table.ScrollContainer minWidth={800}>
        <Table highlightOnHover verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Document</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Resolution #</Table.Th>
              <Table.Th>Signing Status</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {documents.map((doc) => (
              <Table.Tr key={doc.id}>
                <Table.Td>
                  <Text fw={500}>{doc.title}</Text>
                </Table.Td>
                <Table.Td>{getTypeBadge(doc.type)}</Table.Td>
                <Table.Td>
                  {doc.resolution_number ? (
                    <Text size="sm" fw={500}>
                      {doc.resolution_number}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      N/A
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{getSigningBadge(doc.signing_status)}</Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {dayjs(doc.created_at).format('MMM D, YYYY')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {doc.pdf_url && (
                      <Button
                        component="a"
                        href={doc.pdf_url}
                        target="_blank"
                        size="xs"
                        variant="light"
                        leftSection={<IconEye size={14} />}
                      >
                        View
                      </Button>
                    )}
                    {doc.pdf_url && (
                      <Button
                        component="a"
                        href={doc.pdf_url}
                        download
                        size="xs"
                        variant="subtle"
                        leftSection={<IconDownload size={14} />}
                      >
                        Download
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
};

export default BoardDocumentsTab;





