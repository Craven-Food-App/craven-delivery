// @ts-nocheck
import React, { useState } from 'react';
import {
  Stack, Title, Text, Card, Group, Badge, Button, Alert,
  Table, Divider,
} from '@mantine/core';
import { IconFileCheck, IconSignature, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface ComplianceReviewScreenProps {
  intake: any;
  onSign: () => void;
  onBack: () => void;
}

const FILING_LABELS: Record<string, string> = {
  single: 'Single',
  married_jointly: 'Married Filing Jointly',
  married_separately: 'Married Filing Separately',
  head_of_household: 'Head of Household',
};

const CITIZENSHIP_LABELS: Record<string, string> = {
  us_citizen: 'U.S. Citizen',
  permanent_resident: 'Lawful Permanent Resident',
  work_visa: 'Work Visa Holder',
  other: 'Other Work Authorization',
};

const ComplianceReviewScreen: React.FC<ComplianceReviewScreenProps> = ({
  intake, onSign, onBack,
}) => {
  if (!intake) return null;

  const sections = [
    {
      title: 'Tax Information (W-4 Equivalent)',
      complete: intake.tax_complete,
      rows: [
        ['Filing Status', FILING_LABELS[intake.tax_filing_status] || intake.tax_filing_status || '—'],
        ['State', intake.tax_state || '—'],
        ['Federal Allowances', String(intake.federal_allowances ?? 0)],
        ['State Allowances', String(intake.state_allowances ?? 0)],
        ['Additional Withholding', intake.additional_withholding ? `$${intake.additional_withholding}` : '$0.00'],
        ['SSN', intake.ssn_last4 ? `•••-••-${intake.ssn_last4}` : '—'],
      ],
    },
    {
      title: 'Work Eligibility (I-9 Equivalent)',
      complete: intake.eligibility_complete,
      rows: [
        ['Citizenship Status', CITIZENSHIP_LABELS[intake.citizenship_status] || intake.citizenship_status || '—'],
        ['Document Type', (intake.eligibility_document_type || '—').replace(/_/g, ' ')],
        ['Work Auth Expiry', intake.work_authorization_expiry || 'N/A'],
      ],
    },
    {
      title: 'Direct Deposit',
      complete: intake.direct_deposit_complete,
      rows: [
        ['Bank Name', intake.bank_name || '—'],
        ['Account Type', intake.account_type ? intake.account_type.charAt(0).toUpperCase() + intake.account_type.slice(1) : '—'],
        ['Routing Number', intake.routing_number_last4 ? `•••••${intake.routing_number_last4}` : '—'],
        ['Account Number', intake.account_number_last4 ? `••••••${intake.account_number_last4}` : '—'],
      ],
    },
  ];

  const allComplete = intake.tax_complete && intake.eligibility_complete && intake.direct_deposit_complete;

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>Back</Button>
      </Group>
      <Title order={3}><IconFileCheck size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Compliance Review</Title>
      <Text c="dimmed">Review your submitted information before signing. Once signed, compliance records will be locked.</Text>

      {sections.map((section) => (
        <Card key={section.title} padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600}>{section.title}</Text>
            <Badge color={section.complete ? 'green' : 'red'}>{section.complete ? 'Complete' : 'Incomplete'}</Badge>
          </Group>
          <Table>
            <Table.Tbody>
              {section.rows.map(([label, value]) => (
                <Table.Tr key={label}>
                  <Table.Td fw={500} w="40%">{label}</Table.Td>
                  <Table.Td>{value}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ))}

      {!allComplete && (
        <Alert color="red" variant="light">
          <Text size="sm">All sections must be complete before you can sign. Please go back and complete the missing sections.</Text>
        </Alert>
      )}

      {allComplete && (
        <Card padding="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-green-4)' }}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              By signing below, you certify that the information provided is true, complete, and accurate to the best of your knowledge.
              You understand that providing false information may result in termination and legal action.
            </Text>
            <Group justify="flex-end">
              <Button
                size="lg"
                color="green"
                leftSection={<IconSignature size={20} />}
                onClick={onSign}
              >
                Sign Compliance Records
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
};

export default ComplianceReviewScreen;