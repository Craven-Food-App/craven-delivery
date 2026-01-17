import { TextInput, Button, Select, Radio, Checkbox, Card, Stack, Grid, Text, Group, Box } from "@mantine/core";
import { ApplicationStepProps } from "@/types/application";
import { Shield, DollarSign, CreditCard, Wallet } from "lucide-react";

export const BankingStep = ({ data, onUpdate, onNext, onBack, isValid }: ApplicationStepProps) => {
  const formatSSN = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XXX-XX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const handleSSNChange = (value: string) => {
    const formatted = formatSSN(value);
    onUpdate('ssn', formatted);
  };

  return (
    <Stack gap="lg">
      <div>
        <Text fw={700} size="xl" mb="xs">Payment & Tax Information</Text>
        <Text c="dimmed">Choose how you want to receive payments and provide tax information</Text>
      </div>

      <Card p="md" style={{ borderColor: '#ff7a00', backgroundColor: 'rgba(255, 122, 0, 0.05)' }}>
        <Group gap="md" align="flex-start">
          <Shield size={20} style={{ color: '#ff7a00', marginTop: 2 }} />
          <div>
            <Text size="sm" fw={500}>Your information is secure</Text>
            <Text size="xs" c="dimmed">
              Your Social Security Number is required for tax purposes. Payment information is encrypted and secure.
            </Text>
          </div>
        </Group>
      </Card>

      {/* Payout Method Selection */}
      <div>
        <Group gap="xs" mb="md">
          <Wallet size={16} />
          <Text size="sm" fw={500}>Payout Method *</Text>
        </Group>
        
        <Radio.Group
          value={data.payoutMethod || 'direct_deposit'}
          onChange={(value) => onUpdate('payoutMethod', value)}
        >
          <Stack gap="md">
            <Card withBorder p="md" style={{ cursor: 'pointer' }} onClick={() => onUpdate('payoutMethod', 'direct_deposit')}>
              <Group>
                <Radio value="direct_deposit" />
                <div style={{ flex: 1 }}>
                  <Text fw={500}>Direct Deposit</Text>
                  <Text size="sm" c="dimmed">Get paid directly to your bank account</Text>
                </div>
              </Group>
            </Card>
            
            <Card withBorder p="md" style={{ cursor: 'pointer' }} onClick={() => onUpdate('payoutMethod', 'cashapp')}>
              <Group>
                <Radio value="cashapp" />
                <div style={{ flex: 1 }}>
                  <Text fw={500}>Cash App</Text>
                  <Text size="sm" c="dimmed">Instant payouts to your Cash App</Text>
                </div>
              </Group>
            </Card>
          </Stack>
        </Radio.Group>
      </div>

      {/* Direct Deposit Fields */}
      {data.payoutMethod === 'direct_deposit' && (
        <Box p="md" style={{ borderRadius: '8px', border: '1px solid var(--mantine-color-gray-3)' }}>
          <Stack gap="md">
            <Group gap="xs">
              <CreditCard size={16} />
              <Text size="sm" fw={500}>Bank Account Information</Text>
            </Group>
            
            <Select
              label="Account Type"
              placeholder="Select account type"
              value={data.bankAccountType || ''}
              onChange={(value) => onUpdate('bankAccountType', value || '')}
              data={[
                { value: 'checking', label: 'Checking' },
                { value: 'savings', label: 'Savings' },
              ]}
              required
              withAsterisk
            />
            
            <TextInput
              label="Routing Number"
              placeholder="9-digit routing number"
              value={data.routingNumber || ''}
              onChange={(e) => onUpdate('routingNumber', e.target.value)}
              maxLength={9}
              required
              withAsterisk
            />
            
            <TextInput
              label="Account Number"
              placeholder="Account number"
              value={data.accountNumber || ''}
              onChange={(e) => onUpdate('accountNumber', e.target.value)}
              type="password"
              required
              withAsterisk
            />
          </Stack>
        </Box>
      )}

      {/* Cash App Fields */}
      {data.payoutMethod === 'cashapp' && (
        <Box p="md" style={{ borderRadius: '8px', border: '1px solid var(--mantine-color-gray-3)' }}>
          <Stack gap="md">
            <Group gap="xs">
              <Wallet size={16} />
              <Text size="sm" fw={500}>Cash App Information</Text>
            </Group>
            
            <TextInput
              label="Cash App Tag"
              placeholder="@yourcashtag"
              value={data.cashTag || ''}
              onChange={(e) => onUpdate('cashTag', e.target.value)}
              description="Enter your Cash App username (without the @ symbol)"
              required
              withAsterisk
            />
          </Stack>
        </Box>
      )}

      {/* SSN for Tax Purposes */}
      <Box p="md" style={{ borderRadius: '8px', border: '1px solid var(--mantine-color-gray-3)' }}>
        <Stack gap="md">
          <Group gap="xs">
            <DollarSign size={16} />
            <Text size="sm" fw={500}>Tax Information</Text>
          </Group>
          <TextInput
            label="Social Security Number"
            placeholder="XXX-XX-XXXX"
            value={data.ssn}
            onChange={(e) => handleSSNChange(e.target.value)}
            maxLength={11}
            description="Required for tax reporting purposes (format: XXX-XX-XXXX)"
            required
            withAsterisk
          />
        </Stack>
      </Box>

      {/* Background Check Consent */}
      <Card p="md" withBorder style={{ borderWidth: 2 }}>
        <Group align="flex-start" gap="md">
          <Checkbox
            checked={data.backgroundCheckConsent}
            onChange={(e) => onUpdate('backgroundCheckConsent', e.currentTarget.checked)}
          />
          <div style={{ flex: 1 }}>
            <Text size="sm" fw={500} mb="xs">Background Check Authorization *</Text>
            <Text size="xs" c="dimmed">
              I authorize Crave'N to obtain a consumer report and/or investigative consumer report for employment purposes. 
              I understand this may include criminal history, motor vehicle records, and employment verification as permitted by law.
            </Text>
          </div>
        </Group>
      </Card>

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
