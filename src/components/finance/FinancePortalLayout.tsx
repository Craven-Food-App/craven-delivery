import React from 'react';
import { Box, Container, Typography, Divider } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';

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
          bgcolor: 'background.default',
          py: 3,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 0.5,
                  }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
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
            <Divider sx={{ my: 2 }} />
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
