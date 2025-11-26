import { createTheme } from '@mui/material/styles';

export const financePortalTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff6a00',
      light: '#ff9500',
      dark: '#cc5500',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ff9500',
      light: '#ffb84d',
      dark: '#cc7700',
      contrastText: '#000000',
    },
    background: {
      default: '#0a0a0f',
      paper: '#12121a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
      disabled: '#6b7280',
    },
    divider: 'rgba(255, 106, 0, 0.2)',
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#12121a',
          boxShadow: '0 0 20px rgba(255, 106, 0, 0.15)',
          border: '1px solid rgba(255, 106, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 30px rgba(255, 106, 0, 0.25)',
            borderColor: 'rgba(255, 106, 0, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#12121a',
          boxShadow: '0 0 20px rgba(255, 106, 0, 0.15)',
          border: '1px solid rgba(255, 106, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 30px rgba(255, 106, 0, 0.25)',
            borderColor: 'rgba(255, 106, 0, 0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          transition: 'all 0.3s ease',
        },
        contained: {
          boxShadow: '0 0 15px rgba(255, 106, 0, 0.3)',
          '&:hover': {
            boxShadow: '0 0 25px rgba(255, 106, 0, 0.5)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            boxShadow: '0 0 15px rgba(255, 106, 0, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        filled: {
          backgroundColor: 'rgba(255, 106, 0, 0.2)',
          color: '#ff6a00',
          border: '1px solid rgba(255, 106, 0, 0.4)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          transition: 'all 0.3s ease',
          '&.Mui-selected': {
            color: '#ff6a00',
            textShadow: '0 0 10px rgba(255, 106, 0, 0.5)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#ff6a00',
          height: 3,
          boxShadow: '0 0 10px rgba(255, 106, 0, 0.6)',
        },
      },
    },
  },
});

// DataGrid specific theme configuration
export const dataGridTheme = {
  '& .MuiDataGrid-root': {
    border: '1px solid rgba(255, 106, 0, 0.2)',
    backgroundColor: '#12121a',
    '& .MuiDataGrid-cell': {
      borderColor: 'rgba(255, 106, 0, 0.1)',
      color: '#ffffff',
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: '#1a1a24',
      borderColor: 'rgba(255, 106, 0, 0.2)',
      color: '#ff6a00',
      fontWeight: 700,
      fontSize: '0.9rem',
    },
    '& .MuiDataGrid-columnHeader': {
      '&:focus, &:focus-within': {
        outline: 'none',
      },
    },
    '& .MuiDataGrid-row': {
      '&:hover': {
        backgroundColor: 'rgba(255, 106, 0, 0.05)',
      },
      '&.Mui-selected': {
        backgroundColor: 'rgba(255, 106, 0, 0.1)',
        '&:hover': {
          backgroundColor: 'rgba(255, 106, 0, 0.15)',
        },
      },
    },
    '& .MuiDataGrid-footerContainer': {
      borderColor: 'rgba(255, 106, 0, 0.2)',
      backgroundColor: '#1a1a24',
    },
  },
};
