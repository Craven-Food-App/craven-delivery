import React, { useState, useEffect } from 'react';
import { Modal, RingProgress, Button, Stack, Text, Group, Badge, Card } from '@mantine/core';
import { Trophy, X } from 'lucide-react';
import { ArenaCompetition } from '@/types/diamond-orders';

interface ArenaClaimModalProps {
  competition: ArenaCompetition | null;
  opened: boolean;
  onClose: () => void;
  onClaim: (competitionId: string) => void;
  isEligible: boolean;
}

export const ArenaClaimModal: React.FC<ArenaClaimModalProps> = ({ 
  competition, 
  opened, 
  onClose, 
  onClaim,
  isEligible 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [claimed, setClaimed] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    if (!opened || !competition) return;
    
    setTimeRemaining(competition.claim_window_seconds);
    setClaimed(false);
    setTapCount(0);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [opened, competition]);

  const handleTap = () => {
    if (claimed || !isEligible || timeRemaining === 0) return;
    
    setTapCount((prev) => prev + 1);
    
    // Check if this driver won (first to tap)
    if (competition && !competition.winner_driver_id) {
      setClaimed(true);
      onClaim(competition.id);
    }
  };

  const progress = competition ? (timeRemaining / competition.claim_window_seconds) * 100 : 0;
  const payout = competition?.order 
    ? ((competition.order.base_pay || competition.order.delivery_fee_cents || 0) / 100) + 
      ((competition.order.tip || competition.order.tip_cents || 0) / 100)
    : 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      styles={{
        body: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        },
      }}
    >
      <Stack gap="xl" align="center" w="100%" p="xl">
        <Group justify="apart" w="100%">
          <Text fw={700} size="xl">ARENA COMPETITION</Text>
          <Button variant="subtle" onClick={onClose}>
            <X size={20} />
          </Button>
        </Group>

        <Card
          p="xl"
          radius="md"
          style={{
            background: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
            border: '2px solid #FF6A00',
            boxShadow: '0 0 24px rgba(255,106,0,0.8)',
            maxWidth: 400,
            width: '100%',
          }}
        >
          <Stack gap="lg" align="center">
            <Trophy size={48} color="white" />
            
            <Text fw={700} size="lg" c="white" ta="center">
              {competition?.order?.restaurant?.name || 'Restaurant'}
            </Text>
            
            <Text fw={700} size="2xl" c="white">
              ${payout.toFixed(2)}
            </Text>

            {claimed ? (
              <Badge size="lg" color="green" variant="filled">
                Order Claimed!
              </Badge>
            ) : timeRemaining === 0 ? (
              <Badge size="lg" color="red" variant="filled">
                Order Already Claimed
              </Badge>
            ) : (
              <>
                <RingProgress
                  size={200}
                  thickness={12}
                  sections={[{ value: progress, color: 'white' }]}
                  label={
                    <Stack align="center" gap="xs">
                      <Text ta="center" c="white" fw={700} size="3xl">
                        {timeRemaining}
                      </Text>
                      <Text ta="center" c="white" size="sm">
                        seconds left
                      </Text>
                    </Stack>
                  }
                />

                <Button
                  size="xl"
                  fullWidth
                  disabled={!isEligible || claimed}
                  onClick={handleTap}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid white',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    height: 80,
                    transition: 'all 0.1s',
                  }}
                >
                  {!isEligible ? 'Not Eligible' : claimed ? 'Claimed!' : 'TAP TO CLAIM'}
                </Button>

                {tapCount > 0 && (
                  <Text size="sm" c="white">
                    Taps: {tapCount}
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
};

