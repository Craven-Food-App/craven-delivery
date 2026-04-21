import { AppShell, Box, Button, Group, Paper, Stack, Tabs, Text, Title } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MailboxSidebar from "./components/MailboxSidebar";
import MailSearchBar from "./components/MailSearchBar";
import MailThreadList from "./components/MailThreadList";
import MailThreadView from "./components/MailThreadView";
import MailReplyComposer from "./components/MailReplyComposer";
import MailAssignmentPanel from "./components/MailAssignmentPanel";
import { mailApi } from "./api";
import MailboxSettingsModal from "./components/MailboxSettingsModal";

export default function MailCenterPage() {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState("inbox");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mailboxIdFromRoute = params.mailboxId;
  const selectedThreadId = params.threadId;

  const mailboxesQuery = useQuery({
    queryKey: ["mailboxes"],
    queryFn: () => mailApi.getMailboxes(),
  });

  const selectedMailboxId = mailboxIdFromRoute || mailboxesQuery.data?.data?.[0]?.mailbox_id || mailboxesQuery.data?.data?.[0]?.mailboxes?.id;
  const selectedMailbox =
    (mailboxesQuery.data?.data || []).find((entry: any) => (entry.mailbox_id || entry.mailboxes?.id) === selectedMailboxId)?.mailboxes || null;

  const threadsQuery = useQuery({
    queryKey: ["threads", selectedMailboxId, folder, search, page],
    enabled: Boolean(selectedMailboxId),
    queryFn: () =>
      mailApi.getThreads({
        mailboxId: selectedMailboxId,
        folder,
        search,
        unreadOnly: folder === "unread",
        page,
        pageSize: 20,
      }),
  });

  const threadQuery = useQuery({
    queryKey: ["thread", selectedThreadId],
    enabled: Boolean(selectedThreadId),
    queryFn: () => mailApi.getThread(selectedThreadId as string),
  });

  const totalPages = useMemo(() => Math.ceil((threadsQuery.data?.count || 0) / 20), [threadsQuery.data?.count]);

  return (
    <>
      <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header>
        <Group justify="space-between" h="100%" px="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
          <Group>
            <Button variant="subtle" color="gray" onClick={() => navigate("/hub")}>
              Back
            </Button>
            <Title order={4}>Mail Center</Title>
            <Button variant="default" size="xs" onClick={() => setSettingsOpen(true)}>
              Admin Settings
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Enterprise internal mailbox workspace
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Main bg="gray.0" p="md">
        <Group align="stretch" wrap="nowrap" gap="sm">
          <Paper w={280} withBorder radius="md">
            <MailboxSidebar
              mailboxes={mailboxesQuery.data?.data || []}
              selectedMailboxId={selectedMailboxId}
              onMailboxChange={(value: string) => navigate(`/hub/mail/${value}`)}
              folder={folder}
              onFolderChange={setFolder}
              onManualSync={async () => {
                if (!selectedMailboxId) return;
                try {
                  await mailApi.manualSync(selectedMailboxId);
                  message.success("Mailbox sync started");
                  queryClient.invalidateQueries({ queryKey: ["threads"] });
                } catch (error: any) {
                  message.error(error.message || "Sync failed");
                }
              }}
              canManualSync
            />
          </Paper>

          <Paper style={{ flex: 1 }} withBorder radius="md" p="sm">
            <MailSearchBar search={search} setSearch={setSearch} />
            <MailThreadList
              threads={threadsQuery.data?.data || []}
              selectedThreadId={selectedThreadId}
              onSelectThread={(threadId: string) => navigate(`/hub/mail/${selectedMailboxId}/thread/${threadId}`)}
              page={page}
              setPage={setPage}
              total={totalPages}
            />
          </Paper>

          <Paper w="42%" miw={480} withBorder radius="md" p="sm">
            {selectedThreadId ? (
              <Stack>
                <Group justify="space-between">
                  <Group>
                    <Button size="xs" variant="default" onClick={() => selectedThreadId && mailApi.markUnread(selectedThreadId)}>
                      Mark unread
                    </Button>
                    <Button size="xs" variant="default" onClick={() => selectedThreadId && mailApi.archive(selectedThreadId)}>
                      Archive
                    </Button>
                    <Button size="xs" color="red" variant="light" onClick={() => selectedThreadId && mailApi.remove(selectedThreadId)}>
                      Delete
                    </Button>
                  </Group>
                  <MailAssignmentPanel
                    onAssign={async (assignedUserId) => {
                      await mailApi.assign(selectedThreadId, { mailboxId: selectedMailboxId, assignedUserId });
                      queryClient.invalidateQueries({ queryKey: ["thread", selectedThreadId] });
                    }}
                  />
                </Group>

                <MailThreadView
                  detail={threadQuery.data}
                  onAddNote={async (note: string) => {
                    await mailApi.note(selectedThreadId, { note });
                    queryClient.invalidateQueries({ queryKey: ["thread", selectedThreadId] });
                  }}
                />
                <Tabs defaultValue="reply">
                  <Tabs.List>
                    <Tabs.Tab value="reply">Reply</Tabs.Tab>
                    <Tabs.Tab value="reply-all">Reply all</Tabs.Tab>
                    <Tabs.Tab value="forward">Forward</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="reply" pt="sm">
                    <MailReplyComposer
                      onSend={async (payload) => {
                        await mailApi.reply(selectedThreadId, { mailboxId: selectedMailboxId, ...payload });
                        message.success("Reply sent");
                        queryClient.invalidateQueries({ queryKey: ["thread", selectedThreadId] });
                        queryClient.invalidateQueries({ queryKey: ["threads"] });
                      }}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value="reply-all" pt="sm">
                    <MailReplyComposer
                      onSend={async (payload) => {
                        await mailApi.reply(selectedThreadId, { mailboxId: selectedMailboxId, ...payload });
                        message.success("Reply all sent");
                      }}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value="forward" pt="sm">
                    <Box>
                      <Text size="sm" c="dimmed">
                        Forward uses the same composer for now.
                      </Text>
                      <MailReplyComposer
                        onSend={async (payload) => {
                          await mailApi.reply(selectedThreadId, { mailboxId: selectedMailboxId, ...payload });
                          message.success("Forward sent");
                        }}
                      />
                    </Box>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            ) : (
              <Group justify="center" h="100%">
                <Text c="dimmed">Select a thread to read and respond.</Text>
              </Group>
            )}
          </Paper>
        </Group>
      </AppShell.Main>
      </AppShell>
      <MailboxSettingsModal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mailboxId={selectedMailboxId}
        selectedMailbox={selectedMailbox}
        onMailboxSaved={(newMailboxId) => {
          queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
          navigate(`/hub/mail/${newMailboxId}`);
        }}
      />
    </>
  );
}
