import React, { useState, useEffect } from 'react';
import { Container, Stack, Title, Text, Card, Group, Badge, Button, Table, Select, TextInput, Grid, Loader, Center, Alert } from '@mantine/core';
import { IconFileText, IconDownload, IconSearch, IconFilter, IconEye, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { markdownToPdf } from '@/utils/markdownToPdf';
import { SOP_CONTENT } from './sopContent';

console.log('📦 [SOP] SOPManagement module loaded');

interface SOPDocument {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  version: string;
  status: 'draft' | 'active' | 'archived';
  markdown_file_path: string | null;
  pdf_file_path: string | null;
  owner_department: string | null;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  review_frequency_days: number;
  page_count: number | null;
  file_size_bytes: number | null;
  tags: string[] | null;
  keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

const SOPManagement: React.FC = () => {
  console.log('📄 [SOP] SOPManagement component function called!');
  
  const [sops, setSops] = useState<SOPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    console.log('🚀 [SOP] Component mounted, fetching SOPs...');
    fetchSOPs();
  }, []);

  const fetchSOPs = async () => {
    try {
      console.log('🔍 [SOP] Starting fetch...');
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 [SOP] Current user:', user?.email, 'ID:', user?.id);
      
      const { data, error } = await supabase
        .from('sop_documents')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 [SOP] Query result:', { 
        hasData: !!data, 
        dataLength: data?.length || 0,
        error: error ? { code: error.code, message: error.message } : null
      });

      if (error) {
        console.error('❌ [SOP] Fetch error:', error);
        
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast({
            title: 'Setup Required',
            description: 'The sop_documents table has not been created. Please run the migration first.',
            variant: 'destructive',
          });
        } else if (error.code === '42501' || error.message.includes('permission denied')) {
          toast({
            title: 'Permission Denied',
            description: 'You do not have permission to view SOP documents.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error Loading SOPs',
            description: `${error.code}: ${error.message}`,
            variant: 'destructive',
          });
        }
        setSops([]);
        return;
      }
      
      setSops(data || []);
      
      if (data && data.length > 0) {
        console.log(`✅ [SOP] Loaded ${data.length} document(s)`);
      } else {
        console.warn('⚠️ [SOP] No documents found');
        toast({
          title: 'No SOPs Found',
          description: 'No SOP documents found in the database.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('💥 [SOP] Exception:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load SOP documents',
        variant: 'destructive',
      });
      setSops([]);
    } finally {
      setLoading(false);
    }
  };

  const generatePdfFromMarkdown = async (sop: SOPDocument): Promise<Blob | null> => {
    const markdownPath = sop.markdown_file_path;
    if (!markdownPath) {
      toast({
        title: 'No Content Available',
        description: 'No markdown source file specified for this SOP',
        variant: 'destructive',
      });
      return null;
    }

    const content = SOP_CONTENT[markdownPath];
    if (!content) {
      toast({
        title: 'Content Not Found',
        description: `Markdown content for "${markdownPath}" is not available. Contact IT to add this SOP content.`,
        variant: 'destructive',
      });
      return null;
    }

    try {
      const pdfBlob = await markdownToPdf(content, {
        title: sop.title,
        author: 'Crave\'n Inc.',
        subject: sop.description || 'Standard Operating Procedure',
        keywords: sop.keywords?.join(', ') || '',
        version: sop.version,
        department: sop.owner_department || 'Operations',
        documentDate: sop.updated_at ? new Date(sop.updated_at).toLocaleDateString() : new Date().toLocaleDateString(),
      });
      return pdfBlob;
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error.message || 'Failed to generate PDF from markdown',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleViewPDF = async (sop: SOPDocument) => {
    toast({
      title: 'Generating PDF...',
      description: 'Please wait while the PDF is generated',
    });

    const pdfBlob = await generatePdfFromMarkdown(sop);
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    
    setTimeout(() => URL.revokeObjectURL(url), 60000);

    toast({
      title: 'PDF Ready',
      description: 'PDF opened in new tab',
    });
  };

  const handleDownloadPDF = async (sop: SOPDocument) => {
    toast({
      title: 'Generating PDF...',
      description: 'Please wait while the PDF is generated',
    });

    const pdfBlob = await generatePdfFromMarkdown(sop);
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sop.title.replace(/\s+/g, '-')}-v${sop.version}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'PDF downloaded',
    });
  };

  const categories = Array.from(new Set(sops.map(sop => sop.category).filter(Boolean))) as string[];
  const filteredSOPs = sops.filter(sop => {
    const matchesCategory = !filterCategory || sop.category === filterCategory;
    const matchesSearch = !searchQuery || 
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={1} c="dark" mb="xs">
              Standard Operating Procedures
            </Title>
            <Text c="dimmed" size="lg">
              Company-wide SOPs and documentation for executive reference
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={fetchSOPs}
          >
            Refresh
          </Button>
        </Group>

        {/* Filters */}
        <Card withBorder p="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                placeholder="Search SOPs..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                placeholder="Filter by category"
                leftSection={<IconFilter size={16} />}
                data={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(cat => ({ value: cat, label: cat })),
                ]}
                value={filterCategory || ''}
                onChange={(value) => setFilterCategory(value || null)}
                clearable
              />
            </Grid.Col>
          </Grid>
        </Card>

        {/* SOPs Table */}
        <Card withBorder>
          {filteredSOPs.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue" m="md">
              <Text mb="sm" fw={500}>No SOP documents found.</Text>
              <Text size="sm" c="dimmed" mb="sm">
                If you just ran the migration, the Investor Compliance SOP should appear. 
                Make sure the migration completed successfully.
              </Text>
              <Button 
                size="xs" 
                variant="light" 
                mt="sm"
                onClick={fetchSOPs}
                leftSection={<IconRefresh size={14} />}
              >
                Refresh
              </Button>
            </Alert>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Version</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>PDF</Table.Th>
                  <Table.Th>Last Updated</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredSOPs.map((sop) => (
                  <Table.Tr key={sop.id}>
                    <Table.Td>
                      <div>
                        <Text fw={500}>{sop.title}</Text>
                        {sop.description && (
                          <Text size="sm" c="dimmed">{sop.description}</Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      {sop.category ? (
                        <Badge variant="light" color="blue">{sop.category}</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline">v{sop.version}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          sop.status === 'active' ? 'green' :
                          sop.status === 'draft' ? 'yellow' : 'gray'
                        }
                        variant="light"
                      >
                        {sop.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {sop.markdown_file_path && SOP_CONTENT[sop.markdown_file_path] ? (
                        <Badge color="green" variant="light" size="sm">
                          Ready
                        </Badge>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm">
                          Pending
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(sop.updated_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() => handleViewPDF(sop)}
                          disabled={!sop.markdown_file_path || !SOP_CONTENT[sop.markdown_file_path]}
                        >
                          View PDF
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconDownload size={14} />}
                          onClick={() => handleDownloadPDF(sop)}
                          disabled={!sop.markdown_file_path || !SOP_CONTENT[sop.markdown_file_path]}
                        >
                          Download
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        {/* Info Card */}
        <Card withBorder p="md" style={{ backgroundColor: '#f9fafb' }}>
          <Group gap="xs" mb="sm">
            <IconFileText size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
            <Title order={4}>About SOP Documents</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Standard Operating Procedures are stored as Markdown files in the repository and converted to PDF on-demand.
            Click "View PDF" to open in a new tab or "Download" to save a copy.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
};

export default SOPManagement;
