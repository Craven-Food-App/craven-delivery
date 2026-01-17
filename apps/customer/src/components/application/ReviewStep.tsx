import { useState } from "react";
import { Button, TextInput, Card, Stack, Alert, Group, Text, Box, Loader } from "@mantine/core";
import { ApplicationData, ApplicationFiles } from "@/types/application";
import { CheckCircle, Edit, Loader2, AlertCircle } from "lucide-react";
import { validatePassword } from "@/utils/applicationValidation";

interface ReviewStepProps {
  data: ApplicationData;
  files: ApplicationFiles;
  existingUser: any;
  onBack: () => void;
  onEdit: (step: number) => void;
  onSubmit: (password: string) => Promise<void>;
}

export const ReviewStep = ({ data, files, existingUser, onBack, onEdit, onSubmit }: ReviewStepProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const passwordValidation = validatePassword(password, confirmPassword);

  const handleSubmit = async () => {
    if (!existingUser && !passwordValidation.isValid) {
      setError(passwordValidation.errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(password);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const InfoSection = ({ title, step, items }: { title: string; step: number; items: { label: string; value: string }[] }) => (
    <Card>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">{title}</Text>
        <Button variant="subtle" size="sm" onClick={() => onEdit(step)} leftSection={<Edit size={16} />}>
          Edit
        </Button>
      </Group>
      <Stack gap="xs">
        {items.map((item, idx) => (
          <Group justify="space-between" key={idx}>
            <Text size="sm" c="dimmed">{item.label}:</Text>
            <Text size="sm" fw={500}>{item.value}</Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );

  return (
    <Stack gap="lg">
      <div>
        <Text fw={700} size="xl" mb="xs">Review & Submit</Text>
        <Text c="dimmed">Please review your information before submitting</Text>
      </div>

      {existingUser ? (
        <Alert icon={<CheckCircle size={16} />} color="green">
          You're already signed in as {existingUser.email}. Your application will be linked to this account.
        </Alert>
      ) : (
        <Alert icon={<AlertCircle size={16} />} color="blue">
          Create a password for your new account. You'll use this to sign in after your application is approved.
        </Alert>
      )}

      <InfoSection
        title="Personal Information"
        step={1}
        items={[
          { label: "Name", value: `${data.firstName} ${data.lastName}` },
          { label: "Email", value: data.email },
          { label: "Phone", value: data.phone },
          { label: "Date of Birth", value: data.dateOfBirth },
        ]}
      />

      <InfoSection
        title="Address"
        step={2}
        items={[
          { label: "Street", value: data.streetAddress },
          { label: "City", value: data.city },
          { label: "State", value: data.state },
          { label: "ZIP", value: data.zipCode },
        ]}
      />

      <InfoSection
        title="Vehicle & License"
        step={3}
        items={[
          { label: "Vehicle Type", value: data.vehicleType },
          ...(data.vehicleType !== 'walking' ? [
            { label: "Vehicle", value: `${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}` },
            { label: "Color", value: data.vehicleColor },
            { label: "Plate", value: data.licensePlate },
          ] : []),
          { label: "License #", value: data.licenseNumber },
          { label: "License State", value: data.licenseState },
          { label: "Expires", value: data.licenseExpiry },
        ]}
      />

      <InfoSection
        title="Payment & Tax Information"
        step={4}
        items={[
          { label: "SSN", value: data.ssn ? `***-**-${data.ssn.replace(/\D/g, '').slice(-4)}` : '' },
          { label: "Payout Method", value: data.payoutMethod === 'direct_deposit' ? 'Direct Deposit' : data.payoutMethod === 'cashapp' ? 'Cash App' : '' },
          ...(data.payoutMethod === 'direct_deposit' ? [
            { label: "Account Type", value: data.bankAccountType },
            { label: "Routing #", value: data.routingNumber },
            { label: "Account #", value: data.accountNumber ? `***${data.accountNumber.slice(-4)}` : '' },
          ] : []),
          ...(data.payoutMethod === 'cashapp' ? [
            { label: "Cash Tag", value: data.cashTag },
          ] : []),
        ]}
      />

      <Card>
        <Text fw={600} size="lg" mb="md">Documents</Text>
        <Stack gap="xs">
          {Object.entries(files).map(([key, file]) => file && (
            <Group key={key} gap="xs">
              <CheckCircle size={16} style={{ color: '#22c55e' }} />
              <Text size="sm">{file.name}</Text>
            </Group>
          ))}
        </Stack>
      </Card>

      {!existingUser && (
        <Card>
          <Text fw={600} size="lg" mb="md">Create Password</Text>
          <Stack gap="md">
            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              withAsterisk
            />
            <TextInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              withAsterisk
              error={password && confirmPassword && password !== confirmPassword ? "Passwords do not match" : undefined}
            />
          </Stack>
        </Card>
      )}

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Group gap="md" mt="md">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting} style={{ flex: 1 }} size="lg">
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || (!existingUser && !passwordValidation.isValid)} 
          style={{ flex: 1 }} 
          size="lg"
          color="#ff7a00"
          leftSection={isSubmitting ? <Loader size={16} /> : undefined}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </Group>
    </Stack>
  );
};
