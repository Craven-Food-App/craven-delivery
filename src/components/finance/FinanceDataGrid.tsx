import React from 'react';
import { DataGrid, DataGridProps, GridColDef } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { dataGridTheme } from '@/themes/financePortalTheme';

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
    <ThemeProvider theme={dataGridTheme}>
      <Box>
        <DataGrid
          columns={columns}
          rows={rows}
          loading={loading}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          disableRowSelectionOnClick
          autoHeight
          {...props}
        />
      </Box>
    </ThemeProvider>
  );
};
