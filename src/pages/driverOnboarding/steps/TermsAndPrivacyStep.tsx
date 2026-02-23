import React, { useState } from 'react';
import { Button, Text, Stack, Checkbox, Box } from '@mantine/core';
import { FileText } from 'lucide-react';

interface TermsAndPrivacyStepProps {
  onNext: (data: any) => void;
  applicationData: any;
}

export const TermsAndPrivacyStep: React.FC<TermsAndPrivacyStepProps> = ({ onNext }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleContinue = () => {
    if (!termsAccepted || !privacyAccepted) {
      return;
    }

    onNext({
      termsAccepted,
      privacyAccepted,
      consentsAcceptedAt: new Date().toISOString()
    });
  };

  return (
    <Box
      style={{
        width: '100%',
        minHeight: '100vh',
        padding: '80px 24px 40px',
        maxWidth: '600px',
        margin: '0 auto'
      }}
    >
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md">
          <Text fw={700} size="2xl" style={{ fontSize: '32px', color: '#191919' }}>
            Legal Agreements
          </Text>
          <Text size="md" c="dimmed" style={{ lineHeight: '1.6' }}>
            Please review and accept our legal agreements to continue with your application
          </Text>
        </Stack>

        {/* Terms of Service */}
        <Box
          p="md"
          style={{ 
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5E5'
          }}
        >
          <Stack gap="sm">
            <Text fw={600} size="md">Terms of Service</Text>
            <Text size="sm" c="dimmed">
              By clicking the link below, you'll read our complete Terms of Service which
              govern your use of the Crave'n platform as a driver.
            </Text>
            <Checkbox
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.currentTarget.checked)}
              label={
                <Text size="sm">
                  I have read and agree to the{' '}
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/terms-of-service', '_blank');
                    }}
                    style={{ color: '#ff7a00', fontWeight: 'bold' }}
                  >
                    Terms of Service
                  </a>
                </Text>
              }
            />
          </Stack>
        </Box>

        {/* Privacy Policy */}
        <Box
          p="md"
          style={{ 
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5E5'
          }}
        >
          <Stack gap="sm">
            <Text fw={600} size="md">Privacy Policy</Text>
            <Text size="sm" c="dimmed">
              Your privacy is important to us. Review our Privacy Policy to understand how
              we collect, use, and protect your personal information.
            </Text>
            <Checkbox
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.currentTarget.checked)}
              label={
                <Text size="sm">
                  I have read and agree to the{' '}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/privacy-policy', '_blank');
                    }}
                    style={{ color: '#ff7a00', fontWeight: 'bold' }}
                  >
                    Privacy Policy
                  </a>
                </Text>
              }
            />
          </Stack>
        </Box>

        {/* Continue Button */}
        <Box mt="xl">
          <Button
            size="lg"
            fullWidth
            disabled={!termsAccepted || !privacyAccepted}
            onClick={handleContinue}
            style={{
              height: '56px',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '8px',
              backgroundColor: '#DC2626',
            }}
          >
            Continue
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
