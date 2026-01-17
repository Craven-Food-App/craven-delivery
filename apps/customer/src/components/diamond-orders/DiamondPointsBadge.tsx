import React, { useState, useEffect } from 'react';
import { Badge, Group, Text, Transition } from '@mantine/core';
import { Sparkles } from 'lucide-react';

interface DiamondPointsBadgeProps {
  points: number;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
}

export const DiamondPointsBadge: React.FC<DiamondPointsBadgeProps> = ({ points, tier = 'Bronze' }) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [prevPoints, setPrevPoints] = useState(points);

  useEffect(() => {
    if (points > prevPoints) {
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 1000);
    }
    setPrevPoints(points);
  }, [points, prevPoints]);

  const getTierColor = () => {
    switch (tier) {
      case 'Diamond':
        return 'violet';
      case 'Gold':
        return 'yellow';
      case 'Silver':
        return 'gray';
      default:
        return 'orange';
    }
  };

  return (
    <Group gap="xs">
      <Transition mounted={showAnimation} transition="scale" duration={300}>
        {(styles) => (
          <Badge
            size="lg"
            color={getTierColor()}
            variant="filled"
            leftSection={<Sparkles size={14} />}
            style={styles}
          >
            <Text fw={700} size="sm">
              {points} Points
            </Text>
          </Badge>
        )}
      </Transition>
      {!showAnimation && (
        <Badge
          size="lg"
          color={getTierColor()}
          variant="filled"
          leftSection={<Sparkles size={14} />}
        >
          <Text fw={700} size="sm">
            {points} Points
          </Text>
        </Badge>
      )}
    </Group>
  );
};

