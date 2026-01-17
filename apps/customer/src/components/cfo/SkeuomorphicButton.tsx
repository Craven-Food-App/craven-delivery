import React from 'react';

interface SkeuomorphicButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeuomorphicButton: React.FC<SkeuomorphicButtonProps> = ({
  children,
  onClick,
  type = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  className = '',
  style = {},
}) => {
  const typeStyles = {
    primary: {
      background: 'linear-gradient(145deg, #2563eb 0%, #1e40af 100%)',
      color: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    },
    secondary: {
      background: 'linear-gradient(145deg, #6b7280 0%, #4b5563 100%)',
      color: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    },
    danger: {
      background: 'linear-gradient(145deg, #dc2626 0%, #b91c1c 100%)',
      color: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    },
    success: {
      background: 'linear-gradient(145deg, #16a34a 0%, #15803d 100%)',
      color: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    },
  };

  const sizeStyles = {
    small: { padding: '6px 12px', fontSize: '13px', borderRadius: '6px' },
    medium: { padding: '10px 20px', fontSize: '14px', borderRadius: '8px' },
    large: { padding: '14px 28px', fontSize: '16px', borderRadius: '10px' },
  };

  const baseStyle = typeStyles[type];
  const sizeStyle = sizeStyles[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`skeuomorphic-button ${className}`}
      style={{
        ...baseStyle,
        ...sizeStyle,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.2)';
          e.currentTarget.style.transform = 'translateY(1px)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = baseStyle.boxShadow;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = baseStyle.boxShadow;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};


