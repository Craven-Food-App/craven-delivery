import React, { useState, useEffect } from 'react';
import { Modal, Stepper, Button, Stack, Select, TextInput, Textarea, Group } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentWizardProps {
  opened: boolean;
  onClose: () => void;
}

const AppointmentWizard: React.FC<AppointmentWizardProps> = ({ opened, onClose }) => {
  const [active, setActive] = useState(0);
  const [executiveId, setExecutiveId] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [executives, setExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      loadExecutives();
    } else {
      // Reset form when closed
      setActive(0);
      setExecutiveId('');
      setPosition('');
      setAppointmentType('');
      setEffectiveDate(null);
      setNotes('');
    }
  }, [opened]);

  const loadExecutives = async () => {
    try {
      const { data, error } = await supabase
        .from('exec_users')
        .select('id, name, title')
        .order('name');

      if (error) throw error;
      setExecutives(data || []);
    } catch (err) {
      console.error('Error loading executives:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const appointmentData = {
        executive_id: executiveId,
        position: position,
        appointment_type: appointmentType,
        appointment_date: new Date().toISOString(),
        effective_date: effectiveDate?.toISOString(),
        appointed_by: user?.email || '',
        status: 'pending',
        notes: notes || null,
      };

      const { error } = await supabase
        .from('executive_appointments')
        .insert(appointmentData);

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01') {
          alert('Database table not found. Please run the migration to create executive_appointments table.');
        } else {
          throw error;
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (active) {
      case 0:
        return !!executiveId;
      case 1:
        return !!position && !!appointmentType;
      case 2:
        return !!effectiveDate;
      default:
        return false;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Executive Appointment"
      size="lg"
      closeOnClickOutside={false}
    >
      <Stepper active={active} onStepClick={setActive} breakpoint="sm">
        <Stepper.Step label="Executive" description="Select executive">
          <Stack gap="md" mt="xl">
            <Select
              label="Executive"
              placeholder="Select executive"
              data={executives.map(e => ({
                value: e.id,
                label: `${e.name} - ${e.title || 'Executive'}`
              }))}
              value={executiveId}
              onChange={(v) => setExecutiveId(v || '')}
              required
              searchable
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Position" description="Select position">
          <Stack gap="md" mt="xl">
            <Select
              label="Position"
              placeholder="Select position"
              data={[
                'Chief Executive Officer',
                'Chief Financial Officer',
                'Chief Technology Officer',
                'Chief Operating Officer',
                'President',
                'Secretary',
                'Treasurer',
                'Vice President',
                'Assistant Secretary',
              ]}
              value={position}
              onChange={(v) => setPosition(v || '')}
              required
              searchable
            />
            <Select
              label="Appointment Type"
              placeholder="Select type"
              data={[
                { value: 'initial', label: 'Initial Appointment' },
                { value: 'reappointment', label: 'Reappointment' },
                { value: 'promotion', label: 'Promotion' },
                { value: 'lateral', label: 'Lateral Move' },
              ]}
              value={appointmentType}
              onChange={(v) => setAppointmentType(v || '')}
              required
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Details" description="Set dates and notes">
          <Stack gap="md" mt="xl">
            <DateInput
              label="Effective Date"
              value={effectiveDate}
              onChange={setEffectiveDate}
              required
              placeholder="Select effective date"
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes about this appointment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack gap="md" mt="xl">
            <Text>Review appointment details and submit.</Text>
            <Group>
              <Button onClick={handleSubmit} loading={loading}>
                Create Appointment
              </Button>
              <Button variant="subtle" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Stepper.Completed>
      </Stepper>

      <Group justify="flex-end" mt="xl">
        {active > 0 && (
          <Button variant="default" onClick={() => setActive(active - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {active < 3 && (
          <Button onClick={() => setActive(active + 1)} disabled={!canProceed() || loading}>
            Next
          </Button>
        )}
      </Group>
    </Modal>
  );
};

export default AppointmentWizard;

