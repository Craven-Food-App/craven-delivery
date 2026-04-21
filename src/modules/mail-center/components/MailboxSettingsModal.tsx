import { Button, Checkbox, Group, Modal, ScrollArea, Select, Stack, Switch, Table, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { mailApi } from "../api";
import { message } from "antd";

export default function MailboxSettingsModal({
  opened,
  onClose,
  mailboxId,
  selectedMailbox,
}: {
  opened: boolean;
  onClose: () => void;
  mailboxId?: string;
  selectedMailbox?: any;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("readonly");
  const [canRead, setCanRead] = useState(true);
  const [canReply, setCanReply] = useState(false);
  const [canAssign, setCanAssign] = useState(false);
  const [canArchive, setCanArchive] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [imapHost, setImapHost] = useState("imap.mail.me.com");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("smtp.mail.me.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [savingMailbox, setSavingMailbox] = useState(false);
  const [testingMailbox, setTestingMailbox] = useState(false);
  const [savingPermission, setSavingPermission] = useState(false);

  const permissionsQuery = useQuery({
    queryKey: ["mailbox-permissions", mailboxId],
    enabled: Boolean(mailboxId && opened),
    queryFn: () => mailApi.getPermissions(mailboxId as string),
  });

  useEffect(() => {
    if (!opened || !selectedMailbox) return;
    setDisplayName(selectedMailbox.display_name || "");
    setEmailAddress(selectedMailbox.email_address || "");
    setUsername(selectedMailbox.username || selectedMailbox.email_address || "");
    setImapHost(selectedMailbox.imap_host || "imap.mail.me.com");
    setImapPort(String(selectedMailbox.imap_port || 993));
    setSmtpHost(selectedMailbox.smtp_host || "smtp.mail.me.com");
    setSmtpPort(String(selectedMailbox.smtp_port || 587));
    setImapSecure(Boolean(selectedMailbox.imap_secure ?? true));
    setSmtpSecure(Boolean(selectedMailbox.smtp_secure ?? false));
    setIsActive(Boolean(selectedMailbox.is_active ?? true));
    setAppPassword("");
  }, [opened, selectedMailbox]);

  return (
    <Modal opened={opened} onClose={onClose} title="Mailbox Settings" size="lg">
      <Stack>
        <TextInput label="Display name" value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} />
        <TextInput label="Email address" value={emailAddress} onChange={(e) => setEmailAddress(e.currentTarget.value)} />
        <TextInput label="Username" value={username} onChange={(e) => setUsername(e.currentTarget.value)} />
        <TextInput label="App-specific password" type="password" value={appPassword} onChange={(e) => setAppPassword(e.currentTarget.value)} />
        <Group grow>
          <TextInput label="IMAP host" value={imapHost} onChange={(e) => setImapHost(e.currentTarget.value)} />
          <TextInput label="IMAP port" value={imapPort} onChange={(e) => setImapPort(e.currentTarget.value)} />
        </Group>
        <Group grow>
          <TextInput label="SMTP host" value={smtpHost} onChange={(e) => setSmtpHost(e.currentTarget.value)} />
          <TextInput label="SMTP port" value={smtpPort} onChange={(e) => setSmtpPort(e.currentTarget.value)} />
        </Group>
        <Group>
          <Switch label="IMAP secure" checked={imapSecure} onChange={(e) => setImapSecure(e.currentTarget.checked)} />
          <Switch label="SMTP secure" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.currentTarget.checked)} />
          <Switch label="Active" checked={isActive} onChange={(e) => setIsActive(e.currentTarget.checked)} />
        </Group>
        <Group justify="flex-end">
          <Button
            variant="default"
            loading={testingMailbox}
            onClick={async () => {
              if (!mailboxId) {
                message.warning("Save mailbox first, then test connection.");
                return;
              }
              setTestingMailbox(true);
              try {
                await mailApi.testMailboxConnection(mailboxId);
                message.success("Mailbox connection test successful.");
              } catch (error: any) {
                message.error(error.message || "Connection test failed.");
              } finally {
                setTestingMailbox(false);
              }
            }}
          >
            Test connection
          </Button>
          <Button
            loading={savingMailbox}
            onClick={async () => {
              if (!displayName || !emailAddress || !username || (!mailboxId && !appPassword)) {
                message.warning("Display name, email, username, and app password (for new mailbox) are required.");
                return;
              }
              setSavingMailbox(true);
              try {
                const payload = {
                  displayName,
                  emailAddress,
                  username,
                  appPassword,
                  imapHost,
                  imapPort: Number(imapPort),
                  imapSecure,
                  smtpHost,
                  smtpPort: Number(smtpPort),
                  smtpSecure,
                  isActive,
                };

                if (mailboxId) {
                  await mailApi.updateMailbox(mailboxId, {
                    display_name: displayName,
                    email_address: emailAddress,
                    username,
                    imap_host: imapHost,
                    imap_port: Number(imapPort),
                    imap_secure: imapSecure,
                    smtp_host: smtpHost,
                    smtp_port: Number(smtpPort),
                    smtp_secure: smtpSecure,
                    is_active: isActive,
                  });
                  message.success("Mailbox updated.");
                } else {
                  await mailApi.createMailbox(payload);
                  message.success("Mailbox created.");
                }
              } catch (error: any) {
                message.error(error.message || "Failed to save mailbox.");
              } finally {
                setSavingMailbox(false);
              }
            }}
          >
            Save mailbox
          </Button>
        </Group>
        <Text fw={600} mt="sm">
          Permission Matrix
        </Text>
        <Group grow>
          <TextInput label="User ID" value={userId} onChange={(e) => setUserId(e.currentTarget.value)} placeholder="UUID" />
          <Select
            label="Role"
            value={role}
            onChange={(value) => setRole(value || "readonly")}
            data={["super_admin", "executive", "partnerships", "support", "hr", "readonly"]}
          />
        </Group>
        <Group>
          <Checkbox label="Read" checked={canRead} onChange={(e) => setCanRead(e.currentTarget.checked)} />
          <Checkbox label="Reply" checked={canReply} onChange={(e) => setCanReply(e.currentTarget.checked)} />
          <Checkbox label="Assign" checked={canAssign} onChange={(e) => setCanAssign(e.currentTarget.checked)} />
          <Checkbox label="Archive" checked={canArchive} onChange={(e) => setCanArchive(e.currentTarget.checked)} />
          <Checkbox label="Delete" checked={canDelete} onChange={(e) => setCanDelete(e.currentTarget.checked)} />
        </Group>
        <Button
          variant="light"
          loading={savingPermission}
          onClick={async () => {
            if (!mailboxId) {
              message.warning("Select or create a mailbox first.");
              return;
            }
            if (!userId) {
              message.warning("User ID is required.");
              return;
            }
            setSavingPermission(true);
            try {
              await mailApi.updatePermission(mailboxId, { userId, role, canRead, canReply, canAssign, canArchive, canDelete });
              await permissionsQuery.refetch();
              message.success("Mailbox permission updated.");
            } catch (error: any) {
              message.error(error.message || "Failed to update permission.");
            } finally {
              setSavingPermission(false);
            }
          }}
        >
          Upsert Permission
        </Button>
        <ScrollArea h={220}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>R</Table.Th>
                <Table.Th>Rp</Table.Th>
                <Table.Th>A</Table.Th>
                <Table.Th>Ar</Table.Th>
                <Table.Th>D</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(permissionsQuery.data?.data || []).map((row: any) => (
                <Table.Tr key={row.id}>
                  <Table.Td>{row.user_id}</Table.Td>
                  <Table.Td>{row.role}</Table.Td>
                  <Table.Td>{row.can_read ? "Y" : "N"}</Table.Td>
                  <Table.Td>{row.can_reply ? "Y" : "N"}</Table.Td>
                  <Table.Td>{row.can_assign ? "Y" : "N"}</Table.Td>
                  <Table.Td>{row.can_archive ? "Y" : "N"}</Table.Td>
                  <Table.Td>{row.can_delete ? "Y" : "N"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
