import React from 'react';
import { DataGrid, DataGridProps, GridColDef } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme, dataGridTheme } from '@/themes/financePortalTheme';
import '../../styles/neon-finance.css';

interface FinanceDataGridProps extends Omit<DataGridProps, 'columns'> {
  columns: GridColDef[];
  loading?: boolean;
}

export const FinanceDataGrid: React.FC<FinanceDataGridProps> = ({
  columns,
  rows,
  loading = false,
  ...props
}) => {
  return (
    <ThemeProvider theme={financePortalTheme}>
      <Box sx={dataGridTheme}>
        <DataGrid
          columns={columns}
          rows={rows}
          loading={loading}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: '1px solid rgba(255, 106, 0, 0.2)',
            backgroundColor: '#12121a',
            '& .MuiDataGrid-cell': {
              borderColor: 'rgba(255, 106, 0, 0.1)',
              color: '#ffffff',
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#1a1a24',
              borderColor: 'rgba(255, 106, 0, 0.2)',
              color: '#ff6a00',
              fontWeight: 700,
              fontSize: '0.875rem',
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
              color: '#ffffff',
            },
            '& .MuiTablePagination-root': {
              color: '#ffffff',
            },
            '& .MuiTablePagination-selectIcon': {
              color: '#ff6a00',
            },
            '& .MuiDataGrid-selectedRowCount': {
              color: '#a1a1aa',
            },
          }}
          {...props}
        />
      </Box>
    </ThemeProvider>
  );
};
