import { Button, Stack } from "@mantine/core";

export default function MailFolderNav({ folder, onFolderChange }: { folder: string; onFolderChange: (value: string) => void }) {
  return (
    <Stack gap={6}>
      {["inbox", "sent", "archived", "trash", "unread"].map((f) => (
        <Button key={f} variant={folder === f ? "filled" : "subtle"} color="gray" onClick={() => onFolderChange(f)}>
          {f}
        </Button>
      ))}
    </Stack>
  );
}
