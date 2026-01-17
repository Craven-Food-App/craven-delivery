import React, { useState } from 'react';
import {
  Tabs,
  Stack,
  Card,
  Text,
  Group,
  Badge,
} from '@mantine/core';
import {
  IconDashboard,
  IconFileText,
  IconAlertTriangle,
  IconEye,
  IconBuildingBank,
  IconFolder,
  IconShield,
  IconBrain,
  IconReport,
} from '@tabler/icons-react';
import { AuditDashboard } from './AuditDashboard';
import { AuditLogTable } from './AuditLogTable';
import { InternalControlFlags } from './InternalControlFlags';
import { AuditDetailPanel } from './AuditDetailPanel';
import { ReconciliationModule } from './ReconciliationModule';
import { DocumentationCenter } from './DocumentationCenter';
import { SystemAuditTrail } from './SystemAuditTrail';
import { AIAnomalyDetection } from './AIAnomalyDetection';
import { AuditReports } from './AuditReports';
import { AuditLog } from './types';

export const FinanceAuditComponent: React.FC = () => {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailPanelOpened, setDetailPanelOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const handleLogClick = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailPanelOpened(true);
  };

  const handleActionComplete = () => {
    // Refresh data when actions are completed
    setDetailPanelOpened(false);
    setSelectedLog(null);
  };

  return (
    <Stack gap="lg" p="lg">
      <Card p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Text size="xl" fw={700} mb="xs">Finance Audit Portal</Text>
            <Text c="dimmed" size="sm">
              Enterprise-grade audit system for comprehensive financial oversight and compliance
            </Text>
          </div>
          <Badge size="lg" color="blue" leftSection={<IconShield size={16} />}>
            Fortune 500 System
          </Badge>
        </Group>
      </Card>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'dashboard')}>
        <Tabs.List>
          <Tabs.Tab value="dashboard" leftSection={<IconDashboard size={16} />}>
            Dashboard
          </Tabs.Tab>
          <Tabs.Tab value="audit-logs" leftSection={<IconFileText size={16} />}>
            Audit Logs
          </Tabs.Tab>
          <Tabs.Tab value="flags" leftSection={<IconAlertTriangle size={16} />}>
            Control Flags
          </Tabs.Tab>
          <Tabs.Tab value="reconciliation" leftSection={<IconBuildingBank size={16} />}>
            Reconciliation
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFolder size={16} />}>
            Documents
          </Tabs.Tab>
          <Tabs.Tab value="audit-trail" leftSection={<IconShield size={16} />}>
            System Trail
          </Tabs.Tab>
          <Tabs.Tab value="anomalies" leftSection={<IconBrain size={16} />}>
            AI Anomalies
          </Tabs.Tab>
          <Tabs.Tab value="reports" leftSection={<IconReport size={16} />}>
            Reports
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard" pt="md">
          <AuditDashboard />
        </Tabs.Panel>

        <Tabs.Panel value="audit-logs" pt="md">
          <AuditLogTable onRowClick={handleLogClick} />
        </Tabs.Panel>

        <Tabs.Panel value="flags" pt="md">
          <InternalControlFlags onFlagClick={(flag) => {
            // Navigate to audit log if flag has audit_log_id
            if (flag.audit_log_id) {
              // Fetch and show the log
              // This would need to fetch the log first
            }
          }} />
        </Tabs.Panel>

        <Tabs.Panel value="reconciliation" pt="md">
          <ReconciliationModule />
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="md">
          <DocumentationCenter />
        </Tabs.Panel>

        <Tabs.Panel value="audit-trail" pt="md">
          <SystemAuditTrail />
        </Tabs.Panel>

        <Tabs.Panel value="anomalies" pt="md">
          <AIAnomalyDetection />
        </Tabs.Panel>

        <Tabs.Panel value="reports" pt="md">
          <AuditReports />
        </Tabs.Panel>
      </Tabs>

      {/* Audit Detail Panel */}
      <AuditDetailPanel
        log={selectedLog}
        opened={detailPanelOpened}
        onClose={() => {
          setDetailPanelOpened(false);
          setSelectedLog(null);
        }}
        onActionComplete={handleActionComplete}
      />
    </Stack>
  );
};

