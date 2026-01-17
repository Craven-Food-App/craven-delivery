import React, { useState, useMemo } from 'react';
import {
  Table,
  ScrollArea,
  Group,
  Text,
  Button,
  Pagination,
  Select,
  Checkbox,
  ActionIcon,
  Menu,
  Badge,
} from '@mantine/core';
import { IconArrowsSort, IconArrowUp, IconArrowDown, IconDownload, IconDotsVertical } from '@tabler/icons-react';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: (row: T) => any;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
    onSort: (column: string, direction: 'asc' | 'desc') => void;
  };
  selection?: {
    selected: string[];
    onSelectionChange: (selected: string[]) => void;
    selectable?: (row: T) => boolean;
  };
  onRowClick?: (row: T) => void;
  exportable?: boolean;
  onExport?: (format: 'csv' | 'pdf') => void;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  density?: 'compact' | 'standard' | 'spacious';
  getRowId?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  sorting,
  selection,
  onRowClick,
  exportable = false,
  onExport,
  emptyState,
  errorState,
  density = 'standard',
  getRowId = (row) => row.id || String(row),
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const densityStyles = {
    compact: { rowHeight: 40, cellPadding: '8px 12px', fontSize: '12px' },
    standard: { rowHeight: 48, cellPadding: '12px 16px', fontSize: '14px' },
    spacious: { rowHeight: 56, cellPadding: '16px 20px', fontSize: '14px' },
  };

  const styles = densityStyles[density];

  const handleSort = (columnId: string) => {
    if (!sorting) return;
    const newDirection =
      sorting.column === columnId && sorting.direction === 'asc' ? 'desc' : 'asc';
    sorting.onSort(columnId, newDirection);
  };

  const handleSelectRow = (row: T, checked: boolean) => {
    if (!selection) return;
    const rowId = getRowId(row);
    const newSelected = checked
      ? [...selection.selected, rowId]
      : selection.selected.filter((id) => id !== rowId);
    selection.onSelectionChange(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!selection) return;
    const newSelected = checked ? data.map((row) => getRowId(row)) : [];
    selection.onSelectionChange(newSelected);
  };

  const allSelected = selection && data.length > 0 && selection.selected.length === data.length;
  const someSelected = selection && selection.selected.length > 0 && selection.selected.length < data.length;

  const handleExport = (format: 'csv' | 'pdf') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default CSV export
      if (format === 'csv') {
        const headers = columns.map((col) => col.header).join(',');
        const rows = data.map((row) =>
          columns.map((col) => {
            const value = col.accessor(row);
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  if (loading) {
    return <SkeletonLoader variant="table" count={5} />;
  }

  if (errorState) {
    return <>{errorState}</>;
  }

  if (data.length === 0) {
    return emptyState || (
      <EmptyState
        title="No data found"
        description="There are no items to display."
      />
    );
  }

  return (
    <div>
      {selection && selection.selected.length > 0 && (
        <Group justify="space-between" mb="md" p="sm" style={{ backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <Text size="sm" fw={500}>
            {selection.selected.length} selected
          </Text>
          <Group gap="xs">
            <Button size="xs" variant="subtle" onClick={() => selection.onSelectionChange([])}>
              Clear Selection
            </Button>
          </Group>
        </Group>
      )}

      <Group justify="space-between" mb="md">
        {pagination && (
          <Text size="sm" c="dimmed">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </Text>
        )}
        {exportable && (
          <Menu>
            <Menu.Target>
              <Button size="sm" variant="subtle" leftSection={<Download size={16} />}>
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => handleExport('csv')}>Export as CSV</Menu.Item>
              {onExport && <Menu.Item onClick={() => handleExport('pdf')}>Export as PDF</Menu.Item>}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <ScrollArea>
        <Table
          striped
          highlightOnHover
          withTableBorder
          style={{ fontSize: styles.fontSize }}
        >
          <Table.Thead>
            <Table.Tr>
              {selection && (
                <Table.Th style={{ width: 48 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                  />
                </Table.Th>
              )}
              {columns.map((column) => (
                <Table.Th
                  key={column.id}
                  style={{
                    width: column.width,
                    textAlign: column.align || 'left',
                    cursor: column.sortable ? 'pointer' : 'default',
                  }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={600} size="sm">
                      {column.header}
                    </Text>
                    {column.sortable && sorting && (
                      <div>
                        {sorting.column === column.id ? (
                          sorting.direction === 'asc' ? (
                            <ArrowUp size={14} style={{ color: '#ff5f1f' }} />
                          ) : (
                            <ArrowDown size={14} style={{ color: '#ff5f1f' }} />
                          )
                        ) : (
                          <ArrowUpDown size={14} style={{ color: '#9ca3af' }} />
                        )}
                      </div>
                    )}
                  </Group>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row, index) => {
              const rowId = getRowId(row);
              const isSelected = selection?.selected.includes(rowId);
              const isSelectable = !selection || !selection.selectable || selection.selectable(row);

              return (
                <Table.Tr
                  key={rowId}
                  style={{
                    height: styles.rowHeight,
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor:
                      isSelected || hoveredRow === rowId ? 'rgba(255, 95, 31, 0.05)' : undefined,
                  }}
                  onMouseEnter={() => setHoveredRow(rowId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selection && (
                    <Table.Td style={{ padding: styles.cellPadding }}>
                      <Checkbox
                        checked={isSelected}
                        disabled={!isSelectable}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row, e.currentTarget.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Table.Td>
                  )}
                  {columns.map((column) => {
                    const value = column.accessor(row);
                    return (
                      <Table.Td
                        key={column.id}
                        style={{
                          padding: styles.cellPadding,
                          textAlign: column.align || 'left',
                        }}
                      >
                        {column.render ? column.render(value, row) : String(value || '')}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {pagination && (
        <Group justify="space-between" mt="md">
          <Group gap="xs">
            <Text size="sm">Rows per page:</Text>
            <Select
              value={String(pagination.pageSize)}
              onChange={(value) => pagination.onPageSizeChange(Number(value))}
              data={['25', '50', '100']}
              style={{ width: 80 }}
              size="sm"
            />
          </Group>
          <Pagination
            value={pagination.page}
            onChange={pagination.onPageChange}
            total={Math.ceil(pagination.total / pagination.pageSize)}
            size="sm"
          />
        </Group>
      )}
    </div>
  );
}

