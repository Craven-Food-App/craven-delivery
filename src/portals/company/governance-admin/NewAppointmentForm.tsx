import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Button,
  TextInput,
  Select,
  Textarea,
  NumberInput,
  Stack,
  Group,
  Text,
  Grid,
  Title,
  Checkbox,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { IconCheck, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const NewAppointmentForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasArticles, setHasArticles] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    proposed_officer_name: '',
    proposed_officer_email: '',
    proposed_officer_phone: '',
    proposed_title: '',
    appointment_type: 'NEW',
    board_meeting_date: '',
    effective_date: '',
    term_length_months: '',
    authority_granted: '',
    reporting_to: '',
    department: '',
    compensation_structure: JSON.stringify({ 
      base_salary: 0,
      annual_bonus_percentage: 0,
      performance_bonus: '',
      benefits: '',
    }),
    equity_included: false,
    equity_details: JSON.stringify({ 
      percentage: 0, 
      share_count: 0,
      vesting_schedule: '',
      exercise_price: '',
    }),
    notes: '',
    formation_mode: false,
  });

  // Check if company has Articles of Incorporation on file
  useEffect(() => {
    const checkArticles = async () => {
      try {
        // Check if company has Articles of Incorporation on file
        const { data, error } = await supabase
          .from('company_settings')
          .select('setting_value')
          .eq('setting_key', 'has_articles_of_incorporation')
          .single();
        
        // If no record exists or value is false/null, default formation_mode to true
        const settingValue = data?.setting_value;
        const hasArticlesOnFile = settingValue === 'true';
        setHasArticles(hasArticlesOnFile);
        
        if (!hasArticlesOnFile) {
          setFormData(prev => ({ ...prev, formation_mode: true }));
        }
      } catch (error) {
        console.warn('Could not check Articles status, defaulting to false:', error);
        setHasArticles(true); // Default to false (has articles) if check fails
      }
    };
    
    checkArticles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure compensation_structure and equity_details are valid JSON
      let compensationStructure = formData.compensation_structure;
      let equityDetails = formData.equity_details;

      try {
        // Validate and parse compensation_structure
        if (compensationStructure) {
          const parsed = JSON.parse(compensationStructure);
          compensationStructure = JSON.stringify(parsed);
        } else {
          compensationStructure = JSON.stringify({ base_salary: 0 });
        }
      } catch {
        // If invalid, create default structure
        compensationStructure = JSON.stringify({ base_salary: 0 });
      }

      try {
        // Validate and parse equity_details
        if (equityDetails && formData.equity_included) {
          const parsed = JSON.parse(equityDetails);
          equityDetails = JSON.stringify(parsed);
        } else {
          equityDetails = null;
        }
      } catch {
        equityDetails = null;
      }

      // Call Edge Function to create appointment
      const { data, error } = await supabase.functions.invoke('governance-create-appointment', {
        body: {
          ...formData,
          formation_mode: formData.formation_mode || false, // Explicitly include
          compensation_structure: compensationStructure || null,
          equity_details: equityDetails || null,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Appointment draft created successfully. Documents are being generated...',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      navigate('/company/governance-admin/appointments');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create appointment',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/company/governance-admin/appointments')}
          >
            Back to Appointments
          </Button>
        </Group>

        <div>
          <Title order={1} c="dark" mb="xs">
            New Executive Appointment
          </Title>
          <Text c="dimmed" size="lg">
            Create a new executive appointment proposal for board approval.
          </Text>
        </div>

        <form onSubmit={handleSubmit}>
          <Card
            padding="lg"
            radius="md"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <Stack gap="md">
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Officer Name"
                    placeholder="John Doe"
                    required
                    value={formData.proposed_officer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, proposed_officer_name: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Email"
                    type="email"
                    placeholder="john.doe@cravenusa.com"
                    value={formData.proposed_officer_email}
                    onChange={(e) =>
                      setFormData({ ...formData, proposed_officer_email: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Phone Number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.proposed_officer_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, proposed_officer_phone: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Title"
                    placeholder="Select title"
                    required
                    data={[
                      { value: 'CEO', label: 'Chief Executive Officer' },
                      { value: 'CFO', label: 'Chief Financial Officer' },
                      { value: 'CTO', label: 'Chief Technology Officer' },
                      { value: 'COO', label: 'Chief Operating Officer' },
                      { value: 'CXO', label: 'Chief Experience Officer' },
                      { value: 'CMO', label: 'Chief Marketing Officer' },
                      { value: 'CHRO', label: 'Chief Human Resources Officer' },
                      { value: 'CCO', label: 'Chief Compliance Officer' },
                      { value: 'CLO', label: 'Chief Legal Officer' },
                      { value: 'President', label: 'President' },
                      { value: 'VP', label: 'Vice President' },
                    ]}
                    value={formData.proposed_title}
                    onChange={(value) =>
                      setFormData({ ...formData, proposed_title: value || '' })
                    }
                    searchable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Department"
                    placeholder="e.g., Engineering, Sales, Operations"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Appointment Type"
                    required
                    data={[
                      { value: 'NEW', label: 'New Appointment' },
                      { value: 'REPLACEMENT', label: 'Replacement' },
                      { value: 'INTERIM', label: 'Interim' },
                    ]}
                    value={formData.appointment_type}
                    onChange={(value) =>
                      setFormData({ ...formData, appointment_type: value || 'NEW' })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12 }}>
                  <Checkbox
                    label="Formation Mode (Pre-Incorporation Consent Required)"
                    description="Enable if this appointment is part of company formation and Articles of Incorporation are not yet filed"
                    checked={formData.formation_mode}
                    onChange={(e) =>
                      setFormData({ ...formData, formation_mode: e.currentTarget.checked })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Board Meeting Date"
                    type="date"
                    value={formData.board_meeting_date}
                    onChange={(e) =>
                      setFormData({ ...formData, board_meeting_date: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Effective Date"
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) =>
                      setFormData({ ...formData, effective_date: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Term Length (Months)"
                    placeholder="36"
                    value={formData.term_length_months}
                    onChange={(value) =>
                      setFormData({ ...formData, term_length_months: String(value || '') })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Reporting To"
                    placeholder="e.g., Board of Directors, CEO"
                    value={formData.reporting_to}
                    onChange={(e) =>
                      setFormData({ ...formData, reporting_to: e.target.value })
                    }
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12 }}>
                  <Textarea
                    label="Authority Granted"
                    placeholder="Describe the authority and responsibilities..."
                    value={formData.authority_granted}
                    onChange={(e) =>
                      setFormData({ ...formData, authority_granted: e.target.value })
                    }
                    rows={3}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12 }}>
                  <Text fw={600} size="sm" mb="xs">Compensation</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Base Salary (Annual)"
                    placeholder="150000"
                    required
                    value={(() => {
                      try {
                        return formData.compensation_structure ? JSON.parse(formData.compensation_structure)?.base_salary || '' : '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(value) => {
                      try {
                        const current = formData.compensation_structure ? JSON.parse(formData.compensation_structure) : {};
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ ...current, base_salary: Number(value) || 0 }),
                        });
                      } catch {
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ base_salary: Number(value) || 0 }),
                        });
                      }
                    }}
                    prefix="$"
                    thousandSeparator=","
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Annual Bonus Percentage"
                    placeholder="20"
                    value={(() => {
                      try {
                        return formData.compensation_structure ? JSON.parse(formData.compensation_structure)?.annual_bonus_percentage || '' : '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(value) => {
                      try {
                        const current = formData.compensation_structure ? JSON.parse(formData.compensation_structure) : {};
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ ...current, annual_bonus_percentage: Number(value) || 0 }),
                        });
                      } catch {
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ annual_bonus_percentage: Number(value) || 0 }),
                        });
                      }
                    }}
                    suffix="%"
                    decimalScale={2}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Textarea
                    label="Performance Bonus Structure"
                    placeholder="Describe performance bonus criteria and structure..."
                    value={(() => {
                      try {
                        return formData.compensation_structure ? (JSON.parse(formData.compensation_structure)?.performance_bonus || '') : '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      try {
                        const current = formData.compensation_structure ? JSON.parse(formData.compensation_structure) : {};
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ ...current, performance_bonus: e.target.value }),
                        });
                      } catch {
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ performance_bonus: e.target.value }),
                        });
                      }
                    }}
                    rows={2}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Textarea
                    label="Benefits Package"
                    placeholder="Health insurance, retirement, PTO, etc."
                    value={(() => {
                      try {
                        return formData.compensation_structure ? (JSON.parse(formData.compensation_structure)?.benefits || '') : '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      try {
                        const current = formData.compensation_structure ? JSON.parse(formData.compensation_structure) : {};
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ ...current, benefits: e.target.value }),
                        });
                      } catch {
                        setFormData({
                          ...formData,
                          compensation_structure: JSON.stringify({ benefits: e.target.value }),
                        });
                      }
                    }}
                    rows={2}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12 }}>
                  <Checkbox
                    label="Equity Included"
                    checked={formData.equity_included}
                    onChange={(e) =>
                      setFormData({ ...formData, equity_included: e.currentTarget.checked })
                    }
                  />
                </Grid.Col>
                {formData.equity_included && (
                  <>
                    <Grid.Col span={{ base: 12 }}>
                      <Text fw={600} size="sm" mb="xs">Equity Details</Text>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="Equity Percentage"
                        placeholder="5.0"
                        value={(() => {
                          try {
                            return formData.equity_details ? JSON.parse(formData.equity_details)?.percentage || '' : '';
                          } catch {
                            return '';
                          }
                        })()}
                        onChange={(value) => {
                          try {
                            const current = formData.equity_details ? JSON.parse(formData.equity_details) : {};
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ ...current, percentage: Number(value) || 0 }),
                            });
                          } catch {
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ percentage: Number(value) || 0 }),
                            });
                          }
                        }}
                        suffix="%"
                        decimalScale={2}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="Share Count"
                        placeholder="10000"
                        value={(() => {
                          try {
                            return formData.equity_details ? JSON.parse(formData.equity_details)?.share_count || '' : '';
                          } catch {
                            return '';
                          }
                        })()}
                        onChange={(value) => {
                          try {
                            const current = formData.equity_details ? JSON.parse(formData.equity_details) : {};
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ ...current, share_count: Number(value) || 0 }),
                            });
                          } catch {
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ share_count: Number(value) || 0 }),
                            });
                          }
                        }}
                        thousandSeparator=","
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Textarea
                        label="Vesting Schedule"
                        placeholder="e.g., 4-year vesting, 25% after 1 year, monthly thereafter"
                        value={(() => {
                          try {
                            return formData.equity_details ? (JSON.parse(formData.equity_details)?.vesting_schedule || '') : '';
                          } catch {
                            return '';
                          }
                        })()}
                        onChange={(e) => {
                          try {
                            const current = formData.equity_details ? JSON.parse(formData.equity_details) : {};
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ ...current, vesting_schedule: e.target.value }),
                            });
                          } catch {
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ vesting_schedule: e.target.value }),
                            });
                          }
                        }}
                        rows={2}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Exercise Price (if applicable)"
                        placeholder="e.g., $0.01 per share"
                        value={(() => {
                          try {
                            return formData.equity_details ? (JSON.parse(formData.equity_details)?.exercise_price || '') : '';
                          } catch {
                            return '';
                          }
                        })()}
                        onChange={(e) => {
                          try {
                            const current = formData.equity_details ? JSON.parse(formData.equity_details) : {};
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ ...current, exercise_price: e.target.value }),
                            });
                          } catch {
                            setFormData({
                              ...formData,
                              equity_details: JSON.stringify({ exercise_price: e.target.value }),
                            });
                          }
                        }}
                      />
                    </Grid.Col>
                  </>
                )}
                <Grid.Col span={{ base: 12 }}>
                  <Textarea
                    label="Additional Notes"
                    placeholder="Any additional information..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </Grid.Col>
              </Grid>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => navigate('/company/governance-admin/appointments')}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Create Appointment Draft
                </Button>
              </Group>
            </Stack>
          </Card>
        </form>
      </Stack>
    </Container>
  );
};

export default NewAppointmentForm;
