import React, { useEffect, useRef, useState } from 'react';
import { Box, Image as MantineImage } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export type MainCustomerAdData = {
  id: string;
  click_url?: string | null;
  ad_code?: string | null;
  image_url?: string | null;
};

const FADE_MS = 480;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function transitionStyle(opacity: number): React.CSSProperties {
  return {
    opacity,
    transform: opacity === 0 ? 'translateY(8px) scale(0.992)' : 'translateY(0) scale(1)',
    transition: `opacity ${FADE_MS}ms ${EASE}, transform ${FADE_MS}ms ${EASE}`,
    willChange: 'opacity, transform',
  };
}

export type MainCustomerAdPanelVariant =
  | 'customer-mobile'
  | 'customer-desktop'
  | 'web-mobile'
  | 'web-desktop';

/**
 * Main hero ad with smooth crossfade when `ad` id changes (rotation / refresh).
 */
export function MainCustomerAdPanel({
  ad,
  maxHeight,
  variant,
}: {
  ad: MainCustomerAdData | null;
  maxHeight: number;
  variant: MainCustomerAdPanelVariant;
}) {
  const navigate = useNavigate();
  const adRef = useRef(ad);
  adRef.current = ad;

  const handleAdClick = (url: string) => {
    if (/^https?:\/\//i.test(url) || url.startsWith("//")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(url);
  };

  const [displayed, setDisplayed] = useState<MainCustomerAdData | null>(ad);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!ad) {
      setDisplayed(null);
      setOpacity(1);
      return;
    }
    setDisplayed((prev) => {
      if (!prev) {
        setOpacity(1);
        return ad;
      }
      if (prev.id === ad.id) return prev;
      queueMicrotask(() => setOpacity(0));
      return prev;
    });
  }, [ad?.id]);

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'opacity') return;
    setOpacity((o) => {
      if (o !== 0) return o;
      const next = adRef.current;
      if (next) {
        setDisplayed(next);
        requestAnimationFrame(() => setOpacity(1));
      } else {
        setDisplayed(null);
      }
      return o;
    });
  };

  if (!displayed) return null;

  const mainAd = displayed;
  const Wrapper = mainAd.click_url ? 'a' : 'div';
  const wrapperProps = mainAd.click_url
    ? {
        href: mainAd.click_url,
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          handleAdClick(mainAd.click_url!);
        },
      }
    : {};

  const useMantineImage =
    variant === 'customer-mobile' ||
    variant === 'customer-desktop' ||
    variant === 'web-mobile';

  const inner = (
    <div style={transitionStyle(opacity)} onTransitionEnd={onTransitionEnd}>
      <Wrapper
        {...wrapperProps}
        style={{
          display: 'block',
          textDecoration: 'none',
          cursor: mainAd.click_url ? 'pointer' : 'default',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {mainAd.ad_code ? (
          <div
            dangerouslySetInnerHTML={{ __html: mainAd.ad_code }}
            style={{ width: '100%', maxHeight, objectFit: 'cover' }}
          />
        ) : mainAd.image_url ? (
          useMantineImage ? (
            <MantineImage
              src={mainAd.image_url}
              alt="Promotion"
              style={{ width: '100%', maxHeight, objectFit: 'cover' }}
            />
          ) : (
            <img
              src={mainAd.image_url}
              alt="Promotion"
              style={{
                width: '100%',
                maxHeight,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )
        ) : null}
      </Wrapper>
    </div>
  );

  if (variant === 'customer-mobile' || variant === 'web-mobile') {
    return (
      <Box px="md" pt="md" pb="xs" style={{ backgroundColor: 'white' }}>
        {inner}
      </Box>
    );
  }
  if (variant === 'customer-desktop') {
    return <div className="mb-8">{inner}</div>;
  }
  return (
    <div className="bg-white pt-6 pb-2">
      <div className="max-w-7xl mx-auto px-4">{inner}</div>
    </div>
  );
}
