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
  NumberInput,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { replacePlaceholders, formatDocumentDate } from '@/lib/executive/accountability/placeholders';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';

interface ECAPFormData {
  executive_name: string;
  executive_title: string;
  issuer_name: string;
  issuer_title: string;
  date: string;
  plan_duration: number;
  deficiency_list: string[];
  action_items: string[];
}

export const ECAPTemplate: React.FC = () => {
  const { execUser } = useExecAuth();
  const [template, setTemplate] = useState<string>('');
  const [formData, setFormData] = useState<ECAPFormData>({
    executive_name: '',
    executive_title: '',
    issuer_name: execUser?.title || '',
    issuer_title: 'Chief Executive Officer',
    date: formatDocumentDate(new Date()),
    plan_duration: 30,
    deficiency_list: [''],
    action_items: [''],
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
        .eq('document_key', 'ecap_template')
        .single();

      if (error && error.code !== 'PGRST116') {
        const response = await fetch('/src/lib/executive/accountability/templates/ecap_template.html');
        const html = await response.text();
        setTemplate(html);
        
        if (execUser) {
          await supabase.from('eas_documents').insert({
            document_key: 'ecap_template',
            document_type: 'ecap',
            title: 'Executive Corrective Action Plan (ECAP)',
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
      deficiency_list: formData.deficiency_list.filter(d => d.trim()),
      action_items: formData.action_items.filter(a => a.trim()),
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

      const { data: instance, error: instanceError } = await supabase
        .from('eas_instances')
        .insert({
          document_type: 'ecap',
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
            current_step: 'ecap_issued',
            ecap_instance_id: instance.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWorkflow.id);
      } else {
        await supabase.from('eas_workflow').insert({
          executive_id: execData.id,
          current_step: 'ecap_issued',
          ecap_instance_id: instance.id,
        });
      }

      alert('ECAP issued successfully');
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
      <Title order={2}>Executive Corrective Action Plan (ECAP)</Title>

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

          <Group grow>
            <TextInput
              label="Issuer Name"
              value={formData.issuer_name}
              onChange={(e) => setFormData({ ...formData, issuer_name: e.target.value })}
            />
            <TextInput
              label="Issuer Title"
              value={formData.issuer_title}
              onChange={(e) => setFormData({ ...formData, issuer_title: e.target.value })}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <NumberInput
              label="Plan Duration (days)"
              value={formData.plan_duration}
              onChange={(value) => setFormData({ ...formData, plan_duration: Number(value) || 30 })}
              min={1}
              max={90}
            />
          </Group>

          <Divider label="Performance Deficiencies" labelPosition="center" />

          {formData.deficiency_list.map((deficiency, index) => (
            <Textarea
              key={index}
              label={`Deficiency ${index + 1}`}
              value={deficiency}
              onChange={(e) => {
                const updated = [...formData.deficiency_list];
                updated[index] = e.target.value;
                setFormData({ ...formData, deficiency_list: updated });
              }}
              minRows={2}
            />
          ))}
          <Button variant="light" onClick={() => setFormData({ ...formData, deficiency_list: [...formData.deficiency_list, ''] })}>
            Add Deficiency
          </Button>

          <Divider label="Action Items" labelPosition="center" />

          {formData.action_items.map((action, index) => (
            <Textarea
              key={index}
              label={`Action ${index + 1}`}
              value={action}
              onChange={(e) => {
                const updated = [...formData.action_items];
                updated[index] = e.target.value;
                setFormData({ ...formData, action_items: updated });
              }}
              minRows={2}
            />
          ))}
          <Button variant="light" onClick={() => setFormData({ ...formData, action_items: [...formData.action_items, ''] })}>
            Add Action Item
          </Button>

          <Group>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={issueDocument}
              loading={saving}
            >
              Issue ECAP
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

