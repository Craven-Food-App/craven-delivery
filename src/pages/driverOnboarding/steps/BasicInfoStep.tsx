import React, { useState, useEffect } from 'react';
import { TextInput, Button, Card, Text, Stack, Checkbox, Alert, Grid, Box, Loader } from '@mantine/core';
import { User, Mail, Phone, MapPin, Lock, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from '@mantine/form';
import { useToast } from '@/hooks/use-toast';

interface BasicInfoStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  applicationData: any;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ onNext, onBack, applicationData }) => {
  const [loading, setLoading] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{ city: string; state: string; zip: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm({
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      zip: '',
      password: '',
      confirmPassword: '',
      ageVerified: false,
    },
    validate: {
      fullName: (value) => (!value ? 'Please enter your full name' : value.length < 3 ? 'Name must be at least 3 characters' : null),
      email: (value) => (!value ? 'Please enter your email' : !/^\S+@\S+$/.test(value) ? 'Invalid email format' : null),
      phone: (value) => (!value ? 'Please enter your phone number' : !/^[\d\s\-()+]+$/.test(value) ? 'Invalid phone format' : null),
      zip: (value) => (!value ? 'Please confirm your ZIP code' : !/^\d{5}(-\d{4})?$/.test(value) ? 'Invalid ZIP format' : null),
      password: (value) => (!value ? 'Please enter a password' : value.length < 8 ? 'Password must be at least 8 characters' : null),
      confirmPassword: (value, values) => (!value ? 'Please confirm your password' : value !== values.password ? 'Passwords do not match' : null),
      ageVerified: (value) => (!value ? 'You must confirm you are 18+ to apply' : null),
    },
  });

  // Detect location on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Reverse geocode using Nominatim (free, no API key needed)
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const data = await response.json();
              
              if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || '';
                const state = data.address.state || '';
                const zip = data.address.postcode || '';
                
                // Convert state name to abbreviation
                const stateAbbr = getStateAbbreviation(state);
                
                const location = { city, state: stateAbbr, zip };
                setDetectedLocation(location);
                form.setFieldValue('zip', zip);
                toast({
                  title: "Location Detected",
                  description: `${city}, ${stateAbbr}`,
                });
              }
              setLocationLoading(false);
            },
            (error) => {
              console.error('Geolocation error:', error);
              toast({
                title: "Location Detection",
                description: "Could not detect location. Using IP-based detection...",
                variant: "default",
              });
              fallbackToIPLocation();
            }
          );
        } else {
          fallbackToIPLocation();
        }
      } catch (error) {
        console.error('Location detection error:', error);
        setLocationLoading(false);
        toast({
          title: "Error",
          description: "Location detection failed",
          variant: "destructive",
        });
      }
    };

    const fallbackToIPLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const location = {
          city: data.city || '',
          state: data.region_code || '',
          zip: data.postal || ''
        };
        setDetectedLocation(location);
        form.setFieldValue('zip', location.zip);
        toast({
          title: "Location Detected",
          description: `${location.city}, ${location.state}`,
        });
      } catch (error) {
        console.error('IP location error:', error);
        toast({
          title: "Error",
          description: "Could not detect location automatically",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(false);
      }
    };

    detectLocation();
  }, []);

  // Helper function to convert state names to abbreviations
  const getStateAbbreviation = (stateName: string): string => {
    const stateMap: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    return stateMap[stateName] || stateName.substring(0, 2).toUpperCase();
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            phone: values.phone,
            user_type: 'driver'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // 2. Determine region based on ZIP
      let regionId = null;
      let regionName = '';
      const { data: regionsData } = await supabase
        .from('regions')
        .select('id, zip_prefix, name')
        .order('created_at');

      // Find matching region by zip_prefix
      if (regionsData && regionsData.length > 0) {
        const matchingRegion = regionsData.find(r => 
          values.zip.startsWith(r.zip_prefix)
        );
        regionId = matchingRegion?.id || regionsData[0].id; // Default to first region if no match
        regionName = matchingRegion?.name || regionsData[0].name || '';
      }

      // 3. Parse full name
      const nameParts = values.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // 4. Create feeder application (waitlisted)
      const { data: appData, error: appError } = await supabase
        .from('feeder_applications')
        .insert({
          user_id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email: values.email,
          phone: values.phone,
          city: detectedLocation?.city || '',
          state: detectedLocation?.state || '',
          zip_code: values.zip,
          status: 'waitlist',
          region_id: regionId,
          points: 0,
          priority_score: 0,
          waitlist_joined_at: new Date().toISOString(),
          tos_accepted: applicationData?.termsAccepted || false,
          privacy_accepted: applicationData?.privacyAccepted || false
        })
        .select()
        .single();

      if (appError) {
        console.error('Application creation error:', appError);
        throw appError;
      }

      // 5. Create user profile
      await supabase.from('user_profiles').insert({
        user_id: authData.user.id,
        full_name: values.fullName,
        phone: values.phone,
        role: 'driver'
      });

      // 6. Send waitlist email
      try {
        const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-driver-waitlist-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            driverName: values.fullName,
            driverEmail: values.email,
            city: detectedLocation?.city || '',
            state: detectedLocation?.state || '',
            waitlistPosition: appData.waitlist_position,
            location: regionName,
            emailType: 'waitlist'
          }),
        });

        if (!emailResponse.ok) {
          console.log('Warning: Waitlist email sending failed');
        }
      } catch (emailError) {
        console.log('Warning: Waitlist email sending error:', emailError);
      }

      toast({
        title: "Success",
        description: "Application submitted successfully!",
      });

      // Continue to success step
      onNext({
        applicationId: appData.id,
        driverId: appData.id,
        email: values.email,
        city: detectedLocation?.city || '',
        state: detectedLocation?.state || '',
        regionId,
        ...values
      });

    } catch (error: any) {
      console.error('Application error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to submit application',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      p="lg"
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      <Stack gap="lg">
        {/* Header */}
        <Stack align="center" gap="md">
          <Box
            style={{
              padding: 12,
              backgroundColor: 'rgba(255, 122, 0, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={48} style={{ color: '#ff7a00' }} />
          </Box>
          <div style={{ textAlign: 'center' }}>
            <Text fw={700} size="xl">Tell Us About Yourself</Text>
            <Text c="dimmed" size="sm" mt="xs">
              We need some basic information to get started
            </Text>
          </div>
          {locationLoading && (
            <Alert color="blue" icon={<Loader size={16} />}>
              📍 Detecting your location...
            </Alert>
          )}
          {detectedLocation && (
            <Alert color="green">
              ✓ Location Detected: {detectedLocation.city}, {detectedLocation.state}
            </Alert>
          )}
        </Stack>

        {/* Form */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Full Name"
              placeholder="John Smith"
              leftSection={<User size={16} style={{ color: '#ff7a00' }} />}
              size="lg"
              {...form.getInputProps('fullName')}
            />

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Email"
                  type="email"
                  placeholder="john@example.com"
                  leftSection={<Mail size={16} style={{ color: '#ff7a00' }} />}
                  size="lg"
                  {...form.getInputProps('email')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Phone"
                  placeholder="(555) 123-4567"
                  leftSection={<Phone size={16} style={{ color: '#ff7a00' }} />}
                  size="lg"
                  {...form.getInputProps('phone')}
                />
              </Grid.Col>
            </Grid>

            <TextInput
              label="ZIP Code (Auto-detected)"
              placeholder="ZIP code will be auto-detected"
              leftSection={<MapPin size={16} style={{ color: '#ff7a00' }} />}
              size="lg"
              disabled={locationLoading}
              {...form.getInputProps('zip')}
            />

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Password"
                  type="password"
                  placeholder="Create password"
                  leftSection={<Lock size={16} style={{ color: '#ff7a00' }} />}
                  size="lg"
                  {...form.getInputProps('password')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm password"
                  size="lg"
                  {...form.getInputProps('confirmPassword')}
                />
              </Grid.Col>
            </Grid>

            {/* Age Verification */}
            <Box
              p="md"
              style={{
                backgroundColor: '#fffbe6',
                borderRadius: '8px',
                border: '1px solid #ffd666'
              }}
            >
              <Checkbox
                {...form.getInputProps('ageVerified', { type: 'checkbox' })}
                label={
                  <Text size="sm">
                    I confirm that I am at least 18 years of age and legally authorized to work as a delivery driver.
                  </Text>
                }
              />
            </Box>

            {/* Action Buttons */}
            <Grid gutter="md" mt="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Button
                  size="lg"
                  fullWidth
                  variant="outline"
                  onClick={onBack}
                  leftSection={<ArrowLeft size={18} />}
                  style={{ height: '50px' }}
                >
                  Back
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={loading}
                  style={{
                    height: '50px',
                  }}
                  color="#ff7a00"
                >
                  Submit Application
                </Button>
              </Grid.Col>
            </Grid>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
};
