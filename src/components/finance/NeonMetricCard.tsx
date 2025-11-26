import React from 'react';
import { Box, Typography } from '@mui/material';
import { NeonCard } from './NeonCard';
import '../../styles/neon-finance.css';

interface NeonMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  pulse?: boolean;
  glow?: boolean;
}

export const NeonMetricCard: React.FC<NeonMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  pulse = false,
  glow = false,
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#22c55e';
      case 'down':
        return '#ef4444';
      default:
        return '#a1a1aa';
    }
  };

  return (
    <NeonCard pulse={pulse} glow={glow} fadeIn>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#a1a1aa',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: '#ff6a00', opacity: 0.8 }}>
              {icon}
            </Box>
          )}
        </Box>

        <Typography 
          variant="h3" 
          className="neon-gradient"
          sx={{ 
            mb: 1,
            fontWeight: 700,
            fontSize: '2rem',
          }}
        >
          {value}
        </Typography>

        {(subtitle || trendValue) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {trendValue && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: getTrendColor(),
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                {trendValue}
              </Typography>
            )}
            {subtitle && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#6b7280',
                  fontSize: '0.85rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </NeonCard>
  );
};
