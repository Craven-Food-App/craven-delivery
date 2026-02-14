// @ts-nocheck
import React, { useState } from 'react';
import { Stack, Group, Text, Card, Badge, Button, Collapse, Divider } from '@mantine/core';
import { IconClock, IconUser, IconChevronDown, IconDownload } from '@tabler/icons-react';
import { DataTable, ColumnDef } from './DataTable';

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  action: string;
  changes?: {
    field: string;
    before: any;
    after: any;
  }[];
  reason?: string;
  ipAddress?: string;
}

interface AuditTrailProps {
  entityId: string;
  entityType: string;
  format?: 'timeline' | 'table';
  limit?: number;
  exportable?: boolean;
  entries?: AuditEntry[]; // If provided, use these instead of fetching
  loading?: boolean;
}

export function AuditTrail({
  entityId,
  entityType,
  format = 'timeline',
  limit = 50,
  exportable = false,
  entries = [],
  loading = false,
}: AuditTrailProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleExport = () => {
    // Export logic
    const csv = [
      ['Timestamp', 'User', 'Role', 'Action', 'Changes', 'Reason', 'IP Address'].join(','),
      ...entries.map((entry) =>
        [
          entry.timestamp,
          entry.user.name,
          entry.user.role,
          entry.action,
          entry.changes?.map((c) => `${c.field}: ${c.before} → ${c.after}`).join('; ') || '',
          entry.reason || '',
          entry.ipAddress || '',
        ].map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${entityType}_${entityId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && entries.length === 0) {
    return (
      <Card padding="md" withBorder>
        <Text c="dimmed" size="sm">Loading audit trail...</Text>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card padding="md" withBorder>
        <Text c="dimmed" size="sm" ta="center">
          No changes recorded
        </Text>
      </Card>
    );
  }

  if (format === 'table') {
    const columns: ColumnDef<AuditEntry>[] = [
      {
        id: 'timestamp',
        header: 'Timestamp',
        accessor: (row) => row.timestamp,
        sortable: true,
        render: (value) => formatTimestamp(value),
        width: 180,
      },
      {
        id: 'user',
        header: 'User',
        accessor: (row) => row.user.name,
        sortable: true,
        render: (value, row) => (
          <div>
            <Text size="sm" fw={500}>{value}</Text>
            <Text size="xs" c="dimmed">{row.user.role}</Text>
          </div>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        accessor: (row) => row.action,
        sortable: true,
      },
      {
        id: 'changes',
        header: 'Changes',
        accessor: (row) => row.changes?.length || 0,
        render: (value, row) => (
          <Badge variant="light" size="sm">
            {value} field{value !== 1 ? 's' : ''}
          </Badge>
        ),
        width: 100,
      },
    ];

    return (
      <div>
        {exportable && (
          <Group justify="flex-end" mb="md">
            <Button
              size="sm"
              variant="subtle"
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </Group>
        )}
        <DataTable
          data={entries}
          columns={columns}
          density="compact"
        />
      </div>
    );
  }

  // Timeline format
  return (
    <div>
      {exportable && (
        <Group justify="flex-end" mb="md">
          <Button
            size="sm"
            variant="subtle"
            leftSection={<Download size={16} />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </Group>
      )}
      <Stack gap="xs">
        {entries.map((entry, index) => {
          const isExpanded = expandedEntries.has(entry.id);
          const hasChanges = entry.changes && entry.changes.length > 0;

          return (
            <React.Fragment key={entry.id}>
              <Card
                padding="sm"
                withBorder
                style={{
                  borderLeft: '3px solid #ff5f1f',
                  backgroundColor: index === 0 ? '#f9fafb' : 'white',
                }}
              >
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#ff5f1f',
                      marginTop: '6px',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" align="flex-start" mb={4}>
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" align="center" mb={4}>
                          <IconUser size={14} style={{ color: '#6b7280' }} />
                          <Text size="sm" fw={500}>
                            {entry.user.name}
                          </Text>
                          <Badge size="xs" variant="light">
                            {entry.user.role}
                          </Badge>
                        </Group>
                        <Text size="sm" mb={4}>
                          {entry.action}
                        </Text>
                        <Group gap="xs">
                          <IconClock size={12} style={{ color: '#9ca3af' }} />
                          <Text size="xs" c="dimmed">
                            {formatTimestamp(entry.timestamp)}
                          </Text>
                          {entry.ipAddress && (
                            <>
                              <Text size="xs" c="dimmed">•</Text>
                              <Text size="xs" c="dimmed">IP: {entry.ipAddress}</Text>
                            </>
                          )}
                        </Group>
                      </div>
                      {hasChanges && (
                        <Button
                          variant="subtle"
                          size="xs"
                          rightSection={
                            <IconChevronDown
                              size={12}
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 200ms',
                              }}
                            />
                          }
                          onClick={() => toggleEntry(entry.id)}
                        >
                          {isExpanded ? 'Hide' : 'Show'} Changes
                        </Button>
                      )}
                    </Group>

                    {entry.reason && (
                      <Card padding="xs" style={{ backgroundColor: '#f9fafb', marginTop: 8 }} withBorder>
                        <Text size="xs" c="dimmed">
                          <Text component="span" fw={500}>Reason:</Text> {entry.reason}
                        </Text>
                      </Card>
                    )}

                    <Collapse in={isExpanded}>
                      {hasChanges && (
                        <Card padding="sm" style={{ backgroundColor: '#f9fafb', marginTop: 8 }} withBorder>
                          <Text size="xs" fw={600} mb="xs">Field Changes:</Text>
                          <Stack gap="xs">
                            {entry.changes!.map((change, idx) => (
                              <div key={idx}>
                                <Text size="xs" fw={500}>{change.field}:</Text>
                                <Group gap="xs">
                                  <Text size="xs" c="red" style={{ textDecoration: 'line-through' }}>
                                    {String(change.before || 'null')}
                                  </Text>
                                  <Text size="xs">→</Text>
                                  <Text size="xs" c="green">
                                    {String(change.after || 'null')}
                                  </Text>
                                </Group>
                              </div>
                            ))}
                          </Stack>
                        </Card>
                      )}
                    </Collapse>
                  </div>
                </Group>
              </Card>
              {index < entries.length - 1 && (
                <div style={{ marginLeft: '20px', height: '16px', borderLeft: '2px dashed #e5e7eb' }} />
              )}
            </React.Fragment>
          );
        })}
      </Stack>
    </div>
  );
}

