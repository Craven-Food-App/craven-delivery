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
import { IconDeviceFloppy, IconPrinter, IconFileText } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import DOMPurify from 'dompurify';

interface EPMFormData {
  executive_name: string;
  executive_title: string;
  issuer_name: string;
  issuer_title: string;
  date: string;
  failure_list: string[];
  corrective_actions: string[];
}

export const EPMTemplate: React.FC = () => {
  const { execUser } = useExecAuth();
  const [template, setTemplate] = useState<string>('');
  const [formData, setFormData] = useState<EPMFormData>({
    executive_name: '',
    executive_title: '',
    issuer_name: execUser?.title || '',
    issuer_title: 'Chief Executive Officer',
    date: formatDocumentDate(new Date()),
    failure_list: [''],
    corrective_actions: [''],
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
        .eq('document_key', 'epm_template')
        .single();

      if (error && error.code !== 'PGRST116') {
        // If template doesn't exist, load from HTML file
        const response = await fetch('/src/lib/executive/accountability/templates/epm_template.html');
        const html = await response.text();
        setTemplate(html);
        
        // Save to database
        if (execUser) {
          await supabase.from('eas_documents').insert({
            document_key: 'epm_template',
            document_type: 'epm',
            title: 'Executive Performance Memorandum (EPM)',
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
      failure_list: formData.failure_list.filter(f => f.trim()),
      corrective_actions: formData.corrective_actions.filter(a => a.trim()),
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

  const addFailureItem = () => {
    setFormData({
      ...formData,
      failure_list: [...formData.failure_list, ''],
    });
  };

  const updateFailureItem = (index: number, value: string) => {
    const updated = [...formData.failure_list];
    updated[index] = value;
    setFormData({ ...formData, failure_list: updated });
  };

  const addActionItem = () => {
    setFormData({
      ...formData,
      corrective_actions: [...formData.corrective_actions, ''],
    });
  };

  const updateActionItem = (index: number, value: string) => {
    const updated = [...formData.corrective_actions];
    updated[index] = value;
    setFormData({ ...formData, corrective_actions: updated });
  };

  const issueDocument = async () => {
    if (!formData.executive_name || !formData.executive_title) {
      alert('Please select an executive');
      return;
    }

    setSaving(true);
    try {
      // Find executive user
      const { data: execData } = await supabase
        .from('exec_users')
        .select('id')
        .eq('title', formData.executive_name)
        .single();

      if (!execData) {
        alert('Executive not found');
        return;
      }

      // Create instance
      const { data: instance, error: instanceError } = await (supabase
        .from('eas_instances') as any)
        .insert({
          document_type: 'epm',
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

      // Create or update workflow
      const { data: existingWorkflow } = await supabase
        .from('eas_workflow')
        .select('id')
        .eq('executive_id', execData.id)
        .single();

      if (existingWorkflow) {
        await supabase
          .from('eas_workflow')
          .update({
            current_step: 'epm_issued',
            epm_instance_id: instance.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWorkflow.id);
      } else {
        await supabase.from('eas_workflow').insert({
          executive_id: execData.id,
          current_step: 'epm_issued',
          epm_instance_id: instance.id,
        });
      }

      alert('EPM issued successfully');
      // Reset form
      setFormData({
        executive_name: '',
        executive_title: '',
        issuer_name: execUser?.title || '',
        issuer_title: 'Chief Executive Officer',
        date: formatDocumentDate(new Date()),
        failure_list: [''],
        corrective_actions: [''],
      });
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
      <Title order={2}>Executive Performance Memorandum (EPM)</Title>

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

          <TextInput
            label="Date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          <Divider label="Performance Failures" labelPosition="center" />

          {formData.failure_list.map((failure, index) => (
            <Textarea
              key={index}
              label={`Failure ${index + 1}`}
              value={failure}
              onChange={(e) => updateFailureItem(index, e.target.value)}
              minRows={2}
            />
          ))}
          <Button variant="light" onClick={addFailureItem}>Add Failure Item</Button>

          <Divider label="Required Actions" labelPosition="center" />

          {formData.corrective_actions.map((action, index) => (
            <Textarea
              key={index}
              label={`Action ${index + 1}`}
              value={action}
              onChange={(e) => updateActionItem(index, e.target.value)}
              minRows={2}
            />
          ))}
          <Button variant="light" onClick={addActionItem}>Add Action Item</Button>

          <Group>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={issueDocument}
              loading={saving}
            >
              Issue EPM
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

