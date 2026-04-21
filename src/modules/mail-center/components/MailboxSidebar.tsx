import { Alert, Select, Stack, Text } from "@mantine/core";
import {
  IconArchive,
  IconInbox,
  IconMailOpened,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import SyncStatusBadge from "./SyncStatusBadge";
import styles from "../mailCenterICloud.module.css";

const FOLDERS: { id: string; label: string; Icon: typeof IconInbox }[] = [
  { id: "inbox", label: "Inbox", Icon: IconInbox },
  { id: "sent", label: "Sent", Icon: IconSend },
  { id: "archived", label: "Archive", Icon: IconArchive },
  { id: "trash", label: "Trash", Icon: IconTrash },
  { id: "unread", label: "Unread", Icon: IconMailOpened },
];

export default function MailboxSidebar({
  mailboxes,
  selectedMailboxId,
  onMailboxChange,
  folder,
  onFolderChange,
  onManualSync,
  canManualSync,
  mailboxesLoading,
  mailboxesError,
}: any) {
  const options = (mailboxes || [])
    .map((m: any) => {
      const value = m.mailbox_id || m.mailboxes?.id;
      const label = m.mailboxes?.display_name || m.mailboxes?.email_address || value || "Mailbox";
      return value ? { value, label } : null;
    })
    .filter(Boolean) as { value: string; label: string }[];

  const selected = mailboxes?.find((m: any) => (m.mailbox_id || m.mailboxes?.id) === selectedMailboxId);
  const lastSyncAt = selected?.mailboxes?.last_sync_at;

  return (
    <div className={styles.sidebarInner}>
      {mailboxesError ? (
        <Alert color="red" title="Mailboxes unavailable" className={styles.alertBox}>
          {mailboxesError?.message || String(mailboxesError)}
        </Alert>
      ) : null}
      <Text className={styles.accountLabel}>Mailboxes</Text>
      <Select
        classNames={{ root: styles.selectRoot }}
        placeholder={mailboxesLoading ? "Loading…" : options.length === 0 ? "No mailboxes" : "Choose mailbox"}
        data={options}
        value={selectedMailboxId ?? null}
        onChange={onMailboxChange}
        searchable
        disabled={mailboxesLoading}
        nothingFoundMessage="No mailboxes"
      />
      <div className={styles.folderList}>
        <Stack gap={0}>
          {FOLDERS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.folderRow} ${folder === id ? styles.folderRowActive : ""}`}
              onClick={() => onFolderChange(id)}
            >
              <span className={styles.folderIcon}>
                <Icon size={18} stroke={1.75} />
              </span>
              {label}
            </button>
          ))}
        </Stack>
      </div>
      <div className={styles.sidebarFooter}>
        <div className={styles.syncRow}>
          <Text size="xs" c="dimmed" fw={500}>
            Sync
          </Text>
          <SyncStatusBadge status={selected?.mailboxes?.last_sync_status} />
        </div>
        {lastSyncAt ? (
          <Text className={styles.syncMeta}>Last sync: {new Date(lastSyncAt).toLocaleString()}</Text>
        ) : (
          <Text className={styles.syncMeta}>Sync to load messages from the server.</Text>
        )}
        {canManualSync ? (
          <button type="button" className={styles.syncButton} onClick={onManualSync} disabled={mailboxesLoading}>
            Get Mail
          </button>
        ) : (
          <Text className={styles.readOnlyHint}>Read-only access</Text>
        )}
      </div>
    </div>
  );
}
