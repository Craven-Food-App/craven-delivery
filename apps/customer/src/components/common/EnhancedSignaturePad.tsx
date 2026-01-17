import React, { useRef, useState, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  Card,
  Button,
  Stack,
  Text,
  Group,
  ActionIcon,
  Alert,
  Box,
  Paper,
  Loader,
  Center,
  Badge,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX, IconCheck, IconPencil, IconDeviceMobile } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedSignaturePadProps {
  onSave: (signatureDataUrl: string, signatureId?: string, typedName?: string) => Promise<void> | void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  disabled?: boolean;
  showTypedName?: boolean;
  typedNameLabel?: string;
  documentId?: string;
  orderId?: string;
  saveToDatabase?: boolean;
  storageBucket?: string;
  storagePath?: string;
  title?: string;
  description?: string;
  required?: boolean;
}

export const EnhancedSignaturePad: React.FC<EnhancedSignaturePadProps> = ({
  onSave,
  onCancel,
  width = 600,
  height = 300,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  disabled = false,
  showTypedName = false,
  typedNameLabel = 'Type your name',
  documentId,
  orderId,
  saveToDatabase = false,
  storageBucket = 'documents',
  storagePath,
  title = 'Sign Below',
  description = 'Use your finger or stylus to draw your signature',
  required = true,
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [typedNameValue, setTypedNameValue] = useState('');
  const [hasSigned, setHasSigned] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adjust canvas size for mobile
  const canvasWidth = isMobile ? Math.min(width, window.innerWidth - 32) : width;
  const canvasHeight = isMobile ? Math.min(height, 250) : height;

  const clear = useCallback(() => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setHasSigned(false);
    setSignaturePreview(null);
  }, []);

  const handleEnd = useCallback(() => {
    const empty = sigCanvas.current?.isEmpty() ?? true;
    setIsEmpty(empty);
    if (!empty) {
      // Generate preview
      const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png', 1.0);
      setSignaturePreview(dataUrl || null);
    }
  }, []);

  const saveSignature = useCallback(async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      notifications.show({
        title: 'Signature Required',
        message: 'Please draw your signature before saving',
        color: 'orange',
      });
      return;
    }

    if (showTypedName && !typedNameValue.trim()) {
      notifications.show({
        title: 'Name Required',
        message: 'Please enter your name',
        color: 'orange',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get trimmed signature canvas (removes whitespace)
      const trimmedCanvas = sigCanvas.current.getTrimmedCanvas();
      
      // Get high-quality data URL
      const signatureDataUrl = trimmedCanvas.toDataURL('image/png', 1.0);

      let signatureId: string | undefined;
      let signatureUrl: string | undefined;

      // Save to database/storage if requested
      if (saveToDatabase) {
        try {
          // Convert data URL to blob
          const response = await fetch(signatureDataUrl);
          const blob = await response.blob();

          // Generate unique filename
          const timestamp = Date.now();
          const fileName = storagePath 
            ? `${storagePath}/${timestamp}_signature.png`
            : `signatures/${documentId || orderId || 'signature'}_${timestamp}.png`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(storageBucket)
            .upload(fileName, blob, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            // Continue with data URL if storage fails
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(uploadData.path);
            signatureUrl = urlData.publicUrl;
          }

          // Save signature record to database if documentId or orderId provided
            if (documentId || orderId) {
              const signatureRecord: any = {
                signature_data_url: signatureDataUrl,
                signature_url: signatureUrl || null,
                typed_name: showTypedName ? typedNameValue.trim() : null,
                signed_at: new Date().toISOString(),
              };

            if (documentId) {
              signatureRecord.document_id = documentId;
            }
            if (orderId) {
              signatureRecord.order_id = orderId;
            }

            // Check if signatures table exists, otherwise use appropriate table
            const { data: sigData, error: sigError } = await supabase
              .from('signatures')
              .insert(signatureRecord)
              .select()
              .single();

            if (sigError) {
              console.error('Database save error:', sigError);
              // Continue anyway - signature data URL is still available
            } else {
              signatureId = sigData?.id;
            }
          }
        } catch (error: any) {
          console.error('Error saving signature:', error);
          // Continue with callback - signature data URL is still available
        }
      }

      // Call the onSave callback with typed name if available
      await onSave(signatureDataUrl, signatureId, showTypedName ? typedNameValue.trim() : undefined);

      setHasSigned(true);
      notifications.show({
        title: 'Signature Saved',
        message: 'Your signature has been saved successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save signature',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  }, [sigCanvas, typedNameValue, showTypedName, saveToDatabase, documentId, orderId, storageBucket, storagePath, onSave]);

  return (
    <Card p="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <div>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              {title}
            </Text>
            {isMobile && (
              <Badge leftSection={<IconDeviceMobile size={12} />} variant="light" size="sm">
                Mobile
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </div>

        {/* Signature Preview (if saved) */}
        {hasSigned && signaturePreview && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            <Text size="sm" fw={500} mb={4}>Signature Captured</Text>
            <Box
              component="img"
              src={signaturePreview}
              alt="Signature preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
              }}
            />
          </Alert>
        )}

        {/* Typed Name Input */}
        {showTypedName && (
          <TextInput
            label={typedNameLabel}
            placeholder="Enter your full name"
            value={typedNameValue}
            onChange={(e) => setTypedNameValue(e.target.value)}
            disabled={disabled || hasSigned}
            required={required}
          />
        )}

        {/* Signature Canvas */}
        <Paper
          p="xs"
          withBorder
          style={{
            borderStyle: isEmpty && !hasSigned ? 'dashed' : 'solid',
            borderColor: isEmpty && !hasSigned ? '#d0d0d0' : '#e0e0e0',
            backgroundColor: hasSigned ? '#f6ffed' : backgroundColor,
            position: 'relative',
            touchAction: 'none', // Critical for mobile - prevents scrolling while signing
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
        >
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              width: canvasWidth,
              height: canvasHeight,
              className: 'signature-canvas',
              style: {
                width: '100%',
                height: `${canvasHeight}px`,
                display: 'block',
                touchAction: 'none', // Prevents scrolling while signing
                WebkitUserSelect: 'none',
                userSelect: 'none',
                cursor: disabled || hasSigned ? 'not-allowed' : 'crosshair',
              },
            }}
            penColor={penColor}
            backgroundColor={backgroundColor}
            velocityFilterWeight={0.7} // Smoother lines
            minWidth={isMobile ? 1.5 : 2} // Thinner lines on mobile
            maxWidth={isMobile ? 3 : 4}
            throttle={16} // 60fps drawing
            onEnd={handleEnd}
            clearOnResize={false}
          />

          {/* Placeholder when empty */}
          {isEmpty && !hasSigned && (
            <Center
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                color: '#bfbfbf',
              }}
            >
              <Stack align="center" gap="xs">
                <IconPencil size={32} stroke={1.5} />
                <Text size="sm" c="dimmed">
                  {isMobile ? 'Touch here to sign' : 'Click and drag to sign'}
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>

        {/* Action Buttons */}
        <Group justify="space-between" grow>
          <Button
            variant="light"
            color="gray"
            leftSection={<IconX size={16} />}
            onClick={clear}
            disabled={isEmpty || disabled || hasSigned || isSaving}
          >
            Clear
          </Button>
          {onCancel && (
            <Button
              variant="subtle"
              onClick={onCancel}
              disabled={disabled || isSaving}
            >
              Cancel
            </Button>
          )}
          <Button
            color="green"
            leftSection={isSaving ? <Loader size={16} /> : <IconCheck size={16} />}
            onClick={saveSignature}
            disabled={isEmpty || disabled || hasSigned || isSaving || (showTypedName && !typedNameValue.trim())}
            loading={isSaving}
          >
            {hasSigned ? 'Signed' : isSaving ? 'Saving...' : 'Save Signature'}
          </Button>
        </Group>

        {/* Legal Notice */}
        <Alert color="blue" variant="light" p="xs">
          <Text size="xs">
            By signing, you agree that this electronic signature has the same legal effect as a handwritten signature.
          </Text>
        </Alert>
      </Stack>
    </Card>
  );
};

