import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconCar, IconUpload, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  ActionIcon,
  TextInput,
  Select,
  Badge,
  Loader,
  ThemeIcon,
  Paper,
  Grid,
} from '@mantine/core';

interface VehicleManagementSectionProps {
  onBack: () => void;
}

export const VehicleManagementSection: React.FC<VehicleManagementSectionProps> = ({ onBack }) => {
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicle_type: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: ''
  });
  const [documents, setDocuments] = useState({
    drivers_license: false,
    vehicle_registration: false,
    insurance: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVehicleInfo();
  }, []);

  const fetchVehicleInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select(`
          vehicle_type,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_color,
          license_plate,
          drivers_license_front,
          drivers_license_back,
          vehicle_registration,
          insurance_document
        `)
        .eq('user_id', user.id)
        .single();

      if (application) {
        setVehicleInfo({
          vehicle_type: application.vehicle_type || '',
          vehicle_make: application.vehicle_make || '',
          vehicle_model: application.vehicle_model || '',
          vehicle_year: application.vehicle_year?.toString() || '',
          vehicle_color: application.vehicle_color || '',
          license_plate: application.license_plate || ''
        });

        setDocuments({
          drivers_license: !!(application.drivers_license_front && application.drivers_license_back),
          vehicle_registration: !!application.vehicle_registration,
          insurance: !!application.insurance_document
        });
      }
    } catch (error) {
      console.error('Error fetching vehicle info:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('craver_applications')
        .update({
          vehicle_make: vehicleInfo.vehicle_make,
          vehicle_model: vehicleInfo.vehicle_model,
          vehicle_year: parseInt(vehicleInfo.vehicle_year),
          vehicle_color: vehicleInfo.vehicle_color,
          license_plate: vehicleInfo.license_plate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      notifications.show({
        title: "Vehicle updated",
        message: "Your vehicle information has been saved.",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error updating vehicle",
        message: "Please try again later.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch(type) {
      case 'car': return '🚗';
      case 'bike': return '🚲';
      case 'scooter': return '🛴';
      case 'motorcycle': return '🏍️';
      case 'walking': return '🚶';
      default: return '🚗';
    }
  };

  const getDocumentStatus = (isUploaded: boolean) => {
    return isUploaded ? (
      <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
        Uploaded
      </Badge>
    ) : (
      <Badge color="orange" variant="light" leftSection={<IconAlertCircle size={12} />}>
        Required
      </Badge>
    );
  };

  return (
    <Box h="100vh" bg="gray.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-gray-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Group px="md" py="md" gap="md" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Vehicle Management</Title>
        </Group>
      </Paper>

      <Stack gap="xl" p="md">
        {/* Current Vehicle */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="xs">
              <Text size="2xl">{getVehicleIcon(vehicleInfo.vehicle_type)}</Text>
              <Title order={4} fw={600}>Vehicle Information</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Select
                label="Vehicle Type"
                value={vehicleInfo.vehicle_type}
                onChange={(value) => setVehicleInfo({ ...vehicleInfo, vehicle_type: value || '' })}
                disabled
                data={[
                  { value: 'car', label: 'Car' },
                  { value: 'bike', label: 'Bicycle' },
                  { value: 'scooter', label: 'Scooter' },
                  { value: 'motorcycle', label: 'Motorcycle' },
                  { value: 'walking', label: 'Walking' },
                ]}
                styles={{
                  input: {
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  },
                }}
              />
              <Text size="xs" c="dimmed">
                Contact support to change vehicle type
              </Text>

              {vehicleInfo.vehicle_type !== 'walking' && (
                <>
                  <Grid gutter="md">
                    <Grid.Col span={6}>
                      <TextInput
                        label="Make"
                        value={vehicleInfo.vehicle_make}
                        onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicle_make: e.target.value })}
                        placeholder="Toyota"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Model"
                        value={vehicleInfo.vehicle_model}
                        onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicle_model: e.target.value })}
                        placeholder="Camry"
                      />
                    </Grid.Col>
                  </Grid>

                  <Grid gutter="md">
                    <Grid.Col span={6}>
                      <TextInput
                        label="Year"
                        type="number"
                        value={vehicleInfo.vehicle_year}
                        onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicle_year: e.target.value })}
                        placeholder="2020"
                        min="1990"
                        max="2025"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Color"
                        value={vehicleInfo.vehicle_color}
                        onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicle_color: e.target.value })}
                        placeholder="Silver"
                      />
                    </Grid.Col>
                  </Grid>

                  <TextInput
                    label="License Plate"
                    value={vehicleInfo.license_plate}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, license_plate: e.target.value.toUpperCase() })}
                    placeholder="ABC123"
                  />
                </>
              )}

              <Button 
                onClick={handleSave} 
                loading={loading}
                color="orange"
                fullWidth
                mt="md"
              >
                Save Changes
              </Button>
            </Stack>
          </Card.Section>
        </Card>

        {/* Required Documents */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Title order={4} fw={600}>Required Documents</Title>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Paper p="md" style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '8px' }}>
                <Group justify="space-between">
                  <Box>
                    <Text fw={500}>Driver's License</Text>
                    <Text size="sm" c="dimmed">Front and back photos</Text>
                  </Box>
                  <Group gap="xs">
                    {getDocumentStatus(documents.drivers_license)}
                    <Button variant="light" size="xs" leftSection={<IconUpload size={16} />}>
                      Upload
                    </Button>
                  </Group>
                </Group>
              </Paper>

              {vehicleInfo.vehicle_type !== 'walking' && vehicleInfo.vehicle_type !== 'bike' && (
                <>
                  <Paper p="md" style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '8px' }}>
                    <Group justify="space-between">
                      <Box>
                        <Text fw={500}>Vehicle Registration</Text>
                        <Text size="sm" c="dimmed">Current registration document</Text>
                      </Box>
                      <Group gap="xs">
                        {getDocumentStatus(documents.vehicle_registration)}
                        <Button variant="light" size="xs" leftSection={<IconUpload size={16} />}>
                          Upload
                        </Button>
                      </Group>
                    </Group>
                  </Paper>

                  <Paper p="md" style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '8px' }}>
                    <Group justify="space-between">
                      <Box>
                        <Text fw={500}>Insurance</Text>
                        <Text size="sm" c="dimmed">Valid insurance policy</Text>
                      </Box>
                      <Group gap="xs">
                        {getDocumentStatus(documents.insurance)}
                        <Button variant="light" size="xs" leftSection={<IconUpload size={16} />}>
                          Upload
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                </>
              )}

              <Paper p="md" bg="blue.0" radius="md">
                <Text size="xs" c="dimmed">
                  <Text component="span" fw={600}>Note:</Text> All documents must be current and clearly readable. 
                  Document updates may require approval before you can continue driving.
                </Text>
              </Paper>
            </Stack>
          </Card.Section>
        </Card>
      </Stack>
    </Box>
  );
};
