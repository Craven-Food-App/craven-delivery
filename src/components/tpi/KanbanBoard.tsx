import React, { useState } from 'react';
import { Group, Card, Text, Badge, Button, Stack, ScrollArea, ActionIcon, Box } from '@mantine/core';
import { IconPlus, IconGripVertical } from '@tabler/icons-react';
import { StatusBadge } from './StatusBadge';
import { DetailDrawer } from './DetailDrawer';
import { EmptyState } from './EmptyState';

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color?: string;
  limit?: number;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
  [key: string]: any;
}

interface KanbanBoardProps<T extends KanbanCard> {
  columns: KanbanColumn[];
  cards: T[];
  onCardClick?: (card: T) => void;
  onCardMove?: (cardId: string, newStatus: string) => void;
  onAddCard?: (columnId: string) => void;
  renderCard?: (card: T) => React.ReactNode;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export function KanbanBoard<T extends KanbanCard>({
  columns,
  cards,
  onCardClick,
  onCardMove,
  onAddCard,
  renderCard,
  loading = false,
  emptyState,
}: KanbanBoardProps<T>) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getCardsForColumn = (columnId: string) => {
    return cards.filter((card) => card.status === columnId);
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedCard(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedCard && onCardMove) {
      onCardMove(draggedCard, columnId);
    }
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const defaultRenderCard = (card: T) => (
    <Card
      key={card.id}
      padding="sm"
      withBorder
      shadow="sm"
      style={{ cursor: onCardClick ? 'pointer' : 'default', marginBottom: 8 }}
      draggable={!!onCardMove}
      onDragStart={(e) => handleDragStart(e, card.id)}
      onDragEnd={handleDragEnd}
      onClick={() => onCardClick?.(card)}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" fw={500} lineClamp={2} style={{ flex: 1 }}>
            {card.title}
          </Text>
          {card.priority && (
            <Badge size="xs" color={getPriorityColor(card.priority)} variant="light">
              {card.priority}
            </Badge>
          )}
        </Group>
        {card.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {card.description}
          </Text>
        )}
        {card.assignee && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {card.assignee.name}
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );

  if (loading) {
    return (
      <Group gap="md" align="flex-start">
        {columns.map((col) => (
          <Card key={col.id} style={{ width: 300, minHeight: 400 }} withBorder>
            <Text size="sm" c="dimmed">Loading...</Text>
          </Card>
        ))}
      </Group>
    );
  }

  if (cards.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <ScrollArea>
      <Group gap="md" align="flex-start" wrap="nowrap" style={{ minWidth: 'max-content' }}>
        {columns.map((column) => {
          const columnCards = getCardsForColumn(column.id);
          const isDragOver = dragOverColumn === column.id;

          return (
            <Box
              key={column.id}
              style={{
                width: 300,
                minHeight: 400,
                backgroundColor: isDragOver ? '#f0f5ff' : 'transparent',
                border: `2px dashed ${isDragOver ? '#4c6ef5' : 'transparent'}`,
                borderRadius: 8,
                padding: 8,
                transition: 'all 200ms',
              }}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverColumn(column.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <Card padding="sm" mb="sm" withBorder style={{ backgroundColor: column.color || '#f8f9fa' }}>
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      {column.title}
                    </Text>
                    <Badge size="sm" variant="light">
                      {columnCards.length}
                      {column.limit && ` / ${column.limit}`}
                    </Badge>
                  </Group>
                  {onAddCard && (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => onAddCard(column.id)}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Card>

              <ScrollArea style={{ height: 'calc(100vh - 300px)' }}>
                <Stack gap="xs">
                  {columnCards.length === 0 ? (
                    <EmptyState
                      title="No items"
                      description={`No items in ${column.title.toLowerCase()}`}
                      icon={undefined}
                    />
                  ) : (
                    columnCards.map((card) => (
                      <div key={card.id}>
                        {renderCard ? renderCard(card) : defaultRenderCard(card)}
                      </div>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Box>
          );
        })}
      </Group>
    </ScrollArea>
  );
}




















