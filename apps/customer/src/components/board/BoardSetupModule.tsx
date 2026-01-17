import React, { useState, useEffect } from 'react';
import { Card, Button, Stack, Text, Title, Alert, Group, Badge, Table } from '@mantine/core';
import { IconUsers, IconCheck, IconFileText, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { handleInitialBoardSetup } from '@/lib/governance/flows';

interface BoardMember {
  id: string;
  full_name: string;
  email: string;
  role_title: string;
  appointment_date: string;
  status: string;
}

export function BoardSetupModule() {
  const navigate = useNavigate();
  const [boardInitialized, setBoardInitialized] = useState<boolean>(false);
  const [incorporationStatus, setIncorporationStatus] = useState<'pre_incorporation' | 'incorporated'>('pre_incorporation');
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  useEffect(() => {
    checkBoardStatus();
  }, []);

  const checkBoardStatus = async () => {
    try {
      // Check incorporation status
      const { data: incorpSetting } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'incorporation_status')
        .single();

      const status = (incorpSetting?.setting_value as 'pre_incorporation' | 'incorporated') || 'pre_incorporation';
      setIncorporationStatus(status);

      // Check if board is initialized
      const { data: boardSetting } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'board_initialized')
        .single();

      const initialized = boardSetting?.setting_value === 'true';
      setBoardInitialized(initialized);

      if (initialized) {
        // Load board members
        const { data: members } = await supabase
          .from('board_members')
          .select('*')
          .in('status', ['Active', 'Pending', 'Conditional'])
          .order('appointment_date', { ascending: true });

        setBoardMembers(members || []);
      }
    } catch (error: any) {
      console.error('Error checking board status:', error);
      message.error('Failed to load board status');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeBoard = async () => {
    setInitializing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile and exec_user record (check multiple sources for name)
      const [profileResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const profile = profileResult.data;

      // Determine full name from multiple sources (priority order)
      const fullName = 
        profile?.full_name ||           // First: user_profiles.full_name
        user.email?.split('@')[0] ||    // Second: email username
        'Torrance Stroman';             // Final fallback

      // Use auth user email
      const email = user.email || '';

      // Step 1: Create initial director (Torrance)
      // In pre-incorporation, this is conditional
      const { data: boardMember, error: memberError } = await supabase
        .from('board_members')
        .insert({
          full_name: fullName,
          email: email,
          role_title: 'Chairperson / Sole Director / Secretary',
          appointment_date: new Date().toISOString().split('T')[0],
          status: incorporationStatus === 'pre_incorporation' ? 'Conditional' : 'Active', // Conditional until incorporation
          signing_required: true,
          signing_completed: false,
          user_id: user.id,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Step 2: Generate initial documents
      if (incorporationStatus === 'pre_incorporation') {
        // PRE-INCORPORATION MODE: Use Pre-Incorporation Consent
        // The Pre-Incorporation Consent already handles conditional board appointments
        // We just need to ensure it's linked to the board setup
        
        message.info('In pre-incorporation mode, board appointments are conditional and will become effective upon incorporation filing.');
        
        // Check if Pre-Incorporation Consent document exists
        const { data: existingConsent } = await supabase
          .from('executive_documents')
          .select('id, file_url')
          .eq('template_key', 'pre_incorporation_consent')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingConsent) {
          // Link board member to existing consent
          await supabase
            .from('board_documents')
            .insert({
              title: 'Pre-Incorporation Consent (Conditional Board Appointment)',
              type: 'initial_director_consent',
              pdf_url: existingConsent.file_url,
              signing_status: 'pending',
              signers: JSON.stringify([{ role: 'DIRECTOR', user_id: user.id, status: 'pending' }]),
            });
        } else {
          // Create a placeholder board document that references Pre-Incorporation Consent
          await supabase
            .from('board_documents')
            .insert({
              title: 'Pre-Incorporation Consent Required',
              type: 'initial_director_consent',
              signing_status: 'pending',
              signers: JSON.stringify([{ role: 'DIRECTOR', user_id: user.id, status: 'pending' }]),
            });
        }

      } else {
        // POST-INCORPORATION MODE: Use new flow function
        const documentIds = await handleInitialBoardSetup(user.id);
        
        if (documentIds.length > 0) {
          // Navigate to signing flow for post-incorporation documents
          navigate('/executive/signing', { 
            state: { 
              documentIds: documentIds,
              source: 'board_initialization'
            } 
          });
        } else {
          message.warning('Board initialized but no documents were generated. Please check the logs.');
        }
      }

      // Step 3: Mark board as initialized
      const { error: updateError } = await supabase
        .from('company_settings')
        .upsert({
          setting_key: 'board_initialized',
          setting_value: 'true',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (updateError) throw updateError;

      message.success(
        incorporationStatus === 'pre_incorporation'
          ? 'Board structure initialized (conditional - effective upon incorporation)'
          : 'Board of Directors initialized successfully!'
      );
      
      await checkBoardStatus();

    } catch (error: any) {
      console.error('Error initializing board:', error);
      message.error(`Failed to initialize board: ${error.message}`);
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return <Card><Text>Loading...</Text></Card>;
  }

  if (!boardInitialized) {
    return (
      <Card padding="xl" radius="md" withBorder>
        <Stack gap="md">
          <Group>
            <IconUsers size={32} />
            <Title order={2}>Board of Directors Setup</Title>
          </Group>

          {incorporationStatus === 'pre_incorporation' ? (
            <Alert icon={<IconInfoCircle />} color="blue" title="Pre-Incorporation Board Setup">
              <Text size="sm" mb="md">
                You are currently in <strong>pre-incorporation</strong> mode. Board appointments will be 
                <strong> conditional</strong> and become effective automatically upon incorporation filing.
              </Text>
              <Text size="sm" mb="md">
                The Pre-Incorporation Consent document already handles conditional appointments of:
              </Text>
              <ul style={{ marginLeft: 20 }}>
                <li><strong>Initial Directors</strong> - Appointed conditionally, effective upon incorporation</li>
                <li><strong>Initial Officers</strong> - Appointed conditionally, effective upon incorporation</li>
              </ul>
              <Text size="sm" mt="md" c="dimmed">
                After incorporation is complete, you can update board members and create formal resolutions.
              </Text>
            </Alert>
          ) : (
            <Alert icon={<IconAlertCircle />} color="blue" title="Initialize Your Board">
              <Text size="sm" mb="md">
                Before you can create board resolutions and formalize executive appointments, 
                you need to establish your Board of Directors.
              </Text>
              <Text size="sm" mb="md">
                In single-founder mode, you (Torrance Stroman) will be appointed as:
              </Text>
              <ul style={{ marginLeft: 20 }}>
                <li><strong>Sole Director</strong> - The only member of the Board</li>
                <li><strong>Chairperson</strong> - Presides over board meetings</li>
                <li><strong>Secretary</strong> - Maintains board records and resolutions</li>
              </ul>
              <Text size="sm" mt="md">
                After initialization, you'll need to sign the Initial Consent and Organizational 
                Meeting Minutes documents to complete the setup.
              </Text>
            </Alert>
          )}

          <Button
            size="lg"
            onClick={handleInitializeBoard}
            loading={initializing}
            leftSection={<IconCheck />}
          >
            {incorporationStatus === 'pre_incorporation' 
              ? 'Initialize Conditional Board Structure' 
              : 'Initialize Board of Directors'}
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card padding="xl" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <IconUsers size={32} />
            <Title order={2}>Board of Directors</Title>
          </Group>
          <Group>
            <Badge color={incorporationStatus === 'pre_incorporation' ? 'yellow' : 'green'} size="lg">
              {incorporationStatus === 'pre_incorporation' ? 'Conditional (Pre-Inc)' : 'Active'}
            </Badge>
            <Badge color="green" size="lg">Initialized</Badge>
          </Group>
        </Group>

        {incorporationStatus === 'pre_incorporation' && (
          <Alert icon={<IconInfoCircle />} color="yellow" title="Pre-Incorporation Status">
            <Text size="sm">
              Board appointments are conditional and will become effective upon incorporation filing. 
              The Pre-Incorporation Consent document governs these conditional appointments.
            </Text>
          </Alert>
        )}

        <Text size="sm" c="dimmed">
          Current board members and their roles
        </Text>

        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Appointment Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {boardMembers.map((member) => (
              <Table.Tr key={member.id}>
                <Table.Td>{member.full_name}</Table.Td>
                <Table.Td>{member.role_title}</Table.Td>
                <Table.Td>{new Date(member.appointment_date).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Badge color={
                    member.status === 'Active' ? 'green' : 
                    member.status === 'Pending' || member.status === 'Conditional' ? 'yellow' : 
                    'gray'
                  }>
                    {member.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group>
          <Button
            variant="light"
            leftSection={<IconFileText />}
            onClick={() => navigate('/company/governance-admin?tab=resolutions')}
          >
            Manage Board Documents
          </Button>
          {incorporationStatus === 'pre_incorporation' && (
            <Button
              variant="light"
              color="blue"
              onClick={() => navigate('/company/governance-admin?tab=templates')}
            >
              View Pre-Incorporation Consent
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

