import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconCamera, IconEdit, IconDeviceFloppy, IconUser } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  TextInput,
  ActionIcon,
  Avatar,
  Paper,
  Loader,
} from '@mantine/core';

interface ProfileSectionProps {
  onBack: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    profile_photo: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('first_name, last_name, email, phone, profile_photo')
        .eq('user_id', user.id)
        .single();

      if (application) {
        setProfile(application);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('feeder-documents')
        .upload(`profile-photos/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('feeder-documents')
        .getPublicUrl(`profile-photos/${fileName}`);

      // Update profile
      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({ profile_photo: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_photo: publicUrl });
      notifications.show({
        title: 'Photo updated',
        message: 'Your profile photo has been updated.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error uploading photo',
        message: 'Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('craver_applications')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsEditing(false);
      notifications.show({
        title: 'Profile updated',
        message: 'Your profile information has been saved.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error updating profile',
        message: 'Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box h="100vh" bg="slate.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        bg="white"
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-slate-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        className="safe-area-top"
      >
        <Group px="md" py="md" justify="space-between" align="center">
          <ActionIcon onClick={onBack} variant="subtle" color="dark">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={3} fw={700} c="dark">Profile Information</Title>
          {isEditing ? (
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={loading}
            >
              Save
            </Button>
          ) : (
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconEdit size={16} />}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </Group>
      </Paper>

      <Stack gap="md" p="md">
        {/* Profile Photo */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="xl">
            <Stack align="center" gap="md">
              <Box pos="relative">
                <Avatar size={120} radius="xl" src={profile.profile_photo}>
                  <IconUser size={60} />
                </Avatar>
                {isEditing && (
                  <ActionIcon
                    pos="absolute"
                    bottom={0}
                    right={0}
                    radius="xl"
                    color="orange"
                    variant="filled"
                    size="lg"
                    component="label"
                    htmlFor="photo-upload"
                  >
                    <IconCamera size={20} />
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                  </ActionIcon>
                )}
              </Box>
              <Text fw={600} size="lg" c="dark">
                {profile.first_name} {profile.last_name}
              </Text>
            </Stack>
          </Card.Section>
        </Card>

        {/* Profile Form */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="md">
            <Stack gap="md">
              <TextInput
                label="First Name"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                disabled={!isEditing}
                size="md"
              />

              <TextInput
                label="Last Name"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                disabled={!isEditing}
                size="md"
              />

              <TextInput
                label="Email"
                value={profile.email}
                disabled
                size="md"
                description="Email cannot be changed"
              />

              <TextInput
                label="Phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                size="md"
              />
            </Stack>
          </Card.Section>
        </Card>
      </Stack>
    </Box>
  );
};
