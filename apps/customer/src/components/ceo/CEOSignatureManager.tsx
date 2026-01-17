import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Input, Space, Typography, Upload, message, Divider, Spin, Tooltip } from 'antd';
import { UploadOutlined, InfoCircleOutlined, ReloadOutlined, SaveOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { RcFile } from 'antd/es/upload';
import { supabase } from '@/integrations/supabase/client';

const { Title, Text, Paragraph } = Typography;

interface CeoSignatureSetting {
  typed_name?: string;
  signature_png_base64?: string;
  updated_at?: string;
  updated_by?: string;
  title?: string;
}

interface StoredSignatureResponse {
  setting_value: CeoSignatureSetting;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 220;
const CANVAS_ASPECT = CANVAS_HEIGHT / CANVAS_WIDTH;
const MIN_CANVAS_HEIGHT = 200;

const dataUrlFromFile = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsDataURL(file);
  });

export const CEOSignatureManager: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [storedSignature, setStoredSignature] = useState<CeoSignatureSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);

  const drawImageOnCanvas = useCallback((dataUrl: string | null) => {
    if (!dataUrl) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { width, height } = canvasSizeRef.current;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = dataUrl;
  }, []);

  const initializeCanvas = useCallback(
    (width: number, height: number, preserveDrawing: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = Math.max(width, 1);
      const cssHeight = Math.max(height, MIN_CANVAS_HEIGHT);
      const pixelWidth = Math.max(Math.round(cssWidth * dpr), 1);
      const pixelHeight = Math.max(Math.round(cssHeight * dpr), 1);

      let existingDrawing: string | null = null;
      if (preserveDrawing && canvas.width > 0 && canvas.height > 0) {
        existingDrawing = canvas.toDataURL('image/png');
      }

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pixelWidth, pixelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pixelWidth, pixelHeight);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = '#111827';

      canvasSizeRef.current = { width: pixelWidth, height: pixelHeight };
      lastPointRef.current = null;

      if (existingDrawing) {
        drawImageOnCanvas(existingDrawing);
      } else if (signatureDataUrl) {
        drawImageOnCanvas(signatureDataUrl);
      }
    },
    [drawImageOnCanvas, signatureDataUrl]
  );

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvasSizeRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const dpr = window.devicePixelRatio || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = '#111827';
    lastPointRef.current = null;
  }, []);

  const setCanvasToImage = useCallback(
    (dataUrl: string | null) => {
      if (!dataUrl) {
        resetCanvas();
        return;
      }
      drawImageOnCanvas(dataUrl);
    },
    [drawImageOnCanvas, resetCanvas]
  );

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = Math.max(width * CANVAS_ASPECT, MIN_CANVAS_HEIGHT);
      initializeCanvas(width, height, true);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    window.addEventListener('orientationchange', resize);
    window.addEventListener('resize', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('resize', resize);
    };
  }, [initializeCanvas]);

  const fetchSignature = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_system_settings')
        .select('setting_value')
        .eq('setting_key', 'ceo_signature')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const sigValue = data.setting_value as CeoSignatureSetting;
        setStoredSignature(sigValue);
        setTypedName(sigValue.typed_name || '');
        setSignatureDataUrl(sigValue.signature_png_base64 || null);
        setCanvasToImage(sigValue.signature_png_base64 || null);
        setLastUpdated(sigValue.updated_at || null);
        setLastUpdatedBy(sigValue.updated_by || null);
      } else {
        setStoredSignature(null);
        setTypedName('');
        setSignatureDataUrl(null);
        resetCanvas();
        setLastUpdated(null);
        setLastUpdatedBy(null);
      }
    } catch (err) {
      console.error('Failed to load CEO signature:', err);
      message.error('Unable to load stored signature.');
    } finally {
      setLoading(false);
    }
  }, [resetCanvas, setCanvasToImage]);

  useEffect(() => {
    fetchSignature();
  }, [fetchSignature]);

  useEffect(() => {
    if (signatureDataUrl) {
      setCanvasToImage(signatureDataUrl);
    }
  }, [signatureDataUrl, setCanvasToImage]);

  const getCanvasCoordinates = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(event);
    lastPointRef.current = { x, y };
    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();

    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastPoint = lastPointRef.current;
    const { x, y } = getCanvasCoordinates(event);

    if (!lastPoint) {
      lastPointRef.current = { x, y };
      return;
    }

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastPoint = lastPointRef.current;
    const { x, y } = getCanvasCoordinates(event);

    if (lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPointRef.current = null;
    setIsDrawing(false);
    canvas.releasePointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(event.pointerId);
    lastPointRef.current = null;
    setIsDrawing(false);
  };

  const getCanvasDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    const blankCtx = blank.getContext('2d');
    if (blankCtx) {
      blankCtx.fillStyle = '#ffffff';
      blankCtx.fillRect(0, 0, blank.width, blank.height);
    }
    if (canvas.toDataURL() === blank.toDataURL()) {
      return null;
    }
    return canvas.toDataURL('image/png');
  };

  const handleClearSignature = () => {
    resetCanvas();
    setSignatureDataUrl(null);
  };

  const handleUpload = (file: UploadFile): boolean | string => {
    if (!file.originFileObj) {
      message.error('Unable to read file');
      return false;
    }
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      message.error('Please upload an image file');
      return false;
    }
    const isLt2M = file.size ? file.size / 1024 / 1024 < 2 : true;
    if (!isLt2M) {
      message.error('Image must be smaller than 2MB');
      return false;
    }
    dataUrlFromFile(file.originFileObj)
      .then((dataUrl) => {
        setSignatureDataUrl(dataUrl);
        setCanvasToImage(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to read file:', err);
        message.error('Unable to read uploaded file');
      });
    return false;
  };

  const handleSaveSignature = async () => {
    const canvasSignature = getCanvasDataUrl();
    const currentSignature = canvasSignature || signatureDataUrl;

    if (!typedName.trim()) {
      message.warning('Please enter the CEO name exactly as it should appear on signed documents.');
      return;
    }
    if (!currentSignature) {
      message.warning('Please draw or upload the signature.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be signed in to save a signature.');
      }

      try {
        if (user.email) {
          await supabase
            .from('ceo_access_credentials')
            .upsert(
              {
                user_email: user.email,
              },
              { onConflict: 'user_email' }
            );
        }
      } catch (credentialError) {
        console.warn('Unable to ensure CEO access credentials:', credentialError);
      }

      const payload: CeoSignatureSetting = {
        typed_name: typedName.trim(),
        signature_png_base64: currentSignature,
        updated_at: new Date().toISOString(),
        title: 'Chief Executive Officer',
        updated_by: user.id || undefined,
      };

      const { error } = await supabase
        .from('ceo_system_settings')
        .upsert(
          [{
            setting_key: 'ceo_signature',
            setting_value: payload as any,
            category: 'operations',
            description: 'Stored CEO signature used for automatic document signing',
            is_critical: false,
            requires_confirmation: false,
          }],
          { onConflict: 'setting_key' }
        );

      if (error) throw error;

      message.success('CEO signature saved successfully.');
      setStoredSignature(payload);
      setSignatureDataUrl(currentSignature);
      setLastUpdated(payload.updated_at || null);
      setLastUpdatedBy(user.email || payload.updated_by || null);
    } catch (err: any) {
      console.error('Failed to save CEO signature:', err);
      message.error(err?.message || 'Failed to save CEO signature. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignature = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ceo_system_settings')
        .delete()
        .eq('setting_key', 'ceo_signature');
      if (error) throw error;
      message.success('CEO signature removed.');
      setStoredSignature(null);
      setSignatureDataUrl(null);
      setTypedName('');
      resetCanvas();
      setLastUpdated(null);
      setLastUpdatedBy(null);
    } catch (err) {
      console.error('Failed to delete CEO signature:', err);
      message.error('Failed to delete signature.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 8 }}>
            Executive Signature
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Capture or upload the CEO signature once and the system will automatically apply it to documents that require the CEO&apos;s authorization.
          </Paragraph>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card type="inner" title="Signature Details">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Full Legal Name</Text>
                  <Tooltip title="This will be placed beneath the signature on generated documents.">
                    <InfoCircleOutlined style={{ marginLeft: 6 }} />
                  </Tooltip>
                  <Input
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    placeholder="Torrance Stroman"
                    size="large"
                    style={{ marginTop: 8 }}
                  />
                </div>

                <div>
                  <Text strong>Signature</Text>
                  <Tooltip title="Draw or upload the signature exactly as you want it to appear on contracts.">
                    <InfoCircleOutlined style={{ marginLeft: 6 }} />
                  </Tooltip>
                  <div
                    style={{
                      border: '2px dashed #d9d9d9',
                      borderRadius: 12,
                      padding: 16,
                      marginTop: 8,
                      background: '#fefefe',
                    }}
                  >
                    <div ref={canvasContainerRef} style={{ width: '100%' }}>
                      <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        style={{ width: '100%', borderRadius: 8, cursor: 'crosshair', background: '#ffffff', touchAction: 'none' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerCancel}
                        onPointerCancel={handlePointerCancel}
                      />
                    </div>
                    <Space style={{ marginTop: 12 }}>
                      <Button icon={<EditOutlined />} onClick={() => resetCanvas()}>
                        Start Fresh
                      </Button>
                      <Button icon={<ReloadOutlined />} onClick={handleClearSignature}>
                        Clear Drawing
                      </Button>
                      <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*">
                        <Button icon={<UploadOutlined />}>Upload PNG/JPG</Button>
                      </Upload>
                    </Space>
                  </div>
                </div>

                {signatureDataUrl && (
                  <div>
                    <Text strong>Preview</Text>
                    <div
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 16,
                        marginTop: 8,
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <img
                        src={signatureDataUrl}
                        alt="CEO signature preview"
                        style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain' }}
                      />
                      {typedName ? (
                        <Text type="secondary" style={{ fontStyle: 'italic' }}>
                          {typedName}
                        </Text>
                      ) : null}
                    </div>
                  </div>
                )}

                <Space style={{ marginTop: 8 }}>
                  <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveSignature}>
                    Save Signature
                  </Button>
                  {storedSignature ? (
                    <Button danger icon={<DeleteOutlined />} loading={saving} onClick={handleDeleteSignature}>
                      Remove Signature
                    </Button>
                  ) : null}
                  <Button icon={<ReloadOutlined />} onClick={fetchSignature} disabled={saving}>
                    Reload Stored Signature
                  </Button>
                </Space>

                {lastUpdated ? (
                  <Text type="secondary">
                    Last updated {new Date(lastUpdated).toLocaleString()} {lastUpdatedBy ? `by ${lastUpdatedBy}` : ''}
                  </Text>
                ) : (
                  <Text type="secondary">No signature stored yet. Save a signature to enable automatic CEO approvals.</Text>
                )}
              </Space>
            </Card>

            <Card type="inner" title="How automatic signing works">
              <Space direction="vertical" size="small">
                <Text>
                  Once saved, this signature is applied to documents that list <strong>Board</strong> or <strong>CEO</strong> as required signers. The system embeds the signature into the PDF and logs the action for compliance.
                </Text>
                <Divider style={{ margin: '12px 0' }} />
                <ul style={{ paddingLeft: 20, color: '#4b5563' }}>
                  <li>Only the CEO can update or remove this signature.</li>
                  <li>Documents generated after saving will include the signature automatically.</li>
                  <li>Removing the signature stops automatic board signing until a new signature is saved.</li>
                </ul>
              </Space>
            </Card>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default CEOSignatureManager;
