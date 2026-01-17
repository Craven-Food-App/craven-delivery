import React, { useState, useMemo } from 'react';
import { Grid, Select, TextInput, Group, Text, Badge, Stack } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { DocumentCard } from './DocumentCard';

interface Document {
  key: string;
  title: string;
  category: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
}

interface DocumentListProps {
  documents: Document[];
  onDocumentClick: (documentKey: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(documents.map(d => d.category));
    return Array.from(cats).sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, categoryFilter]);

  const acknowledgedCount = documents.filter(d => d.isAcknowledged).length;
  const pendingCount = documents.length - acknowledgedCount;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <div>
          <Text size="xl" fw={600}>Governance Documents</Text>
          <Text size="sm" c="dimmed">
            {acknowledgedCount} of {documents.length} acknowledged
          </Text>
        </div>
        <Group>
          <Badge color="green" variant="light">{acknowledgedCount} Complete</Badge>
          <Badge color="orange" variant="light">{pendingCount} Pending</Badge>
        </Group>
      </Group>

      <Group>
        <TextInput
          placeholder="Search documents..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Filter by category"
          data={categories}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          style={{ width: 200 }}
        />
      </Group>

      <Grid>
        {filteredDocuments.map((doc) => (
          <Grid.Col key={doc.key} span={{ base: 12, sm: 6, md: 4 }}>
            <DocumentCard
              documentKey={doc.key}
              title={doc.title}
              category={doc.category}
              isAcknowledged={doc.isAcknowledged}
              acknowledgedAt={doc.acknowledgedAt}
              onClick={() => onDocumentClick(doc.key)}
            />
          </Grid.Col>
        ))}
      </Grid>

      {filteredDocuments.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No documents found matching your search criteria.
        </Text>
      )}
    </Stack>
  );
};

