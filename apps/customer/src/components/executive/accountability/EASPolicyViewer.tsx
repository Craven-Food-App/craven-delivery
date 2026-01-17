import React, { useState, useEffect } from 'react';
import { Card, Stack, Title, Text, Paper, Button, Group } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { replacePlaceholders, formatDocumentDate } from '@/lib/executive/accountability/placeholders';
import { IconDownload, IconPrinter } from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import DOMPurify from 'dompurify';

export const EASPolicyViewer: React.FC = () => {
  const { execUser } = useExecAuth();
  const [template, setTemplate] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const { data, error } = await supabase
        .from('eas_documents')
        .select('template_content')
        .eq('document_key', 'policy_eas_master')
        .single();

      if (error && error.code !== 'PGRST116') {
        // Load from HTML file
        const response = await fetch('/src/lib/executive/accountability/templates/policy_eas_master.html');
        const html = await response.text();
        setTemplate(html);
        
        // Save to database
        if (execUser) {
          await supabase.from('eas_documents').insert({
            document_key: 'policy_eas_master',
            document_type: 'policy',
            title: 'Executive Discipline & Accountability Policy',
            template_content: html,
            created_by: execUser.id,
          });
        }
      } else if (data) {
        setTemplate(data.template_content);
      }

      // Fill placeholders
      const filled = replacePlaceholders(template || '', {
        executive_name: execUser?.title || 'Executive',
        executive_title: execUser?.title || 'Executive',
        date: formatDocumentDate(new Date()),
      });
      setContent(filled);
    } catch (error) {
      console.error('Error loading policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Executive Discipline & Accountability Policy</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; }
            </style>
          </head>
          <body>
            ${DOMPurify.sanitize(content)}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'executive-accountability-policy.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div>Loading policy...</div>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Executive Discipline & Accountability Policy</Title>
        <Group>
          <Button
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrint}
            variant="light"
          >
            Print
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleDownload}
            variant="light"
          >
            Download
          </Button>
        </Group>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Paper p="md" withBorder>
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
        </Paper>
      </Card>
    </Stack>
  );
};

