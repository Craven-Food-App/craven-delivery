/**
 * Retail / Grocery Pickup Flow
 *
 * Step 2: Confirm arrival with slide-to-confirm "I Am Here".
 * Step 3: Select curbside pickup parking spot (1..N spots from merchant config).
 *
 * Mapbox should be running in the background (from MobileDriverDashboard);
 * this component renders a foreground card and bottom slide / controls.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SlideToConfirm from '@/components/SlideToConfirm';
import { supabase } from '@/integrations/supabase/client';

const C = {
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  accent: '#EA580C', // orange header for retail/grocery flow
  perishable: '#F97316',
} as const;

export interface RetailGroceryPickupFlowProps {
  storeName: string;
  storeAddress: string;
  /** e.g. "9:55 AM curbside pickup" or "ASAP curbside pickup" */
  pickupTimeLabel: string;
  /** Order identifier used to encode QR payload */
  orderId?: string;
  /** Optional: multiple customer orders in this route stop */
  ordersForPickup?: {
    id: string;
    /** Display label for the order (e.g. customer name) */
    label: string;
    /** Total number of packages/items for this order */
    totalPackages: number;
    /** Order number for display and barcode matching: last 4 digits of order id. If omitted, derived from id. */
    orderNumber?: string;
    /** Optional barcode(s) per item in this order; index matches package order. When provided, shown on each line. */
    itemBarcodes?: string[];
    /** Delivery/stop address for this order. Shown on the stops list. */
    address?: string;
  }[];
  storeLogoUrl?: string;
  /** e.g. "Perishable" badge under store info */
  pickupTagLabel?: string;
  /** Optional short trip / order ID (e.g. "Trip 9718") */
  tripLabel?: string;
  /** Number of curbside pickup spots the merchant has configured */
  parkingSpotCount?: number;
  /** Called when the feeder confirms "I Am Here" */
  onArrivalConfirmed?: () => Promise<void> | void;
  /** Called when the feeder chooses a parking spot (1‑indexed) */
  onParkingSpotSelected?: (spotNumber: number) => Promise<void> | void;
  /** Called when clerk has scanned QR (driver taps 'Code scanned') */
  onQrConfirmed?: () => Promise<void> | void;
  /** Called when feeder completes all label scanning (ready to leave pickup) */
  onStartScanning?: () => Promise<void> | void;
  /**
   * Order status step for the curbside status bar: 0 = Not ready, 1 = Getting Ready, 2 = Packaging order, 3 = Ready.
   * When provided (e.g. from API), the bar reflects this; otherwise uses internal state.
   */
  orderStatusStep?: number;
  /** Optional compact Clean Pay card (non-blocking). */
  cleanPaySlot?: React.ReactNode;
  /** When true (live test order), every scanned barcode is auto-accepted so the flow can be completed end-to-end. */
  isTestOrder?: boolean;
}

type PickupStep = 'arrival' | 'spot_and_qr' | 'scan' | 'stops_summary' | 'stops_list';

const formatAddress = (address: string) => {
  if (!address) return '';
  return address;
};

const RetailGroceryPickupFlow: React.FC<RetailGroceryPickupFlowProps> = ({
  storeName,
  storeAddress,
  pickupTimeLabel,
  orderId,
  ordersForPickup,
  storeLogoUrl,
  pickupTagLabel = 'Curbside pickup',
  tripLabel,
  parkingSpotCount,
  onArrivalConfirmed,
  onParkingSpotSelected,
  onQrConfirmed,
  onStartScanning,
  orderStatusStep: orderStatusStepProp,
  cleanPaySlot,
  isTestOrder = false,
}) => {
  const [step, setStep] = useState<PickupStep>('arrival');
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [isSpotDropdownOpen, setIsSpotDropdownOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isQrCompleted, setIsQrCompleted] = useState(false);
  const [handoffCode, setHandoffCode] = useState<string | null>(null);
  const [handoffVerified, setHandoffVerified] = useState(false);
  const [handoffExpanded, setHandoffExpanded] = useState(true);
  const [scanLabels, setScanLabels] = useState<{
    id: number;
    name: string;
    scanned: boolean;
    orderId?: string;
    orderLabel?: string;
    /** Last 4 digits of order id for barcode matching (order number stays in header) */
    orderNumber?: string;
    /** Barcode number for this item: from backend or set when scanned. Shown on the line. */
    itemBarcode?: string;
  }[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
    value?: string;
  } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const scanStartTimeoutRef = useRef<number | null>(null);
  const scanFeedbackTimeoutRef = useRef<number | null>(null);
  const lastScannedValueRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Order status for curbside pickup: 0 = Not ready, 1 = Getting Ready, 2 = Packaging order, 3 = Ready
  const ORDER_STATUS_STEPS = [
    { key: 0, label: 'Not ready' },
    { key: 1, label: 'Getting Ready' },
    { key: 2, label: 'Packaging order' },
    { key: 3, label: 'Ready' },
  ] as const;
  const [orderStatusStepLocal, setOrderStatusStepLocal] = useState<number>(0);
  const orderStatusStep =
    typeof orderStatusStepProp === 'number' && orderStatusStepProp >= 0 && orderStatusStepProp <= 3
      ? orderStatusStepProp
      : orderStatusStepLocal;

  const safeSpotCount = useMemo(() => {
    const n = parkingSpotCount ?? 6;
    if (!Number.isFinite(n) || n <= 0) return 6;
    return Math.min(Math.max(1, Math.round(n)), 24); // clamp 1..24 to avoid huge grids
  }, [parkingSpotCount]);

  const spots = useMemo(() => {
    return Array.from({ length: safeSpotCount }, (_v, i) => i + 1);
  }, [safeSpotCount]);

  const showScanFeedback = useCallback(
    (tone: 'success' | 'error', message: string, value?: string) => {
      if (scanFeedbackTimeoutRef.current != null) {
        window.clearTimeout(scanFeedbackTimeoutRef.current);
        scanFeedbackTimeoutRef.current = null;
      }
      setScanFeedback({ tone, message, value });
      scanFeedbackTimeoutRef.current = window.setTimeout(() => {
        setScanFeedback(null);
        scanFeedbackTimeoutRef.current = null;
      }, tone === 'success' ? 1400 : 1800);
    },
    []
  );

  const handleConfirmArrival = async () => {
    if (onArrivalConfirmed) {
      await onArrivalConfirmed();
    }
    setStep('spot_and_qr');
  };

  const handleSelectSpot = async (spot: number) => {
    setSelectedSpot(spot);
    if (onParkingSpotSelected) {
      await onParkingSpotSelected(spot);
    }
  };

  // Generate QR code when we are on the spot/QR step and have data
  useEffect(() => {
    const generate = async () => {
      if (step !== 'spot_and_qr' || !orderId || !selectedSpot) {
        setQrDataUrl(null);
        return;
      }
      try {
        const QRCode = (await import('qrcode')).default;
        const payload = JSON.stringify({
          order_id: orderId,
          spot: selectedSpot,
        });
        const url = await QRCode.toDataURL(payload, {
          width: 192,
          margin: 1,
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Error generating pickup QR:', err);
        setQrDataUrl(null);
      }
    };
    generate();
  }, [step, orderId, selectedSpot]);

  // Fetch / subscribe to the 6-digit pickup_code + merchant verification status
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('pickup_code, pickup_confirmed_at')
        .eq('id', orderId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('fetch pickup_code failed', error);
        return;
      }
      const code = (data as any)?.pickup_code as string | null;
      if (code) {
        setHandoffCode(String(code));
      } else {
        // Generate a 6-digit code and persist
        const generated = String(Math.floor(100000 + Math.random() * 900000));
        const { error: upErr } = await supabase
          .from('orders')
          .update({ pickup_code: generated })
          .eq('id', orderId);
        if (!upErr && !cancelled) setHandoffCode(generated);
      }
      setHandoffVerified(!!(data as any)?.pickup_confirmed_at);
    };
    load();
    const channel = supabase
      .channel(`retail-pickup-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          if (row.pickup_code) setHandoffCode(String(row.pickup_code));
          setHandoffVerified(!!row.pickup_confirmed_at);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Initialize scan labels list when entering scan step
  useEffect(() => {
    if (step !== 'scan') return;

    let labels: {
      id: number;
      name: string;
      scanned: boolean;
      orderId?: string;
      orderLabel?: string;
      orderNumber?: string;
      itemBarcode?: string;
    }[] = [];

    const last4 = (id: string) => (id || '').replace(/\D/g, '').slice(-4) || id?.slice(-4) || '';

    if (ordersForPickup && ordersForPickup.length > 0) {
      let nextId = 1;
      for (const order of ordersForPickup) {
        const total = order.totalPackages > 0 ? order.totalPackages : 1;
        const orderNum = order.orderNumber ?? last4(order.id);
        const barcodes = order.itemBarcodes ?? [];
        for (let i = 0; i < total; i++) {
          const itemBarcode = barcodes[i];
          labels.push({
            id: nextId++,
            name: itemBarcode ?? 'Scan barcode',
            scanned: false,
            orderId: order.id,
            orderLabel: order.label,
            orderNumber: orderNum,
            itemBarcode: itemBarcode,
          });
        }
      }
    } else {
      // Fallback: single order
      const total = parkingSpotCount && parkingSpotCount > 0 ? parkingSpotCount : 5;
      const orderNum = orderId ? last4(orderId) : '';
      labels = Array.from({ length: total }, (_v, i) => ({
        id: i + 1,
        name: 'Scan barcode',
        scanned: false,
        orderId: orderId,
        orderLabel: 'Customer',
        orderNumber: orderNum,
      }));
    }

    setScanLabels(labels);
    setScannedCount(0);
  }, [step, parkingSpotCount, ordersForPickup, orderId]);

  useEffect(() => {
    if (step !== 'scan') {
      if (scanFeedbackTimeoutRef.current != null) {
        window.clearTimeout(scanFeedbackTimeoutRef.current);
        scanFeedbackTimeoutRef.current = null;
      }
      setScanFeedback(null);
      return;
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (scanFeedbackTimeoutRef.current != null) {
        window.clearTimeout(scanFeedbackTimeoutRef.current);
      }
    };
  }, []);

  // Start/stop live camera barcode scanning in the Scan Labels step
  useEffect(() => {
    const stopCamera = () => {
      if (scanStartTimeoutRef.current != null) {
        window.clearTimeout(scanStartTimeoutRef.current);
        scanStartTimeoutRef.current = null;
      }
      if (scanIntervalRef.current != null) {
        window.clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };

    if (step !== 'scan') {
      stopCamera();
      return;
    }

    setCameraError(null);
    setLastScanned(null);

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera not available on this device.');
        return;
      }
      const isSecure =
        typeof window !== 'undefined' &&
        (window.isSecureContext ?? (window.location?.protocol === 'https:' || window.location?.hostname === 'localhost'));
      if (!isSecure) {
        setCameraError('Camera requires HTTPS or localhost. Use a secure connection.');
        return;
      }

      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass) {
        setCameraError('Barcode scanning not supported in this browser. Use Chrome on Android or a browser that supports BarcodeDetector.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorClass({
          formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'qr_code'],
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const COOLDOWN_MS = 2200;

        const runDetection = async () => {
          const video = videoRef.current;
          if (
            !video ||
            video.readyState !== 4 ||
            video.videoWidth === 0 ||
            video.videoHeight === 0
          )
            return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const barcodes = await detector.detect(canvas);
            if (!barcodes || barcodes.length === 0) return;
            const value = (barcodes[0].rawValue || '').trim();
            if (!value) return;

            const now = Date.now();
            if (
              value === lastScannedValueRef.current &&
              now - lastScannedTimeRef.current < COOLDOWN_MS
            )
              return;
            lastScannedValueRef.current = value;
            lastScannedTimeRef.current = now;

            setLastScanned(value);

            const normalized = value.trim().toLowerCase();
            const digitsOnly = value.replace(/\D/g, '');
            const scannedLast4 = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : digitsOnly;

            setScanLabels((prev) => {
              // Test-order bypass: accept ANY barcode and mark the next unscanned package as done.
              if (isTestOrder) {
                const next = prev.find((p) => !p.scanned);
                if (!next) return prev;
                showScanFeedback('success', 'Barcode accepted', value);
                const updated = prev.map((p) =>
                  p.id === next.id
                    ? { ...p, scanned: true, itemBarcode: p.itemBarcode ?? value, name: value }
                    : p
                );
                setScannedCount((c) => c + 1);
                return updated;
              }
              const hasExplicitBarcodes = prev.some((p) => !!p.itemBarcode);
              const matchBarcode = (candidate?: string) => {
                if (!candidate) return false;
                const exp = candidate.trim().toLowerCase();
                const expDigits = exp.replace(/\D/g, '');
                return (
                  normalized === exp ||
                  normalized.endsWith(exp) ||
                  (!!expDigits && digitsOnly === expDigits) ||
                  (!!expDigits && digitsOnly.endsWith(expDigits))
                );
              };

              const matchByExplicitBarcode = prev.find(
                (p) => !p.scanned && p.itemBarcode && matchBarcode(p.itemBarcode)
              );
              const matchByOrderTail = !hasExplicitBarcodes && scannedLast4
                ? prev.find((p) => !p.scanned && p.orderNumber === scannedLast4)
                : null;
              const matchByOrderId = !hasExplicitBarcodes
                ? prev.find(
                    (p) =>
                      !p.scanned &&
                      (value === p.orderId ||
                        (p.orderNumber && value.endsWith(p.orderNumber)) ||
                        (p.orderId && normalized.endsWith(p.orderId.toLowerCase())))
                  )
                : null;

              const next = matchByExplicitBarcode ?? matchByOrderTail ?? matchByOrderId;
              if (!next) {
                showScanFeedback('error', hasExplicitBarcodes ? 'Wrong barcode' : 'Barcode does not match this order', value);
                return prev;
              }

              showScanFeedback('success', 'Barcode accepted', value);
              const updated = prev.map((p) =>
                p.id === next.id
                  ? {
                      ...p,
                      scanned: true,
                      itemBarcode: p.itemBarcode ?? value,
                      name: value,
                    }
                  : p
              );
              setScannedCount((c) => c + 1);
              return updated;
            });
          } catch (err) {
            console.error('Barcode detection failed', err);
          }
        };

        // Start scanning after video has time to get dimensions (avoids 0x0 canvas)
        scanStartTimeoutRef.current = window.setTimeout(() => {
          scanStartTimeoutRef.current = null;
          scanIntervalRef.current = window.setInterval(runDetection, 600);
        }, 800);
      } catch (err) {
        console.error('Error starting camera for barcode scan:', err);
        setCameraError('Could not access camera. Check permissions.');
      }
    };

    startScanner();

    return () => {
      stopCamera();
    };
  }, [step]);

  const headerTitle = tripLabel ? `Curbside Pickup • ${tripLabel}` : 'Curbside Pickup';

  // After camera stream is acquired, detect torch capability
  useEffect(() => {
    if (step !== 'scan') {
      setTorchOn(false);
      setTorchSupported(false);
      return;
    }
    const id = window.setInterval(() => {
      const stream = mediaStreamRef.current;
      const track = stream?.getVideoTracks?.()[0];
      if (!track) return;
      const caps: any = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
      if ('torch' in caps) {
        setTorchSupported(true);
        window.clearInterval(id);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [step]);

  const toggleTorch = async () => {
    const stream = mediaStreamRef.current;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (err) {
      console.warn('Torch toggle failed', err);
    }
  };

  // Full-screen Label Scanning view (Walmart Spark style, orange)
  if (step === 'scan') {
    const groups = (() => {
      const m = new Map<string, { label: string; orderNumber: string; packages: typeof scanLabels }>();
      scanLabels.forEach((pkg) => {
        const key = pkg.orderId || 'default';
        const rawLabel = pkg.orderLabel?.trim();
        const customerName = rawLabel && rawLabel !== '—' ? rawLabel : 'Customer';
        const g = m.get(key) || {
          label: customerName,
          orderNumber: pkg.orderNumber || (pkg.orderId ? pkg.orderId.replace(/\D/g, '').slice(-4) : ''),
          packages: [] as typeof scanLabels,
        };
        g.packages.push(pkg);
        m.set(key, g);
      });
      return Array.from(m.values());
    })();

    const hasUnscanned = scanLabels.some((p) => !p.scanned);

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          background: '#F4F5F7',
          fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
        }}
      >
        {/* Orange header bar */}
        <div
          style={{
            background: C.accent,
            color: '#FFFFFF',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            paddingBottom: 14,
            paddingLeft: 14,
            paddingRight: 14,
            display: 'grid',
            gridTemplateColumns: '32px 1fr 32px',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setStep('spot_and_qr')}
            aria-label="Close scanner"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              width: 32,
              height: 32,
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', letterSpacing: 0.1 }}>
            Label Scanning
          </div>
          <button
            type="button"
            aria-label="Help"
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.85)',
              color: '#FFFFFF',
              width: 26,
              height: 26,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              padding: 0,
              justifySelf: 'end',
            }}
          >
            ?
          </button>
        </div>

        {/* Camera viewfinder */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            background: '#000',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* White scanner box overlay */}
          <div
            style={{
              position: 'absolute',
              inset: '7% 5%',
              border: '2px solid rgba(255,255,255,0.95)',
              borderRadius: 14,
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.18)',
            }}
          />

          {/* Instruction text */}
          <div
            style={{
              position: 'absolute',
              left: '12%',
              right: '12%',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'center',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M3 5v14M7 5v14M10 5v14M13 5v14M17 5v14M21 5v14" />
            </svg>
            <span>Please position the label barcode within this scanner box.</span>
          </div>

          {scanFeedback && (
            <div
              style={{
                position: 'absolute',
                inset: '7% 5%',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                background:
                  scanFeedback.tone === 'success'
                    ? 'rgba(22, 163, 74, 0.18)'
                    : 'rgba(220, 38, 38, 0.20)',
              }}
            >
              <div
                style={{
                  minWidth: 176,
                  maxWidth: '80%',
                  padding: '16px 18px',
                  borderRadius: 18,
                  background: scanFeedback.tone === 'success' ? 'rgba(21, 128, 61, 0.96)' : 'rgba(185, 28, 28, 0.96)',
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.32)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.92)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {scanFeedback.tone === 'success' ? '✓' : '✕'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{scanFeedback.message}</div>
                {scanFeedback.value && (
                  <div style={{ fontSize: 11, opacity: 0.92, wordBreak: 'break-all' }}>{scanFeedback.value}</div>
                )}
              </div>
            </div>
          )}

          {/* Flash button */}
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle flashlight"
            disabled={!torchSupported}
            style={{
              position: 'absolute',
              right: 18,
              bottom: 18,
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: torchOn ? '#FACC15' : 'rgba(255,255,255,0.92)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              cursor: torchSupported ? 'pointer' : 'not-allowed',
              opacity: torchSupported ? 1 : 0.55,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={torchOn ? '#92400E' : '#1F2937'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2h10l-2 6h-6L7 2z" />
              <path d="M9 8h6v4l-3 10-3-10V8z" />
              <line x1="12" y1="13" x2="12" y2="16" />
            </svg>
          </button>

          {cameraError && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 76,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.7)',
                color: '#FEE2E2',
                fontSize: 11,
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              {cameraError}
            </div>
          )}
        </div>

        {/* Counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 12px 10px',
            fontSize: 14,
            color: C.textSecondary,
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: `1.5px solid ${C.accent}`,
              color: C.accent,
              fontSize: 11,
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
            }}
          >
            i
          </span>
          <span>
            Total scanned:{' '}
            <span style={{ color: C.accent, fontWeight: 700 }}>
              {scannedCount}/{scanLabels.length || 0}
            </span>
          </span>
        </div>

        {/* Package list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {groups.map((group, gi) => {
            const total = group.packages.length;
            const scanned = group.packages.filter((p) => p.scanned).length;
            return (
              <div
                key={gi}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '12px 14px 10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>{group.label}</div>
                    {group.orderNumber && (
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                        Order: <span style={{ color: C.textPrimary, fontWeight: 600 }}>{group.orderNumber}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                    {scanned}/{total} Scanned
                  </div>
                </div>
                <div style={{ borderTop: '1px dashed #E5E7EB', padding: '8px 14px 12px' }}>
                  <div style={{ display: 'flex', fontSize: 11, color: C.textSecondary, marginBottom: 6 }}>
                    <div style={{ width: 24 }}>Status</div>
                    <div>Label</div>
                  </div>
                  {group.packages.map((pkg) => {
                    const isScanned = pkg.scanned;
                    const labelValue = pkg.itemBarcode ?? pkg.name ?? '';
                    const labelTail = labelValue.slice(-4);
                    return (
                      <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                        <div style={{ width: 24 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: isScanned ? '#22C55E' : '#D1D5DB',
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
                            {labelValue ? `••••${labelTail || '----'}` : 'Awaiting barcode'}
                          </div>
                          <div style={{ fontSize: 11, color: C.textSecondary }}>
                            {isScanned ? 'Matched barcode' : pkg.itemBarcode ? 'Expected barcode' : 'Scan order barcode'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E5E7EB',
            padding: '12px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (!hasUnscanned) setStep('stops_summary');
            }}
            disabled={hasUnscanned}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 999,
              border: 'none',
              background: hasUnscanned ? '#D1D5DB' : C.accent,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              cursor: hasUnscanned ? 'not-allowed' : 'pointer',
              boxShadow: hasUnscanned ? 'none' : '0 6px 18px rgba(234, 88, 12, 0.35)',
              opacity: hasUnscanned ? 0.82 : 1,
            }}
          >
            {hasUnscanned ? 'Scan all labels to continue' : 'Finish scanning'}
          </button>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: C.accent,
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Swipe up for help and other options
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
        background: '#F9FAFB', // Full-screen background – hide underlying map
      }}
    >
      {/* Top orange bar / header overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 96,
          background: C.accent,
          opacity: 0.96,
          pointerEvents: 'none',
        }}
      />

      {/* Foreground content */}
      <div
        style={{
          pointerEvents: 'auto',
          padding: '12px 12px calc(env(safe-area-inset-bottom, 0px) + 16px)',
          fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
        }}
      >
        {/* Card with store + status (hidden on Scan Labels step for full-screen scanner) */}
        {step !== 'stops_summary' && step !== 'stops_list' && (
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
              border: `1px solid ${C.border}`,
              padding: '14px 14px 12px',
              marginBottom: 16,
            }}
          >
            {/* Header row: title + optional trip id */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>{headerTitle}</div>
              {tripLabel && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: C.accent,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(234, 88, 12, 0.10)',
                  }}
                >
                  {tripLabel}
                </div>
              )}
            </div>

            {/* Pickup time */}
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 10 }}>
              {pickupTimeLabel}
            </div>

            {/* Store row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: storeLogoUrl ? 'transparent' : '#FFF7ED',
                  border: storeLogoUrl ? `1px solid ${C.border}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {storeLogoUrl ? (
                  <img
                    src={storeLogoUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: `2px solid ${C.accent}`,
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.textPrimary,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {storeName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {formatAddress(storeAddress)}
                </div>
              </div>
            </div>

            {/* Tag row (e.g. Perishable / Curbside) */}
            {pickupTagLabel && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  background: '#FEF3C7',
                  color: '#92400E',
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                {pickupTagLabel}
              </div>
            )}

            {/* Order status step bar: Not ready → Getting Ready → Packaging order → Ready */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 8 }}>
                Order status
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                {ORDER_STATUS_STEPS.map((s, index) => {
                  const isCompleted = orderStatusStep > s.key;
                  const isCurrent = orderStatusStep === s.key;
                  const isLast = index === ORDER_STATUS_STEPS.length - 1;
                  const segmentColor = isCompleted ? '#22C55E' : isCurrent ? C.accent : '#E5E7EB';
                  return (
                    <div
                      key={s.key}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                          {index > 0 && (
                            <div
                              style={{
                                flex: 1,
                                height: 3,
                                borderRadius: 2,
                                background: orderStatusStep >= s.key ? '#22C55E' : '#E5E7EB',
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: isCompleted ? '#22C55E' : isCurrent ? C.accent : '#E5E7EB',
                            border: `2px solid ${segmentColor}`,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                          {!isLast && (
                            <div
                              style={{
                                flex: 1,
                                height: 3,
                                borderRadius: 2,
                                background: isCompleted ? '#22C55E' : '#E5E7EB',
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: isCurrent ? C.accent : C.textSecondary,
                          fontWeight: isCurrent ? 600 : 400,
                          marginTop: 4,
                          textAlign: 'center',
                          lineHeight: 1.2,
                          width: '100%',
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {cleanPaySlot ? (
              <div style={{ marginTop: 12, pointerEvents: 'auto' }}>{cleanPaySlot}</div>
            ) : null}
          </div>
        )}

        {/* Step-specific content */}
        {step === 'arrival' ? (
          <>
            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: C.textSecondary,
                marginBottom: 12,
                whiteSpace: 'nowrap',
              }}
            >
              Slide to confirm when you have arrived at the curbside pickup area.
            </div>
            <SlideToConfirm label="I Am Here" onConfirm={handleConfirmArrival} />
          </>
        ) : step === 'spot_and_qr' ? (
          <>
            <div
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 600,
                color: C.textPrimary,
              }}
            >
              Select your pickup parking spot
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.textSecondary,
                marginBottom: 10,
              }}
            >
              Choose the numbered spot where you are parked so the associate can find you faster.
            </div>

            {/* Parking spot dropdown with radio selection */}
            <div
              style={{
                marginBottom: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setIsSpotDropdownOpen((open) => !open)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #D1D5DB',
                  background: '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  color: C.textPrimary,
                }}
              >
                <span>
                  {selectedSpot ? `Spot #${selectedSpot}` : 'Choose a parking spot'}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    color: C.textSecondary,
                  }}
                >
                  ▼
                </span>
              </button>

              {isSpotDropdownOpen && (
                <div
                  style={{
                    marginTop: 6,
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {spots.map((spot) => {
                    const isSelected = selectedSpot === spot;
                    return (
                      <label
                        key={spot}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          fontSize: 14,
                          cursor: 'pointer',
                          background: isSelected ? '#FFF7ED' : 'transparent',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelectSpot(spot);
                          setIsSpotDropdownOpen(false);
                        }}
                      >
                        <input
                          type="radio"
                          name="pickup-spot"
                          checked={isSelected}
                          onChange={() => {
                            handleSelectSpot(spot);
                            setIsSpotDropdownOpen(false);
                          }}
                          style={{ accentColor: C.accent }}
                        />
                        <span>Spot #{spot}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedSpot && (
              <div
                style={{
                  fontSize: 12,
                  color: '#15803D',
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                Spot #{selectedSpot} selected. Stay in your vehicle while the order is brought out.
              </div>
            )}

            {/* QR code step appears under the completed parking spot selection */}
            {selectedSpot && (
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 12px 14px',
                  borderRadius: 16,
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                }}
              >
                {/* 6-digit handoff code – shown above the QR */}
                {handoffCode && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: '14px 16px 16px',
                      borderRadius: 14,
                      border: handoffVerified
                        ? '1.5px solid #16a34a'
                        : '1px solid rgba(28,28,30,0.10)',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 10px rgba(28,28,30,0.05)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setHandoffExpanded((v) => !v)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'DM Mono, ui-monospace, monospace',
                          fontSize: 24,
                          fontWeight: 800,
                          color: handoffVerified ? '#16a34a' : '#EA580C',
                          lineHeight: 1,
                        }}
                      >
                        #
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: 700,
                          color: handoffVerified ? '#16a34a' : '#EA580C',
                        }}
                      >
                        Driver code:{' '}
                        <span style={{ letterSpacing: '0.12em' }}>{handoffCode}</span>
                      </span>
                      <span
                        aria-hidden
                        style={{
                          color: handoffVerified ? '#16a34a' : '#EA580C',
                          fontSize: 18,
                          fontWeight: 700,
                          transform: handoffExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
                          transition: 'transform 0.2s ease',
                          lineHeight: 1,
                        }}
                      >
                        ⌃
                      </span>
                    </button>
                    {handoffExpanded && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          lineHeight: 1.45,
                          color: '#1c1c1e',
                        }}
                      >
                        Show this 6-digit code to the associate, or let them scan the QR below.
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: 12,
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 999,
                        background: handoffVerified ? '#16a34a' : '#EA580C',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      {handoffVerified ? 'Code Confirmed' : 'Awaiting Merchant Verification'}
                    </div>
                  </div>
                )}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Show this code to the clerk
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.textSecondary,
                    marginBottom: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  They&apos;ll scan this QR for verifications
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    marginBottom: 10,
                    background: '#F9FAFB',
                    borderRadius: 12,
                  }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Pickup QR code"
                      style={{
                        width: 192,
                        height: 192,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textSecondary,
                      }}
                    >
                      Generating code...
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsQrCompleted(true);
                    if (typeof orderStatusStepProp !== 'number') {
                      setOrderStatusStepLocal(3); // advance to "Ready"
                    }
                    if (onQrConfirmed) {
                      await onQrConfirmed();
                    }
                    setStep('scan');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#111827',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Code scanned
                </button>
              </div>
            )}
          </>
        ) : step === 'stops_summary' ? (
          <>
            {/* Item Scanning – all stops in a row (after scanning complete) */}
            <div
              style={{
                marginBottom: 10,
                fontSize: 16,
                fontWeight: 700,
                color: '#FFFFFF',
                background: C.accent,
                padding: '10px 14px',
                borderRadius: 999,
                alignSelf: 'flex-start',
              }}
            >
              Item Scanning
            </div>
            <div
              style={{
                maxHeight: '50vh',
                overflowY: 'auto',
                marginBottom: 16,
              }}
            >
              {(() => {
                const groups = new Map<
                  string,
                  { label: string; orderNumber: string; packages: typeof scanLabels }
                >();
                scanLabels.forEach((pkg) => {
                  const key = pkg.orderId || 'default';
                  const rawLabel = pkg.orderLabel?.trim();
                  const customerName = rawLabel && rawLabel !== '—' ? rawLabel : 'Customer';
                  const group = groups.get(key) || {
                    label: customerName,
                    orderNumber: pkg.orderNumber || (pkg.orderId ? (pkg.orderId).replace(/\D/g, '').slice(-4) : ''),
                    packages: [] as typeof scanLabels,
                  };
                  group.packages.push(pkg);
                  groups.set(key, group);
                });
                return Array.from(groups.entries()).map(([orderKey, group]) => {
                  const total = group.packages.length;
                  const scanned = group.packages.filter((p) => p.scanned).length;
                  const initial = (group.label || 'C').charAt(0).toUpperCase();
                  return (
                    <div
                      key={orderKey}
                      style={{
                        borderRadius: 16,
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        marginBottom: 12,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderBottom: '1px solid #F3F4F6',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: '#FDE047',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#854D0E',
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
                              {group.label}
                            </div>
                            {group.orderNumber && (
                              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                                Order: {group.orderNumber}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: C.textSecondary }}>
                          {scanned}/{total} Scanned
                        </div>
                      </div>
                      <div>
                        {group.packages.map((pkg) => {
                          const isScanned = pkg.scanned;
                          return (
                            <div
                              key={pkg.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 14px',
                                borderBottom: '1px dotted #E5E7EB',
                                background: isScanned ? '#F0FDF4' : 'transparent',
                              }}
                            >
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: isScanned ? '#22C55E' : '#E5E7EB',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isScanned ? '#FFFFFF' : 'transparent',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {isScanned ? '✓' : ''}
                              </div>
                              <div
                                style={{
                                  flex: 1,
                                  fontSize: 13,
                                  color: C.textPrimary,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {pkg.itemBarcode ?? pkg.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <button
              type="button"
              onClick={() => setStep('stops_list')}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 999,
                border: 'none',
                background: C.accent,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(234, 88, 12, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>››</span>
              DONE SCANNING
            </button>
          </>
        ) : step === 'stops_list' ? (
          <>
            {/* Your stops: content starts BELOW the blue bar, list is scrollable, stops are numbered */}
            <div
              style={{
                paddingTop: 'calc(136px + env(safe-area-inset-top, 0px))',
                paddingLeft: 12,
                paddingRight: 12,
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                minHeight: '100vh',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ marginBottom: 10, fontSize: 16, fontWeight: 700, color: C.textPrimary }}>Your stops</div>
              <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>
                Start the top order when you&apos;re ready to go.
              </div>
              <div
                style={{
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  maxHeight: 'calc(100vh - 220px)',
                  paddingBottom: 24,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {((ordersForPickup && ordersForPickup.length > 0)
                    ? ordersForPickup
                    : [{ id: orderId || 'order', label: 'Customer', totalPackages: 1, address: storeAddress }]
                  ).map((order, index) => {
                    const last4 = (id: string) => (id || '').replace(/\D/g, '').slice(-4) || id?.slice(-4) || '';
                    const orderNum = order.orderNumber ?? last4(order.id);
                    const address = order.address || storeAddress || '—';
                    const customerName = (order.label?.trim() && order.label.trim() !== '—') ? order.label.trim() : 'Customer';
                    const isTop = index === 0;
                    const stopNumber = index + 1;
                    return (
                      <div
                        key={order.id}
                        style={{
                          borderRadius: 16,
                          background: '#FFFFFF',
                          border: isTop ? `2px solid ${C.accent}` : '1px solid #E5E7EB',
                          overflow: 'hidden',
                          boxShadow: isTop ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            padding: '14px 14px 10px',
                            borderBottom: '1px solid #F3F4F6',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
                              <span style={{ color: C.accent, marginRight: 4 }}>Stop {stopNumber}.</span>
                              {customerName}
                            </span>
                            {orderNum && (
                              <span style={{ fontSize: 12, fontWeight: 600, color: C.accent, flexShrink: 0 }}>Order: {orderNum}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>
                            {formatAddress(address)}
                          </div>
                        </div>
                        {isTop && (
                          <div style={{ padding: '12px 14px 14px' }}>
                            <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, textAlign: 'center' }}>
                              Slide to confirm to start this order
                            </div>
                            <SlideToConfirm
                              label="Slide to confirm to start"
                              onConfirm={async () => {
                                if (onStartScanning) await onStartScanning();
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Start scanning + scan labels screen */}
            <div
              style={{
                marginBottom: 10,
                fontSize: 16,
                fontWeight: 700,
                color: '#FFFFFF',
                background: C.accent,
                padding: '10px 14px',
                borderRadius: 999,
                alignSelf: 'flex-start',
              }}
            >
              Scan Labels
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.textSecondary,
                marginBottom: 12,
              }}
            >
              Use the scanner to confirm each package on this order. Scanned labels will turn green with a checkmark.
            </div>

            {/* Scanner preview card */}
            <div
              style={{
                borderRadius: 16,
                background: '#0F766E',
                padding: '14px',
                marginBottom: 12,
                color: '#ECFEFF',
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 6 }}>Scanner</div>
              <div
                style={{
                  height: 160,
                  borderRadius: 12,
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#0F766E',
                }}
              >
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '10%',
                    right: '10%',
                    top: '50%',
                    height: 2,
                    background: '#22C55E',
                    boxShadow: '0 0 12px rgba(34,197,94,0.8)',
                    transform: 'translateY(-50%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 10,
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }}
                >
                  Align barcode within the box
                </div>
              </div>
              {cameraError && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: '#FEE2E2',
                  }}
                >
                  {cameraError}
                </div>
              )}
              {lastScanned && !cameraError && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: '#A7F3D0',
                  }}
                >
                  Last scanned: {lastScanned}
                </div>
              )}
            </div>

            {/* Total scanned counter */}
            <div
              style={{
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 600,
                color: C.textPrimary,
              }}
            >
              Total scanned: {scannedCount}/{scanLabels.length || 0}
            </div>

            {/* Package list */}
            <div
              style={{
                maxHeight: 260,
                overflowY: 'auto',
                marginBottom: 12,
              }}
            >
              {(() => {
                // Group packages by order
                const groups = new Map<
                  string,
                  { label: string; orderNumber: string; packages: typeof scanLabels }
                >();
                scanLabels.forEach((pkg) => {
                  const key = pkg.orderId || 'default';
                  const rawLabel = pkg.orderLabel?.trim();
                  const customerName = rawLabel && rawLabel !== '—' ? rawLabel : 'Customer';
                  const group = groups.get(key) || {
                    label: customerName,
                    orderNumber: pkg.orderNumber || (pkg.orderId ? (pkg.orderId).replace(/\D/g, '').slice(-4) : ''),
                    packages: [] as typeof scanLabels,
                  };
                  group.packages.push(pkg);
                  groups.set(key, group);
                });

                return Array.from(groups.entries()).map(([orderKey, group]) => {
                  const total = group.packages.length;
                  const scanned = group.packages.filter((p) => p.scanned).length;
                  return (
                    <div
                      key={orderKey}
                      style={{
                        borderRadius: 16,
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        marginBottom: 10,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Order header: customer name + Order: XXXX */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px 6px',
                          borderBottom: '1px solid #F3F4F6',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: C.textPrimary,
                            }}
                          >
                            {group.label}
                          </div>
                          {group.orderNumber && (
                            <div
                              style={{
                                fontSize: 11,
                                color: C.accent,
                                fontWeight: 600,
                              }}
                            >
                              Order: {group.orderNumber}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.textSecondary,
                          }}
                        >
                          {scanned}/{total} scanned
                        </div>
                      </div>

                      {/* Packages for this order */}
                      {group.packages.map((pkg) => {
                        const isScanned = pkg.scanned;
                        return (
                          <div
                            key={pkg.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              background: isScanned ? '#ECFDF3' : 'transparent',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: isScanned ? '#166534' : C.textPrimary,
                                }}
                              >
                                {pkg.itemBarcode ?? pkg.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: isScanned ? '#16A34A' : C.textSecondary,
                                }}
                              >
                                {isScanned ? 'Scanned' : 'Not scanned'}
                              </div>
                            </div>
                            <div>
                              {isScanned ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: '#22C55E',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: 13,
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '5px 9px',
                                    borderRadius: 999,
                                    border: '1px solid #E5E7EB',
                                    background: '#F9FAFB',
                                    color: C.textSecondary,
                                    fontSize: 11,
                                    fontWeight: 500,
                                  }}
                                >
                                  Awaiting scan
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Start scanning / complete button */}
            <button
              type="button"
              onClick={async () => {
                const hasUnscanned = scanLabels.some((p) => !p.scanned);
                if (hasUnscanned) {
                  // Scan the next unscanned package
                  const nextId = scanLabels.find((p) => !p.scanned)?.id;
                  if (nextId != null) {
                    setScanLabels((prev) =>
                      prev.map((p) => (p.id === nextId ? { ...p, scanned: true } : p))
                    );
                    setScannedCount((prev) => prev + 1);
                  }
                  return;
                }
                // All scanned – show all stops in a row, then user taps DONE SCANNING
                setStep('stops_summary');
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 999,
                border: 'none',
                background: C.accent,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(234, 88, 12, 0.35)',
                marginBottom: 8,
              }}
            >
              {scanLabels.some((p) => !p.scanned) ? 'Scan next label' : 'Finish scanning'}
            </button>

            {/* Help drawer hint */}
            <div
              style={{
                marginTop: 4,
                paddingTop: 10,
                borderTop: '1px solid #E5E7EB',
                fontSize: 11,
                color: C.textSecondary,
                textAlign: 'center',
              }}
            >
              Swipe up if you&apos;re having issues
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RetailGroceryPickupFlow;

