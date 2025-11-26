import React from 'react';
import { Box, Typography } from '@mui/material';
import { LucideIcon } from 'lucide-react';

interface CyberpunkMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: LucideIcon;
  color?: 'cyan' | 'magenta' | 'yellow' | 'green';
}

export const CyberpunkMetricCard: React.FC<CyberpunkMetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  color = 'cyan',
}) => {
  const colorMap = {
    cyan: {
      border: 'rgba(0, 255, 255, 0.4)',
      glow: 'rgba(0, 255, 255, 0.3)',
      text: '#00ffff',
      icon: '#00ffff',
    },
    magenta: {
      border: 'rgba(255, 0, 255, 0.4)',
      glow: 'rgba(255, 0, 255, 0.3)',
      text: '#ff00ff',
      icon: '#ff00ff',
    },
    yellow: {
      border: 'rgba(255, 255, 0, 0.4)',
      glow: 'rgba(255, 255, 0, 0.3)',
      text: '#ffff00',
      icon: '#ffff00',
    },
    green: {
      border: 'rgba(0, 255, 0, 0.4)',
      glow: 'rgba(0, 255, 0, 0.3)',
      text: '#00ff00',
      icon: '#00ff00',
    },
  };

  const colors = colorMap[color];

  const getTrendColor = () => {
    if (trend === 'up') return '#00ff00';
    if (trend === 'down') return '#ff0000';
    return colors.text;
  };

  return (
    <Box
      className="hud-metric-card data-stream"
      sx={{
        background: `linear-gradient(145deg, ${colors.glow}, rgba(3, 7, 18, 0.9))`,
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s',
        '&:hover': {
          borderColor: colors.text,
          boxShadow: `0 0 30px ${colors.glow}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Corner accent */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 40px 40px 0',
          borderColor: `transparent ${colors.border} transparent transparent`,
        }}
      />
      
      {/* Icon */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          opacity: 0.3,
        }}
      >
        <Icon size={40} color={colors.icon} />
      </Box>

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            color: colors.text,
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          {title}
        </Typography>
        
        <Typography
          variant="h3"
          sx={{
            fontFamily: 'monospace',
            color: colors.text,
            fontWeight: 700,
            mt: 1,
            mb: 0.5,
            textShadow: `0 0 20px ${colors.glow}`,
            fontSize: '2rem',
          }}
        >
          {value}
        </Typography>

        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
            }}
          >
            {subtitle}
          </Typography>
        )}

        {trendValue && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color: getTrendColor(),
                fontSize: '0.75rem',
                fontWeight: 700,
                textShadow: `0 0 10px ${getTrendColor()}`,
              }}
            >
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '━'} {trendValue}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Scan line effect */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${colors.text}, transparent)`,
          opacity: 0.5,
        }}
      />
    </Box>
  );
};
