import React, { useState, useEffect } from 'react';
import {
  Card,
  Stack,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  Group,
  Select,
  Paper,
  Divider,
  Alert,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { replacePlaceholders, formatDocumentDate } from '@/lib/executive/accountability/placeholders';
import { IconDeviceFloppy, IconAlertTriangle } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import DOMPurify from 'dompurify';

interface BNNCFormData {
  executive_name: string;
  executive_title: string;
  date: string;
  board_findings: string[];
  board_required_actions: string[];
}

export const BNNCTemplate: React.FC = () => {
  const { execUser } = useExecAuth();
  const [template, setTemplate] = useState<string>('');
  const [formData, setFormData] = useState<BNNCFormData>({
    executive_name: '',
    executive_title: '',
    date: formatDocumentDate(new Date()),
    board_findings: [''],
    board_required_actions: [''],
  });
  const [preview, setPreview] = useState<string>('');
  const [executives, setExecutives] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplate();
    loadExecutives();
  }, []);

  useEffect(() => {
    if (template) {
      generatePreview();
    }
  }, [formData, template]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('eas_documents')
        .select('template_content')
        .eq('document_key', 'bnnc_template')
        .single();

      if (error && error.code !== 'PGRST116') {
        const response = await fetch('/src/lib/executive/accountability/templates/bnnc_template.html');
        const html = await response.text();
        setTemplate(html);
        
        if (execUser) {
          await supabase.from('eas_documents').insert({
            document_key: 'bnnc_template',
            document_type: 'bnnc',
            title: 'Board Notice of Non-Compliance (BNNC)',
            template_content: html,
            created_by: execUser.id,
          });
        }
      } else if (data) {
        setTemplate(data.template_content);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutives = async () => {
    try {
      const { data, error } = await supabase
        .from('exec_users')
        .select('id, title, department')
        .in('role', ['cfo', 'coo', 'cto', 'cxo'])
        .order('title');

      if (error) throw error;

      setExecutives(
        (data || []).map((exec: any) => ({
          value: exec.id,
          label: `${exec.title}${exec.department ? ` - ${exec.department}` : ''}`,
        }))
      );
    } catch (error) {
      console.error('Error loading executives:', error);
    }
  };

  const generatePreview = () => {
    const filled = replacePlaceholders(template, {
      ...formData,
      board_findings: formData.board_findings.filter(f => f.trim()),
      board_required_actions: formData.board_required_actions.filter(a => a.trim()),
    });
    setPreview(filled);
  };

  const handleExecutiveSelect = async (execId: string) => {
    const { data } = await supabase
      .from('exec_users')
      .select('title, department')
      .eq('id', execId)
      .single();

    if (data) {
      setFormData({
        ...formData,
        executive_name: data.title,
        executive_title: data.title,
      });
    }
  };

  const issueDocument = async () => {
    if (!formData.executive_name || !formData.executive_title) {
      alert('Please select an executive');
      return;
    }

    setSaving(true);
    try {
      const { data: execData } = await supabase
        .from('exec_users')
        .select('id')
        .eq('title', formData.executive_name)
        .single();

      if (!execData) {
        alert('Executive not found');
        return;
      }

      const { data: instance, error: instanceError } = await (supabase
        .from('eas_instances') as any)
        .insert({
          document_type: 'bnnc',
          executive_id: execData.id,
          issuer_id: execUser?.id,
          status: 'issued',
          filled_content: preview,
          metadata: formData,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (instanceError) throw instanceError;

      const { data: existingWorkflow } = await supabase
        .from('eas_workflow')
        .select('id')
        .eq('executive_id', execData.id)
        .single();

      if (existingWorkflow) {
        await supabase
          .from('eas_workflow')
          .update({
            current_step: 'bnnc_issued',
            bnnc_instance_id: instance.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWorkflow.id);
      } else {
        await supabase.from('eas_workflow').insert({
          executive_id: execData.id,
          current_step: 'bnnc_issued',
          bnnc_instance_id: instance.id,
        });
      }

      alert('BNNC issued successfully');
    } catch (error) {
      console.error('Error issuing document:', error);
      alert('Error issuing document');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading template...</div>;
  }

  return (
    <Stack gap="md">
      <Title order={2}>Board Notice of Non-Compliance (BNNC)</Title>

      <Alert icon={<IconAlertTriangle size={16} />} color="red" title="Board-Level Document">
        This document requires Board approval. Only Board members and CEO can issue BNNC.
      </Alert>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Select
            label="Select Executive"
            placeholder="Choose an executive"
            data={executives}
            value={formData.executive_name}
            onChange={(value) => value && handleExecutiveSelect(value)}
            searchable
          />

          <Group grow>
            <TextInput
              label="Executive Name"
              value={formData.executive_name}
              onChange={(e) => setFormData({ ...formData, executive_name: e.target.value })}
            />
            <TextInput
              label="Executive Title"
              value={formData.executive_title}
              onChange={(e) => setFormData({ ...formData, executive_title: e.target.value })}
            />
          </Group>

          <TextInput
            label="Date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          <Divider label="Board Findings" labelPosition="center" />

          {formData.board_findings.map((finding, index) => (
            <Textarea
              key={index}
              label={`Finding ${index + 1}`}
              value={finding}
              onChange={(e) => {
                const updated = [...formData.board_findings];
                updated[index] = e.target.value;
                setFormData({ ...formData, board_findings: updated });
              }}
              minRows={2}
            />
          ))}
          <Button variant="light" onClick={() => setFormData({ ...formData, board_findings: [...formData.board_findings, ''] })}>
            Add Finding
          </Button>

          <Divider label="Required Actions" labelPosition="center" />

          {formData.board_required_actions.map((action, index) => (
            <Textarea
              key={index}
              label={`Action ${index + 1}`}
              value={action}
              onChange={(e) => {
                const updated = [...formData.board_required_actions];
                updated[index] = e.target.value;
                setFormData({ ...formData, board_required_actions: updated });
              }}
              minRows={2}
            />
          ))}
          <Button variant="light" onClick={() => setFormData({ ...formData, board_required_actions: [...formData.board_required_actions, ''] })}>
            Add Required Action
          </Button>

          <Group>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={issueDocument}
              loading={saving}
              color="red"
            >
              Issue BNNC
            </Button>
          </Group>
        </Stack>
      </Card>

      {preview && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Preview</Title>
            <Paper p="md" withBorder>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview) }} />
            </Paper>
          </Stack>
        </Card>
      )}
    </Stack>
  );
};

