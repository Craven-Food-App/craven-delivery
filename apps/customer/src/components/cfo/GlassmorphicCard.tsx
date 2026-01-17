import React from 'react';

interface GlassmorphicCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
}

export const GlassmorphicCard: React.FC<GlassmorphicCardProps> = ({
  children,
  className = '',
  style = {},
  hover = true,
}) => {
  return (
    <div
      className={`glassmorphic-card ${className}`}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
        padding: '24px',
        transition: hover ? 'box-shadow 0.3s ease, transform 0.3s ease' : 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 18px 36px rgba(15, 23, 42, 0.16)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(15, 23, 42, 0.12)';
        }
      }}
    >
      {children}
    </div>
  );
};

