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

interface ETFCNFormData {
  executive_name: string;
  executive_title: string;
  date: string;
  cause_list: string[];
}

export const ETFCNTemplate: React.FC = () => {
  const { execUser } = useExecAuth();
  const [template, setTemplate] = useState<string>('');
  const [formData, setFormData] = useState<ETFCNFormData>({
    executive_name: '',
    executive_title: '',
    date: formatDocumentDate(new Date()),
    cause_list: [''],
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
        .eq('document_key', 'etfcn_template')
        .single();

      if (error && error.code !== 'PGRST116') {
        const response = await fetch('/src/lib/executive/accountability/templates/etfcn_template.html');
        const html = await response.text();
        setTemplate(html);
        
        if (execUser) {
          await supabase.from('eas_documents').insert({
            document_key: 'etfcn_template',
            document_type: 'etfcn',
            title: 'Termination for Cause Notice (Executive)',
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
      cause_list: formData.cause_list.filter(c => c.trim()),
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

    if (!confirm('Are you sure you want to issue a Termination for Cause notice? This action is final and cannot be undone.')) {
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
          document_type: 'etfcn',
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
            current_step: 'termination_for_cause',
            etfcn_instance_id: instance.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWorkflow.id);
      } else {
        await supabase.from('eas_workflow').insert({
          executive_id: execData.id,
          current_step: 'termination_for_cause',
          etfcn_instance_id: instance.id,
        });
      }

      alert('Termination for Cause notice issued successfully');
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
      <Title order={2}>Termination for Cause Notice (Executive)</Title>

      <Alert icon={<IconAlertTriangle size={16} />} color="red" title="Final Action">
        This is a final termination notice. All unvested equity will be forfeited. This action cannot be undone.
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

          <Divider label="Basis for Termination" labelPosition="center" />

          {formData.cause_list.map((cause, index) => (
            <Textarea
              key={index}
              label={`Cause ${index + 1}`}
              value={cause}
              onChange={(e) => {
                const updated = [...formData.cause_list];
                updated[index] = e.target.value;
                setFormData({ ...formData, cause_list: updated });
              }}
              minRows={3}
            />
          ))}
          <Button variant="light" onClick={() => setFormData({ ...formData, cause_list: [...formData.cause_list, ''] })}>
            Add Cause
          </Button>

          <Group>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={issueDocument}
              loading={saving}
              color="red"
            >
              Issue Termination Notice
            </Button>
          </Group>
        </Stack>
      </Card>

      {preview && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Preview</Title>
            <Paper p="md" withBorder>
              <div dangerouslySetInnerHTML={{ __html: preview }} />
            </Paper>
          </Stack>
        </Card>
      )}
    </Stack>
  );
};

