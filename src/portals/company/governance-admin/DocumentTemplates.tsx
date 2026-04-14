import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Stack, Group, Text, Table, Badge, Modal, Loader, Center, TextInput, Select, Textarea, Tabs, ActionIcon, Tooltip } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { IconTag, IconFileText, IconPencil, IconSearch, IconEye, IconDeviceFloppy, IconX, IconCode } from '@tabler/icons-react';
import DocumentTemplateTagger from './DocumentTemplateTagger';
import Editor from '@monaco-editor/react';

interface DocumentTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string;
  category: string;
  html_content: string;
  is_active: boolean;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'executive', label: 'Executive' },
  { value: 'governance', label: 'Governance' },
  { value: 'board', label: 'Board' },
  { value: 'formation', label: 'Formation' },
  { value: 'foundational', label: 'Foundational' },
  { value: 'legal', label: 'Legal' },
];

const DocumentTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<string | null>('preview');

  // Tagger state
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [taggerOpen, setTaggerOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setEditedHtml(template.html_content);
    setEditedName(template.name);
    setEditedDescription(template.description || '');
    setEditorTab('preview');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingTemplate(null);
    setEditedHtml('');
    setEditedName('');
    setEditedDescription('');
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('document_templates')
        .update({
          name: editedName,
          description: editedDescription,
          html_content: editedHtml,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      notifications.show({
        title: 'Saved',
        message: `Template "${editedName}" updated successfully`,
        color: 'green',
      });

      // Update local state
      setTemplates(prev =>
        prev.map(t =>
          t.id === editingTemplate.id
            ? { ...t, name: editedName, description: editedDescription, html_content: editedHtml }
            : t
        )
      );
      closeEditor();
    } catch (error: any) {
      notifications.show({
        title: 'Error saving template',
        message: error.message || 'Failed to save',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTagTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setTaggerOpen(true);
  };

  const getTemplatePreviewUrl = (template: DocumentTemplate): string => {
    const blob = new Blob([template.html_content], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.template_key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'executive': return 'orange';
      case 'governance': return 'blue';
      case 'board': return 'violet';
      case 'formation': return 'teal';
      case 'foundational': return 'cyan';
      case 'legal': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">Document & Email Templates ({templates.length})</Text>
        </Group>

        {/* Filters */}
        <Group mb="md" gap="sm">
          <TextInput
            placeholder="Search templates..."
            leftSection={<IconSearch size={14} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 350 }}
            size="sm"
          />
          <Select
            data={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val || '')}
            placeholder="Filter by category"
            size="sm"
            clearable
            w={200}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Template Name</Table.Th>
              <Table.Th>Key</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredTemplates.map((template) => (
              <Table.Tr key={template.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconFileText size={16} />
                    <div>
                      <Text fw={500} size="sm">{template.name}</Text>
                      {template.description && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {template.description}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="gray" size="sm" tt="none">
                    {template.template_key}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={getCategoryColor(template.category)} size="sm">
                    {template.category || 'none'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={template.is_active ? 'green' : 'gray'} size="sm">
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Tooltip label="Edit Template">
                      <ActionIcon variant="light" color="blue" onClick={() => openEditor(template)}>
                        <IconPencil size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Tag Signature Fields">
                      <ActionIcon variant="light" color="grape" onClick={() => handleTagTemplate(template)}>
                        <IconTag size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {filteredTemplates.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="lg">No templates found</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Template Editor Modal */}
      <Modal
        opened={editorOpen}
        onClose={closeEditor}
        title={
          <Group gap="xs">
            <IconCode size={20} />
            <Text fw={600}>Edit Template: {editingTemplate?.name}</Text>
          </Group>
        }
        size="100%"
        fullScreen
        styles={{
          body: { height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', padding: 0 },
          header: { borderBottom: '1px solid var(--mantine-color-gray-3)' },
        }}
      >
        {editingTemplate && (
          <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
            {/* Top bar: name, description, save */}
            <Group p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }} gap="sm">
              <TextInput
                label="Template Name"
                value={editedName}
                onChange={(e) => setEditedName(e.currentTarget.value)}
                style={{ flex: 1 }}
                size="xs"
              />
              <TextInput
                label="Description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.currentTarget.value)}
                style={{ flex: 2 }}
                size="xs"
              />
              <Group gap="xs" mt={18}>
                <Button
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={handleSave}
                  loading={saving}
                  size="xs"
                >
                  Save Changes
                </Button>
                <Button variant="subtle" color="gray" onClick={closeEditor} size="xs">
                  Cancel
                </Button>
              </Group>
            </Group>

            {/* Editor and preview panels */}
            <Tabs value={editorTab} onChange={setEditorTab} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Tabs.List px="sm">
                <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>Preview</Tabs.Tab>
                <Tabs.Tab value="code" leftSection={<IconCode size={14} />}>HTML Editor</Tabs.Tab>
                <Tabs.Tab value="split" leftSection={<IconFileText size={14} />}>Split View</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="preview" style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', overflow: 'auto', background: '#f8f8f8', padding: 16 }}>
                  <div
                    style={{
                      maxWidth: 900,
                      margin: '0 auto',
                      background: '#fff',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      borderRadius: 4,
                      minHeight: 600,
                    }}
                  >
                    <iframe
                      srcDoc={editedHtml}
                      style={{ width: '100%', height: 'calc(100vh - 220px)', border: 'none' }}
                      title="Template Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="code" style={{ flex: 1, overflow: 'hidden' }}>
                <Editor
                  height="calc(100vh - 200px)"
                  defaultLanguage="html"
                  value={editedHtml}
                  onChange={(val) => setEditedHtml(val || '')}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </Tabs.Panel>

              <Tabs.Panel value="split" style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
                  <div style={{ flex: 1, borderRight: '1px solid var(--mantine-color-gray-3)' }}>
                    <Editor
                      height="100%"
                      defaultLanguage="html"
                      value={editedHtml}
                      onChange={(val) => setEditedHtml(val || '')}
                      theme="vs-light"
                      options={{
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        fontSize: 12,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', background: '#f8f8f8', padding: 12 }}>
                    <iframe
                      srcDoc={editedHtml}
                      style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                      title="Template Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Modal>

      {/* Tagger Modal */}
      <Modal
        opened={taggerOpen}
        onClose={() => {
          setTaggerOpen(false);
          setSelectedTemplate(null);
        }}
        title={`Tag Signature Fields: ${selectedTemplate?.name}`}
        size="xl"
        fullScreen
      >
        {selectedTemplate && (
          <DocumentTemplateTagger
            templateId={selectedTemplate.id}
            templateKey={selectedTemplate.template_key}
            documentUrl={getTemplatePreviewUrl(selectedTemplate)}
            onSave={() => {
              setTaggerOpen(false);
              setSelectedTemplate(null);
              notifications.show({
                title: 'Success',
                message: 'Signature fields saved successfully',
                color: 'green',
              });
            }}
          />
        )}
      </Modal>
    </Stack>
  );
};

export default DocumentTemplates;
