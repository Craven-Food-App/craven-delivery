import { Badge, Button, Group, ScrollArea, Select, Stack, Text } from "@mantine/core";
import SyncStatusBadge from "./SyncStatusBadge";

export default function MailboxSidebar({
  mailboxes,
  selectedMailboxId,
  onMailboxChange,
  folder,
  onFolderChange,
  onManualSync,
  canManualSync,
}: any) {
  return (
    <Stack p="sm" gap="sm" h="100%">
      <Select
        label="Mailbox"
        data={(mailboxes || []).map((m: any) => ({ value: m.mailbox_id || m.mailboxes?.id, label: m.mailboxes?.display_name || m.mailboxes?.email_address }))}
        value={selectedMailboxId}
        onChange={onMailboxChange}
        searchable
      />
      <ScrollArea h={180}>
        <Stack gap={6}>
          {["inbox", "sent", "archived", "trash", "unread"].map((f) => (
            <Button key={f} variant={folder === f ? "filled" : "light"} color="gray" onClick={() => onFolderChange(f)} justify="space-between">
              <span style={{ textTransform: "capitalize" }}>{f}</span>
            </Button>
          ))}
        </Stack>
      </ScrollArea>
      <Group justify="space-between">
        <Text size="sm" fw={600}>
          Sync
        </Text>
        <SyncStatusBadge status={mailboxes?.find((m: any) => (m.mailbox_id || m.mailboxes?.id) === selectedMailboxId)?.mailboxes?.last_sync_status} />
      </Group>
      {canManualSync ? (
        <Button onClick={onManualSync} variant="default">
          Manual Sync
        </Button>
      ) : (
        <Badge color="gray">Read-only mailbox access</Badge>
      )}
    </Stack>
  );
}
