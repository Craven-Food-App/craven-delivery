import React, { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Alert,
  Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconFileText, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const ResolutionBuilder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    meeting_date: null as Date | null,
    effective_date: null as Date | null,
    appointment_id: '',
    equity_grant_details: null as any,
  });

  const resolutionTypes = [
    { value: 'EXECUTIVE_APPOINTMENT', label: 'Executive Appointment' },
    { value: 'EQUITY_GRANT', label: 'Equity Grant' },
    { value: 'POLICY', label: 'Policy Change' },
    { value: 'REMOVAL', label: 'Officer Removal' },
    { value: 'OTHER', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('governance-create-resolution', {
        body: {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          meeting_date: formData.meeting_date?.toISOString().split('T')[0] || null,
          effective_date: formData.effective_date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          appointment_id: formData.appointment_id || null,
          equity_grant_details: formData.equity_grant_details,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Resolution created successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: '',
        meeting_date: null,
        effective_date: null,
        appointment_id: '',
        equity_grant_details: null,
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create resolution',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconFileText size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Create Board Resolution
          </Title>
          <Text c="dimmed">
            Create a new board resolution for executive appointments, equity grants, or policy changes.
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <Select
                label="Resolution Type"
                placeholder="Select resolution type"
                data={resolutionTypes}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value || '' })}
                required
              />

              <TextInput
                label="Resolution Title"
                placeholder="e.g., Appointment of John Doe as Chief Technology Officer"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <Textarea
                label="Description"
                placeholder="Detailed description of the resolution..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                minRows={4}
              />

              <Group grow>
                <DateInput
                  label="Meeting Date"
                  placeholder="Select meeting date"
                  value={formData.meeting_date}
                  onChange={(value) => setFormData({ ...formData, meeting_date: value as any })}
                />

                <DateInput
                  label="Effective Date"
                  placeholder="Select effective date"
                  value={formData.effective_date}
                  onChange={(value) => setFormData({ ...formData, effective_date: value as any })}
                />
              </Group>

              {formData.type === 'EXECUTIVE_APPOINTMENT' && (
                <TextInput
                  label="Appointment ID (Optional)"
                  placeholder="Link to existing appointment"
                  value={formData.appointment_id}
                  onChange={(e) => setFormData({ ...formData, appointment_id: e.target.value })}
                />
              )}

              {formData.type === 'EQUITY_GRANT' && (
                <Alert icon={<IconAlertCircle size={16} />} title="Equity Grant Details" color="blue">
                  Equity grant details will be specified when the resolution is executed.
                </Alert>
              )}

              <Group justify="flex-end" mt="md">
                <Button
                  type="submit"
                  leftSection={<IconCheck size={16} />}
                  loading={loading}
                  disabled={!formData.title || !formData.type}
                >
                  Create Resolution
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  );
};

export default ResolutionBuilder;

