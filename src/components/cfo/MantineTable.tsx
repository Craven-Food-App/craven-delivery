import React from 'react';
import { Table, ScrollArea, Loader, Center } from '@mantine/core';

interface Column<T = any> {
  title: string;
  dataIndex?: string;
  key?: string;
  width?: number;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

interface MantineTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  pagination?: {
    pageSize?: number;
    showSizeChanger?: boolean;
  };
  scroll?: { x?: number | string };
  size?: 'small' | 'default';
  rowSelection?: {
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
}

export function MantineTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  rowKey = 'id',
  pagination,
  scroll,
  size = 'default',
  rowSelection,
}: MantineTableProps<T>) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(pagination?.pageSize || 10);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>(rowSelection?.selectedRowKeys || []);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || record.key || String(index);
  };

  const handleSelectRow = (record: T, checked: boolean) => {
    if (!rowSelection) return;
    const key = getRowKey(record, 0);
    let newKeys: string[];
    if (checked) {
      newKeys = [...selectedKeys, key];
    } else {
      newKeys = selectedKeys.filter(k => k !== key);
    }
    setSelectedKeys(newKeys);
    const selectedRows = data.filter(d => newKeys.includes(getRowKey(d, 0)));
    rowSelection.onChange?.(newKeys, selectedRows);
  };

  const paginatedData = pagination
    ? data.slice((page - 1) * pageSize, page * pageSize)
    : data;

  const totalPages = pagination ? Math.ceil(data.length / pageSize) : 1;

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <Center style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(255,255,255,0.8)' }}>
          <Loader />
        </Center>
      )}
      <ScrollArea>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders={size === 'default'}
          style={{ minWidth: scroll?.x ? (typeof scroll.x === 'number' ? scroll.x : undefined) : undefined }}
        >
          <Table.Thead>
            <Table.Tr>
              {rowSelection && (
                <Table.Th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.length === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allKeys = data.map((d, i) => getRowKey(d, i));
                        setSelectedKeys(allKeys);
                        rowSelection.onChange?.(allKeys, data);
                      } else {
                        setSelectedKeys([]);
                        rowSelection.onChange?.([], []);
                      }
                    }}
                  />
                </Table.Th>
              )}
              {columns.map((col, idx) => (
                <Table.Th key={col.key || col.dataIndex || idx} style={{ width: col.width }}>
                  {col.title}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length + (rowSelection ? 1 : 0)} style={{ textAlign: 'center', padding: 40 }}>
                  No data
                </Table.Td>
              </Table.Tr>
            ) : (
              paginatedData.map((record, recordIdx) => {
                const key = getRowKey(record, recordIdx);
                const isSelected = selectedKeys.includes(key);
                return (
                  <Table.Tr key={key} style={{ background: isSelected ? '#e7f5ff' : undefined }}>
                    {rowSelection && (
                      <Table.Td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(record, e.target.checked)}
                        />
                      </Table.Td>
                    )}
                    {columns.map((col, colIdx) => {
                      const value = col.dataIndex ? record[col.dataIndex] : undefined;
                      const rendered = col.render ? col.render(value, record, recordIdx) : value;
                      return (
                        <Table.Td key={col.key || col.dataIndex || colIdx}>
                          {rendered}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {pagination && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.length)} of {data.length}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '4px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ padding: '4px 12px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '4px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
            {pagination.showSizeChanger && (
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


