import React from 'react';
import { Stack, Title, Text } from '@mantine/core';
import ExecutiveCalendar from './ExecutiveCalendar';

/**
 * Shared leadership calendar (no partnership renewal layer). Used from Company Portal
 * and from individual C-suite portal tabs so everyone sees the same schedule.
 */
export function ExecutiveCalendarTabContent() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Executive Calendar</Title>
        <Text c="dimmed" size="sm" mt={4}>
          New events are private by default—only the organizer and invited executives see them. You can mark an item as visible to all executives for shared milestones or all-hands, or place events on a shared calendar so every member of that calendar sees them. Recurring meetings, attachments, and RSVP (accept / maybe / decline) are supported; only the organizer can edit or delete an event they created (shared calendar owners and editors can help with invites and attachments).
        </Text>
      </div>
      <ExecutiveCalendar showRenewalLayer={false} />
    </Stack>
  );
}
