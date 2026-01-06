import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconCar, IconFileText, IconUpload, IconCheck, IconX } from '@tabler/icons-react';
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
  Loader,
  ThemeIcon,
  Paper,
  Grid,
} from '@mantine/core';

type VehicleDocumentsPageProps = {
  onBack: () => void;
};

const VehicleDocumentsPage: React.FC<VehicleDocumentsPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [documents, setDocuments] = useState<any>({});

  useEffect(() => {
    fetchVehicleData();
  }, []);

  const fetchVehicleData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Driver table structure needs update - using placeholder data
      const driverData: any = null;

      if (driverData) {
        setVehicleData(driverData);
        setDocuments({
          registration: null,
          insurance: null,
          inspection: null,
          license: null,
        });
      }
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean | null | undefined) => {
    if (status === true) {
      return <IconCheck size={20} color="var(--mantine-color-green-6)" />;
    }
    return <IconX size={20} color="var(--mantine-color-gray-4)" />;
  };

  if (loading) {
    return (
      <Box h="100vh" w="100%" bg="gray.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" bg="gray.0" style={{ overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ 
          zIndex: 10, 
          borderBottom: '1px solid var(--mantine-color-gray-2)', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)'
        }}
      >
        <Group px="xl" py="md" justify="space-between" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Vehicle & Documents</Title>
          <Box w={24} />
        </Group>
      </Paper>

      <Stack gap="md" p="xl">
        {/* Vehicle Information */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="green" variant="light">
                <IconCar size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Vehicle Information</Title>
                <Text size="sm" c="dimmed">Your registered vehicle details</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Grid gutter="md">
                <Grid.Col span={6}>
                  <Text size="sm" fw={600} c="dimmed" mb="xs">Make</Text>
                  <Paper p="md" bg="gray.0" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                    <Text c="dark">{vehicleData?.vehicle_make || 'Not set'}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" fw={600} c="dimmed" mb="xs">Model</Text>
                  <Paper p="md" bg="gray.0" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                    <Text c="dark">{vehicleData?.vehicle_model || 'Not set'}</Text>
                  </Paper>
                </Grid.Col>
              </Grid>

              <Grid gutter="md">
                <Grid.Col span={6}>
                  <Text size="sm" fw={600} c="dimmed" mb="xs">Year</Text>
                  <Paper p="md" bg="gray.0" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                    <Text c="dark">{vehicleData?.vehicle_year || 'Not set'}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" fw={600} c="dimmed" mb="xs">Color</Text>
                  <Paper p="md" bg="gray.0" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                    <Text c="dark">{vehicleData?.vehicle_color || 'Not set'}</Text>
                  </Paper>
                </Grid.Col>
              </Grid>

              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">License Plate</Text>
                <Paper p="md" bg="gray.0" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                  <Text c="dark">{vehicleData?.license_plate || 'Not set'}</Text>
                </Paper>
              </Box>

              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">Vehicle Type</Text>
                <Paper p="md" bg="gray.0" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                  <Text c="dark" tt="capitalize">{vehicleData?.vehicle_type || 'Not set'}</Text>
                </Paper>
              </Box>
            </Stack>
          </Card.Section>
        </Card>

        {/* Documents Status */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="blue" variant="light">
                <IconFileText size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Document Status</Title>
                <Text size="sm" c="dimmed">Required documents and verification</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Paper p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                <Group justify="space-between">
                  <Group gap="md">
                    <IconFileText size={20} color="var(--mantine-color-gray-6)" />
                    <Box>
                      <Text fw={700} c="dark">Vehicle Registration</Text>
                      <Text size="sm" c="dimmed">Registration document</Text>
                    </Box>
                  </Group>
                  {getStatusIcon(documents.registration)}
                </Group>
              </Paper>

              <Paper p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                <Group justify="space-between">
                  <Group gap="md">
                    <IconFileText size={20} color="var(--mantine-color-gray-6)" />
                    <Box>
                      <Text fw={700} c="dark">Insurance</Text>
                      <Text size="sm" c="dimmed">
                        {documents.insurance ? `${documents.insurance.provider} - ${documents.insurance.policy}` : 'Not uploaded'}
                      </Text>
                    </Box>
                  </Group>
                  {getStatusIcon(documents.insurance)}
                </Group>
              </Paper>

              <Paper p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                <Group justify="space-between">
                  <Group gap="md">
                    <IconFileText size={20} color="var(--mantine-color-gray-6)" />
                    <Box>
                      <Text fw={700} c="dark">Vehicle Inspection</Text>
                      <Text size="sm" c="dimmed">Inspection certificate</Text>
                    </Box>
                  </Group>
                  {getStatusIcon(documents.inspection)}
                </Group>
              </Paper>

              <Paper p="md" style={{ border: '2px solid var(--mantine-color-gray-2)', borderRadius: '12px' }}>
                <Group justify="space-between">
                  <Group gap="md">
                    <IconFileText size={20} color="var(--mantine-color-gray-6)" />
                    <Box>
                      <Text fw={700} c="dark">Driver's License</Text>
                      <Text size="sm" c="dimmed">License number on file</Text>
                    </Box>
                  </Group>
                  {getStatusIcon(documents.license)}
                </Group>
              </Paper>
            </Stack>

            <Button
              fullWidth
              mt="md"
              color="orange"
              leftSection={<IconUpload size={20} />}
              style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-red-6))' }}
            >
              Upload Documents
            </Button>
          </Card.Section>
        </Card>
      </Stack>

      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </Box>
  );
};

export default VehicleDocumentsPage;
