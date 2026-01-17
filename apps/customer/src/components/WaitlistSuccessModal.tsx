import { CheckCircle, Clock } from "lucide-react";
import { Modal, Button, Card, Stack, Text, Group, Box, List } from "@mantine/core";

interface WaitlistSuccessModalProps {
  firstName: string;
  city: string;
  state: string;
  waitlistPosition: number;
  regionName?: string | null;
  onClose: () => void;
}

export const WaitlistSuccessModal = ({
  firstName,
  city,
  state,
  waitlistPosition,
  regionName,
  onClose,
}: WaitlistSuccessModalProps) => {
  const displayRegion = regionName || `${city}, ${state}`;

  return (
    <Modal
      opened={true}
      onClose={onClose}
      centered
      size="lg"
      title={null}
      withCloseButton={false}
      overlayProps={{
        backgroundOpacity: 0.5,
        blur: 4,
      }}
    >
      <Stack gap="lg" align="center">
        {/* Animated Checkmark */}
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={48} style={{ color: '#22c55e' }} />
        </Box>
        
        {/* Headline */}
        <div style={{ textAlign: 'center' }}>
          <Text fw={700} size="2xl" mb="xs">
            You're on the List! 🎉
          </Text>
          <Text size="lg" c="dimmed">
            Thanks for applying, {firstName}!
          </Text>
        </div>
        
        {/* Body Text */}
        <Card p="lg" style={{ backgroundColor: 'var(--mantine-color-gray-0)', width: '100%' }}>
          <Stack gap="md" align="flex-start">
            <Text size="sm">
              Your application has been received and <Text component="span" fw={700}>you've been placed on our driver waitlist</Text> for <Text component="span" fw={700}>{displayRegion}</Text>. We matched your region automatically based on the address you submitted.
            </Text>
            
            <div>
              <Text size="sm" fw={500} mb="xs">What happens next:</Text>
              <List spacing="xs" size="sm" c="dimmed">
                <List.Item icon={<CheckCircle size={16} style={{ color: '#22c55e' }} />}>
                  We'll review your documents within 48 hours
                </List.Item>
                <List.Item icon={<CheckCircle size={16} style={{ color: '#22c55e' }} />}>
                  You'll receive an email confirmation shortly
                </List.Item>
                <List.Item icon={<Clock size={16} style={{ color: '#ff7a00' }} />}>
                  When routes open in {displayRegion}, we'll send you an invitation to complete your background check and start delivering
                </List.Item>
              </List>
            </div>
            
            <Card p="md" style={{ backgroundColor: 'rgba(255, 122, 0, 0.1)', borderColor: '#ff7a00', width: '100%' }}>
              <Text size="sm" fw={500} mb="xs">
                Your Position: #{waitlistPosition} in {displayRegion}
              </Text>
              <Text size="xs" c="dimmed">
                Estimated wait time: 2-8 weeks (we're growing fast!)
              </Text>
            </Card>
          </Stack>
        </Card>
        
        {/* Contact Info */}
        <Text size="sm" c="dimmed" ta="center">
          Questions? Email us at <Text component="a" href="mailto:drivers@craven.com" c="#ff7a00" style={{ textDecoration: 'underline' }}>drivers@craven.com</Text> or text <Text component="span" fw={500}>(419) 555-CRAVE</Text>
        </Text>
        
        {/* CTA Buttons */}
        <Stack gap="md" style={{ width: '100%' }}>
          <Button 
            size="lg" 
            fullWidth
            onClick={() => window.open('/', '_blank')}
            color="#ff7a00"
          >
            Explore Crave'N
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            fullWidth
            onClick={onClose}
          >
            Close
          </Button>
        </Stack>
        
        {/* Social Proof */}
        <Text size="xs" c="dimmed" ta="center">
          Join 1,200+ drivers already on our waitlist across 15 cities
        </Text>
      </Stack>
    </Modal>
  );
};