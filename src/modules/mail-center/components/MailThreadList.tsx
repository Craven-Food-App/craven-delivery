import { Center, Pagination, Text } from "@mantine/core";
import MailThreadRow from "./MailThreadRow";
import styles from "../mailCenterICloud.module.css";

export default function MailThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  page,
  setPage,
  total,
  loading,
  folder,
  hasMailbox,
}: any) {
  const emptyHint = !hasMailbox
    ? "No mailbox available. Ask an admin for access or open settings to add one."
    : folder === "sent"
      ? "No messages in Sent. Sync or send mail to see items here."
      : folder === "inbox"
        ? "No messages in Inbox. Tap Get Mail in the sidebar."
        : "No messages in this folder.";

  return (
    <div className={styles.listColumnBody}>
      <div className={styles.threadListScroll}>
        {loading ? (
          <Center py="xl">
            <Text c="dimmed" size="sm">
              Loading…
            </Text>
          </Center>
        ) : (threads || []).length === 0 ? (
          <div className={styles.emptyState}>{emptyHint}</div>
        ) : (
          (threads || []).map((thread: any) => (
            <MailThreadRow
              key={thread.id}
              thread={thread}
              selected={selectedThreadId === thread.id}
              onClick={() => onSelectThread(thread.id)}
            />
          ))
        )}
      </div>
      <div className={styles.listFooter}>
        <Pagination value={page} onChange={setPage} total={Math.max(1, total)} size="sm" />
      </div>
    </div>
  );
}
