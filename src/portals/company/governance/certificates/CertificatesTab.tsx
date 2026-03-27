// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Table,
  Badge,
  Button,
  Group,
  TextInput,
  Modal,
  Loader,
  Alert,
  Anchor,
  Tabs,
  NumberFormatter,
} from '@mantine/core';
import { IconCertificate, IconDownload, IconEye, IconAlertCircle, IconRefresh, IconPlus } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface Certificate {
  id: string;
  certificate_number: string;
  recipient_user_id: string;
  shares_amount: number;
  share_class: string;
  issue_date: string;
  status: string;
  document_url: string | null;
  recipient_name?: string;
  recipient_email?: string;
}

interface PendingCertificate {
  recipient_user_id: string;
  recipient_name: string;
  recipient_email: string;
  shares_amount: number;
  share_class: string;
  grant_date: string;
  equity_ledger_id: string;
}

const CertificatesTab: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [pendingCertificates, setPendingCertificates] = useState<PendingCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [fullScreenCertificate, setFullScreenCertificate] = useState<Certificate | null>(null);
  const [activeTab, setActiveTab] = useState<string>('issued');

  useEffect(() => {
    loadCertificates();
    loadPendingCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      // Only load certificates that have a document_url (fully issued certificates)
      const { data, error } = await supabase
        .from('share_certificates')
        .select('*')
        .not('document_url', 'is', null)
        .neq('document_url', '')
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Enrich with user info
      const enrichedCertificates = await Promise.all(
        (data || []).map(async (cert) => {
          // Skip if recipient_user_id is missing
          if (!cert.recipient_user_id) {
            return {
              ...cert,
              recipient_name: 'Unknown',
              recipient_email: '',
            };
          }

          // Try user_profiles first
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', cert.recipient_user_id)
            .maybeSingle();

          if (profile?.full_name) {
            return {
              ...cert,
              recipient_name: profile.full_name,
              recipient_email: profile.email || '',
            };
          }

          // Try exec_users as fallback
          const { data: execUser } = await supabase
            .from('exec_users')
            .select('name, title')
            .eq('user_id', cert.recipient_user_id)
            .maybeSingle();
          
          if (execUser?.name || execUser?.title) {
            return {
              ...cert,
              recipient_name: execUser.name || execUser.title || 'Unknown',
              recipient_email: '',
            };
          }

          // Try to get email from auth.users via a workaround
          // Since we can't directly query auth.users, try known mappings
          const knownUsers: Record<string, { name: string; email: string }> = {
            '8829227c-cd71-459b-a0f6-9b0f0dcb6372': {
              name: 'Torrance Stroman',
              email: 'tstroman.ceo@cravenusa.com',
            },
            '5a259c29-8cdd-4569-9a3c-4f7481f1b441': {
              name: 'Justin Sweet',
              email: 'jsweet.cfo@cravenusa.com',
            },
          };

          if (knownUsers[cert.recipient_user_id]) {
            return {
              ...cert,
              recipient_name: knownUsers[cert.recipient_user_id].name,
              recipient_email: knownUsers[cert.recipient_user_id].email,
            };
          }

          return {
            ...cert,
            recipient_name: 'Unknown',
            recipient_email: '',
          };
        })
      );

      setCertificates(enrichedCertificates);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load certificates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCertificates = async () => {
    try {
      const pending: PendingCertificate[] = [];

      // Known users mapping for fallback
      const knownUsers: Record<string, { name: string; email: string }> = {
        '8829227c-cd71-459b-a0f6-9b0f0dcb6372': {
          name: 'Torrance Stroman',
          email: 'tstroman.ceo@cravenusa.com',
        },
        '5a259c29-8cdd-4569-9a3c-4f7481f1b441': {
          name: 'Justin Sweet',
          email: 'jsweet.cfo@cravenusa.com',
        },
      };

      // 1. Find equity grants that should have certificates but don't
      const { data: equityGrants, error } = await supabase
        .from('equity_ledger')
        .select('id, recipient_user_id, shares_amount, share_class, transaction_date, transaction_type')
        .eq('transaction_type', 'grant')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      console.log('📋 [PENDING] Found equity grants:', equityGrants?.length || 0);

      // Get all existing certificates
      const { data: existingCerts } = await supabase
        .from('share_certificates')
        .select('recipient_user_id, shares_amount, document_url');

      // Find grants without certificates OR with certificates that don't have document_url
      for (const grant of equityGrants || []) {
        // Check if certificate exists for this grant AND has a document_url
        const hasCompleteCertificate = existingCerts?.some(
          cert => cert.recipient_user_id === grant.recipient_user_id && 
                   cert.shares_amount === grant.shares_amount &&
                   cert.document_url &&
                   cert.document_url !== ''
        );

        // Include if no certificate exists OR certificate exists but has no document_url
        if (!hasCompleteCertificate) {
          // Get user info - try known users first
          let name = '';
          let email = '';

          if (knownUsers[grant.recipient_user_id]) {
            name = knownUsers[grant.recipient_user_id].name;
            email = knownUsers[grant.recipient_user_id].email;
          } else {
            // Try user_profiles
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', grant.recipient_user_id)
              .maybeSingle();

            name = profile?.full_name || '';
            email = profile?.email || '';

            // Try exec_users as fallback (skip if recipient_user_id is empty to avoid 400)
            if (!name && grant.recipient_user_id) {
              const { data: execUser } = await supabase
                .from('exec_users')
                .select('name, title')
                .eq('user_id', grant.recipient_user_id)
                .maybeSingle();
              
              if (execUser) {
                name = execUser.name || execUser.title || '';
              }
            }
          }

          // Always include if it's a known user, or if we found a name
          const finalName = name || knownUsers[grant.recipient_user_id]?.name;
          const finalEmail = email || knownUsers[grant.recipient_user_id]?.email || '';
          
          if (finalName || knownUsers[grant.recipient_user_id]) {
            pending.push({
              recipient_user_id: grant.recipient_user_id,
              recipient_name: finalName || 'Unknown',
              recipient_email: finalEmail,
              shares_amount: grant.shares_amount,
              share_class: grant.share_class || 'Common',
              grant_date: grant.transaction_date,
              equity_ledger_id: grant.id,
            });
            console.log('✅ [PENDING] Added grant to pending:', grant.recipient_user_id, grant.shares_amount, finalName || 'Unknown');
          } else {
            console.log('⚠️ [PENDING] Skipped grant - no name found:', grant.recipient_user_id, grant.shares_amount);
          }
        }
      }

      // 2. Find existing certificates that don't have document_url (need document generation)
      const { data: certificatesWithoutDoc, error: certError } = await supabase
        .from('share_certificates')
        .select('id, recipient_user_id, shares_amount, share_class, issue_date, certificate_number')
        .or('document_url.is.null,document_url.eq.');

      if (!certError && certificatesWithoutDoc) {
        for (const cert of certificatesWithoutDoc) {
          // Get user info
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', cert.recipient_user_id)
            .maybeSingle();

          // Check exec_users as fallback
          let name = profile?.full_name || '';
          let email = profile?.email || '';

          if (!name && cert.recipient_user_id) {
            const { data: execUser } = await supabase
              .from('exec_users')
              .select('name, title')
              .eq('user_id', cert.recipient_user_id)
              .maybeSingle();
            
            if (execUser) {
              name = execUser.name || execUser.title || 'Unknown';
            }
          }

          // Check known users (defined above)
          if (knownUsers[cert.recipient_user_id]) {
            name = knownUsers[cert.recipient_user_id].name;
            email = knownUsers[cert.recipient_user_id].email;
          }

          if (name && name !== 'Unknown') {
            // Check if already in pending (avoid duplicates)
            const alreadyPending = pending.some(
              p => p.recipient_user_id === cert.recipient_user_id && 
                   p.shares_amount === cert.shares_amount
            );

            if (!alreadyPending) {
              pending.push({
                recipient_user_id: cert.recipient_user_id,
                recipient_name: name,
                recipient_email: email,
                shares_amount: cert.shares_amount,
                share_class: cert.share_class || 'Common',
                grant_date: cert.issue_date,
                equity_ledger_id: cert.id, // Using certificate id as identifier
              });
            }
          }
        }
      }

      console.log('📋 [PENDING] Total pending certificates:', pending.length);
      console.log('📋 [PENDING] Pending list:', pending);
      setPendingCertificates(pending);
    } catch (error: any) {
      console.error('Error loading pending certificates:', error);
    }
  };

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPending = pendingCertificates.filter(
    (pending) => {
      // If search term is empty, show all
      if (!searchTerm || searchTerm.trim() === '') {
        return true;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = pending.recipient_name?.toLowerCase().includes(searchLower) || false;
      const emailMatch = pending.recipient_email?.toLowerCase().includes(searchLower) || false;
      return nameMatch || emailMatch;
    }
  );

  // Debug logging
  if (pendingCertificates.length > 0) {
    console.log('🔍 [PENDING] Filtering:', {
      total: pendingCertificates.length,
      searchTerm: searchTerm || '(empty)',
      filtered: filteredPending.length,
      items: pendingCertificates.map(p => ({ 
        name: p.recipient_name || '(no name)', 
        email: p.recipient_email || '(no email)', 
        shares: p.shares_amount,
        ledger_id: p.equity_ledger_id 
      }))
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'replaced':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const handleGenerateCertificate = async (pending: PendingCertificate) => {
    try {
      // Call the governance-issue-shares function to generate certificate
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        notifications.show({
          title: 'Error',
          message: 'You must be logged in to generate certificates',
          color: 'red',
        });
        return;
      }

      // Check if this is an existing certificate that just needs a document
      const { data: existingCert } = await supabase
        .from('share_certificates')
        .select('id, certificate_number, document_url')
        .eq('recipient_user_id', pending.recipient_user_id)
        .eq('shares_amount', pending.shares_amount)
        .maybeSingle();

      if (existingCert && !existingCert.document_url) {
        // Certificate exists but needs document - call generate-certificate
        // Note: This may fail if certificate_number already exists, but the function should handle it
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/governance-generate-certificate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipient_user_id: pending.recipient_user_id,
            shares_amount: pending.shares_amount,
            share_class: pending.share_class,
            certificate_number: existingCert.certificate_number,
            resolution_id: null,
            appointment_id: null,
          }),
        });

        if (!response.ok) {
          // If it fails because certificate exists, try issue-shares which may handle updates
          const errorText = await response.text();
          const error = errorText ? JSON.parse(errorText) : { error: `HTTP ${response.status}` };
          if (error.error?.includes('unique') || error.error?.includes('exists')) {
            // Fall back to issue-shares which should handle existing certificates
            const issueResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/governance-issue-shares`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                recipient_user_id: pending.recipient_user_id,
                shares_amount: pending.shares_amount,
                share_class: pending.share_class,
              }),
            });

            if (!issueResponse.ok) {
              const issueText = await issueResponse.text();
              const issueError = issueText ? JSON.parse(issueText) : { error: `HTTP ${issueResponse.status}` };
              throw new Error(issueError.error || 'Failed to generate certificate document');
            }
          } else {
            throw new Error(error.error || 'Failed to generate certificate');
          }
        } else {
          // Success - update existing certificate with document_url if returned
          const resultText = await response.text();
          const result = resultText ? JSON.parse(resultText) : {};
          if (result.document_url && existingCert.id) {
            await supabase
              .from('share_certificates')
              .update({
                document_url: result.document_url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingCert.id);
          }
        }
      } else {
        // New certificate - use issue-shares which creates certificate and document
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/governance-issue-shares`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipient_user_id: pending.recipient_user_id,
            shares_amount: pending.shares_amount,
            share_class: pending.share_class,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          const error = errText ? JSON.parse(errText) : { error: `HTTP ${response.status}` };
          throw new Error(error.error || 'Failed to generate certificate');
        }
      }

      notifications.show({
        title: 'Success',
        message: 'Certificate generated successfully',
        color: 'green',
      });

      loadCertificates();
      loadPendingCertificates();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to generate certificate',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Stack gap="xl">
        <div>
          <Title order={2}>Stock Certificates</Title>
          <Text c="dimmed">Generate and manage stock certificates</Text>
        </div>
        <Loader size="lg" />
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Stock Certificates</Title>
        <Text c="dimmed">Generate and manage stock certificates</Text>
      </div>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'issued')}>
        <Tabs.List>
          <Tabs.Tab value="issued">
            Issued Certificates ({certificates.length})
          </Tabs.Tab>
          <Tabs.Tab value="pending">
            Pending ({pendingCertificates.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="issued" pt="xl">
          <Card padding="lg" radius="md" withBorder>
            <Group mb="md" justify="space-between">
              <TextInput
                placeholder="Search by certificate number, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={() => {
                  setLoading(true);
                  loadCertificates();
                  setLoading(false);
                }}
              >
                Refresh
              </Button>
            </Group>

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Certificate #</Table.Th>
                  <Table.Th>Recipient</Table.Th>
                  <Table.Th>Shares</Table.Th>
                  <Table.Th>Share Class</Table.Th>
                  <Table.Th>Issue Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredCertificates.map((cert) => (
                  <Table.Tr key={cert.id}>
                    <Table.Td>
                      <Text fw={500}>{cert.certificate_number}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{cert.recipient_name}</Text>
                      {cert.recipient_email && (
                        <Text size="xs" c="dimmed">
                          {cert.recipient_email}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <NumberFormatter value={cert.shares_amount} thousandSeparator />
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{cert.share_class}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(cert.status)}>{cert.status}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {cert.document_url ? (
                          <>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconEye size={14} />}
                              onClick={() => {
                                setSelectedCertificate(cert);
                                setPreviewModalOpen(true);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconDownload size={14} />}
                              component="a"
                              href={cert.document_url}
                              target="_blank"
                            >
                              Download
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconPlus size={14} />}
                            onClick={async () => {
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) {
                                  notifications.show({
                                    title: 'Error',
                                    message: 'You must be logged in to generate certificate documents',
                                    color: 'red',
                                  });
                                  return;
                                }

                                // For existing certificates, we need to generate the document differently
                                // Call a document generation endpoint that can handle existing certificates
                                // For now, show a message that this needs to be done via the backend
                                notifications.show({
                                  title: 'Certificate Document Generation',
                                  message: 'Please use the "Generate Certificate" option from the Pending tab, or contact an administrator to generate the document for this existing certificate.',
                                  color: 'blue',
                                });
                                
                                // Alternative: Try to call the generate function and handle the error
                                // If certificate exists, we'll need backend support to update existing certificates
                                console.log('Certificate document generation requested for existing certificate:', cert.certificate_number);
                              } catch (error: any) {
                                notifications.show({
                                  title: 'Error',
                                  message: error.message || 'Failed to generate certificate document',
                                  color: 'red',
                                });
                              }
                            }}
                          >
                            Generate Document
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {filteredCertificates.length === 0 && (
              <Alert icon={<IconAlertCircle size={16} />} title="No Certificates" color="blue" mt="md">
                {searchTerm ? 'No certificates match your search.' : 'No share certificates have been issued yet.'}
              </Alert>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="pending" pt="xl">
          <Card padding="lg" radius="md" withBorder>
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <Text size="xs" c="dimmed" mb="xs">
                Debug: {pendingCertificates.length} total, {filteredPending.length} filtered (search: "{searchTerm}")
              </Text>
            )}
            
            <Group mb="md" justify="space-between">
              <TextInput
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={loadPendingCertificates}
              >
                Refresh
              </Button>
            </Group>

            <Alert icon={<IconAlertCircle size={16} />} color="yellow" mb="md">
              These equity grants should have certificates but don't. Click "Generate Certificate" to create them.
            </Alert>

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Recipient</Table.Th>
                  <Table.Th>Shares</Table.Th>
                  <Table.Th>Share Class</Table.Th>
                  <Table.Th>Grant Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(() => {
                  console.log('🎨 [RENDER] Rendering table with filteredPending:', filteredPending.length, filteredPending);
                  if (filteredPending.length === 0) {
                    return null;
                  }
                  return filteredPending.map((pending) => (
                    <Table.Tr key={pending.equity_ledger_id || `pending-${pending.recipient_user_id}-${pending.shares_amount}`}>
                      <Table.Td>
                        <Text>{pending.recipient_name}</Text>
                        {pending.recipient_email && (
                          <Text size="xs" c="dimmed">
                            {pending.recipient_email}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <NumberFormatter value={pending.shares_amount} thousandSeparator />
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{pending.share_class}</Badge>
                      </Table.Td>
                      <Table.Td>
                        {new Date(pending.grant_date).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={() => handleGenerateCertificate(pending)}
                        >
                          Generate Certificate
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ));
                })()}
              </Table.Tbody>
            </Table>

            {filteredPending.length === 0 && (
              <Alert icon={<IconAlertCircle size={16} />} title="All Good!" color="green" mt="md">
                {searchTerm ? 'No pending certificates match your search.' : 'All equity grants have certificates.'}
              </Alert>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedCertificate(null);
        }}
        title={`Certificate ${selectedCertificate?.certificate_number}`}
        size="xl"
      >
        {selectedCertificate && (
          <Stack gap="md">
            <Group>
              <Text fw={500}>Recipient:</Text>
              <Text>{selectedCertificate.recipient_name}</Text>
            </Group>
            <Group>
              <Text fw={500}>Shares:</Text>
              <Text>
                <NumberFormatter value={selectedCertificate.shares_amount} thousandSeparator /> {selectedCertificate.share_class}
              </Text>
            </Group>
            <Group>
              <Text fw={500}>Issue Date:</Text>
              <Text>{new Date(selectedCertificate.issue_date).toLocaleDateString()}</Text>
            </Group>
            {selectedCertificate.document_url && (
              <>
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    Preview
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => {
                      setFullScreenCertificate(selectedCertificate);
                      setPreviewModalOpen(false);
                    }}
                  >
                    Open full-screen
                  </Button>
                </Group>
                <div
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    height: 360,
                  }}
                >
                  <iframe
                    src={selectedCertificate.document_url}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      backgroundColor: '#ffffff',
                    }}
                    title={`Certificate preview ${selectedCertificate.certificate_number}`}
                  />
                </div>
              </>
            )}
          </Stack>
        )}
      </Modal>

      {fullScreenCertificate && fullScreenCertificate.document_url && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text c="white" fw={500}>
              Certificate {fullScreenCertificate.certificate_number}
            </Text>
            <Button
              size="sm"
              variant="white"
              onClick={() => setFullScreenCertificate(null)}
            >
              Back to certificates
            </Button>
          </div>
          <div style={{ flex: 1, padding: '0 16px 16px' }}>
            <iframe
              src={fullScreenCertificate.document_url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 8,
                backgroundColor: '#ffffff',
              }}
              title={`Certificate full view ${fullScreenCertificate.certificate_number}`}
            />
          </div>
        </div>
      )}
    </Stack>
  );
};

export default CertificatesTab;

