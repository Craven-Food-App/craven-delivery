import { Text } from "@mantine/core";
import DOMPurify from "dompurify";
import styles from "../mailCenterICloud.module.css";

function parseStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function MailMessageCard({ message }: any) {
  const html = message.html_body ? DOMPurify.sanitize(message.html_body) : null;
  const toList = parseStringList(message.to_json);
  const time = message.received_at ? new Date(message.received_at).toLocaleString() : "";

  return (
    <article className={styles.msgCard}>
      <div className={styles.msgHeader}>
        <div className={styles.msgFrom}>{message.from_name || message.from_email || "Unknown"}</div>
        <div className={styles.msgTime}>{time}</div>
      </div>
      {toList.length > 0 ? (
        <div className={styles.msgTo}>To: {toList.join(", ")}</div>
      ) : null}
      <div className={styles.msgBody}>
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Text size="sm">{message.text_body || "(No content)"}</Text>}
      </div>
      {message.has_attachments ? <span className={styles.msgAttach}>Includes attachments</span> : null}
    </article>
  );
}
