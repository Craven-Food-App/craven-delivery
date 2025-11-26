import React from 'react';
import { Card, CardProps } from '@mui/material';
import '../../styles/neon-finance.css';

interface NeonCardProps extends CardProps {
  glow?: boolean;
  pulse?: boolean;
  fadeIn?: boolean;
}

export const NeonCard: React.FC<NeonCardProps> = ({ 
  children, 
  glow = false,
  pulse = false,
  fadeIn = false,
  className = '',
  sx = {},
  ...props 
}) => {
  const animationClass = `${pulse ? 'neon-pulse' : ''} ${fadeIn ? 'neon-fade-in' : ''}`.trim();
  
  return (
    <Card
      className={`neon-card ${animationClass} ${className}`}
      sx={{
        background: 'linear-gradient(135deg, rgba(18, 18, 26, 0.95) 0%, rgba(10, 10, 15, 0.95) 100%)',
        border: '1px solid rgba(255, 106, 0, 0.3)',
        boxShadow: glow 
          ? '0 0 30px rgba(255, 106, 0, 0.25)' 
          : '0 0 20px rgba(255, 106, 0, 0.15)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(255, 106, 0, 0.5)',
          boxShadow: glow 
            ? '0 0 40px rgba(255, 106, 0, 0.35)' 
            : '0 0 30px rgba(255, 106, 0, 0.25)',
          transform: 'translateY(-2px)',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};
