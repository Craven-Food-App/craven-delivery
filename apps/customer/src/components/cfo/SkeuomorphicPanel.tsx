import React from 'react';

interface SkeuomorphicPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  headerActions?: React.ReactNode;
}

export const SkeuomorphicPanel: React.FC<SkeuomorphicPanelProps> = ({
  children,
  title,
  className = '',
  style = {},
  headerActions,
}) => {
  return (
    <div
      className={`skeuomorphic-panel ${className}`}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#1f2937',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div style={{ padding: title ? '24px' : '0' }}>{children}</div>
    </div>
  );
};


