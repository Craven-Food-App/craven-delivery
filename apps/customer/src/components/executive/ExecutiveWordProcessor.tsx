import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Divider, Input, List, Modal, Space, Spin, Tag, Tooltip, Typography, message } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  PrinterOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '@/integrations/supabase/client';

type EditorDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_DESCRIPTION =
  'Draft executive memos, board updates, and leadership communications with a Microsoft Word-style editor. All formatting, colors, and layout are preserved when exporting.';

interface ExecutiveWordProcessorProps {
  storageKey: string;
  supabaseTable?: string;
  title?: string;
  description?: string;
}

const sanitizeFileName = (raw: string) => {
  const trimmed = raw.trim() || 'Executive Document';
  return trimmed.replace(/[\\/:*?"<>|]/g, '').substring(0, 80);
};

const createHtmlShell = (body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Executive Document</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; color: #111827; }
      h1, h2, h3, h4, h5, h6 { color: #0f172a; }
      table { border-collapse: collapse; width: 100%; }
      table, th, td { border: 1px solid #d1d5db; }
      th, td { padding: 8px; }
    </style>
  </head>
  <body>${body}</body>
</html>`;

const ExecutiveWordProcessor: React.FC<ExecutiveWordProcessorProps> = ({
  storageKey,
  supabaseTable,
  title = 'Executive Word Processor',
  description = DEFAULT_DESCRIPTION,
}) => {
  const storageNamespace = useMemo(() => `executive-word-processor-${storageKey}`, [storageKey]);

  const [documents, setDocuments] = useState<EditorDocument[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ font: [] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ color: [] }, { background: [] }],
        [{ script: 'sub' }, { script: 'super' }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'code-block'],
        ['clean'],
      ],
      clipboard: {
        matchVisual: false,
      },
    }),
    [],
  );

  const formats = useMemo(
    () => [
      'header',
      'font',
      'size',
      'bold',
      'italic',
      'underline',
      'strike',
      'blockquote',
      'color',
      'background',
      'script',
      'align',
      'list',
      'indent',
      'link',
      'image',
      'code-block',
    ],
    [],
  );

  const currentDocument = useMemo(() => documents.find((doc) => doc.id === currentDocumentId) ?? null, [documents, currentDocumentId]);

  const normalizeSupabaseDocs = (rows: any[]): EditorDocument[] =>
    rows.map((row) => ({
      id: String(row.id),
      title: row.title?.trim() || 'Untitled Document',
      content: row.content ?? '',
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    }));

  const loadDocuments = useCallback(
    async (options?: { selectId?: string }) => {
      setLoading(true);
      try {
        let docs: EditorDocument[] = [];

        if (supabaseTable) {
          const { data, error } = await supabase
            .from(supabaseTable as any)
            .select('id, title, content, created_at, updated_at')
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false });

          if (error) throw error;
          docs = data ? normalizeSupabaseDocs(data) : [];
        } else if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(storageNamespace);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                docs = parsed.map((doc) => ({
                  id: doc.id,
                  title: doc.title || 'Untitled Document',
                  content: doc.content || '',
                  createdAt: doc.createdAt || new Date().toISOString(),
                  updatedAt: doc.updatedAt || new Date().toISOString(),
                }));
              }
            } catch (err) {
              console.warn('Failed to parse stored documents', err);
            }
          }
        }

        setDocuments(docs);
        setCurrentDocumentId((prev) => {
          if (options?.selectId) return options.selectId;
          if (prev && docs.some((doc) => doc.id === prev)) return prev;
          return docs.length > 0 ? docs[0].id : null;
        });
      } catch (error: any) {
        console.error('Failed to load documents', error);
        message.error(error?.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    },
    [storageNamespace, supabaseTable],
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 992);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentDocument) {
      setEditorTitle(currentDocument.title);
      setEditorContent(currentDocument.content);
      setIsDirty(false);
    } else {
      setEditorTitle('');
      setEditorContent('');
      setIsDirty(false);
    }
  }, [currentDocumentId, currentDocument]);

  const persistLocalDocuments = (docs: EditorDocument[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageNamespace, JSON.stringify(docs));
  };

  const handleCreateDocument = async () => {
    const trimmed = newDocTitle.trim();
    const titleValue = trimmed || 'Untitled Document';

    setNewDocModalOpen(false);
    setNewDocTitle('');

    if (supabaseTable) {
      setSaving(true);
      try {
        const { data, error } = await supabase
          .from(supabaseTable as any)
          .insert({ title: titleValue, content: '' })
          .select()
          .single();

        if (error) throw error;
        await loadDocuments({ selectId: (data as any)?.id ? String((data as any).id) : undefined });
        message.success('Document created');
      } catch (error: any) {
        console.error('Failed to create document', error);
        message.error(error?.message || 'Failed to create document');
      } finally {
        setSaving(false);
      }
    } else {
      const now = new Date().toISOString();
      const doc: EditorDocument = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        title: titleValue,
        content: '',
        createdAt: now,
        updatedAt: now,
      };

      const nextDocs = [doc, ...documents];
      setDocuments(nextDocs);
      setCurrentDocumentId(doc.id);
      persistLocalDocuments(nextDocs);
      message.success('Document created');
    }
  };

  const handleSaveDocument = async () => {
    if (!editorTitle.trim()) {
      message.warning('Document title is required');
      return;
    }

    const now = new Date().toISOString();
    const trimmedTitle = editorTitle.trim();

    if (supabaseTable) {
      if (!currentDocumentId) {
        // Create new document if none selected (rare)
        setSaving(true);
        try {
          const { data, error } = await supabase
            .from(supabaseTable as any)
            .insert({ title: trimmedTitle, content: editorContent })
            .select()
            .single();

          if (error) throw error;
          await loadDocuments({ selectId: (data as any)?.id ? String((data as any).id) : undefined });
          message.success('Document saved');
          setIsDirty(false);
        } catch (error: any) {
          console.error('Failed to save document', error);
          message.error(error?.message || 'Failed to save document');
        } finally {
          setSaving(false);
        }
        return;
      }

      setSaving(true);
      try {
        const { error } = await supabase
          .from(supabaseTable as any)
          .update({ title: trimmedTitle, content: editorContent })
          .eq('id', currentDocumentId);

        if (error) throw error;
        await loadDocuments({ selectId: currentDocumentId });
        message.success('Document saved');
        setIsDirty(false);
      } catch (error: any) {
        console.error('Failed to save document', error);
        message.error(error?.message || 'Failed to save document');
      } finally {
        setSaving(false);
      }
    } else {
      const docId = currentDocumentId ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
      const existing = documents.find((doc) => doc.id === docId);
      const updatedDoc: EditorDocument = {
        id: docId,
        title: trimmedTitle,
        content: editorContent,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      const nextDocs = [updatedDoc, ...documents.filter((doc) => doc.id !== docId)];
      setDocuments(nextDocs);
      setCurrentDocumentId(docId);
      persistLocalDocuments(nextDocs);
      message.success('Document saved');
      setIsDirty(false);
    }
  };

  const handleDeleteDocument = (doc: EditorDocument) => {
    Modal.confirm({
      title: `Delete "${doc.title}"?`,
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      centered: true,
      onOk: async () => {
        if (supabaseTable) {
          setSaving(true);
          try {
            const { error } = await supabase.from(supabaseTable as any).delete().eq('id', doc.id);
            if (error) throw error;
            await loadDocuments({ selectId: undefined });
            message.success('Document deleted');
          } catch (error: any) {
            console.error('Failed to delete document', error);
            message.error(error?.message || 'Failed to delete document');
          } finally {
            setSaving(false);
          }
        } else {
          const nextDocs = documents.filter((item) => item.id !== doc.id);
          setDocuments(nextDocs);
          setCurrentDocumentId((prev) => (prev === doc.id ? (nextDocs[0]?.id ?? null) : prev));
          persistLocalDocuments(nextDocs);
          message.success('Document deleted');
        }
      },
    });
  };

  const handleSelectDocument = (doc: EditorDocument) => {
    if (isDirty) {
      Modal.confirm({
        title: 'Discard unsaved changes?',
        content: 'You have unsaved changes in the current document.',
        okText: 'Discard',
        cancelText: 'Cancel',
        onOk: () => {
          setCurrentDocumentId(doc.id);
        },
      });
      return;
    }

    setCurrentDocumentId(doc.id);
  };

  const downloadAsWord = () => {
    const fileName = `${sanitizeFileName(editorTitle || 'Executive Document')}.doc`;
    const html = createHtmlShell(editorContent || '<p></p>');
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsHtml = () => {
    const fileName = `${sanitizeFileName(editorTitle || 'Executive Document')}.html`;
    const html = createHtmlShell(editorContent || '<p></p>');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    const html = createHtmlShell(editorContent || '<p></p>');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editorContent || '');
      message.success('Content copied to clipboard');
    } catch (error) {
      console.error('Clipboard copy failed', error);
      message.error('Unable to copy content.');
    }
  };

  const lastUpdatedLabel = currentDocument
    ? new Date(currentDocument.updatedAt).toLocaleString()
    : 'No document selected';

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 20,
        boxShadow: '0 20px 45px -20px rgba(15, 23, 42, 0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            <Space>
              <FileTextOutlined />
              {title}
            </Space>
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {description}
          </Typography.Paragraph>
        </Space>

        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewDocModalOpen(true)} disabled={saving}>
            New Document
          </Button>
          <Button
            icon={<SaveOutlined />}
            type="default"
            onClick={handleSaveDocument}
            loading={saving}
            disabled={!currentDocument && !editorTitle.trim()}
          >
            Save
          </Button>
          <Tooltip title="Download as Word (.doc)">
            <Button icon={<DownloadOutlined />} onClick={downloadAsWord} disabled={!currentDocumentId} />
          </Tooltip>
          <Tooltip title="Download formatted HTML">
            <Button icon={<FileTextOutlined />} onClick={downloadAsHtml} disabled={!currentDocumentId} />
          </Tooltip>
          <Tooltip title="Print document">
            <Button icon={<PrinterOutlined />} onClick={printDocument} disabled={!currentDocumentId} />
          </Tooltip>
          <Tooltip title="Copy HTML to clipboard">
            <Button icon={<CopyOutlined />} onClick={copyToClipboard} disabled={!currentDocumentId} />
          </Tooltip>

          {currentDocument && (
            <Tag color={isDirty ? 'orange' : 'blue'} style={{ marginLeft: isMobile ? 0 : 'auto' }}>
              {isDirty ? 'Unsaved changes' : `Last updated ${lastUpdatedLabel}`}
            </Tag>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0 24px' }} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            display: isMobile && currentDocumentId ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 16,
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 16,
            padding: 16,
            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(237, 242, 247, 0.8) 100%)',
            minHeight: 320,
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            Your Documents
          </Typography.Title>

          {loading && documents.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              <Typography.Paragraph>Create your first executive document to get started.</Typography.Paragraph>
            </div>
          ) : (
            <List
              dataSource={documents}
              renderItem={(doc) => {
                const isActive = doc.id === currentDocumentId;
                return (
                  <List.Item
                    style={{
                      padding: 0,
                      border: 'none',
                    }}
                  >
                    <Button
                      block
                      type={isActive ? 'primary' : 'default'}
                      onClick={() => handleSelectDocument(doc)}
                      style={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        height: 'auto',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{doc.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {new Date(doc.updatedAt).toLocaleString()}
                      </div>
                    </Button>
                    <Tooltip title="Delete document">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDeleteDocument(doc)}
                      />
                    </Tooltip>
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 16,
            padding: isMobile ? 12 : 20,
            background: '#ffffff',
            minHeight: 400,
          }}
        >
          {currentDocumentId ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Input
                value={editorTitle}
                placeholder="Document Title"
                onChange={(event) => {
                  setEditorTitle(event.target.value);
                  setIsDirty(true);
                }}
                size="large"
              />

              <ReactQuill
                theme="snow"
                value={editorContent}
                onChange={(value) => {
                  setEditorContent(value);
                  setIsDirty(true);
                }}
                modules={modules}
                formats={formats}
                style={{ height: isMobile ? 320 : 480 }}
              />
            </Space>
          ) : (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Typography.Title level={4}>Select or create a document</Typography.Title>
              <Typography.Paragraph type="secondary">
                Choose a document from the list to begin editing, or create a new memo tailored to your executive needs.
              </Typography.Paragraph>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewDocModalOpen(true)}>
                Create Document
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="New Document"
        open={newDocModalOpen}
        okText="Create"
        confirmLoading={saving}
        onOk={handleCreateDocument}
        onCancel={() => setNewDocModalOpen(false)}
      >
        <Input
          value={newDocTitle}
          onChange={(event) => setNewDocTitle(event.target.value)}
          placeholder="Document title"
          autoFocus
        />
      </Modal>
    </Card>
  );
};

export default ExecutiveWordProcessor;
