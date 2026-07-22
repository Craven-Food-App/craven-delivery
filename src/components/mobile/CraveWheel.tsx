import React, { useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import {
  CRAVE_ORANGE,
  CRAVE_WHEEL_SERVICES,
  type CraveWheelService,
} from '@/components/mobile/craveWheelConfig';
import {
  getWheelItemSize,
  getWheelRadius,
  layoutWheelItems,
} from '@/components/mobile/craveWheelGeometry';

interface CraveWheelProps {
  open: boolean;
  reducedMotion: boolean;
  firstItemRef: React.RefObject<HTMLButtonElement | null>;
  onClose: (reason?: string) => void;
  onSelect: (service: CraveWheelService) => void;
}

const PARTICLE_COUNT = 10;

export const CraveWheel: React.FC<CraveWheelProps> = ({
  open,
  reducedMotion,
  firstItemRef,
  onClose,
  onSelect,
}) => {
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 560) : 390
  );
  const [closing, setClosing] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(Math.min(window.innerWidth, 560));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setSelectedId(null);
      setBurstKey((k) => k + 1);
    }
  }, [open]);

  const radius = getWheelRadius(viewportWidth);
  const itemSize = getWheelItemSize(viewportWidth);
  const layout = useMemo(
    () => layoutWheelItems(CRAVE_WHEEL_SERVICES.length, radius, viewportWidth),
    [radius, viewportWidth]
  );

  const handleSelect = (service: CraveWheelService) => {
    setSelectedId(service.id);
    onSelect(service);

    if (service.comingSoon || !service.enabled) {
      notifications.show({
        title: 'Coming soon',
        message: `${service.label} will be available soon on Crave'n.`,
        color: 'orange',
      });
      return;
    }

    if (service.path.includes('browse=guest')) {
      sessionStorage.setItem('browse_as_guest', 'true');
    }

    // Navigate immediately — do not wait for close animation
    navigate(service.path);
  };

  const requestClose = () => {
    if (closing) return;
    if (reducedMotion) {
      onClose('overlay');
      return;
    }
    setClosing(true);
    window.setTimeout(() => onClose('overlay'), 200);
  };

  if (!open && !closing) return null;

  const guideR = radius;
  const startA = 205;
  const endA = 335;
  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: Math.cos(rad) * guideR,
      y: Math.sin(rad) * guideR,
    };
  };
  const s = polar(startA);
  const e = polar(endA);
  // Sweep through top (270°) — large-arc=1, sweep=1 for the upper path in this coord system
  const guidePath = `M ${s.x} ${s.y} A ${guideR} ${guideR} 0 0 1 ${e.x} ${e.y}`;

  return (
    <>
      <button
        type="button"
        className={`crave-nav-overlay${closing ? ' closing' : ''}`}
        aria-label="Close Crave menu"
        onClick={requestClose}
      />

      <div className="crave-wheel-layer" aria-hidden={!open}>
        <svg
          className={`crave-wheel-guide${open && !closing ? ' is-open' : ''}`}
          width={guideR * 2 + 8}
          height={guideR + 8}
          viewBox={`${-guideR - 4} ${-guideR - 4} ${guideR * 2 + 8} ${guideR + 8}`}
          style={{ overflow: 'visible' }}
        >
          <path
            d={guidePath}
            fill="none"
            stroke={CRAVE_ORANGE}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>

        {!reducedMotion &&
          Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
            const angle = ((205 + (130 * i) / (PARTICLE_COUNT - 1)) * Math.PI) / 180;
            const dist = 40 + (i % 3) * 18;
            const px = `${Math.cos(angle) * dist}px`;
            const py = Math.sin(angle) * dist;
            return (
              <span
                key={`${burstKey}-${i}`}
                className={`crave-particle${open && !closing ? ' is-burst' : ''}`}
                style={
                  {
                    '--px': px,
                    '--py': py,
                    animationDelay: `${i * 18}ms`,
                    background:
                      i % 2 === 0 ? CRAVE_ORANGE : '#fb923c',
                  } as React.CSSProperties
                }
              />
            );
          })}

        {CRAVE_WHEEL_SERVICES.map((service, index) => {
          const pos = layout[index];
          if (!pos) return null;
          const isDisabled = service.comingSoon || !service.enabled;

          return (
            <button
              key={service.id}
              type="button"
              ref={index === 0 ? firstItemRef : undefined}
              className={[
                'crave-wheel-item',
                open && !closing ? 'is-open' : '',
                closing ? 'is-closing' : '',
                isDisabled ? 'is-disabled' : '',
                selectedId === service.id ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                {
                  '--crave-x': `${pos.x}px`,
                  '--crave-y': pos.y,
                  '--crave-item-size': `${itemSize}px`,
                  animationDelay: reducedMotion ? '0ms' : `${index * 32}ms`,
                  zIndex: 10 + index,
                } as React.CSSProperties
              }
              aria-label={
                isDisabled
                  ? `${service.label}, coming soon`
                  : `Open ${service.label}`
              }
              aria-disabled={isDisabled}
              onClick={() => handleSelect(service)}
            >
              <span className="crave-wheel-orb">
                {service.Icon ? (
                  <service.Icon
                    className="crave-wheel-glyph"
                    width="100%"
                    height="100%"
                  />
                ) : (
                  <span className="crave-wheel-emoji" aria-hidden="true">
                    {service.emoji}
                  </span>
                )}
                {service.badge ? (
                  <span className="crave-wheel-badge">{service.badge}</span>
                ) : null}
              </span>
              <span className="crave-wheel-label">{service.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default CraveWheel;
