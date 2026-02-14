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
import { IconFileText, IconDownload } from '@tabler/icons-react';
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
  appointed_by?: string;
}

interface Appointment {
  id: string;
  proposed_officer_name: string;
  proposed_title: string;
  proposed_officer_email: string;
  effective_date: string;
  status: string;
}

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('MyAppointment: No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('MyAppointment: Fetching appointment for user email:', user.email);

      // First, try exact email match in corporate_officers table
      let { data: corporateOfficer, error: corporateError } = await supabase
        .from('corporate_officers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      console.log('MyAppointment: Exact email match result:', corporateOfficer ? 'Found' : 'Not found', corporateError);

      // If not found, try case-insensitive match
      if (!corporateOfficer && user.email) {
        const { data: corporateOfficerCaseInsensitive, error: errorCaseInsensitive } = await supabase
          .from('corporate_officers')
          .select('*')
          .ilike('email', user.email)
          .maybeSingle();
        
        if (corporateOfficerCaseInsensitive) {
          corporateOfficer = corporateOfficerCaseInsensitive;
          corporateError = errorCaseInsensitive;
          console.log('MyAppointment: Case-insensitive match found:', corporateOfficer);
        }
      }

      if (corporateOfficer) {
        console.log('MyAppointment: Setting officer from corporate_officers:', corporateOfficer);
        setOfficer(corporateOfficer);
        setLoading(false);
        return;
      }

      // If not found in corporate_officers, check executive_appointments
      console.log('MyAppointment: Checking executive_appointments for email:', user.email);
      let { data: appointment, error: appointmentError } = await supabase
        .from('executive_appointments')
        .select('id, proposed_officer_name, proposed_title, proposed_officer_email, effective_date, status')
        .eq('proposed_officer_email', user.email)
        .in('status', ['APPROVED', 'SENT_TO_BOARD', 'ACTIVE'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Try case-insensitive match if exact match failed
      if (!appointment && user.email) {
        const { data: appointmentCaseInsensitive, error: errorCaseInsensitive } = await supabase
          .from('executive_appointments')
          .select('id, proposed_officer_name, proposed_title, proposed_officer_email, effective_date, status')
          .ilike('proposed_officer_email', user.email)
          .in('status', ['APPROVED', 'SENT_TO_BOARD', 'ACTIVE'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (appointmentCaseInsensitive) {
          appointment = appointmentCaseInsensitive;
          appointmentError = errorCaseInsensitive;
          console.log('MyAppointment: Case-insensitive appointment match found:', appointment);
        }
      }

      if (appointment && !appointmentError) {
        // Store appointment ID for timeline
        setAppointmentId(appointment.id);
        
        // Convert appointment to officer format
        const appointmentOfficer: CorporateOfficer = {
          id: appointment.id,
          full_name: appointment.proposed_officer_name || user.email?.split('@')[0] || 'Unknown',
          email: appointment.proposed_officer_email || user.email || undefined,
          title: appointment.proposed_title || 'Officer',
          effective_date: appointment.effective_date || new Date().toISOString(),
          status: appointment.status === 'APPROVED' || appointment.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
        };
        console.log('MyAppointment: Setting officer from executive_appointments:', appointmentOfficer);
        setOfficer(appointmentOfficer);
        setLoading(false);
        return;
      }
      
      // If we have a corporate officer, try to find the appointment_id from officer_ledger
      if (corporateOfficer) {
        const { data: ledgerEntry } = await supabase
          .from('officer_ledger')
          .select('appointment_id')
          .eq('name', corporateOfficer.full_name)
          .eq('title', corporateOfficer.title)
          .maybeSingle();
        
        if (ledgerEntry?.appointment_id) {
          setAppointmentId(ledgerEntry.appointment_id);
        }
      }

      // If neither found, set to null
      console.log('MyAppointment: No appointment found. User email:', user.email);
      console.log('MyAppointment: Corporate officer error:', corporateError);
      console.log('MyAppointment: Appointment error:', appointmentError);
      
      // Debug: Let's also check what emails exist in corporate_officers
      const { data: allOfficers } = await supabase
        .from('corporate_officers')
        .select('email, full_name')
        .limit(10);
      console.log('MyAppointment: Available emails in corporate_officers:', allOfficers);
      
      if (corporateError && corporateError.code !== '42P01') {
        console.error('Error fetching corporate officer:', corporateError);
      }
      if (appointmentError) {
        console.error('Error fetching appointment:', appointmentError);
      }
      setOfficer(null);
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load appointment',
        color: 'red',
      });
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

      {/* Activation Timeline */}
      {appointmentId && (
        <ActivationTimeline appointmentId={appointmentId} />
      )}
    </Stack>
  );
};

export default MyAppointment;
