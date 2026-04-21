import { Badge, Group, Paper, Text } from "@mantine/core";

export default function MailThreadRow({ thread, selected, onClick }: any) {
  const participants = Array.isArray(thread.participants_json) ? thread.participants_json : [];
  return (
    <Paper p="sm" withBorder bg={selected ? "gray.0" : "white"} onClick={onClick} style={{ cursor: "pointer" }}>
      <Group justify="space-between">
        <Text fw={thread.unread_count > 0 ? 700 : 500} size="sm">
          {participants[0] || "Unknown sender"}
        </Text>
        {thread.unread_count > 0 ? <Badge color="blue">{thread.unread_count}</Badge> : null}
      </Group>
      <Text size="sm" fw={600} lineClamp={1}>
        {thread.subject || "(No subject)"}
      </Text>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" lineClamp={1}>
          {participants.slice(1).join(", ")}
        </Text>
        {thread.assigned_user_id ? <Badge size="xs">Assigned</Badge> : null}
      </Group>
    </Paper>
  );
}
