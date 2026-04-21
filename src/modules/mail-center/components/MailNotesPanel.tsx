import { Button, ScrollArea, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

export default function MailNotesPanel({ notes, onAddNote }: any) {
  const [value, setValue] = useState("");
  return (
    <Stack>
      <Textarea value={value} onChange={(e) => setValue(e.currentTarget.value)} placeholder="Internal note..." minRows={3} />
      <Button
        variant="light"
        onClick={async () => {
          if (!value.trim()) return;
          await onAddNote(value.trim());
          setValue("");
        }}
      >
        Add Note
      </Button>
      <ScrollArea h={220}>
        <Stack gap="xs">
          {(notes || []).map((note: any) => (
            <Text key={note.id} size="sm">
              {note.note}
            </Text>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
