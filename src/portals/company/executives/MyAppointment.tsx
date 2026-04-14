// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Text,
  Paper,
  Badge,
  Loader,
  Center,
  Button,
  Card,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import dayjs from 'dayjs';
import ActivationTimeline from './ActivationTimeline';
import { uuidLastFour } from '@/utils/executiveUuidDisplay';

interface CorporateOfficer {
  id: string;
  full_name: string;
  email?: string;
  title: string;
  effective_date: string;
  term_end?: string;
  status: string;
  certificate_url?: string;
  /** Extra capacity lines (exec role, board, etc.) when no formal appointment row exists */
  capacityLines?: string[];
  /** Source label for the primary card */
  sourceNote?: string;
}

interface Appointment {
  id: string;
  position?: string;
  proposed_title?: string;
  proposed_officer_name?: string;
  proposed_officer_email?: string;
  effective_date?: string;
  status?: string;
  certificate_url?: string;
}

const normalizeDisplayStatus = (status?: string) => {
  const value = (status || '').toLowerCase();
  if (['active', 'approved', 'appointed', 'fully_appointed_active'].includes(value)) return 'ACTIVE';
  if (value.includes('documents_sent') || value.includes('pending_signature')) return 'DOCUMENTS SENT';
  if (value.includes('resign')) return 'RESIGNED';
  if (value.includes('remove') || value.includes('terminate')) return 'REMOVED';
  if (value.includes('expire')) return 'EXPIRED';
  if (value.includes('pending') || value.includes('selected')) return 'PENDING';
  return 'PENDING';
};

const normalizeExecOfficerStatus = (officerStatus?: string | null) => {
  const v = (officerStatus || '').toLowerCase();
  if (v === 'active' || v === 'approved') return 'ACTIVE';
  if (v === 'inactive' || v === 'terminated') return 'REMOVED';
  if (v === 'pending' || v === 'provisional') return 'PENDING';
  return normalizeDisplayStatus(officerStatus || undefined);
};

const MyAppointment: React.FC = () => {
  const [officer, setOfficer] = useState<CorporateOfficer | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  /** exec_users.id — last 4 shown as Executive record ID */
  const [executiveRecordId, setExecutiveRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAppointment();
  }, []);

  const fetchMyAppointment = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOfficer(null);
        setExecutiveRecordId(null);
        return;
      }

      const { data: execUser } = await supabase
        .from('exec_users')
        .select('id, title, role, metadata, officer_status, appointment_date, created_at, department')
        .eq('user_id', user.id)
        .maybeSingle();

      setExecutiveRecordId(execUser?.id ?? null);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      let boardMember: {
        role_title: string;
        status: string;
        appointment_date: string;
      } | null = null;
      const { data: bmByUid } = await supabase
        .from('board_members')
        .select('role_title, status, appointment_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (bmByUid) boardMember = bmByUid;
      else if (user.email) {
        const { data: bmByEmail } = await supabase
          .from('board_members')
          .select('role_title, status, appointment_date')
          .ilike('email', user.email)
          .maybeSingle();
        if (bmByEmail) boardMember = bmByEmail;
      }

      const appointmentSelect =
        'id, position, proposed_title, proposed_officer_name, proposed_officer_email, effective_date, status, certificate_url';

      let appointment: Appointment | null = null;
      if (execUser?.id) {
        const { data: aptByExec } = await supabase
          .from('executive_appointments')
          .select(appointmentSelect)
          .eq('executive_id', execUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<Appointment>();
        appointment = aptByExec ?? null;
      }
      if (!appointment && user.email) {
        const { data: aptByEmail } = await supabase
          .from('executive_appointments')
          .select(appointmentSelect)
          .ilike('proposed_officer_email', user.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<Appointment>();
        appointment = aptByEmail ?? null;
      }

      let corporateOfficer: {
        id: string;
        position: string;
        status: string;
        term_start?: string;
        term_end?: string;
        appointed_date?: string;
      } | null = null;
      if (execUser?.id) {
        const { data: co } = await supabase
          .from('corporate_officers')
          .select('id, position, status, term_start, term_end, appointed_date')
          .eq('executive_id', execUser.id)
          .order('appointed_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        corporateOfficer = co ?? null;
      }

      const metadata = execUser?.metadata || {};

      if (appointment?.id) {
        setAppointmentId(appointment.id);
      } else {
        setAppointmentId(null);
      }

      if (appointment || corporateOfficer) {
        const fullName =
          appointment?.proposed_officer_name ||
          metadata?.proposed_officer_name ||
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Unknown';

        const email =
          appointment?.proposed_officer_email ||
          metadata?.proposed_officer_email ||
          profile?.email ||
          user.email ||
          undefined;
        const title =
          appointment?.proposed_title ||
          appointment?.position ||
          execUser?.title ||
          corporateOfficer?.position ||
          'Officer';

        const effectiveDate =
          appointment?.effective_date ||
          corporateOfficer?.term_start ||
          corporateOfficer?.appointed_date ||
          execUser?.appointment_date ||
          execUser?.created_at ||
          new Date().toISOString();

        const status = normalizeDisplayStatus(corporateOfficer?.status || appointment?.status);

        const capacityLines: string[] = [];
        if (execUser?.role) {
          capacityLines.push(`Executive role: ${execUser.role.toUpperCase()}`);
        }
        if (execUser?.title && execUser.title !== title) {
          capacityLines.push(`Title on file: ${execUser.title}`);
        }
        if (boardMember?.role_title) {
          capacityLines.push(
            `Board: ${boardMember.role_title}${boardMember.status ? ` (${boardMember.status})` : ''}`,
          );
        }

        setOfficer({
          id: corporateOfficer?.id || appointment?.id || user.id,
          full_name: fullName,
          email,
          title,
          effective_date: effectiveDate,
          term_end: corporateOfficer?.term_end || undefined,
          status,
          certificate_url: appointment?.certificate_url,
          capacityLines: capacityLines.length ? capacityLines : undefined,
        });
        return;
      }

      if (execUser) {
        const fullName =
          profile?.full_name ||
          metadata?.proposed_officer_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Unknown';
        const email = profile?.email || user.email || undefined;
        const title = execUser.title || execUser.role || 'Executive';

        const capacityLines: string[] = [];
        if (execUser.role) {
          capacityLines.push(`Executive role: ${execUser.role.toUpperCase()}`);
        }
        if (execUser.department) {
          capacityLines.push(`Department: ${execUser.department}`);
        }
        if (boardMember?.role_title) {
          const bmStatus = boardMember.status?.toLowerCase() === 'active' ? 'Active' : boardMember.status || '';
          capacityLines.push(`Board: ${boardMember.role_title}${bmStatus ? ` (${bmStatus})` : ''}`);
        }

        const effectiveDate =
          execUser.appointment_date || execUser.created_at || new Date().toISOString();
        const status = normalizeExecOfficerStatus(execUser.officer_status);

        setOfficer({
          id: execUser.id,
          full_name: fullName,
          email,
          title,
          effective_date: effectiveDate,
          term_end: undefined,
          status,
          certificate_url: undefined,
          capacityLines: capacityLines.length ? capacityLines : undefined,
          sourceNote:
            'Shown from your active executive profile. A formal governance appointment record will appear here when filed.',
        });
        return;
      }

      if (boardMember) {
        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';
        const status =
          boardMember.status?.toLowerCase() === 'active' ? 'ACTIVE' : normalizeDisplayStatus(boardMember.status);
        setOfficer({
          id: user.id,
          full_name: fullName,
          email: profile?.email || user.email || undefined,
          title: boardMember.role_title || 'Board member',
          effective_date: boardMember.appointment_date || new Date().toISOString(),
          status,
          capacityLines: ['Board appointment (no executive roster row linked to this account)'],
          sourceNote: 'Board role on file. Add an executive profile if you also serve as an officer.',
        });
        return;
      }

      setOfficer(null);
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load appointment',
        color: 'red',
      });
      setOfficer(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'DOCUMENTS SENT':
        return 'blue';
      case 'RESIGNED':
        return 'orange';
      case 'REMOVED':
        return 'red';
      case 'EXPIRED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!officer) {
    return (
      <Paper p="xl" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
        <Center>
          <Stack align="center" gap="md">
            <Text c="dimmed">No appointment found for your account</Text>
            {executiveRecordId && uuidLastFour(executiveRecordId) ? (
              <Text size="xs" c="dimmed" style={{ fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace' }}>
                Executive record ID ·•••{uuidLastFour(executiveRecordId)}
              </Text>
            ) : null}
            <Text size="sm" c="dimmed">
              If you believe this is an error, please contact the Corporate Secretary.
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Card
        padding="lg"
        radius="md"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={600} size="xl" c="dark" mb="xs">
                {officer.full_name}
              </Text>
              <Text size="lg" c="dimmed">
                {officer.title}
              </Text>
              {officer.capacityLines?.length ? (
                <Stack gap={4} mt="xs">
                  {officer.capacityLines.map((line, i) => (
                    <Text key={i} size="sm" c="dimmed">
                      {line}
                    </Text>
                  ))}
                </Stack>
              ) : null}
              {officer.sourceNote ? (
                <Text size="xs" c="dimmed" mt="xs" style={{ maxWidth: 520 }}>
                  {officer.sourceNote}
                </Text>
              ) : null}
              {executiveRecordId && uuidLastFour(executiveRecordId) ? (
                <Text size="xs" c="dimmed" mt={6} style={{ fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace' }}>
                  Executive record ID ·•••{uuidLastFour(executiveRecordId)}
                </Text>
              ) : null}
            </div>
            <Badge color={getStatusColor(officer.status)} size="lg" variant="light">
              {officer.status}
            </Badge>
          </Group>

          <Group>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Effective Date
              </Text>
              <Text fw={500} c="dark">
                {dayjs(officer.effective_date).format('MMMM D, YYYY')}
              </Text>
            </div>
            {officer.term_end && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Term End
                </Text>
                <Text fw={500} c="dark">
                  {dayjs(officer.term_end).format('MMMM D, YYYY')}
                </Text>
              </div>
            )}
          </Group>

          {officer.certificate_url && (
            <Group>
              <Button
                leftSection={<IconDownload size={16} />}
                component="a"
                href={officer.certificate_url}
                target="_blank"
                variant="light"
              >
                Download Certificate
              </Button>
            </Group>
          )}
        </Stack>
      </Card>

      {appointmentId && <ActivationTimeline appointmentId={appointmentId} />}
    </Stack>
  );
};

export default MyAppointment;
