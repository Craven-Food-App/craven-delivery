import React from 'react';

interface SkeuomorphicCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  depth?: 'shallow' | 'medium' | 'deep';
  onClick?: () => void;
}

export const SkeuomorphicCard: React.FC<SkeuomorphicCardProps> = ({ 
  children, 
  className = '', 
  style = {},
  hover = true,
  depth = 'medium',
  onClick
}) => {
  const depthStyles = {
    shallow: {
      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
    },
    medium: {
      boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
    },
    deep: {
      boxShadow: 'inset 0 3px 6px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(0, 0, 0, 0.1), 0 6px 12px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(0, 0, 0, 0.12)',
    },
  };

  const depthStyle = depthStyles[depth];

  return (
    <div
      className={`skeuomorphic-card ${className}`}
      onClick={onClick}
      style={{
        background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
        borderRadius: '12px',
        padding: '24px',
        transition: hover ? 'all 0.2s ease' : 'none',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        ...depthStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(0, 0, 0, 0.05), 0 6px 12px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = depthStyle.boxShadow;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
};

