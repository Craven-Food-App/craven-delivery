import React, { useState, useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Table,
  Badge,
  Card,
  Group,
  Loader,
  Alert,
  Grid,
} from '@mantine/core';
import { IconUsers, IconMail, IconCalendar } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface BoardMember {
  id: string;
  full_name: string;
  email: string;
  role_title: string;
  appointment_date: string;
  status: string;
  user_id?: string;
  signing_completed?: boolean;
}

const BoardMembersDirectory: React.FC = () => {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoardMembers();
  }, []);

  const loadBoardMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Error loading board members:', error);
        setMembers([]);
        return;
      }

      setMembers(data || []);
    } catch (err) {
      console.error('Error loading board members:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const activeMembers = members.filter(m => m.status === 'Active');
  const totalMembers = members.length;

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading board members...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      {/* Stats */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Active Members</Text>
              <Text size="2xl" fw={700} c="green">
                {activeMembers.length}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Total Members</Text>
              <Text size="2xl" fw={700}>
                {totalMembers}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Signed Documents</Text>
              <Text size="2xl" fw={700} c="blue">
                {members.filter(m => m.signing_completed).length}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Members Table */}
      {members.length === 0 ? (
        <Alert color="blue">
          No board members found. Board members will appear here once they are added to the system.
        </Alert>
      ) : (
        <Card padding={0} radius="md" withBorder>
          <Table.ScrollContainer minWidth={800}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Appointment Date</Table.Th>
                  <Table.Th>Signing Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={500}>{member.full_name}</Text>
                        <Text size="xs" c="dimmed">
                          {member.email}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{member.role_title}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          member.status === 'Active'
                            ? 'green'
                            : member.status === 'Pending'
                            ? 'yellow'
                            : 'gray'
                        }
                      >
                        {member.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {dayjs(member.appointment_date).format('MMM D, YYYY')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {member.signing_completed ? (
                        <Badge color="green" variant="light">Completed</Badge>
                      ) : (
                        <Badge color="yellow" variant="light">Pending</Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </Stack>
  );
};

export default BoardMembersDirectory;







