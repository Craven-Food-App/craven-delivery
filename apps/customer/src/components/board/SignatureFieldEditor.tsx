import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Select,
  Input,
  InputNumber,
  Switch,
  Alert,
  Typography,
  message,
  Segmented,
  Tooltip,
  Spin,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ZoomInOutlined, ZoomOutOutlined, AimOutlined, FileAddOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { Text } = Typography;

const DEFAULT_WIDTH = 24;
const DEFAULT_HEIGHT = 12;
const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;

const FIELD_TYPE_OPTIONS = [
  { value: 'signature', label: 'Signature' },
  { value: 'initials', label: 'Initials' },
  { value: 'date', label: 'Date' },
  { value: 'text', label: 'Text' },
];

const DEFAULT_SIGNER_ROLE = 'executive';

export interface SignatureFieldRecord {
  id: string;
  field_type: 'signature' | 'initials' | 'date' | 'text';
  signer_role: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  label: string | null;
  required: boolean;
}

interface SignatureFieldEditorProps {
  templateId: string;
  templateName: string;
  htmlContent: string;
  visible: boolean;
  onClose: (refresh?: boolean) => void;
}

interface CardSectionProps {
  title: string;
  children: React.ReactNode;
}

const CardSection: React.FC<CardSectionProps> = ({ title, children }) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16,
      background: '#ffffff',
    }}
  >
    <Text strong style={{ display: 'block', marginBottom: 12 }}>
      {title}
    </Text>
    {children}
  </div>
);

export const SignatureFieldEditor: React.FC<SignatureFieldEditorProps> = ({
  templateId,
  templateName,
  htmlContent,
  visible,
  onClose,
}) => {
  const [fields, setFields] = useState<SignatureFieldRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

  const pageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    fieldId: string;
    offsetX: number;
    offsetY: number;
    widthPx: number;
    heightPx: number;
  } | null>(null);
  const fieldsRef = useRef<SignatureFieldRecord[]>([]);

  const normalizedHtml = useMemo(() => {
    const baseStyles = `
      <style>
        body {
          margin: 32px;
          font-family: 'Times New Roman', serif;
          color: #111827;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
    `;
    return `${baseStyles}${htmlContent || '<p>No template content.</p>'}`;
  }, [htmlContent]);

  const fieldsOnActivePage = useMemo(
    () => fields.filter((field) => field.page_number === activePage),
    [fields, activePage],
  );

  const highestFieldPage = useMemo(
    () => fields.reduce((max, field) => Math.max(max, field.page_number ?? 1), 1),
    [fields],
  );

  const totalPages = useMemo(
    () => Math.max(pageCount, highestFieldPage, 1),
    [pageCount, highestFieldPage],
  );

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const fetchFields = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_template_signature_fields' as any)
        .select('*')
        .eq('template_id', templateId)
        .order('page_number')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const normalizedFields =
        (data || []).map((field: any) => ({
          ...field,
          width_percent: Number(field.width_percent) || DEFAULT_WIDTH,
          height_percent: Number(field.height_percent) || DEFAULT_HEIGHT,
          x_percent: Number(field.x_percent) || 10,
          y_percent: Number(field.y_percent) || 70,
        })) ?? [];

      setFields(normalizedFields as SignatureFieldRecord[]);

      const fetchedHighestPage =
        normalizedFields.reduce((max: number, field: any) => Math.max(max, field.page_number ?? 1), 1) || 1;
      setPageCount((prev) => Math.max(prev, fetchedHighestPage, 1));

      setActivePage((prev) => {
        const maxPage = Math.max(fetchedHighestPage, 1);
        return Math.min(prev, maxPage);
      });
      setActiveFieldId(null);
    } catch (err: any) {
      console.error('Failed to fetch signature fields', err);
      message.error(err.message || 'Failed to load signature fields');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (visible && templateId) {
      fetchFields();
    }
  }, [visible, templateId, fetchFields]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !pageRef.current) return;
      const { fieldId, offsetX, offsetY, widthPx, heightPx } = dragRef.current;
      const rect = pageRef.current.getBoundingClientRect();
      const pointerX = (event.clientX - rect.left) / zoom;
      const pointerY = (event.clientY - rect.top) / zoom;

      const rawLeft = pointerX - offsetX;
      const rawTop = pointerY - offsetY;

      const field = fieldsRef.current.find((f) => f.id === fieldId);
      if (!field) return;

      const maxLeft = widthPx - (field.width_percent / 100) * widthPx;
      const maxTop = heightPx - (field.height_percent / 100) * heightPx;

      const clampedLeft = Math.min(Math.max(rawLeft, 0), maxLeft);
      const clampedTop = Math.min(Math.max(rawTop, 0), maxTop);

      const newX = (clampedLeft / widthPx) * 100;
      const newY = (clampedTop / heightPx) * 100;

      setFields((prev) =>
        prev.map((item) =>
          item.id === fieldId
            ? {
                ...item,
                x_percent: Number(newX.toFixed(2)),
                y_percent: Number(newY.toFixed(2)),
              }
            : item,
        ),
      );
    };

    const handlePointerUp = async () => {
      if (!dragRef.current) return;
      const movedFieldId = dragRef.current.fieldId;
      dragRef.current = null;
      setDraggingFieldId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      const updatedField = fieldsRef.current.find((field) => field.id === movedFieldId);
      if (!updatedField) return;

      try {
        await supabase
          .from('document_template_signature_fields' as any)
          .update({
            x_percent: updatedField.x_percent,
            y_percent: updatedField.y_percent,
          } as any)
          .eq('id', updatedField.id);
      } catch (error: any) {
        console.error('Failed to persist field position', error);
        message.error('Failed to save new field position');
        fetchFields();
      }
    };

    if (draggingFieldId) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingFieldId, zoom, fetchFields]);

  const handlePointerDown = (field: SignatureFieldRecord, event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const widthPx = rect.width / zoom;
    const heightPx = rect.height / zoom;
    const fieldLeftPx = (field.x_percent / 100) * widthPx;
    const fieldTopPx = (field.y_percent / 100) * heightPx;
    const pointerX = (event.clientX - rect.left) / zoom;
    const pointerY = (event.clientY - rect.top) / zoom;

    dragRef.current = {
      fieldId: field.id,
      offsetX: pointerX - fieldLeftPx,
      offsetY: pointerY - fieldTopPx,
      widthPx,
      heightPx,
    };
    setDraggingFieldId(field.id);
    setActiveFieldId(field.id);
  };

  const addField = async (fieldType: SignatureFieldRecord['field_type']) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('document_template_signature_fields' as any)
        .insert({
          template_id: templateId,
          field_type: fieldType,
          signer_role: DEFAULT_SIGNER_ROLE,
          page_number: activePage,
          x_percent: 40,
          y_percent: 70,
          width_percent: DEFAULT_WIDTH,
          height_percent: DEFAULT_HEIGHT,
          label: fieldType === 'date' ? 'Execution Date' : 'Executive Signature',
          required: true,
        } as any)
        .select('*')
        .single();

      if (error) throw error;
      setFields((prev) => [...prev, data as any as SignatureFieldRecord]);
      setActiveFieldId((data as any).id);
      message.success('Field added');
    } catch (err: any) {
      console.error('Failed to add field', err);
      message.error(err.message || 'Failed to add field');
    } finally {
      setSaving(false);
    }
  };

  const updateField = async (fieldId: string, updates: Partial<SignatureFieldRecord>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
    );
    try {
      await supabase
        .from('document_template_signature_fields' as any)
        .update(updates as any)
        .eq('id', fieldId);
    } catch (err: any) {
      console.error('Failed to update field', err);
      message.error(err.message || 'Failed to update field');
      fetchFields();
    }
  };

  const deleteField = async (fieldId: string) => {
    Modal.confirm({
      title: 'Remove field?',
      content: 'Are you sure you want to remove this signature field?',
      okType: 'danger',
      onOk: async () => {
        try {
          await supabase.from('document_template_signature_fields' as any).delete().eq('id', fieldId);
          setFields((prev) => prev.filter((field) => field.id !== fieldId));
          if (activeFieldId === fieldId) {
            setActiveFieldId(null);
          }
          message.success('Field removed');
        } catch (err: any) {
          console.error('Failed to remove field', err);
          message.error(err.message || 'Failed to remove field');
        }
      },
    });
  };

  const activeField = fields.find((field) => field.id === activeFieldId) || null;

  const fieldControls = activeField ? (
    <CardSection title="Field Settings">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Text strong>Field Type</Text>
          <Select
            value={activeField.field_type}
            options={FIELD_TYPE_OPTIONS}
            onChange={(value) => updateField(activeField.id, { field_type: value })}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Signer Role</Text>
          <Input
            placeholder="Signer role (e.g., executive, board, witness)"
            value={activeField.signer_role}
            onChange={(event) => updateField(activeField.id, { signer_role: event.target.value })}
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Label</Text>
          <Input
            placeholder="Field label (optional)"
            value={activeField.label || ''}
            onChange={(event) => updateField(activeField.id, { label: event.target.value || null })}
            style={{ marginTop: 4 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text strong>Page</Text>
            <InputNumber
              min={1}
              value={activeField.page_number}
              onChange={(value) => {
                if (!value) return;
                updateField(activeField.id, { page_number: Number(value) });
                setActivePage(Number(value));
              }}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Required</Text>
            <div style={{ marginTop: 6 }}>
              <Switch
                checked={activeField.required}
                onChange={(checked) => updateField(activeField.id, { required: checked })}
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text strong>Width %</Text>
            <InputNumber
              min={5}
              max={100}
              value={activeField.width_percent}
              onChange={(value) => {
                if (!value) return;
                updateField(activeField.id, { width_percent: Number(value) });
              }}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Height %</Text>
            <InputNumber
              min={4}
              max={100}
              value={activeField.height_percent}
              onChange={(value) => {
                if (!value) return;
                updateField(activeField.id, { height_percent: Number(value) });
              }}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </div>
        <div>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteField(activeField.id)}
            block
          >
            Remove Field
          </Button>
        </div>
      </Space>
    </CardSection>
  ) : (
    <Alert
      type="info"
      showIcon
      message="Select a field to edit"
      description="Click on a field in the preview to adjust its settings."
    />
  );

  return (
    <Modal
      open={visible}
      onCancel={() => onClose()}
      footer={null}
      width={1100}
      destroyOnClose
      title={`Signature Fields • ${templateName}`}
    >
      <div style={{ display: 'flex', gap: 16, minHeight: '70vh' }}>
        <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Space align="center" style={{ marginBottom: 12, justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Space wrap>
              <Button icon={<PlusOutlined />} onClick={() => addField('signature')} loading={saving}>
                Add Signature
              </Button>
              <Button onClick={() => addField('date')} loading={saving}>
                Add Date
              </Button>
              <Button onClick={() => addField('text')} loading={saving}>
                Add Text
              </Button>
              <Button
                icon={<FileAddOutlined />}
                onClick={() => {
                  setPageCount((prev) => {
                    const nextCount = prev + 1;
                    setActivePage(nextCount);
                    return nextCount;
                  });
                }}
              >
                Add Page
              </Button>
            </Space>
            <Space>
              <Tooltip title="Zoom out">
                <Button
                  icon={<ZoomOutOutlined />}
                  onClick={() => setZoom((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                />
              </Tooltip>
              <Tooltip title="Reset zoom">
                <Button icon={<AimOutlined />} onClick={() => setZoom(1)} />
              </Tooltip>
              <Tooltip title="Zoom in">
                <Button
                  icon={<ZoomInOutlined />}
                  onClick={() => setZoom((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))))}
                />
              </Tooltip>
            </Space>
          </Space>

          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              background: '#f8fafc',
              flex: 1,
              overflow: 'auto',
            }}
          >
            <div
              ref={pageRef}
              style={{
                position: 'relative',
                width: PAGE_WIDTH_PX,
                height: PAGE_HEIGHT_PX,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                background: '#ffffff',
                boxShadow: '0 12px 24px rgba(148, 163, 184, 0.18)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    minHeight: `${totalPages * PAGE_HEIGHT_PX}px`,
                    pointerEvents: 'none',
                padding: 24,
                    boxSizing: 'border-box',
                    transform: `translateY(-${(activePage - 1) * PAGE_HEIGHT_PX}px)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  dangerouslySetInnerHTML={{ __html: normalizedHtml }}
                />
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {loading ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <Spin tip="Loading fields..." />
                  </div>
                ) : fieldsOnActivePage.length === 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#64748b',
                      textAlign: 'center',
                      padding: 16,
                    }}
                  >
                    <Text type="secondary">No fields on this page yet. Use the buttons above to add one.</Text>
                  </div>
                ) : null}

                {fieldsOnActivePage.map((field) => {
                  const isActive = field.id === activeFieldId;
                  return (
                    <div
                      key={field.id}
                      onPointerDown={(event) => handlePointerDown(field, event)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveFieldId(field.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${field.x_percent}%`,
                        top: `${field.y_percent}%`,
                        width: `${field.width_percent}%`,
                        height: `${field.height_percent}%`,
                        border: isActive ? '2px solid #2563eb' : '2px dashed #1f2937',
                        borderRadius: 6,
                        background:
                          field.field_type === 'signature'
                            ? 'rgba(59, 130, 246, 0.12)'
                            : field.field_type === 'date'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(99, 102, 241, 0.14)',
                        boxShadow: isActive ? '0 0 0 2px rgba(37, 99, 235, 0.25)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'grab',
                        color: '#1f2937',
                        fontWeight: 600,
                        fontSize: 12,
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        transition: 'border 0.12s ease',
                      }}
                    >
                      <span>{field.label || `${field.field_type.toUpperCase()} (${field.signer_role})`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Space align="center" style={{ marginTop: 12, justifyContent: 'space-between' }}>
            <Text type="secondary">
              Zoom: {(zoom * 100).toFixed(0)}% • Fields on page {activePage}: {fieldsOnActivePage.length}
            </Text>
            <Space>
              <Text strong>Active Page</Text>
              <Segmented
                value={activePage}
                onChange={(value) => {
                  setActiveFieldId(null);
                  setActivePage(Number(value));
                }}
                  options={Array.from({ length: Math.max(totalPages, activePage) }).map((_, index) => ({
                  label: `Page ${index + 1}`,
                  value: index + 1,
                }))}
              />
            </Space>
          </Space>
        </div>

        <div style={{ width: 320 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <CardSection title="Instructions">
              <Space direction="vertical" size={8}>
                <Text type="secondary">
                  Drag fields onto the document to mark required signatures, initials, or dates. Each signer will only
                  see fields assigned to their role.
                </Text>
                <Text type="secondary">
                  Use <Text strong>Add Page</Text> if you need to position fields on a page that has no fields yet.
                  Switch pages with the selector below the preview.
                </Text>
              </Space>
            </CardSection>
            {fieldControls}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

