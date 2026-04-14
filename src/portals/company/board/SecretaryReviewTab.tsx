import React, { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Card, Badge, Group, Button, Textarea,
  Table, Loader, Alert, Accordion, ActionIcon, Tooltip, Divider, Modal
} from '@mantine/core';
import {
  IconCheck, IconX, IconEye, IconFileText, IconClock,
  IconShieldCheck, IconAlertTriangle, IconUser, IconCalendar
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppointmentReview {
  id: string;
  executive_id: string;
  proposed_officer_name: string | null;
  proposed_title: string | null;
  status: string;
  appointment_date: string | null;
  effective_date: string | null;
  created_at: string;
  documents: DocumentReview[];
}

interface DocumentReview {
  id: string;
  type: string;
  officer_name: string | null;
  signature_status: string | null;
  signed_at: string | null;
  signed_by_user: string | null;
  file_url: string | null;
  signed_file_url: string | null;
  packet_id: string | null;
  signing_stage: number | null;
  signing_order: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  signed: 'green',
  pending: 'yellow',
  not_signed: 'gray',
  READY_FOR_SECRETARY_REVIEW: 'blue',
  SECRETARY_APPROVED: 'green',
  fully_signed: 'teal',
};

const formatDocType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const isHtmlDocumentUrl = (url: string) => /\.html?(?:[?#].*)?$/i.test(url);

const SecretaryReviewTab: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewHtml(null);
    setPreviewTitle('');
    setPreviewLoading(false);
  };

  const handlePreviewDoc = async (url: string, title: string) => {
    setPreviewTitle(title);
    setPreviewUrl(null);
    setPreviewHtml(null);
    setPreviewLoading(true);

    try {
      if (isHtmlDocumentUrl(url)) {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }

        const html = await response.text();
        setPreviewHtml(html);
      } else {
        setPreviewUrl(url);
      }
    } catch (err: any) {
      console.error('Document preview error:', err);
      toast.error('Failed to load document preview');
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data: appts, error: apptErr } = await supabase
        .from('executive_appointments')
        .select('id, executive_id, proposed_officer_name, proposed_title, status, appointment_date, effective_date, created_at')
        .in('status', ['READY_FOR_SECRETARY_REVIEW', 'SECRETARY_APPROVED', 'fully_signed', 'ACTIVATING'])
        .order('created_at', { ascending: false });

      if (apptErr) throw apptErr;
      if (!appts?.length) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const apptIds = appts.map(a => a.id);
      const { data: docs, error: docErr } = await supabase
        .from('executive_documents')
        .select('id, type, officer_name, signature_status, signed_at, signed_by_user, file_url, signed_file_url, packet_id, signing_stage, signing_order, appointment_id')
        .in('appointment_id', apptIds)
        .order('signing_stage', { ascending: true })
        .order('signing_order', { ascending: true });

      if (docErr) throw docErr;

      const enriched: AppointmentReview[] = appts.map(a => ({
        ...a,
        documents: (docs || []).filter(d => (d as any).appointment_id === a.id).map(d => {
          const { appointment_id, ...rest } = d as any;
          return rest;
        }),
      }));

      setAppointments(enriched);
    } catch (err: any) {
      console.error('Secretary review fetch error:', err);
      toast.error('Failed to load appointments for review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleApprove = async (apptId: string) => {
    setProcessing(apptId);
    try {
      const { error } = await supabase
        .from('executive_appointments')
        .update({
          status: 'SECRETARY_APPROVED',
          notes: reviewNotes[apptId] || 'Approved by Corporate Secretary after document review.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', apptId);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('appointment_audit_log').insert({
          appointment_id: apptId,
          action_type: 'secretary_approved',
          actor_user_id: user.id,
          metadata_json: { notes: reviewNotes[apptId] || 'All documents verified and approved.' },
          timestamp: new Date().toISOString(),
        });
      }

      toast.success('Appointment approved by Secretary');
      fetchAppointments();
    } catch (err: any) {
      console.error('Approval error:', err);
      toast.error('Failed to approve: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (apptId: string) => {
    if (!reviewNotes[apptId]?.trim()) {
      toast.error('Please provide rejection notes before rejecting.');
      return;
    }

    setProcessing(apptId);
    try {
      const { error } = await supabase
        .from('executive_appointments')
        .update({
          status: 'AWAITING_SIGNATURES',
          notes: `REJECTED: ${reviewNotes[apptId]}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', apptId);

      if (error) throw error;

      // Reset all documents back to pending so they can be re-signed
      const { error: resetError } = await supabase
        .from('executive_documents')
        .update({
          signature_status: 'pending',
          status: 'generated',
          signed_file_url: null,
          signed_at: null,
          signed_by_user: null,
          signer_roles: null,
          signature_token: crypto.randomUUID(),
          signature_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('appointment_id', apptId);

      if (resetError) {
        console.error('Failed to reset document signatures:', resetError);
        toast.error('Appointment rejected but failed to reset document signatures. Documents may need manual reset.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('appointment_audit_log').insert({
          appointment_id: apptId,
          action_type: 'secretary_rejected',
          actor_user_id: user.id,
          metadata_json: { reason: reviewNotes[apptId], documents_reset: !resetError },
          timestamp: new Date().toISOString(),
        });
      }

      toast.warning('Appointment rejected — returned for re-signing');
      fetchAppointments();
    } catch (err: any) {
      console.error('Rejection error:', err);
      toast.error('Failed to reject: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading appointments for review…</Text>
      </Stack>
    );
  }

  if (!appointments.length) {
    return (
      <Alert icon={<IconShieldCheck size={20} />} color="green" variant="light">
        <Text fw={500}>No appointments pending review</Text>
        <Text size="sm" c="dimmed" mt={4}>
          Appointments will appear here once all documents have been signed by the appointee.
        </Text>
      </Alert>
    );
  }

  const pendingReview = appointments.filter(a => a.status === 'READY_FOR_SECRETARY_REVIEW');
  const reviewed = appointments.filter(a => a.status !== 'READY_FOR_SECRETARY_REVIEW');
  const previewOpen = previewLoading || !!previewUrl || !!previewHtml;

  return (
    <Stack gap="lg">
      <Modal
        opened={previewOpen}
        onClose={closePreview}
        title={previewTitle || 'Document Preview'}
        size="xl"
        centered
        styles={{ body: { padding: 0, height: '70vh' } }}
      >
        {previewLoading ? (
          <Stack align="center" justify="center" h="100%" py="xl">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">Loading document preview…</Text>
          </Stack>
        ) : previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
            title={previewTitle}
            sandbox="allow-same-origin"
          />
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
            title={previewTitle}
            sandbox="allow-same-origin"
          />
        ) : null}
      </Modal>

      <Group gap="md">
        <Badge size="lg" variant="light" color="blue" leftSection={<IconClock size={14} />}>
          {pendingReview.length} Pending Review
        </Badge>
        <Badge size="lg" variant="light" color="green" leftSection={<IconCheck size={14} />}>
          {reviewed.length} Reviewed
        </Badge>
      </Group>

      {pendingReview.length > 0 && (
        <Stack gap="md">
          <Title order={3} style={{ fontSize: 18 }}>⏳ Pending Secretary Review</Title>
          {pendingReview.map(appt => (
            <AppointmentReviewCard
              key={appt.id}
              appointment={appt}
              notes={reviewNotes[appt.id] || ''}
              onNotesChange={(v) => setReviewNotes(prev => ({ ...prev, [appt.id]: v }))}
              onApprove={() => handleApprove(appt.id)}
              onReject={() => handleReject(appt.id)}
              processing={processing === appt.id}
              isPending
              onPreviewDoc={handlePreviewDoc}
            />
          ))}
        </Stack>
      )}

      {reviewed.length > 0 && (
        <Stack gap="md">
          <Title order={3} style={{ fontSize: 18 }}>✅ Previously Reviewed</Title>
          {reviewed.map(appt => (
            <AppointmentReviewCard
              key={appt.id}
              appointment={appt}
              notes=""
              onNotesChange={() => {}}
              onApprove={() => {}}
              onReject={() => {}}
              processing={false}
              isPending={false}
              onPreviewDoc={handlePreviewDoc}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};

interface CardProps {
  appointment: AppointmentReview;
  notes: string;
  onNotesChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  processing: boolean;
  isPending: boolean;
  onPreviewDoc: (url: string, title: string) => void | Promise<void>;
}

const AppointmentReviewCard: React.FC<CardProps> = ({
  appointment, notes, onNotesChange, onApprove, onReject, processing, isPending, onPreviewDoc,
}) => {
  const signedCount = appointment.documents.filter(d => d.signature_status === 'signed').length;
  const totalDocs = appointment.documents.length;
  const allSigned = signedCount === totalDocs && totalDocs > 0;

  const stages = appointment.documents.reduce<Record<string, DocumentReview[]>>((acc, doc) => {
    const key = doc.packet_id || `Stage ${doc.signing_stage || '?'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <div>
          <Group gap="sm">
            <IconUser size={20} />
            <Title order={4} style={{ fontSize: 16 }}>
              {appointment.proposed_officer_name || 'Unknown Officer'}
            </Title>
            <Badge variant="light" color="violet">{appointment.proposed_title || 'Unknown Role'}</Badge>
          </Group>
          <Group gap="xs" mt={4}>
            <IconCalendar size={14} />
            <Text size="xs" c="dimmed">
              Submitted: {formatDate(appointment.created_at)}
            </Text>
          </Group>
        </div>
        <Group gap="xs">
          <Badge
            size="lg"
            color={allSigned ? 'green' : 'yellow'}
            variant="filled"
          >
            {signedCount}/{totalDocs} Signed
          </Badge>
          <Badge color={STATUS_COLORS[appointment.status] || 'gray'} variant="light">
            {appointment.status.replace(/_/g, ' ')}
          </Badge>
        </Group>
      </Group>

      <Divider mb="md" />

      <Accordion variant="contained" radius="md">
        {Object.entries(stages).map(([stageKey, docs]) => (
          <Accordion.Item key={stageKey} value={stageKey}>
            <Accordion.Control>
              <Group gap="sm">
                <IconFileText size={16} />
                <Text size="sm" fw={500}>{stageKey.replace(/_/g, ' ').replace(/P\d+\s*/i, 'Packet ')}</Text>
                <Badge
                  size="sm"
                  variant="light"
                  color={docs.every(d => d.signature_status === 'signed') ? 'green' : 'yellow'}
                >
                  {docs.filter(d => d.signature_status === 'signed').length}/{docs.length}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Document</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Signed At</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {docs.map(doc => (
                    <Table.Tr key={doc.id}>
                      <Table.Td>
                        <Text size="xs">{formatDocType(doc.type)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          color={doc.signature_status === 'signed' ? 'green' : 'yellow'}
                          leftSection={doc.signature_status === 'signed' ? <IconCheck size={10} /> : <IconClock size={10} />}
                        >
                          {doc.signature_status || 'pending'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">{formatDate(doc.signed_at)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {doc.signed_file_url && (
                            <Tooltip label="View signed document">
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="blue"
                                onClick={() => onPreviewDoc(doc.signed_file_url!, `${formatDocType(doc.type)} (Signed)`)}
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {doc.file_url && !doc.signed_file_url && (
                            <Tooltip label="View original document">
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="gray"
                                onClick={() => onPreviewDoc(doc.file_url!, formatDocType(doc.type))}
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {isPending && (
        <Stack gap="sm" mt="md">
          <Textarea
            label="Review Notes"
            placeholder="Add notes about your review (required for rejection)…"
            value={notes}
            onChange={(e) => onNotesChange(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end" gap="sm">
            <Button
              color="red"
              variant="light"
              leftSection={<IconX size={16} />}
              onClick={onReject}
              loading={processing}
              disabled={processing}
            >
              Reject & Return for Re-signing
            </Button>
            <Button
              color="green"
              leftSection={<IconShieldCheck size={16} />}
              onClick={onApprove}
              loading={processing}
              disabled={processing || !allSigned}
            >
              Approve & Certify
            </Button>
          </Group>
          {!allSigned && (
            <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light">
              <Text size="xs">Cannot approve — {totalDocs - signedCount} document(s) still unsigned.</Text>
            </Alert>
          )}
        </Stack>
      )}
    </Card>
  );
};

export default SecretaryReviewTab;
