import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Power, Activity, Zap, Server } from 'lucide-react';

interface CyberpunkHeaderProps {
  onSignOut: () => void;
}

export const CyberpunkHeader: React.FC<CyberpunkHeaderProps> = ({ onSignOut }) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        background: 'rgba(3, 7, 18, 0.8)',
        borderBottom: '2px solid rgba(0, 255, 255, 0.4)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
      }}
      className="corner-brackets"
    >
      {/* Left Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#00ffff',
              textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
              letterSpacing: '0.1em',
            }}
            className="glitch-text"
          >
            CFO:HUD
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: 'rgba(0, 255, 255, 0.6)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
            }}
          >
            FINANCIAL COMMAND CENTER
          </Typography>
        </Box>
      </Box>

      {/* Center Section - System Status */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Activity size={16} color="#00ff00" />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: '#00ff00',
              fontSize: '0.7rem',
              textShadow: '0 0 10px rgba(0, 255, 0, 0.8)',
            }}
          >
            SYSTEMS ONLINE
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Server size={16} color="#00ffff" />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: '#00ffff',
              fontSize: '0.7rem',
            }}
          >
            DATABASE: ACTIVE
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Zap size={16} color="#ffff00" />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: '#ffff00',
              fontSize: '0.7rem',
              textShadow: '0 0 10px rgba(255, 255, 0, 0.8)',
            }}
          >
            REALTIME
          </Typography>
        </Box>
      </Box>

      {/* Right Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              color: '#00ffff',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: 'rgba(0, 255, 255, 0.6)',
              fontSize: '0.65rem',
            }}
          >
            {time.toLocaleDateString('en-US', { 
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}
          </Typography>
        </Box>
        <IconButton
          onClick={onSignOut}
          sx={{
            color: '#ff0000',
            border: '1px solid rgba(255, 0, 0, 0.4)',
            '&:hover': {
              background: 'rgba(255, 0, 0, 0.1)',
              borderColor: 'rgba(255, 0, 0, 0.8)',
              boxShadow: '0 0 20px rgba(255, 0, 0, 0.4)',
            },
          }}
        >
          <Power size={20} />
        </IconButton>
      </Box>
    </Box>
  );
};
