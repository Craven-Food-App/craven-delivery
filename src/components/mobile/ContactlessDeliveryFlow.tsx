/**
 * Contactless Delivery – 5-step "Orders, details" flow after driver slides "I am here" at customer.
 * 1) Labels scanned → START SCANNING → scan view → DONE SCANNING
 * 2) House/unit confirmation → YES I'M HERE
 * 3) Drop-off notes → GOT IT
 * 4) Drop-off location → SELECT → modal (Front door, Back door, etc.) → SUBMIT
 * 5) Proof of delivery → TAKE PHOTO → COMPLETE DROP-OFF
 */
import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, Button, Stack, Group, ActionIcon } from '@mantine/core';
import { IconX, IconNavigation, IconPhone, IconFileText, IconMapPin, IconCamera } from '@tabler/icons-react';
import SlideToConfirm from '@/components/SlideToConfirm';
import FullscreenCamera from './FullscreenCamera';

const DROPOFF_OPTIONS = [
  { value: 'front_door', label: 'Front door' },
  { value: 'back_door', label: 'Back door' },
  { value: 'porch', label: 'Porch' },
  { value: 'carport', label: 'Carport' },
  { value: 'mailroom', label: 'Mailroom' },
  { value: 'garage', label: 'Garage' },
];

export interface ContactlessDeliveryFlowProps {
  customerName: string;
  customerAddress: string;
  dropoffTimeLabel?: string;
  propertyType?: string;
  orderNumber: string;
  orderId?: string;
  /** Number of items/labels to scan for this delivery (default 1) */
  itemsToScanCount?: number;
  deliveryNotes?: string;
  onNavigate: () => void;
  onContact?: () => void;
  onCompleteDropOff: (opts: { deliveryPhotoUrl?: string; dropOffLocation?: string }) => void | Promise<void>;
  onClose?: () => void;
}

type StepIndex = 1 | 2 | 3 | 4 | 5;

const ContactlessDeliveryFlow: React.FC<ContactlessDeliveryFlowProps> = ({
  customerName,
  customerAddress,
  dropoffTimeLabel = 'drop-off',
  propertyType = 'House',
  orderNumber,
  orderId,
  itemsToScanCount = 1,
  deliveryNotes,
  onNavigate,
  onContact,
  onCompleteDropOff,
  onClose,
}) => {
  const [showBanner, setShowBanner] = useState(true);
  const [step1Scanned, setStep1Scanned] = useState(0);
  const [step1Total] = useState(Math.max(1, itemsToScanCount));
  const [showScanView, setShowScanView] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [dropOffLocation, setDropOffLocation] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationValue, setSelectedLocationValue] = useState<string | null>(null);
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null);
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);

  const currentStep: StepIndex =
    step1Scanned < step1Total
      ? 1
      : !step2Done
        ? 2
        : !step3Done
          ? 3
          : !dropOffLocation
            ? 4
            : 5;

  const step1Complete = step1Scanned >= step1Total;
  const step2Complete = step2Done;
  const step3Complete = step3Done;
  const step4Complete = !!dropOffLocation;
  const step5Complete = !!deliveryPhotoUrl;

  const handleDoneScanning = () => {
    setShowScanView(false);
    setStep1Scanned(step1Total);
  };

  const handleLocationSubmit = () => {
    if (selectedLocationValue) {
      const option = DROPOFF_OPTIONS.find((o) => o.value === selectedLocationValue);
      setDropOffLocation(option?.label ?? selectedLocationValue);
      setShowLocationModal(false);
      setSelectedLocationValue(null);
    }
  };

  const handlePhotoCapture = (imageData: string) => {
    setDeliveryPhotoUrl(imageData);
    setShowPhotoCamera(false);
  };

  const handleCompleteDropOffConfirm = async () => {
    const option = DROPOFF_OPTIONS.find((o) => o.label === dropOffLocation);
    await onCompleteDropOff({
      deliveryPhotoUrl: deliveryPhotoUrl ?? undefined,
      dropOffLocation: option?.value ?? dropOffLocation ?? undefined,
    });
  };

  const stepNodes: { step: StepIndex; complete: boolean; current: boolean }[] = [
    { step: 1, complete: step1Complete, current: currentStep === 1 },
    { step: 2, complete: step2Complete, current: currentStep === 2 },
    { step: 3, complete: step3Complete, current: currentStep === 3 },
    { step: 4, complete: step4Complete, current: currentStep === 4 },
    { step: 5, complete: step5Complete, current: currentStep === 5 },
  ];

  // —— Label scanning full-screen view ——
  if (showScanView) {
    return (
      <DeliveryLabelScanView
        customerName={customerName}
        orderNumber={orderNumber}
        totalItems={step1Total}
        initialScanned={step1Scanned}
        onScannedUpdate={setStep1Scanned}
        onDone={handleDoneScanning}
        onClose={() => setShowScanView(false)}
      />
    );
  }

  // —— Location modal ——
  if (showLocationModal) {
    return (
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <Box
          style={{
            background: '#fff',
            width: '100%',
            maxWidth: 480,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconMapPin size={20} color="#2563EB" />
              <Text fw={700} size="lg">Where did you leave the order?</Text>
            </Group>
            <ActionIcon variant="subtle" onClick={() => setShowLocationModal(false)}>
              <IconX size={20} />
            </ActionIcon>
          </Group>
          <Stack gap="xs">
            {DROPOFF_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: selectedLocationValue === opt.value ? '2px solid #2563EB' : '1px solid #E5E7EB',
                  background: selectedLocationValue === opt.value ? '#EFF6FF' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="dropoff-location"
                  value={opt.value}
                  checked={selectedLocationValue === opt.value}
                  onChange={() => setSelectedLocationValue(opt.value)}
                  style={{ accentColor: '#2563EB' }}
                />
                <span style={{ fontWeight: 500 }}>{opt.label}</span>
              </label>
            ))}
          </Stack>
          <Button
            fullWidth
            mt="lg"
            size="md"
            color="blue"
            onClick={handleLocationSubmit}
            disabled={!selectedLocationValue}
          >
            SUBMIT
          </Button>
        </Box>
      </Box>
    );
  }

  // —— Photo camera ——
  if (showPhotoCamera) {
    return (
      <FullscreenCamera
        isOpen
        onClose={() => setShowPhotoCamera(false)}
        onCapture={handlePhotoCapture}
        title="Proof of delivery"
        description="Customers appreciate including the address number or the front of the home in the photo."
        type="delivery"
      />
    );
  }

  // —— Main Contactless Delivery view ——
  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#F9FAFB',
        overflowY: 'auto',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <Box
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {onClose && (
          <ActionIcon variant="subtle" onClick={onClose} size="lg">
            <IconX size={24} />
          </ActionIcon>
        )}
        <Text fw={700} size="lg">Contactless Delivery</Text>
        <Box style={{ width: 40 }} />
      </Box>

      {showBanner && (
        <Box
          style={{
            background: '#111827',
            color: '#fff',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text size="sm">You can press NAVIGATE for walking directions to the drop-off location.</Text>
          <ActionIcon variant="subtle" color="gray" onClick={() => setShowBanner(false)}>
            <IconX size={18} />
          </ActionIcon>
        </Box>
      )}

      {/* Customer block */}
      <Box style={{ padding: 16, background: '#fff', marginBottom: 8 }}>
        <Text fw={700} size="lg">{customerName}</Text>
        <Text size="sm" c="dimmed" mt={4}>{customerAddress}</Text>
        {dropoffTimeLabel && (
          <Text size="sm" c="dimmed" mt={2}>{dropoffTimeLabel}</Text>
        )}
        <Group mt="sm" gap="xs">
          <Box
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: '#F3F4F6',
              fontSize: 12,
              color: '#6B7280',
            }}
          >
            {propertyType}
          </Box>
          <Group gap="md" ml="auto">
            {onContact && (
              <Button variant="subtle" size="xs" leftSection={<IconPhone size={14} />} onClick={onContact}>
                CONTACT
              </Button>
            )}
            <Button variant="subtle" size="xs" leftSection={<IconNavigation size={14} />} onClick={onNavigate}>
              NAVIGATE
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Timeline */}
      <Box style={{ padding: '0 16px 16px', position: 'relative' }}>
        <Box
          style={{
            position: 'absolute',
            left: 27,
            top: 36,
            bottom: 36,
            width: 2,
            background: '#E5E7EB',
            zIndex: 0,
          }}
        />
        {stepNodes.map((node) => (
          <Box key={node.step} style={{ display: 'flex', gap: 12, marginBottom: 8, position: 'relative', zIndex: 1 }}>
            <Box
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: node.complete ? '#2563EB' : node.current ? '#2563EB' : '#E5E7EB',
                color: node.complete ? '#fff' : node.current ? '#fff' : '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {node.complete ? '✓' : node.step}
            </Box>
            <Box
              style={{
                flex: 1,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                padding: 14,
              }}
            >
              {node.step === 1 && (
                <>
                  <Group justify="space-between" mb="xs">
                    <Group gap={6}>
                      <span style={{ fontSize: 16 }}>📊</span>
                      <Text fw={600} size="sm">Labels scanned: {step1Scanned}/{step1Total}</Text>
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed">{customerName}</Text>
                  <Group gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">{step1Total} item(s)</Text>
                    <Text size="xs" c="dimmed">Order {orderNumber}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>View all orders (1)</Text>
                  {!step1Complete && (
                    <Button
                      fullWidth
                      mt="md"
                      color="blue"
                      onClick={() => setShowScanView(true)}
                    >
                      START SCANNING
                    </Button>
                  )}
                </>
              )}
              {node.step === 2 && (
                <>
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconMapPin size={18} color="#2563EB" />
                      <Text fw={600} size="sm">House/unit number confirmation</Text>
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>{customerAddress.split(',')[0]}</Text>
                  {!step2Complete && (
                    <Button
                      fullWidth
                      mt="md"
                      color="blue"
                      onClick={() => setStep2Done(true)}
                    >
                      YES, I&apos;M HERE
                    </Button>
                  )}
                </>
              )}
              {node.step === 3 && (
                <>
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconFileText size={18} color="#2563EB" />
                      <Text fw={600} size="sm">Drop-off notes</Text>
                    </Group>
                  </Group>
                  {deliveryNotes && (
                    <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
                      {deliveryNotes}
                    </Text>
                  )}
                  {!deliveryNotes && (
                    <Text size="sm" c="dimmed" mt={4}>No special instructions.</Text>
                  )}
                  {!step3Complete && (
                    <Button fullWidth mt="md" color="blue" onClick={() => setStep3Done(true)}>
                      GOT IT
                    </Button>
                  )}
                </>
              )}
              {node.step === 4 && (
                <>
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconMapPin size={18} color="#2563EB" />
                      <Text fw={600} size="sm">Drop-off location</Text>
                    </Group>
                  </Group>
                  {step4Complete ? (
                    <Group justify="space-between" mt="sm">
                      <Text size="sm">{dropOffLocation}</Text>
                      <Button variant="light" size="xs" onClick={() => setShowLocationModal(true)}>
                        Edit
                      </Button>
                    </Group>
                  ) : (
                    <Button fullWidth mt="md" color="blue" onClick={() => setShowLocationModal(true)}>
                      SELECT
                    </Button>
                  )}
                </>
              )}
              {node.step === 5 && (
                <>
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconCamera size={18} color="#2563EB" />
                      <Text fw={600} size="sm">Proof of delivery</Text>
                    </Group>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    Customers appreciate including the address number or the front of the home/apt in the delivery photo.
                  </Text>
                  {!deliveryPhotoUrl ? (
                    <Button fullWidth mt="md" color="blue" onClick={() => setShowPhotoCamera(true)}>
                      TAKE PHOTO
                    </Button>
                  ) : (
                    <>
                      <Box
                        component="img"
                        src={deliveryPhotoUrl}
                        alt="Delivery proof"
                        style={{
                          width: '100%',
                          maxHeight: 200,
                          objectFit: 'cover',
                          borderRadius: 12,
                          marginTop: 12,
                        }}
                      />
                      <Button
                        variant="light"
                        size="xs"
                        mt="xs"
                        onClick={() => setShowPhotoCamera(true)}
                      >
                        Retake
                      </Button>
                      <Box mt="md">
                        <SlideToConfirm
                          label="Complete drop-off"
                          onConfirm={handleCompleteDropOffConfirm}
                        />
                      </Box>
                    </>
                  )}
                </>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Box style={{ padding: '8px 16px', textAlign: 'center' }}>
        <Text size="xs" c="dimmed">Swipe up if you&apos;re having issues</Text>
      </Box>
    </Box>
  );
};

// —— Delivery label scan view (full-screen, camera + list + DONE SCANNING) ——
interface DeliveryLabelScanViewProps {
  customerName: string;
  orderNumber: string;
  totalItems: number;
  initialScanned: number;
  onScannedUpdate: (n: number) => void;
  onDone: () => void;
  onClose: () => void;
}

const DeliveryLabelScanView: React.FC<DeliveryLabelScanViewProps> = ({
  customerName,
  orderNumber,
  totalItems,
  initialScanned,
  onScannedUpdate,
  onDone,
  onClose,
}) => {
  const [scanned, setScanned] = useState(initialScanned);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastValueRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    onScannedUpdate(scanned);
  }, [scanned, onScannedUpdate]);

  useEffect(() => {
    if (!(typeof window !== 'undefined' && (window as any).BarcodeDetector)) return;
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const BarcodeDetector = (window as any).BarcodeDetector;
        const detector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'qr_code'] });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const run = async () => {
          const v = videoRef.current;
          if (!v || v.readyState !== 4 || v.videoWidth === 0) return;
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          try {
            const barcodes = await detector.detect(canvas);
            const value = (barcodes?.[0]?.rawValue || '').trim();
            if (!value) return;
            const now = Date.now();
            if (value === lastValueRef.current && now - lastTimeRef.current < 2000) return;
            lastValueRef.current = value;
            lastTimeRef.current = now;
            setScanned((prev) => Math.min(prev + 1, totalItems));
          } catch (_) {}
        };
        intervalRef.current = window.setInterval(run, 600);
      } catch (_) {}
    };
    start();
    return () => {
      mounted = false;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [totalItems]);

  const allScanned = scanned >= totalItems;

  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Box
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ActionIcon variant="subtle" onClick={onClose}>
          <IconX size={24} />
        </ActionIcon>
        <Text fw={700}>Label Scanning</Text>
        <Box style={{ width: 40 }} />
      </Box>
      <Box style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text size="sm" c="dimmed">Total scanned: <strong style={{ color: '#2563EB' }}>{scanned}/{totalItems}</strong></Text>
      </Box>
      <Box
        style={{
          flex: 1,
          minHeight: 200,
          background: '#0F766E',
          margin: 12,
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box
          style={{
            position: 'absolute',
            left: '10%',
            right: '10%',
            top: '50%',
            height: 2,
            background: '#22C55E',
            transform: 'translateY(-50%)',
          }}
        />
        <Box
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: '#ECFEFF',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Please position the label barcode within this scanner box.
        </Box>
      </Box>
      <Box
        style={{
          background: '#fff',
          borderRadius: 12,
          margin: 12,
          padding: 14,
          border: '1px solid #E5E7EB',
        }}
      >
        <Group justify="space-between">
          <Text fw={600} size="sm" c="blue">{customerName}</Text>
          <Text size="sm" c="dimmed">{scanned}/{totalItems} Scanned</Text>
        </Group>
        <Text size="xs" c="dimmed" mt={4}>Order: {orderNumber}</Text>
      </Box>
      {!allScanned && (
        <Box style={{ padding: '0 12px 8px' }}>
          <Button
            variant="light"
            size="sm"
            fullWidth
            onClick={() => setScanned((p) => Math.min(p + 1, totalItems))}
          >
            Mark 1 scanned
          </Button>
        </Box>
      )}
      <Box style={{ padding: 12 }}>
        <Button
          fullWidth
          size="md"
          color="blue"
          onClick={allScanned ? onDone : undefined}
          disabled={!allScanned}
          leftSection={<span style={{ fontSize: 18 }}>››</span>}
        >
          DONE SCANNING
        </Button>
      </Box>
      <Text size="xs" c="dimmed" ta="center" pb="sm">Swipe up for help and other options</Text>
    </Box>
  );
};

export default ContactlessDeliveryFlow;
