import React from 'react';
import { GlassmorphicCard } from './GlassmorphicCard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GlassmorphicMetricCardProps {
  title: string;
  value: string;
  change: number;
  changeUnit: string;
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>;
  iconColor: string;
  gradient?: string;
}

export const GlassmorphicMetricCard: React.FC<GlassmorphicMetricCardProps> = ({
  title,
  value,
  change,
  changeUnit,
  icon: Icon,
  iconColor,
  gradient,
}) => {
  const isPositive = change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
  const changeColor = isPositive ? '#16a34a' : '#dc2626';

  return (
    <GlassmorphicCard
      style={{
        background: gradient || '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <p
              style={{
                color: '#475467',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              {title}
            </p>
            <h2
              style={{
                color: '#0f172a',
                fontSize: '32px',
                fontWeight: 800,
                margin: 0,
              }}
            >
              {value}
            </h2>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f5f5f8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${iconColor}30`,
            }}
          >
            {React.createElement(Icon, { style: { color: iconColor, fontSize: '24px' } })}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <ChangeIcon style={{ color: changeColor, width: '16px', height: '16px' }} />
          <span
            style={{
              color: changeColor,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {Math.abs(change).toFixed(1)}%
          </span>
          <span
            style={{
              color: '#667085',
              fontSize: '12px',
            }}
          >
            {changeUnit}
          </span>
        </div>
      </div>
    </GlassmorphicCard>
  );
};

