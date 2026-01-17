import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, TextInput, Stack, Grid, Text, Group, Box, Alert } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const ProfileCompletionForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (application) {
        setProfile({
          firstName: application.first_name || '',
          lastName: application.last_name || '',
          phone: application.phone || '',
          email: application.email || '',
          streetAddress: application.street_address || '',
          city: application.city || '',
          state: application.state || '',
          zipCode: application.zip_code || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!profile.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!profile.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!profile.streetAddress.trim()) {
      newErrors.streetAddress = 'Street address is required';
    }
    if (!profile.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!profile.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!profile.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate all fields are filled
    if (!validateProfile()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to complete this task.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!application) return;

      // Update application
      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({
          first_name: profile.firstName.trim(),
          last_name: profile.lastName.trim(),
          phone: profile.phone.trim(),
          email: profile.email.trim(),
          street_address: profile.streetAddress.trim(),
          city: profile.city.trim(),
          state: profile.state.trim(),
          zip_code: profile.zipCode.trim()
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Complete the task
      const { data: task } = await supabase
        .from('onboarding_tasks')
        .select('id')
        .eq('driver_id', application.id)
        .eq('task_key', 'complete_profile')
        .single();

      if (task) {
        const { error: completeError } = await supabase.functions.invoke('complete-onboarding-task', {
          body: {
            task_id: task.id,
            driver_id: application.id,
          },
        });

        if (completeError) {
          throw completeError;
        }
      }

      toast({
        title: "Profile Updated! ✅",
        description: "Your personal information has been saved and the task is complete.",
      });

      navigate('/enhanced-onboarding');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
      <Box style={{ maxWidth: 672, margin: '0 auto' }}>
        <Button
          variant="subtle"
          onClick={() => navigate('/enhanced-onboarding')}
          mb="md"
          leftSection={<ArrowLeft size={16} />}
        >
          Back to Onboarding
        </Button>

        <Card>
          <Stack gap="md" p="lg">
            <div>
              <Text fw={600} size="lg" mb="xs">Complete Your Profile</Text>
              <Text size="sm" c="dimmed" mb="md">
                Fill in all required information to complete this task and earn points. All fields are required.
              </Text>
            </div>

            <Alert icon={<AlertCircle size={16} />} color="orange" mb="md">
              This task is required. You must fill out all information to complete it and earn points.
            </Alert>

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="First Name"
                  placeholder="Enter your first name"
                  value={profile.firstName}
                  onChange={(e) => {
                    setProfile({ ...profile, firstName: e.target.value });
                    if (errors.firstName) {
                      setErrors({ ...errors, firstName: '' });
                    }
                  }}
                  error={errors.firstName}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={profile.lastName}
                  onChange={(e) => {
                    setProfile({ ...profile, lastName: e.target.value });
                    if (errors.lastName) {
                      setErrors({ ...errors, lastName: '' });
                    }
                  }}
                  error={errors.lastName}
                  required
                />
              </Grid.Col>
            </Grid>

            <TextInput
              label="Email"
              type="email"
              placeholder="Enter your email address"
              value={profile.email}
              onChange={(e) => {
                setProfile({ ...profile, email: e.target.value });
                if (errors.email) {
                  setErrors({ ...errors, email: '' });
                }
              }}
              error={errors.email}
              required
            />

            <TextInput
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={profile.phone}
              onChange={(e) => {
                setProfile({ ...profile, phone: e.target.value });
                if (errors.phone) {
                  setErrors({ ...errors, phone: '' });
                }
              }}
              error={errors.phone}
              required
            />

            <TextInput
              label="Street Address"
              placeholder="Enter your street address"
              value={profile.streetAddress}
              onChange={(e) => {
                setProfile({ ...profile, streetAddress: e.target.value });
                if (errors.streetAddress) {
                  setErrors({ ...errors, streetAddress: '' });
                }
              }}
              error={errors.streetAddress}
              required
            />

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="City"
                  placeholder="Enter your city"
                  value={profile.city}
                  onChange={(e) => {
                    setProfile({ ...profile, city: e.target.value });
                    if (errors.city) {
                      setErrors({ ...errors, city: '' });
                    }
                  }}
                  error={errors.city}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="State"
                  placeholder="Enter your state"
                  value={profile.state}
                  onChange={(e) => {
                    setProfile({ ...profile, state: e.target.value });
                    if (errors.state) {
                      setErrors({ ...errors, state: '' });
                    }
                  }}
                  error={errors.state}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="Zip Code"
                  placeholder="Enter your zip code"
                  value={profile.zipCode}
                  onChange={(e) => {
                    setProfile({ ...profile, zipCode: e.target.value });
                    if (errors.zipCode) {
                      setErrors({ ...errors, zipCode: '' });
                    }
                  }}
                  error={errors.zipCode}
                  required
                />
              </Grid.Col>
            </Grid>

            <Button
              onClick={handleSave}
              disabled={loading}
              fullWidth
              color="#ff7a00"
              leftSection={<Save size={16} />}
              mt="md"
            >
              {loading ? 'Saving...' : 'Save & Complete Task'}
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
};
