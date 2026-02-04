// @ts-nocheck
import React from 'react';
import { Group, Select, TextInput, Button, DatePickerInput } from '@mantine/core';
import { IconSearch, IconFilter, IconX } from '@tabler/icons-react';

interface FilterBarProps {
  filters: FilterConfig[];
  onFilterChange: (key: string, value: any) => void;
  onClear?: () => void;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onClear }) => {
  return (
    <Group gap="md" mb="lg">
      {filters.map((filter) => {
        if (filter.type === 'select' && filter.options) {
          return (
            <Select
              key={filter.key}
              label={filter.label}
              placeholder={filter.placeholder || `Select ${filter.label}`}
              data={filter.options}
              clearable
              onChange={(value) => onFilterChange(filter.key, value)}
              style={{ minWidth: 150 }}
            />
          );
        }
        if (filter.type === 'text') {
          return (
            <TextInput
              key={filter.key}
              label={filter.label}
              placeholder={filter.placeholder || `Search ${filter.label}`}
              leftSection={<IconSearch size={16} />}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
          );
        }
        return null;
      })}
      {onClear && (
        <Button variant="subtle" leftSection={<IconX size={16} />} onClick={onClear} mt="auto">
          Clear
        </Button>
      )}
    </Group>
  );
};

