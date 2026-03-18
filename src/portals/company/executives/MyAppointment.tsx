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

interface CorporateOfficer {
  id: string;
  full_name: string;
  email?: string;
  title: string;
  effective_date: string;
  term_end?: string;
  status: string;
  certificate_url?: string;
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

const MyAppointment: React.FC = () => {
  const [officer, setOfficer] = useState<CorporateOfficer | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
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
        return;
      }

      const { data: execUser } = await supabase
        .from('exec_users')
        .select('id, title, role, metadata')
        .eq('user_id', user.id)
        .maybeSingle();

      let appointmentQuery = supabase
        .from('executive_appointments')
        .select(
          'id, position, proposed_title, proposed_officer_name, proposed_officer_email, effective_date, status, certificate_url'
        )
        .order('created_at', { ascending: false })
        .limit(1);

      if (execUser?.id) {
        appointmentQuery = appointmentQuery.eq('executive_id', execUser.id);
      } else if (user.email) {
        appointmentQuery = appointmentQuery.ilike('proposed_officer_email', user.email);
      }

      const { data: appointment } = await appointmentQuery.maybeSingle<Appointment>();

      const { data: corporateOfficer } = execUser?.id
        ? await supabase
            .from('corporate_officers')
            .select('id, position, status, term_start, term_end, appointed_date')
            .eq('executive_id', execUser.id)
            .order('appointed_date', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null as any };

      if (!appointment && !corporateOfficer) {
        setOfficer(null);
        return;
      }

      if (appointment?.id) {
        setAppointmentId(appointment.id);
      }

      const metadata = execUser?.metadata || {};
      const fullName =
        appointment?.proposed_officer_name ||
        metadata?.proposed_officer_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Unknown';

      const email = appointment?.proposed_officer_email || metadata?.proposed_officer_email || user.email || undefined;
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
        new Date().toISOString();

      const status = normalizeDisplayStatus(corporateOfficer?.status || appointment?.status);

      setOfficer({
        id: corporateOfficer?.id || appointment?.id || user.id,
        full_name: fullName,
        email,
        title,
        effective_date: effectiveDate,
        term_end: corporateOfficer?.term_end || undefined,
        status,
        certificate_url: appointment?.certificate_url,
      });
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
