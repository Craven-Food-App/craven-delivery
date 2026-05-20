import React, { useState } from 'react';
import { Box, Stack, Title, Text, Button, Group, UnstyledButton } from '@mantine/core';

interface DeliveryPhotoGuideProps {
  onComplete: () => void;
  onClose: () => void;
}

const SLIDES = [
  {
    title: 'Take Great Delivery Photos',
    body: 'Great delivery photos show the condition of the items at delivery and where you left the items at the location.',
    illustration: (
      <svg viewBox="0 0 240 180" width="100%" style={{ maxWidth: 260 }}>
        <ellipse cx="120" cy="160" rx="110" ry="10" fill="#ffedd5" />
        <rect x="90" y="40" width="70" height="110" rx="4" fill="#0d9488" />
        <rect x="95" y="45" width="60" height="100" rx="2" fill="#14b8a6" />
        <circle cx="148" cy="95" r="3" fill="#f59e0b" />
        <circle cx="148" cy="103" r="3" fill="#f59e0b" />
        <text x="115" y="70" fontSize="10" fill="#fff" fontWeight="700">2A</text>
        <rect x="40" y="120" width="35" height="35" rx="3" fill="#c2956b" />
        <rect x="60" y="115" width="30" height="40" rx="3" fill="#a0522d" />
        <circle cx="180" cy="140" r="14" fill="#ef4444" />
        <rect x="175" y="135" width="10" height="20" fill="#a16207" />
        <g transform="translate(60,55)">
          <rect x="0" y="0" width="90" height="22" rx="11" fill="#fff" stroke="#0d9488"/>
          <circle cx="11" cy="11" r="7" fill="#0d9488"/>
          <text x="18" y="15" fontSize="9" fill="#0f172a" fontWeight="600">1</text>
          <text x="26" y="15" fontSize="9" fill="#0f172a">Contains all items</text>
        </g>
        <g transform="translate(120,25)">
          <rect x="0" y="0" width="100" height="22" rx="11" fill="#fff" stroke="#0d9488"/>
          <circle cx="11" cy="11" r="7" fill="#0d9488"/>
          <text x="18" y="15" fontSize="9" fill="#0f172a" fontWeight="600">2</text>
          <text x="26" y="15" fontSize="9" fill="#0f172a">Location is visible</text>
        </g>
      </svg>
    ),
  },
  {
    title: "Dos and Don'ts",
    body: "Don't take zoomed-in photos of the items. The surrounding location should be visible in the photo. If you can get the house number in the photo, that's even better.",
    illustration: (
      <svg viewBox="0 0 280 180" width="100%" style={{ maxWidth: 280 }}>
        <g>
          <rect x="10" y="10" width="120" height="140" rx="6" fill="#e0f2fe" stroke="#94a3b8" strokeDasharray="4 3"/>
          <rect x="30" y="80" width="40" height="55" rx="3" fill="#c2956b"/>
          <rect x="55" y="70" width="45" height="65" rx="3" fill="#a0522d"/>
          <circle cx="70" cy="160" r="14" fill="#ef4444"/>
          <path d="M64 154 L76 166 M76 154 L64 166" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <g transform="translate(140,0)">
          <rect x="10" y="10" width="120" height="140" rx="6" fill="#e0f2fe" stroke="#94a3b8" strokeDasharray="4 3"/>
          <rect x="50" y="40" width="50" height="90" rx="3" fill="#0d9488"/>
          <text x="65" y="60" fontSize="8" fill="#fff" fontWeight="700">2A</text>
          <circle cx="92" cy="80" r="2" fill="#f59e0b"/>
          <circle cx="92" cy="86" r="2" fill="#f59e0b"/>
          <rect x="20" y="110" width="22" height="20" rx="2" fill="#c2956b"/>
          <rect x="35" y="105" width="20" height="25" rx="2" fill="#a0522d"/>
          <circle cx="100" cy="120" r="8" fill="#ef4444"/>
          <circle cx="70" cy="160" r="14" fill="#22c55e"/>
          <path d="M64 160 L69 165 L77 156" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </g>
      </svg>
    ),
  },
  {
    title: 'Why are they important?',
    body: 'Delivery photos are proof of delivery. If pictures are not clear, Crave\u2019N may withhold payment or lock your account while any claim for loss, damage, or theft is investigated.',
    illustration: (
      <svg viewBox="0 0 220 200" width="100%" style={{ maxWidth: 240 }}>
        <rect x="20" y="20" width="180" height="160" rx="12" fill="#fff7ed"/>
        <circle cx="110" cy="90" r="42" fill="#fed7aa"/>
        <circle cx="110" cy="80" r="22" fill="#f3d5b5"/>
        <path d="M88 75 Q110 50 132 75" fill="#1f2937"/>
        <circle cx="100" cy="80" r="4" fill="#1f2937"/>
        <circle cx="120" cy="80" r="4" fill="#1f2937"/>
        <rect x="55" y="145" width="110" height="26" rx="13" fill="#fff" stroke="#e5e7eb"/>
        <g transform="translate(65,150)" fill="#facc15">
          {[0,1,2,3,4].map(i => (
            <polygon key={i} transform={`translate(${i*18},0)`} points="8,0 10,5 15,5 11,9 13,15 8,12 3,15 5,9 1,5 6,5"/>
          ))}
        </g>
      </svg>
    ),
  },
];

export const DeliveryPhotoGuide: React.FC<DeliveryPhotoGuideProps> = ({ onComplete, onClose }) => {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <Box
        style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '28px 24px 32px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <Group justify="flex-end" mb="xs">
          <UnstyledButton onClick={onClose} style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
            CLOSE
          </UnstyledButton>
        </Group>

        <Box style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          {slide.illustration}
        </Box>

        <Stack gap="sm" mb="lg">
          <Title order={3} style={{ color: '#0f172a' }}>{slide.title}</Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.55 }}>{slide.body}</Text>
        </Stack>

        <Group justify="center" gap={8} mb="xl">
          {SLIDES.map((_, i) => (
            <Box
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: i === step ? '#f97316' : '#e5e7eb',
              }}
            />
          ))}
        </Group>

        <Group justify="space-between">
          {step > 0 ? (
            <Button variant="subtle" color="orange" onClick={() => setStep(s => s - 1)} style={{ fontWeight: 700 }}>
              BACK
            </Button>
          ) : <Box />}
          <Button
            color="orange"
            radius="xl"
            size="md"
            style={{ minWidth: 130, fontWeight: 700 }}
            onClick={() => {
              if (isLast) onComplete();
              else setStep(s => s + 1);
            }}
          >
            {isLast ? 'GOT IT' : 'NEXT'}
          </Button>
        </Group>
      </Box>
    </Box>
  );
};

export default DeliveryPhotoGuide;