import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconDeviceFloppy, IconUser, IconMail, IconPhone, IconMapPin, IconCalendar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  ActionIcon,
  TextInput,
  Loader,
  ThemeIcon,
  Paper,
  Grid,
} from '@mantine/core';

type ProfileDetailsPageProps = {
  onBack: () => void;
};

const ProfileDetailsPage: React.FC<ProfileDetailsPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setUser(authUser);

      // Fetch driver profile
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      // Fetch user profile from drivers table if exists
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, full_name, email, phone, city, zip')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (driverData) {
        setProfile(driverData);
        const nameParts = (driverData.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          firstName,
          lastName,
          email: authUser.email || driverData.email || '',
          phone: driverData.phone || '',
          dateOfBirth: '',
          streetAddress: '',
          city: driverData.city || '',
          state: '',
          zipCode: driverData.zip || '',
        });
      } else if (driverProfile) {
        setProfile(driverProfile);
        setFormData({
          firstName: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: authUser.user_metadata?.last_name || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          email: authUser.email || '',
          phone: authUser.user_metadata?.phone || '',
          dateOfBirth: '',
          streetAddress: '',
          city: '',
          state: '',
          zipCode: '',
        });
      } else {
        const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '';
        const nameParts = fullName.split(' ');
        setFormData({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: authUser.email || '',
          phone: authUser.user_metadata?.phone || '',
          dateOfBirth: '',
          streetAddress: '',
          city: '',
          state: '',
          zipCode: '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      notifications.show({
        title: 'Failed to load profile data',
        message: "",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        notifications.show({
          title: 'Not authenticated',
          message: '',
          color: 'red',
        });
        return;
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (!fullName) {
        notifications.show({
          title: 'Name is required',
          message: '',
          color: 'red',
        });
        return;
      }

      const { data: existingDriver, error: checkError } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking driver:', checkError);
        throw checkError;
      }

      if (!formData.city || !formData.zipCode || !formData.phone) {
        notifications.show({
          title: 'Name, Phone, City, and Zip Code are required',
          message: '',
          color: 'red',
        });
        return;
      }

      const updateData: any = {
        full_name: fullName,
        phone: formData.phone,
        city: formData.city,
        zip: formData.zipCode,
      };

      if (existingDriver) {
        const { data, error } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('auth_user_id', authUser.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        if (!formData.city || !formData.zipCode || !formData.phone) {
          notifications.show({
            title: 'Name, Phone, City, and Zip Code are required',
            message: '',
            color: 'red',
          });
          return;
        }

        const insertData: any = {
          auth_user_id: authUser.id,
          full_name: fullName,
          email: formData.email || authUser.email || '',
          phone: formData.phone,
          city: formData.city,
          zip: formData.zipCode,
          status: 'started',
        };

        const { data, error } = await supabase
          .from('drivers')
          .insert(insertData)
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: formData.phone,
        }
      });

      if (authError) {
        console.error('Auth update error:', authError);
      }

      notifications.show({
        title: 'Profile updated successfully',
        message: "",
        color: 'green',
      });
      await fetchProfileData();
      setTimeout(() => onBack(), 500);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMessage = error?.message || error?.details || 'Failed to save profile';
      notifications.show({
        title: `Error: ${errorMessage}`,
        message: '',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box h="100vh" w="100%" bg="gray.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" bg="gray.0" style={{ overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-gray-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Group px="xl" py="md" justify="space-between" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Profile Information</Title>
          <Button
            variant="subtle"
            color="orange"
            onClick={handleSave}
            loading={saving}
            leftSection={<IconDeviceFloppy size={16} />}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Group>
      </Paper>

      {/* Form */}
      <Stack gap="md" p="xl">
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="blue" variant="light">
                <IconUser size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Personal Information</Title>
                <Text size="sm" c="dimmed">Update your personal details</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <Grid gutter="md">
                <Grid.Col span={6}>
                  <TextInput
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First name"
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                label={
                  <Group gap="xs">
                    <IconMail size={16} />
                    <Text>Email</Text>
                  </Group>
                }
                type="email"
                value={formData.email}
                disabled
                styles={{
                  input: {
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    color: 'var(--mantine-color-gray-5)',
                  },
                }}
              />
              <Text size="xs" c="dimmed">Email cannot be changed</Text>

              <TextInput
                label={
                  <Group gap="xs">
                    <IconPhone size={16} />
                    <Text>Phone Number</Text>
                  </Group>
                }
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />

              <TextInput
                label={
                  <Group gap="xs">
                    <IconCalendar size={16} />
                    <Text>Date of Birth</Text>
                  </Group>
                }
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </Stack>
          </Card.Section>
        </Card>

        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="md" mb="md">
              <ThemeIcon size="xl" radius="lg" color="green" variant="light">
                <IconMapPin size={24} />
              </ThemeIcon>
              <Box>
                <Title order={4} fw={700} c="dark">Address</Title>
                <Text size="sm" c="dimmed">Your current address</Text>
              </Box>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack gap="md">
              <TextInput
                label="Street Address"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="123 Main St"
              />

              <Grid gutter="md">
                <Grid.Col span={6}>
                  <TextInput
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                label="Zip Code"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="12345"
              />
            </Stack>
          </Card.Section>
        </Card>
      </Stack>

      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </Box>
  );
};

export default ProfileDetailsPage;
