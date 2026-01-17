import React from "react";
import { TextInput, Button, Select, Stack, Grid, Text, Group } from "@mantine/core";
import { ApplicationStepProps, US_STATES } from "@/types/application";
import { AddressAutocomplete } from "@/components/common/AddressAutocomplete";
import { MapPin } from "lucide-react";

export const AddressStep = ({ data, onUpdate, onNext, onBack, isValid }: ApplicationStepProps) => {
  const [addressSearch, setAddressSearch] = React.useState('');

  const handleAddressParsed = (parsed: { street: string; city: string; state: string; zipCode: string }) => {
    onUpdate('streetAddress', parsed.street);
    onUpdate('city', parsed.city);
    if (parsed.state) {
      onUpdate('state', parsed.state.toUpperCase());
    }
    onUpdate('zipCode', parsed.zipCode);
  };

  return (
    <Stack gap="lg">
      <div>
        <Text fw={700} size="xl" mb="xs">Your Address</Text>
        <Text c="dimmed">Where should we send your delivery earnings?</Text>
      </div>

      <div>
        <Group gap="xs" mb="xs">
          <MapPin size={16} />
          <Text size="sm" fw={500}>Search Address</Text>
        </Group>
        <AddressAutocomplete 
          value={addressSearch}
          onChange={(value) => setAddressSearch(value)}
          onAddressParsed={handleAddressParsed} 
        />
        <Text size="xs" c="dimmed" mt="xs">Or enter your address manually below</Text>
      </div>

      <TextInput
        label="Street Address"
        placeholder="123 Main St, Apt 4B"
        value={data.streetAddress}
        onChange={(e) => onUpdate('streetAddress', e.target.value)}
        required
        withAsterisk
      />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="City"
            placeholder="Los Angeles"
            value={data.city}
            onChange={(e) => onUpdate('city', e.target.value)}
            required
            withAsterisk
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="State"
            placeholder="Select state"
            value={data.state}
            onChange={(value) => onUpdate('state', value || '')}
            data={US_STATES}
            required
            withAsterisk
            searchable
          />
        </Grid.Col>
      </Grid>

      <TextInput
        label="ZIP Code"
        placeholder="90210"
        value={data.zipCode}
        onChange={(e) => onUpdate('zipCode', e.target.value)}
        maxLength={10}
        required
        withAsterisk
      />

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
