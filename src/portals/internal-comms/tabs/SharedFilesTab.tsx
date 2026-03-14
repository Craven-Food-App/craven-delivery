import React, { useState, useEffect, useCallback } from 'react';
import { Button, Upload, Table, Input, Empty, Spin, message, Typography, Tag, Tooltip } from 'antd';
import { UploadOutlined, DownloadOutlined, FileOutlined, FilePdfOutlined, FileImageOutlined, FileExcelOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { Text } = Typography;

interface SharedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
  message_id: string;
}

const fileIcon = (type: string | null) => {
  if (!type) return <FileOutlined />;
  if (type.includes('pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  if (type.includes('image')) return <FileImageOutlined style={{ color: '#3b82f6' }} />;
  if (type.includes('sheet') || type.includes('excel')) return <FileExcelOutlined style={{ color: '#10b981' }} />;
  return <FileOutlined />;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const SharedFilesTab: React.FC = () => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

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
        const uploaderIds = [...new Set(data.map((f: any) => f.uploaded_by))];
        const { data: profiles } = await supabase
          .from('exec_users')
          .select('user_id, full_name')
          .in('user_id', uploaderIds);
        const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
        setFiles(data.map((f: any) => ({ ...f, uploader_name: nameMap.get(f.uploaded_by) || 'Unknown' })));
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      await fetchFiles();
    };
    init();
  }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    if (!currentUser) return false;
    setUploading(true);
    try {
      const filePath = `${currentUser.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('internal-comms-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('internal-comms-files')
        .getPublicUrl(filePath);

      // Create a placeholder message for standalone file uploads
      const { data: msgData, error: msgError } = await supabase
        .from('internal_messages')
        .insert({
          sender_id: currentUser.id,
          body: `Shared file: ${file.name}`,
          channel: 'direct',
          recipient_ids: [currentUser.id],
          read_by: [currentUser.id],
        })
        .select('id')
        .single();

      if (msgError) throw msgError;

      const { error: attachError } = await supabase.from('internal_message_attachments').insert({
        message_id: msgData.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size_bytes: file.size,
        file_type: file.type,
        uploaded_by: currentUser.id,
      });
      if (attachError) throw attachError;

      message.success(`${file.name} uploaded`);
      fetchFiles();
    } catch (err: any) {
      message.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const filtered = files.filter(f =>
    f.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'File',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (name: string, record: SharedFile) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fileIcon(record.file_type)}
          <Text>{name}</Text>
        </div>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size_bytes',
      key: 'size',
      width: 100,
      render: (bytes: number) => formatSize(bytes),
    },
    {
      title: 'Uploaded By',
      dataIndex: 'uploader_name',
      key: 'uploader',
      width: 150,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      width: 160,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: any, record: SharedFile) => (
        <Tooltip title="Download">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            href={record.file_url}
            target="_blank"
            style={{ color: '#FF6B35' }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Text strong style={{ fontSize: 16 }}>Shared Files</Text>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Upload
            beforeUpload={(file) => { handleUpload(file); return false; }}
            showUploadList={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt"
          >
            <Button icon={<UploadOutlined />} loading={uploading}
              style={{ borderColor: '#FF6B35', color: '#FF6B35' }}>
              Upload File
            </Button>
          </Upload>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <Empty description="No files shared yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          size="small"
          scroll={{ x: 500 }}
        />
      )}
    </div>
  );
};

export default SharedFilesTab;
