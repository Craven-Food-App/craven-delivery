import { Badge, Divider, Group, Paper, Text } from "@mantine/core";
import DOMPurify from "dompurify";

export default function MailMessageCard({ message }: any) {
  const html = message.html_body ? DOMPurify.sanitize(message.html_body) : null;
  return (
    <Paper withBorder p="md">
      <Group justify="space-between">
        <Text fw={600}>{message.from_name || message.from_email || "Unknown"}</Text>
        <Text size="xs" c="dimmed">
          {message.received_at ? new Date(message.received_at).toLocaleString() : "Unknown time"}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mb="xs">
        {(message.to_json || []).join(", ")}
      </Text>
      <Divider my="sm" />
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Text size="sm">{message.text_body || "(No content)"}</Text>}
      {message.has_attachments ? <Badge mt="sm">Has attachments</Badge> : null}
    </Paper>
  );
}
