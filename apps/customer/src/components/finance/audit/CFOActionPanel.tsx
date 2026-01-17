import React, { useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Button,
  Textarea,
  Select,
  Alert,
  Modal,
  Divider,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconShield,
  IconLock,
  IconFileText,
  IconAlertTriangle,
  IconSend,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { AuditLog } from './types';

interface CFOActionPanelProps {
  log: AuditLog;
  onActionComplete?: () => void;
}

export const CFOActionPanel: React.FC<CFOActionPanelProps> = ({ log, onActionComplete }) => {
  const [action, setAction] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!action) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Error',
          message: 'You must be logged in to perform actions',
          color: 'red',
        });
        return;
      }

      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      switch (action) {
        case 'approve':
          updateData.status = 'approved';
          updateData.approved_by = user.id;
          updateData.cfo_comment = comment || null;
          break;
        case 'reject':
          updateData.status = 'rejected';
          updateData.cfo_comment = comment || null;
          break;
        case 'clear':
          updateData.status = 'cleared';
          updateData.cleared_date = new Date().toISOString();
          updateData.reviewed_by = user.id;
          updateData.cfo_comment = comment || null;
          break;
        case 'flag':
          updateData.status = 'flagged';
          updateData.reviewed_by = user.id;
          updateData.cfo_comment = comment || null;
          break;
        case 'request_docs':
          updateData.status = 'under_review';
          updateData.cfo_comment = `Documentation requested: ${comment}`;
          break;
        case 'freeze':
          updateData.status = 'flagged';
          updateData.cfo_comment = `Account frozen: ${comment}`;
          break;
        case 'lock':
          updateData.locked_at = new Date().toISOString();
          updateData.cfo_comment = `Transaction locked: ${comment}`;
          break;
        case 'override':
          updateData.status = 'cleared';
          updateData.cfo_comment = `CFO Override: ${comment}`;
          break;
      }

      const { error } = await supabase
        .from('audit_logs')
        .update(updateData)
        .eq('id', log.id);

      if (error) throw error;

      // Log to audit trail
      await supabase.rpc('log_audit_trail_entry', {
        p_action_type: `transaction_${action}`,
        p_action_description: `CFO ${action} transaction ${log.transaction_id || log.id}`,
        p_target_type: 'audit_log',
        p_target_id: log.id,
        p_old_values: { status: log.status },
        p_new_values: updateData,
        p_metadata: { cfo_action: action, comment },
      });

      notifications.show({
        title: 'Success',
        message: `Transaction ${action} successfully`,
        color: 'green',
      });

      setAction(null);
      setComment('');
      setConfirmModalOpened(false);
      onActionComplete?.();
    } catch (error: any) {
      console.error('Error performing action:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to perform action',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = [
    { value: 'approve', label: 'Approve Transaction', icon: IconCheck, color: 'green' },
    { value: 'reject', label: 'Reject Transaction', icon: IconX, color: 'red' },
    { value: 'clear', label: 'Mark Cleared', icon: IconCheck, color: 'green' },
    { value: 'flag', label: 'Flag for Review', icon: IconAlertTriangle, color: 'orange' },
    { value: 'request_docs', label: 'Request Documentation', icon: IconFileText, color: 'blue' },
    { value: 'freeze', label: 'Freeze Account', icon: IconShield, color: 'red' },
    { value: 'lock', label: 'Lock Transaction (Immutable)', icon: IconLock, color: 'gray' },
    { value: 'override', label: 'CFO Override Exception', icon: IconShield, color: 'purple' },
  ];

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconShield size={16} />}>
        <Text size="sm" fw={600} mb="xs">CFO Action Panel</Text>
        <Text size="sm">
          All actions performed here will be logged in the immutable audit trail and cannot be undone.
        </Text>
      </Alert>

      <Card withBorder p="md">
        <Text fw={600} mb="md">Select Action</Text>
        <Select
          placeholder="Choose an action..."
          data={actionOptions.map(opt => ({ value: opt.value, label: opt.label }))}
          value={action}
          onChange={setAction}
        />
      </Card>

      {action && (
        <>
          <Card withBorder p="md">
            <Text fw={600} mb="md">Add Comment (Required)</Text>
            <Textarea
              placeholder="Enter your comment or reason for this action..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              minRows={4}
              required
            />
          </Card>

          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setAction(null);
                setComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              onClick={() => setConfirmModalOpened(true)}
              disabled={!comment.trim()}
              color={actionOptions.find(opt => opt.value === action)?.color}
            >
              Execute Action
            </Button>
          </Group>
        </>
      )}

      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title="Confirm Action"
      >
        <Stack gap="md">
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            <Text fw={600} mb="xs">Warning: This action cannot be undone</Text>
            <Text size="sm">
              You are about to {actionOptions.find(opt => opt.value === action)?.label.toLowerCase()} this transaction.
              This will be permanently logged in the audit trail.
            </Text>
          </Alert>
          <Text size="sm">
            <strong>Action:</strong> {actionOptions.find(opt => opt.value === action)?.label}
          </Text>
          {comment && (
            <div>
              <Text size="sm" fw={600} mb="xs">Comment:</Text>
              <Text size="sm">{comment}</Text>
            </div>
          )}
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              loading={loading}
              color={actionOptions.find(opt => opt.value === action)?.color}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};



