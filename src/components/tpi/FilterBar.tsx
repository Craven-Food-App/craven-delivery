// @ts-nocheck
import React, { useState } from 'react';
import { Group, Button, Chip, Select, TextInput, Menu } from '@mantine/core';
import { IconX, IconFilter, IconBookmark } from '@tabler/icons-react';

export interface Filter {
  id: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'boolean' | 'number';
  label: string;
  value: any;
  options?: { label: string; value: any }[];
}

export interface SavedView {
  id: string;
  name: string;
  filters: Filter[];
  isDefault?: boolean;
}

interface FilterBarProps {
  filters: Filter[];
  activeFilters: Filter[];
  onFilterChange: (filters: Filter[]) => void;
  savedViews?: SavedView[];
  onSaveView?: (name: string, filters: Filter[]) => void;
  onLoadView?: (view: SavedView) => void;
  onDeleteView?: (viewId: string) => void;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  savedViews = [],
  onSaveView,
  onLoadView,
  onDeleteView,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<Filter[]>(activeFilters);

  const handleFilterChange = (filterId: string, value: any) => {
    const updated = localFilters.map((f) =>
      f.id === filterId ? { ...f, value } : f
    );
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const handleRemoveFilter = (filterId: string) => {
    const updated = localFilters.filter((f) => f.id !== filterId);
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const handleClearAll = () => {
    setLocalFilters([]);
    onFilterChange([]);
  };

  const handleSaveView = () => {
    const name = prompt('Enter a name for this view:');
    if (name && onSaveView) {
      onSaveView(name, localFilters);
    }
  };

  const activeFilterCount = activeFilters.filter((f) => f.value !== null && f.value !== '' && f.value !== undefined).length;

  return (
    <div style={{ marginBottom: '16px' }}>
      <Group gap="sm" align="center">
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconFilter size={16} />}
          onClick={() => setExpanded(!expanded)}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="subtle" size="xs" onClick={handleClearAll}>
            Clear All
          </Button>
        )}

        {savedViews.length > 0 && (
          <Menu>
            <Menu.Target>
              <Button variant="subtle" size="sm">
                Saved Views
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {savedViews.map((view) => (
                <Menu.Item
                  key={view.id}
                  onClick={() => {
                    if (onLoadView) {
                      onLoadView(view);
                      setLocalFilters(view.filters);
                    }
                  }}
                >
                  {view.name} {view.isDefault && '(Default)'}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}

        {onSaveView && activeFilterCount > 0 && (
          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconBookmark size={16} />}
            onClick={handleSaveView}
          >
            Save View
          </Button>
        )}

        {/* Active Filter Chips */}
        {activeFilters
          .filter((f) => f.value !== null && f.value !== '' && f.value !== undefined)
          .map((filter) => (
            <Chip
              key={filter.id}
              checked={true}
              onClose={() => handleRemoveFilter(filter.id)}
              variant="light"
              size="sm"
            >
              {filter.label}: {String(filter.value)}
            </Chip>
          ))}
      </Group>

      {/* Expanded Filter Panel */}
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Group gap="md" align="flex-end">
            {filters.map((filter) => {
              if (filter.type === 'text') {
                return (
                  <TextInput
                    key={filter.id}
                    label={filter.label}
                    value={localFilters.find((f) => f.id === filter.id)?.value || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.currentTarget.value)}
                    size="sm"
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                );
              }
              if (filter.type === 'select' && filter.options) {
                return (
                  <Select
                    key={filter.id}
                    label={filter.label}
                    value={localFilters.find((f) => f.id === filter.id)?.value || ''}
                    onChange={(value) => handleFilterChange(filter.id, value)}
                    data={filter.options}
                    size="sm"
                    clearable
                    style={{ minWidth: '150px' }}
                  />
                );
              }
              return null;
            })}
          </Group>
        </div>
      )}
    </div>
  );
}

