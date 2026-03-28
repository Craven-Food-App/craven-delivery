import React, { useState, useEffect, useCallback } from 'react';
import {
  TextInput,
  Group,
  Text,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Stack,
  FileInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconFileSpreadsheet,
  IconDownload,
  IconUpload,
  IconSearch,
} from '@tabler/icons-react';
import { MantineTable } from '@/components/cfo/MantineTable';
import { supabase } from '@/integrations/supabase/client';
import { INTERNAL_COMMS_BUCKET, extractInternalCommsStoragePath } from '@/lib/internalCommsStorage';

interface SharedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

const fileIcon = (type: string | null) => {
  if (!type) return <IconFile size={18} />;
  if (type.includes('pdf')) return <IconFileTypePdf size={18} color="#ef4444" />;
  if (type.includes('image')) return <IconPhoto size={18} color="#3b82f6" />;
  if (type.includes('sheet') || type.includes('excel')) return <IconFileSpreadsheet size={18} color="#10b981" />;
  return <IconFile size={18} />;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SharedFilesTab: React.FC = () => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  const getNameMap = useCallback(async (userIds: string[]): Promise<Map<string, string>> => {
    if (userIds.length === 0) return new Map();
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    const map = new Map<string, string>();
    (profiles || []).forEach((p: { user_id: string; full_name: string | null; email: string | null }) => {
      map.set(p.user_id, p.full_name || p.email || 'Unknown');
    });
    return map;
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_message_attachments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const uploaderIds = [...new Set(data.map((f: SharedFile) => f.uploaded_by))];
        const nameMap = await getNameMap(uploaderIds);
        setFiles(data.map((f: SharedFile) => ({ ...f, uploader_name: nameMap.get(f.uploaded_by) || 'Unknown' })));
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [getNameMap]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      await fetchFiles();
    };
    void init();
  }, [fetchFiles]);

  const handleUpload = async (file: File | null) => {
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const filePath = `${currentUser.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(INTERNAL_COMMS_BUCKET)
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: msgData, error: msgError } = await supabase
        .from('internal_messages')
        .insert([{
          sender_id: currentUser.id,
          body: `Shared file: ${file.name}`,
          channel: 'direct' as const,
          recipient_ids: [currentUser.id],
          read_by: [currentUser.id],
        }])
        .select('id')
        .single();

      if (msgError) throw msgError;

      const { error: attachError } = await supabase.from('internal_message_attachments').insert([{
        message_id: msgData.id,
        file_name: file.name,
        file_url: filePath,
        file_size_bytes: file.size,
        file_type: file.type,
        uploaded_by: currentUser.id,
      }]);
      if (attachError) throw attachError;

      notifications.show({ title: 'Uploaded', message: file.name, color: 'green' });
      fetchFiles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      notifications.show({ title: 'Upload failed', message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const filtered = files.filter((f) =>
    f.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const openFile = async (record: SharedFile) => {
    const filePath = extractInternalCommsStoragePath(record.file_url);
    if (!filePath) {
      notifications.show({ title: 'Error', message: `Unable to open ${record.file_name}`, color: 'red' });
      return;
    }
    const { data, error } = await supabase.storage
      .from(INTERNAL_COMMS_BUCKET)
      .createSignedUrl(filePath, 60 * 5);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const { data: blob, error: downloadError } = await supabase.storage
      .from(INTERNAL_COMMS_BUCKET)
      .download(filePath);
    if (downloadError || !blob) {
      notifications.show({
        title: 'Error',
        message: `${record.file_name}: ${error?.message || downloadError?.message || 'Download failed'}`,
        color: 'red',
      });
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Text fw={700} size="md">Shared Files</Text>
        <Group gap="sm" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={18} />}
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={220}
          />
          <FileInput
            placeholder="Upload File"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt"
            leftSection={<IconUpload size={18} />}
            disabled={uploading || !currentUser}
            onChange={handleUpload}
            style={{ minWidth: 160 }}
          />
        </Group>
      </Group>

      {loading ? (
        <Center py={40}>
          <Loader size="lg" />
        </Center>
      ) : files.length === 0 ? (
        <Text c="dimmed" ta="center" py={40}>No files shared yet</Text>
      ) : filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py={40}>No files match your search</Text>
      ) : (
        <MantineTable
          data={filtered}
          rowKey="id"
          size="small"
          scroll={{ x: 500 }}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'File',
              dataIndex: 'file_name',
              render: (name: string, record: SharedFile) => (
                <Group gap={8} wrap="nowrap">
                  {fileIcon(record.file_type)}
                  <Text size="sm">{name}</Text>
                </Group>
              ),
            },
            {
              title: 'Size',
              dataIndex: 'file_size_bytes',
              width: 100,
              render: (bytes: number | null) => formatSize(bytes),
            },
            {
              title: 'Uploaded By',
              dataIndex: 'uploader_name',
              width: 150,
            },
            {
              title: 'Date',
              dataIndex: 'created_at',
              width: 160,
              render: (date: string) => new Date(date).toLocaleDateString(),
            },
            {
              title: '',
              key: 'action',
              width: 60,
              render: (_: unknown, record: SharedFile) => (
                <Tooltip label="Download">
                  <ActionIcon variant="subtle" color="orange" onClick={() => void openFile(record)}>
                    <IconDownload size={18} />
                  </ActionIcon>
                </Tooltip>
              ),
            },
          ]}
        />
      )}
    </Stack>
  );
};

export default SharedFilesTab;
