import React from 'react';
import { Skeleton, Stack, Group } from '@mantine/core';

interface SkeletonLoaderProps {
  variant: 'text' | 'circular' | 'rectangular' | 'card' | 'table' | 'list';
  width?: number | string;
  height?: number | string;
  count?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function SkeletonLoader({
  variant,
  width,
  height,
  count = 1,
  animation = 'pulse',
}: SkeletonLoaderProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return {
          width: width || '100%',
          height: height || 16,
          borderRadius: 4,
        };
      case 'circular':
        return {
          width: width || 40,
          height: height || 40,
          borderRadius: '50%',
        };
      case 'rectangular':
        return {
          width: width || '100%',
          height: height || 200,
          borderRadius: 8,
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || 150,
          borderRadius: 8,
        };
      case 'table':
        return {
          width: width || '100%',
          height: height || 48,
          borderRadius: 4,
        };
      case 'list':
        return {
          width: width || '100%',
          height: height || 60,
          borderRadius: 8,
        };
    }
  };

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <Stack gap="sm" style={{ padding: '16px' }}>
            <Skeleton height={20} width="60%" radius="sm" animate={animation !== 'none'} />
            <Skeleton height={16} width="100%" radius="sm" animate={animation !== 'none'} />
            <Skeleton height={16} width="80%" radius="sm" animate={animation !== 'none'} />
            <Skeleton height={40} width="100%" radius="sm" animate={animation !== 'none'} />
          </Stack>
        );
      case 'table':
        return (
          <Group gap="md" style={{ padding: '12px 16px' }}>
            <Skeleton height={16} width={100} radius="sm" animate={animation !== 'none'} />
            <Skeleton height={16} width="30%" radius="sm" animate={animation !== 'none'} />
            <Skeleton height={16} width="20%" radius="sm" animate={animation !== 'none'} />
            <Skeleton height={16} width={80} radius="sm" animate={animation !== 'none'} />
          </Group>
        );
      case 'list':
        return (
          <Group gap="md" style={{ padding: '12px' }}>
            <Skeleton height={40} width={40} radius="sm" circle animate={animation !== 'none'} />
            <Stack gap={4} style={{ flex: 1 }}>
              <Skeleton height={16} width="60%" radius="sm" animate={animation !== 'none'} />
              <Skeleton height={12} width="40%" radius="sm" animate={animation !== 'none'} />
            </Stack>
          </Group>
        );
      default:
        return (
          <Skeleton
            style={getVariantStyles()}
            animate={animation !== 'none'}
            radius="sm"
          />
        );
    }
  };

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <Stack gap="xs">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </Stack>
  );
}


































