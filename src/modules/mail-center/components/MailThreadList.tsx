import { Pagination, ScrollArea, Stack } from "@mantine/core";
import MailThreadRow from "./MailThreadRow";

export default function MailThreadList({ threads, selectedThreadId, onSelectThread, page, setPage, total }: any) {
  return (
    <Stack h="100%" gap="xs">
      <ScrollArea h="calc(100vh - 260px)">
        <Stack gap="xs">
          {(threads || []).map((thread: any) => (
            <MailThreadRow
              key={thread.id}
              thread={thread}
              selected={selectedThreadId === thread.id}
              onClick={() => onSelectThread(thread.id)}
            />
          ))}
        </Stack>
      </ScrollArea>
      <Pagination value={page} onChange={setPage} total={Math.max(1, total)} size="sm" />
    </Stack>
  );
}
