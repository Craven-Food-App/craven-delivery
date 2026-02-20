// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { TextInput, Button, Card, Text, Stack, Checkbox, Alert, Grid, Box, Loader, Select } from '@mantine/core';
import { User, Mail, Phone, MapPin, Lock, ArrowLeft, Eye, EyeOff, Search } from 'lucide-react';
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [noMiddleName, setNoMiddleName] = useState(false);
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  const form = useForm({
    initialValues: {
      legalFirstName: '',
      legalMiddleName: '',
      legalLastName: '',
      country: 'US',
      zip: '',
      password: '',
      email: applicationData?.email || '',
      phone: applicationData?.phone || '',
    },
    validate: {
      legalFirstName: (value) => (!value ? 'Please enter your legal first name' : null),
      legalMiddleName: (value, values) => {
        if (noMiddleName) return null;
        return null; // Middle name is optional
      },
      legalLastName: (value) => (!value ? 'Please enter your legal last name' : null),
      country: (value) => (!value ? 'Please select a country' : null),
      zip: (value) => (!value ? 'Please enter your ZIP code' : !/^\d{5}(-\d{4})?$/.test(value) ? 'Invalid ZIP format' : null),
      password: (value) => {
        if (isLoggedIn) return null; // Password optional if already logged in
        if (!value) return 'Please enter a password';
        if (value.length < 10) return 'Password must be at least 10 characters';
        if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must include a number';
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return 'Password must include a special character';
        return null;
      },
    },
  });

  // Update form when applicationData changes (from signup box)
  useEffect(() => {
    if (applicationData?.email || applicationData?.phone) {
      form.setValues({
        email: applicationData.email || form.values.email,
        phone: applicationData.phone || form.values.phone,
      });
    }
  }, [applicationData?.email, applicationData?.phone]);

  // Handle no middle name checkbox
  useEffect(() => {
    if (noMiddleName) {
      form.setFieldValue('legalMiddleName', '');
    }
  }, [noMiddleName]);

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
      // 1. Check if user is already logged in (created from FeederHub signup)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let userId: string;

      if (currentUser) {
        // User already exists - use existing user
        userId = currentUser.id;
        
        // Update password if provided
        if (values.password) {
          const { error: passwordError } = await supabase.auth.updateUser({
            password: values.password
          });
          if (passwordError) {
            console.warn('Could not update password:', passwordError);
          }
        }
      } else {
        // Create new auth user
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
          if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
            toast({
              title: "Error",
              description: "An account with this email already exists. Please login.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error('Failed to create user account');
        }

        userId = authData.user.id;
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

      // 3. Use separate name fields
      const firstName = values.legalFirstName || '';
      const middleName = noMiddleName ? '' : (values.legalMiddleName || '');
      const lastName = values.legalLastName || '';

      // 4. Check if application already exists
      const { data: existingApp } = await supabase
        .from('craver_applications')
        .select('id, waitlist_position')
        .eq('user_id', userId)
        .maybeSingle();

      let appData;
      if (existingApp) {
        // Application already exists, use it
        appData = existingApp;
      } else {
        // Create feeder application (waitlisted)
        const { data: newAppData, error: appError } = await supabase
          .from('craver_applications')
          .insert({
            user_id: userId,
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

        appData = newAppData;
      }

      // 5. Update or create user profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim();
        await supabase.from('user_profiles')
          .update({
            full_name: fullName,
            phone: values.phone,
            email: values.email,
            role: 'driver'
          })
          .eq('user_id', userId);
      } else {
        // Create new profile
        const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim();
        await supabase.from('user_profiles').insert({
          user_id: userId,
          full_name: fullName,
          phone: values.phone,
          email: values.email,
          role: 'driver'
        });
      }

      // 6. Get waitlist position (might be calculated by trigger)
      let waitlistPosition = appData.waitlist_position;
      if (!waitlistPosition && appData.id) {
        try {
          const { data: positionData, error: positionError } = await supabase.rpc('get_driver_queue_position', {
            driver_uuid: appData.id
          });
          if (!positionError && positionData && positionData[0]) {
            waitlistPosition = positionData[0].queue_position;
          }
        } catch (positionErr) {
          console.warn('Could not fetch waitlist position:', positionErr);
        }
      }

      // 7. Send waitlist email
      try {
        const emailPayload = {
          driverName: `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim(),
          driverEmail: values.email,
          city: detectedLocation?.city || '',
          state: detectedLocation?.state || '',
          waitlistPosition: waitlistPosition || 0,
          location: regionName,
          emailType: 'waitlist' as const
        };

        console.log('Sending waitlist email with payload:', { ...emailPayload, driverEmail: values.email });

        const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-driver-waitlist-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const responseText = await emailResponse.text();
        console.log('Email response status:', emailResponse.status);
        console.log('Email response text:', responseText);

        if (!emailResponse.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            errorData = { error: responseText };
          }
          
          console.error('Waitlist email sending failed:', {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            error: errorData
          });
          
          toast({
            title: "Email Warning",
            description: `Application submitted, but email notification failed: ${errorData.error || 'Unknown error'}. Please check your email inbox.`,
            variant: "default",
          });
        } else {
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            result = { message: responseText };
          }
          console.log('Waitlist email sent successfully:', result);
          
          if (result.error) {
            console.error('Email function returned error:', result.error);
            toast({
              title: "Email Warning",
              description: `Application submitted, but email notification failed: ${result.error}. Please check your email inbox.`,
              variant: "default",
            });
          }
        }
      } catch (emailError: any) {
        console.error('Waitlist email sending error:', emailError);
        toast({
          title: "Email Warning",
          description: `Application submitted, but email notification failed: ${emailError.message || 'Network error'}. Please check your email inbox.`,
          variant: "default",
        });
      }

      // 8. Notify CEO of new driver signup
      try {
        const driverFullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim();
        const ceoEmails = ['tstroman.ceo@cravenusa.com', 'craven@usa.com'];
        const notificationSubject = `🚗 New Feeder Application: ${driverFullName}`;
        const notificationBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EA580C;">New Feeder Driver Application</h2>
            <p>A new driver has applied to become a Feeder.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">Name</td><td style="padding: 8px;">${driverFullName}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Email</td><td style="padding: 8px;">${values.email}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">Phone</td><td style="padding: 8px;">${values.phone || 'Not provided'}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Location</td><td style="padding: 8px;">${detectedLocation?.city || ''}, ${detectedLocation?.state || ''} ${values.zip}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">Region</td><td style="padding: 8px;">${regionName || 'Unknown'}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #555;">Applied At</td><td style="padding: 8px;">${new Date().toLocaleString()}</td></tr>
            </table>
            <p style="margin-top: 24px; color: #888; font-size: 12px;">This is an automated notification from Crave'N Delivery.</p>
          </div>
        `;

        await Promise.all(ceoEmails.map(email =>
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              recipientEmail: email,
              recipientName: 'CEO',
              subject: notificationSubject,
              body: notificationBody,
              type: 'new_driver_signup',
              metadata: { driverName: driverFullName, driverEmail: values.email, region: regionName }
            }),
          })
        ));
        console.log('CEO notifications sent for new driver signup');
      } catch (ceoNotifyError) {
        console.warn('Could not send CEO notification:', ceoNotifyError);
      }

      // Clear secure storage after successful submission
      import('@/utils/storage').then(({ secureRemoveItem }) => {
        secureRemoveItem('feeder_signup_email');
        secureRemoveItem('feeder_signup_phone');
      }).catch(() => {
        // Fallback to regular localStorage removal
        localStorage.removeItem('feeder_signup_email');
        localStorage.removeItem('feeder_signup_phone');
      });

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
    <Box
      style={{
        width: '100%',
        minHeight: '100vh',
        padding: '80px 24px 40px',
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF'
      }}
    >
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="xs">
          <Text fw={700} size="2xl" style={{ fontSize: '32px', color: '#191919' }}>
            Let's sign you up to Feed!
          </Text>
        </Stack>

        {/* Form */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Legal First Name */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: '#191919' }}>
                Legal first name
              </Text>
              <TextInput
                placeholder=""
                size="md"
                styles={{
                  input: {
                    backgroundColor: '#F5F5F5',
                    border: 'none',
                    color: '#191919'
                  }
                }}
                {...form.getInputProps('legalFirstName')}
              />
            </div>

            {/* Legal Middle Name */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: '#191919' }}>
                Legal middle name
              </Text>
              <TextInput
                placeholder=""
                size="md"
                disabled={noMiddleName}
                styles={{
                  input: {
                    backgroundColor: noMiddleName ? '#E0E0E0' : '#F5F5F5',
                    border: 'none',
                    color: '#191919'
                  }
                }}
                {...form.getInputProps('legalMiddleName')}
              />
              <Checkbox
                checked={noMiddleName}
                onChange={(e) => setNoMiddleName(e.currentTarget.checked)}
                label={<Text size="sm" style={{ color: '#666' }}>No middle name</Text>}
                mt="xs"
              />
            </div>

            {/* Legal Last Name */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: '#191919' }}>
                Legal last name
              </Text>
              <TextInput
                placeholder=""
                size="md"
                styles={{
                  input: {
                    backgroundColor: '#F5F5F5',
                    border: 'none',
                    color: '#191919'
                  }
                }}
                {...form.getInputProps('legalLastName')}
              />
            </div>

            {/* Country and Zip Code */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: '#191919' }}>
                Country
              </Text>
              <Grid gutter="sm">
                <Grid.Col span={6}>
                  <Select
                    data={[
                      { value: 'US', label: 'US US' },
                      { value: 'CA', label: 'CA Canada' },
                      { value: 'MX', label: 'MX Mexico' },
                    ]}
                    {...form.getInputProps('country')}
                    styles={{
                      input: {
                        backgroundColor: '#F5F5F5',
                        border: 'none',
                      }
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <div>
                    <Text size="sm" fw={500} mb="xs" style={{ color: '#191919' }}>
                      Zip code
                    </Text>
                    <TextInput
                      placeholder=""
                      size="md"
                      disabled={locationLoading}
                      rightSection={<Search size={16} style={{ color: '#666' }} />}
                      styles={{
                        input: {
                          backgroundColor: '#F5F5F5',
                          border: 'none',
                          color: '#191919'
                        }
                      }}
                      {...form.getInputProps('zip')}
                    />
                  </div>
                </Grid.Col>
              </Grid>
            </div>

            {/* Password */}
            {!isLoggedIn && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <Text size="sm" fw={500} style={{ color: '#191919' }}>
                    Password
                  </Text>
                  <Button
                    type="button"
                    variant="subtle"
                    size="xs"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ padding: '4px 8px', height: 'auto', color: '#666' }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder=""
                  size="md"
                  styles={{
                    input: {
                      backgroundColor: '#F5F5F5',
                      border: 'none',
                      color: '#191919'
                    }
                  }}
                  {...form.getInputProps('password')}
                />
                <Text size="xs" mt="xs" style={{ color: '#666' }}>
                  Minimum 10 characters: including upper case, lower case, a number, and a special character
                </Text>
              </div>
            )}

            {/* Continue Button */}
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              style={{
                height: '48px',
                backgroundColor: '#DC2626',
                borderRadius: '8px',
                marginTop: '16px'
              }}
            >
              Continue
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};
