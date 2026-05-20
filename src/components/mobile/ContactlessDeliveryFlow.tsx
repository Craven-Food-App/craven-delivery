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
import { IconX, IconNavigation, IconPhone, IconFileText, IconMapPin, IconCamera, IconBarcode } from '@tabler/icons-react';
import SlideToConfirm from '@/components/SlideToConfirm';
import FullscreenCamera from './FullscreenCamera';
import DeliveryPhotoGuide from './DeliveryPhotoGuide';

// Ensure BarcodeDetector is available; pre-load WASM when using polyfill.
async function getBarcodeDetector(): Promise<any> {
  const native = (window as any).BarcodeDetector;
  if (native) return native;
  try {
    const { BarcodeDetector: Pony, prepareZXingModule } = await import('barcode-detector/ponyfill');
    await prepareZXingModule();
    return Pony;
  } catch (e) {
    console.warn('BarcodeDetector polyfill failed:', e);
    return null;
  }
}

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
  /** Optional list of valid barcodes for this order; if provided, scan must match one */
  expectedBarcodes?: string[];
  deliveryNotes?: string;
  onNavigate: () => void;
  onContact?: () => void;
  onCompleteDropOff: (opts: { deliveryPhotoUrl?: string; dropOffLocation?: string }) => void | Promise<void>;
  onClose?: () => void;
  /** Shown on step 5 above “Complete drop-off” after photo is taken */
  beforeCompleteDeliverySlot?: React.ReactNode;
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
  expectedBarcodes,
  deliveryNotes,
  onNavigate,
  onContact,
  onCompleteDropOff,
  onClose,
  beforeCompleteDeliverySlot,
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
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);

  const requestOpenCamera = () => {
    const key = orderId ? `craven:delivery-photo-guide:${orderId}` : null;
    if (key) {
      try {
        if (localStorage.getItem(key) === '1') {
          setShowPhotoCamera(true);
          return;
        }
      } catch {}
    }
    setShowPhotoGuide(true);
  };

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
        expectedBarcodes={expectedBarcodes}
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
                <IconMapPin size={20} color="#EA580C" />
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
                  border: selectedLocationValue === opt.value ? '2px solid #EA580C' : '1px solid #E5E7EB',
                  background: selectedLocationValue === opt.value ? '#FFF7ED' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="dropoff-location"
                  value={opt.value}
                  checked={selectedLocationValue === opt.value}
                  onChange={() => setSelectedLocationValue(opt.value)}
                  style={{ accentColor: '#EA580C' }}
                />
                <span style={{ fontWeight: 500 }}>{opt.label}</span>
              </label>
            ))}
          </Stack>
          <Button
            fullWidth
            mt="lg"
            size="md"
            color="orange"
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
                background: node.complete ? '#EA580C' : node.current ? '#EA580C' : '#E5E7EB',
                color: node.complete || node.current ? '#fff' : '#9CA3AF',
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
                      <IconBarcode size={18} />
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
                      color="orange"
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
                      <IconMapPin size={18} color="#EA580C" />
                      <Text fw={600} size="sm">House/unit number confirmation</Text>
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>{customerAddress.split(',')[0]}</Text>
                  {!step2Complete && (
                    <Button
                      fullWidth
                      mt="md"
                      color="orange"
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
                      <IconFileText size={18} color="#EA580C" />
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
                    <Button fullWidth mt="md" color="orange" onClick={() => setStep3Done(true)}>
                      GOT IT
                    </Button>
                  )}
                </>
              )}
              {node.step === 4 && (
                <>
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconMapPin size={18} color="#EA580C" />
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
                    <Button fullWidth mt="md" color="orange" onClick={() => setShowLocationModal(true)}>
                      SELECT
                    </Button>
                  )}
                </>
              )}
              {node.step === 5 && (
                <>
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconCamera size={18} color="#EA580C" />
                      <Text fw={600} size="sm">Proof of delivery</Text>
                    </Group>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    Customers appreciate including the address number or the front of the home/apt in the delivery photo.
                  </Text>
                  {!deliveryPhotoUrl ? (
                    <Button fullWidth mt="md" color="orange" onClick={() => setShowPhotoCamera(true)}>
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
                      {beforeCompleteDeliverySlot ? (
                        <Box mt="md">{beforeCompleteDeliverySlot}</Box>
                      ) : null}
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
  /** Optional list of valid barcodes for this order; if provided, scan must match one of these */
  expectedBarcodes?: string[];
  onScannedUpdate: (n: number) => void;
  onDone: () => void;
  onClose: () => void;
}

function barcodeMatchesOrder(
  scannedValue: string,
  orderNumber: string,
  expectedBarcodes?: string[]
): boolean {
  const normalized = scannedValue.trim().toLowerCase();
  const orderNorm = orderNumber.trim().toLowerCase();
  if (expectedBarcodes?.length) {
    return expectedBarcodes.some(
      (exp) => exp.trim().toLowerCase() === normalized || normalized.endsWith(exp.trim().toLowerCase())
    );
  }
  const digitsScanned = normalized.replace(/\D/g, '');
  const digitsOrder = orderNorm.replace(/\D/g, '');
  if (digitsOrder.length >= 4 && digitsScanned.length >= 4) {
    if (digitsScanned.slice(-4) === digitsOrder.slice(-4)) return true;
  }
  return normalized.includes(orderNorm) || normalized.endsWith(orderNorm);
}

const DeliveryLabelScanView: React.FC<DeliveryLabelScanViewProps> = ({
  customerName,
  orderNumber,
  totalItems,
  initialScanned,
  expectedBarcodes,
  onScannedUpdate,
  onDone,
  onClose,
}) => {
  const [scanned, setScanned] = useState(initialScanned);
  const [showWrongBarcode, setShowWrongBarcode] = useState(false);
  const wrongBarcodeTimeoutRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastValueRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    onScannedUpdate(scanned);
  }, [scanned, onScannedUpdate]);

  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera not available on this device.');
          return;
        }
        const BarcodeDetectorClass = await getBarcodeDetector();
        if (!mounted) return;
        if (!BarcodeDetectorClass) {
          setCameraError('Barcode scanning not supported. Use Chrome on Android or add the barcode-detector polyfill.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setCameraError(null);
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!mounted) return;
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('playing', onReady);
            video.removeEventListener('error', onErr);
            resolve();
          };
          const onErr = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('playing', onReady);
            video.removeEventListener('error', onErr);
            reject(new Error('Video failed to load'));
          };
          if (video.readyState >= 2 && video.videoWidth > 0) {
            resolve();
            return;
          }
          video.addEventListener('loadeddata', onReady);
          video.addEventListener('playing', onReady);
          video.addEventListener('error', onErr);
          setTimeout(() => onReady(), 3000);
        });
        if (!mounted) return;
        const detector = new BarcodeDetectorClass({
          formats: ['code_128', 'code_93', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
        });
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
            if (barcodeMatchesOrder(value, orderNumber, expectedBarcodes)) {
              setScanned((prev) => Math.min(prev + 1, totalItems));
              setShowWrongBarcode(false);
            } else {
              setShowWrongBarcode(true);
              if (wrongBarcodeTimeoutRef.current)
                window.clearTimeout(wrongBarcodeTimeoutRef.current);
              wrongBarcodeTimeoutRef.current = window.setTimeout(() => {
                setShowWrongBarcode(false);
                wrongBarcodeTimeoutRef.current = null;
              }, 1500);
            }
          } catch (e) {
            if (import.meta.env.DEV) console.warn('Barcode detect error:', e);
          }
        };
        intervalRef.current = window.setInterval(run, 400);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not access camera.';
        setCameraError(msg);
      }
    };
    start();
    return () => {
      mounted = false;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (wrongBarcodeTimeoutRef.current)
        window.clearTimeout(wrongBarcodeTimeoutRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [totalItems, orderNumber, expectedBarcodes]);

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
        <Text size="sm" c="dimmed">
          Total scanned:{' '}
          <strong style={{ color: '#EA580C' }}>
            {scanned}/{totalItems}
          </strong>
        </Text>
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
        {cameraError && (
          <Box
            style={{
              position: 'absolute',
              bottom: 36,
              left: 12,
              right: 12,
              fontSize: 12,
              color: '#FEE2E2',
              background: 'rgba(0,0,0,0.6)',
              padding: 8,
              borderRadius: 8,
            }}
          >
            {cameraError}
          </Box>
        )}
        {showWrongBarcode && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(220, 38, 38, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              borderRadius: 12,
            }}
          >
            <Box
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'rgba(220, 38, 38, 0.95)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconX size={56} stroke={3} />
            </Box>
          </Box>
        )}
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
          <Text fw={600} size="sm">{customerName}</Text>
          <Text size="sm" c="dimmed">
            {scanned}/{totalItems} Scanned
          </Text>
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
          color="orange"
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
