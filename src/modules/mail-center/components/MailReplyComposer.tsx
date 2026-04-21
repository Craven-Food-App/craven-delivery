import { Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";
import styles from "../mailCenterICloud.module.css";

export default function MailReplyComposer({ onSend }: { onSend: (payload: any) => Promise<void> }) {
  const [bodyText, setBodyText] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Stack className={styles.composer} gap="sm">
      <Group grow>
        <TextInput label="Cc" value={cc} onChange={(e) => setCc(e.currentTarget.value)} />
        <TextInput label="Bcc" value={bcc} onChange={(e) => setBcc(e.currentTarget.value)} />
      </Group>
      <Textarea label="Message" minRows={6} value={bodyText} onChange={(e) => setBodyText(e.currentTarget.value)} />
      <Button
        loading={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await onSend({
              bodyText,
              bodyHtml: `<p>${bodyText.replace(/\n/g, "<br />")}</p>`,
              cc: cc ? cc.split(",").map((s) => s.trim()).filter(Boolean) : [],
              bcc: bcc ? bcc.split(",").map((s) => s.trim()).filter(Boolean) : [],
            });
            setBodyText("");
          } finally {
            setLoading(false);
          }
        }}
      >
        Send
      </Button>
    </Stack>
  );
}
