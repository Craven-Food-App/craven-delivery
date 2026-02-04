// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Text,
  Badge,
  Group,
  ActionIcon,
  TextInput,
  Select,
  Button,
  ScrollArea,
  Checkbox,
  Pagination,
  Stack,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconFilter,
  IconEye,
  IconDownload,
  IconRefresh,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { AuditLog } from './types';

interface AuditLogTableProps {
  onRowClick?: (log: AuditLog) => void;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ 
  onRowClick, 
  selectedRows = [],
  onSelectionChange 
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(dayjs().subtract(30, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, typeFilter, severityFilter, sourceFilter, startDate, endDate, currentPage, sortColumn, sortDirection]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const startDateStr = startDate ? dayjs(startDate).format('YYYY-MM-DD') : null;
      const endDateStr = endDate ? dayjs(endDate).format('YYYY-MM-DD') : null;

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (startDateStr) query = query.gte('transaction_date', startDateStr);
      if (endDateStr) query = query.lte('transaction_date', endDateStr);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (typeFilter) query = query.eq('transaction_type', typeFilter);
      if (severityFilter) query = query.eq('severity', severityFilter);
      if (sourceFilter) query = query.eq('source', sourceFilter);

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      } else {
        query = query.order('transaction_date', { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs((data || []) as AuditLog[]);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(log =>
      log.transaction_id?.toLowerCase().includes(term) ||
      log.notes?.toLowerCase().includes(term) ||
      log.account_category?.toLowerCase().includes(term) ||
      log.expense_category?.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(filteredLogs.map(log => log.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedRows, id]);
    } else {
      onSelectionChange?.(selectedRows.filter(rowId => rowId !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared': return 'green';
      case 'pending': return 'yellow';
      case 'flagged': return 'red';
      case 'under_review': return 'blue';
      case 'rejected': return 'red';
      case 'approved': return 'green';
      default: return 'gray';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="md" wrap="wrap">
        <TextInput
          placeholder="Search transactions..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <Select
          placeholder="Status"
          data={['cleared', 'pending', 'flagged', 'under_review', 'rejected', 'approved']}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          style={{ width: 150 }}
        />
        <Select
          placeholder="Type"
          data={['revenue', 'expense', 'payout', 'invoice', 'payment', 'refund', 'adjustment', 'reconciliation']}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
          style={{ width: 150 }}
        />
        <Select
          placeholder="Severity"
          data={['low', 'medium', 'high', 'critical']}
          value={severityFilter}
          onChange={setSeverityFilter}
          clearable
          style={{ width: 150 }}
        />
        <Select
          placeholder="Source"
          data={['stripe', 'ach', 'manual', 'payout', 'invoice', 'bank_transfer', 'wire', 'check']}
          value={sourceFilter}
          onChange={setSourceFilter}
          clearable
          style={{ width: 150 }}
        />
        <DatePickerInput
          placeholder="Start Date"
          value={startDate}
          onChange={setStartDate}
          style={{ width: 150 }}
        />
        <DatePickerInput
          placeholder="End Date"
          value={endDate}
          onChange={setEndDate}
          style={{ width: 150 }}
        />
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={fetchLogs}
          variant="light"
        >
          Refresh
        </Button>
      </Group>

      {/* Table */}
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}>
                <Checkbox
                  checked={selectedRows.length === filteredLogs.length && filteredLogs.length > 0}
                  indeterminate={selectedRows.length > 0 && selectedRows.length < filteredLogs.length}
                  onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                />
              </Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('transaction_id')}
              >
                Transaction ID
                {sortColumn === 'transaction_id' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('transaction_type')}
              >
                Type
                {sortColumn === 'transaction_type' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('amount')}
              >
                Amount
                {sortColumn === 'amount' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('source')}
              >
                Source
                {sortColumn === 'source' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('transaction_date')}
              >
                Date
                {sortColumn === 'transaction_date' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th>Entered By</Table.Th>
              <Table.Th>Reviewed By</Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('status')}
              >
                Status
                {sortColumn === 'status' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th>Flag Reason</Table.Th>
              <Table.Th 
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('severity')}
              >
                Severity
                {sortColumn === 'severity' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </Table.Th>
              <Table.Th>Documentation</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Linked Entity</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={16} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Text c="dimmed">Loading audit logs...</Text>
                </Table.Td>
              </Table.Tr>
            ) : filteredLogs.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={16} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Text c="dimmed">No audit logs found</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredLogs.map((log) => (
                <Table.Tr 
                  key={log.id}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={() => onRowClick?.(log)}
                >
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.includes(log.id)}
                      onChange={(e) => handleSelectRow(log.id, e.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {log.transaction_id || log.id.substring(0, 8)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm">{log.transaction_type}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600} size="sm" c={log.transaction_type === 'revenue' ? 'green' : 'red'}>
                      {formatCurrency(log.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="outline">{log.source}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dayjs(log.transaction_date).format('MMM D, YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{log.entered_by ? 'User' : 'System'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{log.reviewed_by ? 'User' : '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(log.status)} size="sm">{log.status}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {log.flag_reason ? (
                      <Tooltip label={log.flag_reason}>
                        <Text size="xs" c="red" truncate style={{ maxWidth: 100 }}>
                          {log.flag_reason}
                        </Text>
                      </Tooltip>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getSeverityColor(log.severity)} size="sm">{log.severity}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={log.has_documentation ? 'green' : 'red'} size="sm">
                      {log.has_documentation ? 'Yes' : 'No'} ({log.documentation_count})
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{log.account_category || log.expense_category || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {log.linked_vendor_id ? 'Vendor' : 
                       log.linked_driver_id ? 'Driver' : 
                       log.linked_merchant_id ? 'Merchant' : 
                       log.linked_customer_id ? 'Customer' : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Group gap="xs">
                      <Tooltip label="View Details">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => onRowClick?.(log)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
          </Text>
          <Pagination
            value={currentPage}
            onChange={setCurrentPage}
            total={totalPages}
          />
        </Group>
      )}
    </Stack>
  );
};

