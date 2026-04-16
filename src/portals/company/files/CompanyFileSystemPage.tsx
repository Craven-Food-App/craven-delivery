// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBuilding,
  IconFile,
  IconFolder,
  IconFolderPlus,
  IconUpload,
  IconUserStar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

type FileScope = 'company' | 'executive';

interface FileNode {
  id: string;
  parent_id: string | null;
  name: string;
  node_type: 'folder' | 'file';
  scope: string;
  department_id?: string | null;
  employee_id?: string | null;
  executive_id?: string | null;
  created_at: string;
}

interface FileAsset {
  id: string;
  node_id: string;
  storage_bucket: string;
  storage_path: string;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

const SCOPE_ROOT_NAMES: Record<FileScope, string> = {
  company: 'Company File System',
  executive: 'Executive File System',
};

const CompanyFileSystemPage: React.FC = () => {
  const [activeScope, setActiveScope] = useState<FileScope>('company');
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [assetsByNode, setAssetsByNode] = useState<Record<string, FileAsset>>({});
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void loadFileSystem();
  }, []);

  useEffect(() => {
    const root = scopedRootNode;
    if (root && !selectedNodeId) {
      setSelectedNodeId(root.id);
    }
    if (root && selectedNodeId) {
      const selected = nodes.find((n) => n.id === selectedNodeId);
      if (!selected || selected.scope !== activeScope) {
        setSelectedNodeId(root.id);
      }
    }
  }, [activeScope, nodes]);

  const loadFileSystem = async () => {
    setLoading(true);
    try {
      // Provision executive folders + link executive_documents (idempotent).
      const { data: syncResult, error: syncError } = await (supabase as any).rpc(
        'sync_executive_file_system_from_records'
      );
      if (syncError) {
        console.warn('sync_executive_file_system_from_records:', syncError);
      } else if (syncResult && typeof syncResult === 'object' && syncResult.ok === true) {
        const added =
          Number(syncResult.inserted_exec_folders || 0) +
          Number(syncResult.inserted_files || 0) +
          Number(syncResult.inserted_subfolders || 0);
        if (added > 0) {
          notifications.show({
            title: 'Executive files synced',
            message: `Updated folders and linked records (${Number(syncResult.inserted_files || 0)} documents).`,
            color: 'teal',
          });
        }
      }

      const [{ data: nodeRows, error: nodeError }, { data: assetRows, error: assetError }] = await Promise.all([
        supabase
          .from('company_file_nodes')
          .select('id, parent_id, name, node_type, scope, department_id, employee_id, executive_id, created_at')
          .order('name', { ascending: true }),
        supabase
          .from('company_file_assets')
          .select('id, node_id, storage_bucket, storage_path, file_url, mime_type, size_bytes, created_at'),
      ]);

      if (nodeError) throw nodeError;
      if (assetError) throw assetError;

      setNodes((nodeRows || []) as FileNode[]);
      const map: Record<string, FileAsset> = {};
      (assetRows || []).forEach((row: any) => {
        map[row.node_id] = row;
      });
      setAssetsByNode(map);
    } catch (error: any) {
      notifications.show({
        title: 'Failed to load file system',
        message: error?.message || 'Could not load file data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const scopedNodes = useMemo(
    () => nodes.filter((node) => node.scope === activeScope),
    [nodes, activeScope]
  );

  const scopedRootNode = useMemo(
    () => scopedNodes.find((node) => node.parent_id === null && node.name === SCOPE_ROOT_NAMES[activeScope]) || null,
    [scopedNodes, activeScope]
  );

  const selectedNode = useMemo(
    () => scopedNodes.find((node) => node.id === selectedNodeId) || null,
    [scopedNodes, selectedNodeId]
  );

  const childNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    return scopedNodes
      .filter((node) => node.parent_id === selectedNodeId)
      .sort((a, b) => {
        if (a.node_type !== b.node_type) return a.node_type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [scopedNodes, selectedNodeId]);

  const renderFolderTree = (parentId: string | null, depth = 0): React.ReactNode =>
    scopedNodes
      .filter((node) => node.parent_id === parentId && node.node_type === 'folder')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => {
        const active = selectedNodeId === node.id;
        return (
          <Box key={node.id}>
            <Button
              variant={active ? 'light' : 'subtle'}
              color={active ? 'blue' : 'gray'}
              leftSection={<IconFolder size={14} />}
              justify="flex-start"
              fullWidth
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => setSelectedNodeId(node.id)}
            >
              {node.name}
            </Button>
            {renderFolderTree(node.id, depth + 1)}
          </Box>
        );
      });

  const ensureFolderSelected = () => {
    if (!selectedNode || selectedNode.node_type !== 'folder') {
      notifications.show({
        title: 'Select a folder',
        message: 'Choose a folder before creating subfolders or uploading files.',
        color: 'yellow',
      });
      return false;
    }
    return true;
  };

  const handleCreateFolder = async () => {
    if (!ensureFolderSelected()) return;
    if (!newFolderName.trim()) {
      notifications.show({ title: 'Folder name required', message: 'Enter a folder name.', color: 'yellow' });
      return;
    }

    setCreatingFolder(true);
    try {
      const { error } = await supabase.from('company_file_nodes').insert({
        parent_id: selectedNode!.id,
        name: newFolderName.trim(),
        node_type: 'folder',
        scope: activeScope,
      });
      if (error) throw error;

      notifications.show({ title: 'Folder created', message: `"${newFolderName.trim()}" created.`, color: 'green' });
      setNewFolderName('');
      setCreateFolderOpen(false);
      await loadFileSystem();
    } catch (error: any) {
      notifications.show({ title: 'Create folder failed', message: error?.message || 'Unable to create folder', color: 'red' });
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUploadFile = async (file: File | null) => {
    if (!file) return;
    if (!ensureFolderSelected()) return;

    setUploading(true);
    try {
      const safeName = file.name.replace(/\s+/g, '-');
      const storagePath = `${activeScope}/${selectedNode!.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-files')
        .upload(storagePath, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('company-files').getPublicUrl(storagePath);

      const { data: insertedNode, error: nodeError } = await supabase
        .from('company_file_nodes')
        .insert({
          parent_id: selectedNode!.id,
          name: file.name,
          node_type: 'file',
          scope: activeScope,
        })
        .select('id')
        .single();
      if (nodeError) throw nodeError;

      const { error: assetError } = await supabase
        .from('company_file_assets')
        .insert({
          node_id: insertedNode.id,
          storage_bucket: 'company-files',
          storage_path: storagePath,
          file_url: publicUrlData?.publicUrl || null,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
      if (assetError) throw assetError;

      notifications.show({
        title: 'Upload complete',
        message: `${file.name} uploaded successfully.`,
        color: 'green',
      });
      await loadFileSystem();
    } catch (error: any) {
      notifications.show({
        title: 'Upload failed',
        message: error?.message || 'Could not upload file.',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading file systems...</Text>
      </Stack>
    );
  }

  if (!scopedRootNode) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="File System Not Initialized">
        Missing root folder for <b>{SCOPE_ROOT_NAMES[activeScope]}</b>. Run the migration that seeds
        company and executive file hierarchies.
      </Alert>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Enterprise File Systems</Title>
          <Text c="dimmed">
            Hierarchical records by department, employee, and executive with auditable storage metadata.
          </Text>
          <Alert color="blue" variant="light" mt="sm" title="Executive tree">
            Under <b>Active Executives</b> and <b>Archived Executives</b>, each executive gets standard subfolders.
            Rows in <b>executive_documents</b> that have a file URL are mirrored as files under{' '}
            <b>Linked executive records</b>. Apply the latest Supabase migrations, then open this page again to run the sync.
          </Alert>
        </div>
      </Group>

      <Tabs value={activeScope} onChange={(value) => setActiveScope((value as FileScope) || 'company')}>
        <Tabs.List>
          <Tabs.Tab value="company" leftSection={<IconBuilding size={16} />}>
            Company File System
          </Tabs.Tab>
          <Tabs.Tab value="executive" leftSection={<IconUserStar size={16} />}>
            Executive File System
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeScope} pt="md">
          <Group align="flex-start" grow>
            <Card withBorder style={{ minHeight: 600, width: '35%' }}>
              <Stack gap="sm">
                <Text fw={700}>Folder Tree</Text>
                <Divider />
                <ScrollArea h={520}>
                  <Stack gap={4}>{renderFolderTree(null)}</Stack>
                </ScrollArea>
              </Stack>
            </Card>

            <Card withBorder style={{ minHeight: 600, width: '65%' }}>
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={700}>{selectedNode?.name || 'Select a folder'}</Text>
                    <Text size="sm" c="dimmed">
                      {selectedNode?.node_type === 'folder'
                        ? 'Folder contents'
                        : selectedNode?.node_type === 'file'
                        ? 'File metadata'
                        : 'Choose a node from the folder tree.'}
                    </Text>
                  </div>
                  <Group>
                    <Button
                      variant="light"
                      leftSection={<IconFolderPlus size={16} />}
                      onClick={() => setCreateFolderOpen(true)}
                      disabled={!selectedNode || selectedNode.node_type !== 'folder'}
                    >
                      New Folder
                    </Button>
                    <Button
                      component="label"
                      leftSection={<IconUpload size={16} />}
                      loading={uploading}
                      disabled={!selectedNode || selectedNode.node_type !== 'folder'}
                    >
                      Upload File
                      <input
                        type="file"
                        hidden
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0] || null;
                          void handleUploadFile(file);
                          event.currentTarget.value = '';
                        }}
                      />
                    </Button>
                  </Group>
                </Group>
                <Divider />

                {childNodes.length === 0 ? (
                  <Alert color="gray" title="No Items">
                    This folder is empty.
                  </Alert>
                ) : (
                  <Stack gap="xs">
                    {childNodes.map((node) => {
                      const asset = assetsByNode[node.id];
                      return (
                        <Card
                          key={node.id}
                          withBorder
                          padding="sm"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          <Group justify="space-between">
                            <Group gap="xs">
                              {node.node_type === 'folder' ? <IconFolder size={18} /> : <IconFile size={18} />}
                              <Box>
                                <Text fw={600}>{node.name}</Text>
                                <Text size="xs" c="dimmed">
                                  {node.node_type === 'folder'
                                    ? 'Folder'
                                    : `${asset?.mime_type || 'File'}${asset?.size_bytes ? ` • ${asset.size_bytes.toLocaleString()} bytes` : ''}`}
                                </Text>
                              </Box>
                            </Group>
                            <Group gap="xs">
                              <Badge variant="light">{node.node_type}</Badge>
                              {node.node_type === 'file' && asset?.file_url && (
                                <Button
                                  component="a"
                                  href={asset.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  size="xs"
                                  variant="subtle"
                                >
                                  Open
                                </Button>
                              )}
                            </Group>
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Group>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={createFolderOpen} onClose={() => setCreateFolderOpen(false)} title="Create Folder">
        <Stack>
          <TextInput
            label="Folder Name"
            placeholder="e.g. Exit & Termination"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button loading={creatingFolder} onClick={handleCreateFolder}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default CompanyFileSystemPage;
