import { TextInput, Button, Alert, Stack, Grid, Text } from "@mantine/core";
import { AlertCircle } from "lucide-react";
import { ApplicationStepProps } from "@/types/application";

export const AccountSetupStep = ({ data, onUpdate, onNext, isValid }: ApplicationStepProps) => {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const minDate = new Date('1900-01-01');

  return (
    <Stack gap="lg">
      <div>
        <Text fw={700} size="xl" mb="xs">Let's Get Started</Text>
        <Text c="dimmed">Tell us about yourself</Text>
      </div>

      <Alert icon={<AlertCircle size={16} />} color="blue">
        {data.email ? "If you already have an account, you'll be asked to sign in during submission." : "We'll create your account when you submit the application."}
      </Alert>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="First Name"
            placeholder="John"
            value={data.firstName}
            onChange={(e) => onUpdate('firstName', e.target.value)}
            required
            withAsterisk
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Last Name"
            placeholder="Doe"
            value={data.lastName}
            onChange={(e) => onUpdate('lastName', e.target.value)}
            required
            withAsterisk
          />
        </Grid.Col>
      </Grid>

      <TextInput
        label="Email Address"
        type="email"
        placeholder="john.doe@example.com"
        value={data.email}
        onChange={(e) => onUpdate('email', e.target.value)}
        required
        withAsterisk
      />

      <TextInput
        label="Phone Number"
        type="tel"
        placeholder="(555) 123-4567"
        value={data.phone}
        onChange={(e) => onUpdate('phone', e.target.value)}
        required
        withAsterisk
      />

      <TextInput
        label="Date of Birth"
        type="date"
        value={data.dateOfBirth || ''}
        onChange={(e) => onUpdate('dateOfBirth', e.target.value)}
        max={maxDate.toISOString().split('T')[0]}
        min={minDate.toISOString().split('T')[0]}
        required
        withAsterisk
        description="You must be at least 18 years old"
      />

      <Button onClick={onNext} disabled={!isValid} fullWidth size="lg" color="#ff7a00">
        Continue
      </Button>
    </Stack>
  );
};
