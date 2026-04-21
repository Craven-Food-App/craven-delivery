import { Stack, Tabs } from "@mantine/core";
import MailMessageCard from "./MailMessageCard";
import MailNotesPanel from "./MailNotesPanel";
import MailActivityPanel from "./MailActivityPanel";

export default function MailThreadView({ detail, onAddNote }: any) {
  return (
    <Tabs defaultValue="conversation">
      <Tabs.List>
        <Tabs.Tab value="conversation">Conversation</Tabs.Tab>
        <Tabs.Tab value="notes">Notes</Tabs.Tab>
        <Tabs.Tab value="activity">Activity</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="conversation" pt="sm">
        <Stack>
          {(detail?.messages || []).map((message: any) => (
            <MailMessageCard key={message.id} message={message} />
          ))}
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="notes" pt="sm">
        <MailNotesPanel notes={detail?.notes || []} onAddNote={onAddNote} />
      </Tabs.Panel>
      <Tabs.Panel value="activity" pt="sm">
        <MailActivityPanel activity={detail?.activity || []} />
      </Tabs.Panel>
    </Tabs>
  );
}
