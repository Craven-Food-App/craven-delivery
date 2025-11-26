import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import '../../styles/neon-finance.css';

interface FinancePortalLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const FinancePortalLayout: React.FC<FinancePortalLayoutProps> = ({
  title,
  subtitle,
  children,
  actions,
}) => {
  return (
    <ThemeProvider theme={financePortalTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography 
                  variant="h3" 
                  className="neon-glow"
                  sx={{ 
                    color: '#ff6a00',
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#a1a1aa',
                      fontSize: '1rem',
                    }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {actions && (
                <Box>
                  {actions}
                </Box>
              )}
            </Box>
            <Box className="neon-divider" sx={{ my: 3 }} />
          </Box>

          {/* Content */}
          <Box>
            {children}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};
