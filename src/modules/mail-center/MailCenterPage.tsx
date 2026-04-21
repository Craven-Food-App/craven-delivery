import { AppShell, Alert, Box, Stack, Tabs, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconSettings } from "@tabler/icons-react";
import MailboxSidebar from "./components/MailboxSidebar";
import MailSearchBar from "./components/MailSearchBar";
import MailThreadList from "./components/MailThreadList";
import MailThreadView from "./components/MailThreadView";
import MailReplyComposer from "./components/MailReplyComposer";
import MailAssignmentPanel from "./components/MailAssignmentPanel";
import { mailApi } from "./api";
import MailboxSettingsModal from "./components/MailboxSettingsModal";
import styles from "./mailCenterICloud.module.css";

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

  const firstMailboxId =
    mailboxesQuery.data?.data?.[0]?.mailbox_id || mailboxesQuery.data?.data?.[0]?.mailboxes?.id;
  const selectedMailboxId = mailboxIdFromRoute || firstMailboxId;
  const selectedMailbox =
    (mailboxesQuery.data?.data || []).find((entry: any) => (entry.mailbox_id || entry.mailboxes?.id) === selectedMailboxId)?.mailboxes || null;

  useEffect(() => {
    if (mailboxIdFromRoute || !firstMailboxId || mailboxesQuery.isLoading) return;
    navigate(`/hub/mail/${firstMailboxId}`, { replace: true });
  }, [mailboxIdFromRoute, firstMailboxId, mailboxesQuery.isLoading, navigate]);

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
      <AppShell header={{ height: 52 }} padding={0}>
        <AppShell.Header className={styles.appHeader}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button type="button" className={styles.backLink} onClick={() => navigate("/hub")}>
                ‹ Hub
              </button>
              <h1 className={styles.toolbarTitle}>Mail</h1>
            </div>
            <div className={styles.toolbarRight}>
              <Text className={styles.subtitle} visibleFrom="sm">
                Mailbox
              </Text>
              <button type="button" className={styles.iconBtn} onClick={() => setSettingsOpen(true)} aria-label="Mailbox settings">
                <IconSettings size={22} stroke={1.5} />
              </button>
            </div>
          </div>
        </AppShell.Header>
        <AppShell.Main className={styles.shellMain}>
          <div className={styles.mainGrid}>
            <aside className={styles.colSidebar}>
              <MailboxSidebar
                mailboxes={mailboxesQuery.data?.data || []}
                selectedMailboxId={selectedMailboxId}
                onMailboxChange={(value: string | null) => value && navigate(`/hub/mail/${value}`)}
                folder={folder}
                onFolderChange={setFolder}
                onManualSync={async () => {
                  if (!selectedMailboxId) return;
                  try {
                    await mailApi.manualSync(selectedMailboxId);
                    message.success("Mailbox updated");
                    queryClient.invalidateQueries({ queryKey: ["threads"] });
                    queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
                  } catch (error: any) {
                    message.error(error.message || "Sync failed");
                  }
                }}
                canManualSync
                mailboxesLoading={mailboxesQuery.isLoading}
                mailboxesError={mailboxesQuery.error as Error | null}
              />
            </aside>

            <section className={styles.colList}>
              <div className={styles.listHeader}>
                <MailSearchBar search={search} setSearch={setSearch} />
              </div>
              {threadsQuery.error ? (
                <Alert color="red" title="Could not load messages" className={styles.alertBox}>
                  {(threadsQuery.error as Error).message}
                </Alert>
              ) : null}
              <MailThreadList
                threads={threadsQuery.data?.data || []}
                selectedThreadId={selectedThreadId}
                onSelectThread={(threadId: string) => navigate(`/hub/mail/${selectedMailboxId}/thread/${threadId}`)}
                page={page}
                setPage={setPage}
                total={totalPages}
                loading={Boolean(selectedMailboxId) && threadsQuery.isLoading}
                folder={folder}
                hasMailbox={Boolean(selectedMailboxId)}
              />
            </section>

            <section className={styles.colReader}>
              {selectedThreadId ? (
                <div className={styles.readerBody}>
                  <div className={styles.readerToolbar}>
                    <div className={styles.readerToolbarLeft}>
                      <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={() => selectedThreadId && mailApi.markUnread(selectedThreadId)}
                      >
                        Mark unread
                      </button>
                      <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={() => selectedThreadId && mailApi.archive(selectedThreadId)}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className={`${styles.toolBtn} ${styles.toolBtnDanger}`}
                        onClick={() => selectedThreadId && mailApi.remove(selectedThreadId)}
                      >
                        Delete
                      </button>
                    </div>
                    <MailAssignmentPanel
                      onAssign={async (assignedUserId) => {
                        await mailApi.assign(selectedThreadId, { mailboxId: selectedMailboxId, assignedUserId });
                        queryClient.invalidateQueries({ queryKey: ["thread", selectedThreadId] });
                      }}
                    />
                  </div>
                  <div className={styles.readerScroll}>
                    <MailThreadView
                      detail={threadQuery.data}
                      onAddNote={async (note: string) => {
                        await mailApi.note(selectedThreadId, { note });
                        queryClient.invalidateQueries({ queryKey: ["thread", selectedThreadId] });
                      }}
                    />
                    <div className={styles.replySection}>
                      <Tabs defaultValue="reply" className={styles.replyTabs}>
                        <Tabs.List>
                          <Tabs.Tab value="reply">Reply</Tabs.Tab>
                          <Tabs.Tab value="reply-all">Reply all</Tabs.Tab>
                          <Tabs.Tab value="forward">Forward</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panel value="reply" pt="sm">
                          <MailReplyComposer
                            onSend={async (payload) => {
                              await mailApi.reply(selectedThreadId, { mailboxId: selectedMailboxId, ...payload });
                              message.success("Sent");
                              queryClient.invalidateQueries({ queryKey: ["thread", selectedThreadId] });
                              queryClient.invalidateQueries({ queryKey: ["threads"] });
                            }}
                          />
                        </Tabs.Panel>
                        <Tabs.Panel value="reply-all" pt="sm">
                          <MailReplyComposer
                            onSend={async (payload) => {
                              await mailApi.reply(selectedThreadId, { mailboxId: selectedMailboxId, ...payload });
                              message.success("Sent");
                            }}
                          />
                        </Tabs.Panel>
                        <Tabs.Panel value="forward" pt="sm">
                          <Box>
                            <Text size="sm" c="dimmed" mb="xs">
                              Forward uses the same composer for now.
                            </Text>
                            <MailReplyComposer
                              onSend={async (payload) => {
                                await mailApi.reply(selectedThreadId, { mailboxId: selectedMailboxId, ...payload });
                                message.success("Sent");
                              }}
                            />
                          </Box>
                        </Tabs.Panel>
                      </Tabs>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.readerEmpty}>Select a message to read.</div>
              )}
            </section>
          </div>
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
