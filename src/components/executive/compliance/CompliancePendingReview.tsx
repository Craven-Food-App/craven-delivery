// @ts-nocheck
import React from 'react';
import {
  Stack, Title, Text, Card, Group, Badge, Alert, ThemeIcon, Timeline,
} from '@mantine/core';
import {
  IconCheck, IconHourglass, IconShieldCheck, IconFileCheck,
  IconReceipt, IconId, IconBuildingBank, IconSignature,
} from '@tabler/icons-react';

interface CompliancePendingReviewProps {
  intake: any;
  complianceStatus: string;
}

const CompliancePendingReview: React.FC<CompliancePendingReviewProps> = ({
  intake, complianceStatus,
}) => {
  const isApproved = complianceStatus === 'approved' || complianceStatus === 'payroll_ready';
  const isPending = complianceStatus === 'submitted' || complianceStatus === 'review_pending';

  return (
    <Stack gap="xl">
      {isApproved ? (
        <Alert icon={<IconShieldCheck size={24} />} color="green" variant="light" title="Payroll Activation Complete">
          <Text size="sm">
            Your compliance records have been reviewed and approved. You are now marked as payroll ready.
            {intake?.reviewed_at && ` Approved on ${new Date(intake.reviewed_at).toLocaleDateString()}.`}
          </Text>
        </Alert>
      ) : (
        <Alert icon={<IconHourglass size={24} />} color="orange" variant="light" title="Pending Administrative Review">
          <Text size="sm">
            Your compliance records have been signed and submitted. An administrator will review your information
            before activating payroll. You will be notified once the review is complete.
          </Text>
        </Alert>
      )}

      <Card padding="lg" radius="md" withBorder>
        <Title order={4} mb="lg">Final Activation Timeline</Title>
        <Timeline active={isApproved ? 4 : 3} bulletSize={28} lineWidth={2}>
          <Timeline.Item
            bullet={<IconReceipt size={14} />}
            title="Tax Information"
          >
            <Text size="sm" c="dimmed">Filed: {intake?.tax_filing_status || '—'} | State: {intake?.tax_state || '—'}</Text>
            <Badge color="green" size="sm" mt={4}>Complete</Badge>
          </Timeline.Item>

          <Timeline.Item
            bullet={<IconId size={14} />}
            title="Work Eligibility"
          >
            <Text size="sm" c="dimmed">Status: {intake?.citizenship_status?.replace(/_/g, ' ') || '—'}</Text>
            <Badge color="green" size="sm" mt={4}>Complete</Badge>
          </Timeline.Item>

          <Timeline.Item
            bullet={<IconBuildingBank size={14} />}
            title="Direct Deposit"
          >
            <Text size="sm" c="dimmed">Bank: {intake?.bank_name || '—'} | Account: ••••{intake?.account_number_last4 || '—'}</Text>
            <Badge color="green" size="sm" mt={4}>Complete</Badge>
          </Timeline.Item>

          <Timeline.Item
            bullet={<IconSignature size={14} />}
            title="Compliance Records Signed"
          >
            <Text size="sm" c="dimmed">
              Signed on {intake?.submitted_at ? new Date(intake.submitted_at).toLocaleDateString() : '—'}
            </Text>
            <Badge color="green" size="sm" mt={4}>Signed</Badge>
          </Timeline.Item>

          <Timeline.Item
            bullet={isApproved ? <IconCheck size={14} /> : <IconHourglass size={14} />}
            title="Administrative Review"
          >
            <Text size="sm" c="dimmed">
              {isApproved
                ? `Approved on ${intake?.reviewed_at ? new Date(intake.reviewed_at).toLocaleDateString() : '—'}`
                : 'Pending review by corporate administration'}
            </Text>
            <Badge color={isApproved ? 'green' : 'orange'} size="sm" mt={4}>
              {isApproved ? 'Approved' : 'Pending'}
            </Badge>
          </Timeline.Item>
        </Timeline>
      </Card>

      {intake?.admin_notes && (
        <Card padding="lg" radius="md" withBorder>
          <Text fw={600} mb="sm">Admin Notes</Text>
          <Text size="sm">{intake.admin_notes}</Text>
        </Card>
      )}
    </Stack>
  );
};

export default CompliancePendingReview;