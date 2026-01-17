import { TextInput, Button, Select, Card, Stack, Grid, Text, Group, Box } from "@mantine/core";
import { Car, Bike, Footprints } from "lucide-react";
import { ApplicationStepProps, US_STATES } from "@/types/application";

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car', icon: Car },
  { value: 'bike', label: 'Bike / Scooter', icon: Bike },
  { value: 'walking', label: 'Walking', icon: Footprints },
];

export const VehicleStep = ({ data, onUpdate, onNext, onBack, isValid }: ApplicationStepProps) => {
  const needsVehicleInfo = data.vehicleType && data.vehicleType !== 'walking';
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // License must be valid tomorrow at minimum

  return (
    <Stack gap="lg">
      <div>
        <Text fw={700} size="xl" mb="xs">Vehicle & License</Text>
        <Text c="dimmed">How will you make deliveries?</Text>
      </div>

      <div>
        <Text size="sm" fw={500} mb="xs">Vehicle Type *</Text>
        <Grid gutter="md">
          {VEHICLE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = data.vehicleType === type.value;
            return (
              <Grid.Col key={type.value} span={{ base: 12, md: 4 }}>
                <Card
                  withBorder
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? '#ff7a00' : undefined,
                    backgroundColor: isSelected ? 'rgba(255, 122, 0, 0.05)' : undefined,
                  }}
                  onClick={() => onUpdate('vehicleType', type.value)}
                >
                  <Stack align="center" gap="sm" p="md">
                    <Icon 
                      size={32} 
                      style={{ 
                        color: isSelected ? '#ff7a00' : 'var(--mantine-color-gray-6)' 
                      }} 
                    />
                    <Text fw={500}>{type.label}</Text>
                  </Stack>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </div>

      {needsVehicleInfo && (
        <Box p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Stack gap="md">
            <Text size="sm" fw={500}>Vehicle Information</Text>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Make"
                  placeholder="Toyota"
                  value={data.vehicleMake}
                  onChange={(e) => onUpdate('vehicleMake', e.target.value)}
                  required
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Model"
                  placeholder="Camry"
                  value={data.vehicleModel}
                  onChange={(e) => onUpdate('vehicleModel', e.target.value)}
                  required
                  withAsterisk
                />
              </Grid.Col>
            </Grid>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="Year"
                  placeholder="2020"
                  value={data.vehicleYear}
                  onChange={(e) => onUpdate('vehicleYear', e.target.value)}
                  maxLength={4}
                  required
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="Color"
                  placeholder="Silver"
                  value={data.vehicleColor}
                  onChange={(e) => onUpdate('vehicleColor', e.target.value)}
                  required
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="License Plate"
                  placeholder="ABC123"
                  value={data.licensePlate}
                  onChange={(e) => onUpdate('licensePlate', e.target.value.toUpperCase())}
                  required
                  withAsterisk
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Box>
      )}

      <Box p="md" style={{ borderRadius: '8px', border: '1px solid var(--mantine-color-gray-3)' }}>
        <Stack gap="md">
          <Text size="sm" fw={500}>Driver's License Information</Text>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="License Number"
                placeholder="D1234567"
                value={data.licenseNumber}
                onChange={(e) => onUpdate('licenseNumber', e.target.value)}
                required
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="License State"
                placeholder="Select state"
                value={data.licenseState}
                onChange={(value) => onUpdate('licenseState', value || '')}
                data={US_STATES}
                required
                withAsterisk
                searchable
              />
            </Grid.Col>
          </Grid>
          <TextInput
            label="Expiration Date"
            type="date"
            value={data.licenseExpiry || ''}
            onChange={(e) => onUpdate('licenseExpiry', e.target.value)}
            min={minDate.toISOString().split('T')[0]}
            required
            withAsterisk
          />
        </Stack>
      </Box>

      <Group gap="md" mt="md">
        <Button variant="outline" onClick={onBack} style={{ flex: 1 }} size="lg">
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid} style={{ flex: 1 }} size="lg" color="#ff7a00">
          Continue
        </Button>
      </Group>
    </Stack>
  );
};
