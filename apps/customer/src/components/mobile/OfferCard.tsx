import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Text,
  Title,
  Button,
  Badge,
  Card,
  Group,
  Progress,
} from '@mantine/core';
import { IconStar, IconMapPin, IconClock, IconPackage } from '@tabler/icons-react';

interface Offer {
  id: string;
  pickupName: string;
  pickupRating: number;
  dropoffDistance: number;
  estimatedTime: number;
  estimatedPay: number;
  itemCount: number;
  miles: number;
}

interface OfferCardProps {
  offer: Offer;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  countdownSeconds?: number;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onAccept,
  onDecline,
  countdownSeconds = 30
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onDecline(offer.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, offer.id, onDecline]);

  const progressPercentage = (timeLeft / countdownSeconds) * 100;

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}
    >
      <Box w="100%" p="md">
        <Card w="100%" shadow="xl" radius="lg" withBorder>
          <Stack gap="md" p="xl">
            <Progress
              value={progressPercentage}
              color="blue"
              size="sm"
              radius="xl"
              style={{ transition: 'all 1s linear' }}
            />

            <Group align="center" justify="space-between">
              <Box style={{ flex: 1 }}>
                <Group gap="sm" mb={4}>
                  <Title order={4} fw={600}>{offer.pickupName}</Title>
                  <Group gap={4}>
                    <IconStar size={16} fill="var(--mantine-color-yellow-4)" color="var(--mantine-color-yellow-4)" />
                    <Text size="sm" fw={500}>{offer.pickupRating}</Text>
                  </Group>
                </Group>
                <Group gap="md" c="dimmed">
                  <Group gap={4}>
                    <IconMapPin size={16} />
                    <Text size="sm">{offer.dropoffDistance} mi</Text>
                  </Group>
                  <Group gap={4}>
                    <IconClock size={16} />
                    <Text size="sm">{offer.estimatedTime} min</Text>
                  </Group>
                  <Group gap={4}>
                    <IconPackage size={16} />
                    <Text size="sm">{offer.itemCount} items</Text>
                  </Group>
                </Group>
              </Box>
              
              <Box style={{ textAlign: 'right' }}>
                <Text size="2xl" fw={700} c="green.6">
                  ${offer.estimatedPay.toFixed(2)}
                </Text>
                <Text size="xs" c="dimmed">
                  {offer.miles.toFixed(1)} mi total
                </Text>
              </Box>
            </Group>

            <Box style={{ textAlign: 'center' }}>
              <Badge variant="outline" size="sm">
                {timeLeft}s remaining
              </Badge>
            </Box>

            <Group gap="md">
              <Button
                variant="outline"
                onClick={() => onDecline(offer.id)}
                style={{ flex: 1 }}
              >
                Decline
              </Button>
              <Button
                onClick={() => onAccept(offer.id)}
                style={{ flex: 1 }}
                color="green"
              >
                Accept
              </Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
};
