import { formatMailListDate } from "../mailDateUtils";
import styles from "../mailCenterICloud.module.css";

function parseParticipants(raw: unknown): string[] {
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

export default function MailThreadRow({ thread, selected, onClick }: any) {
  const participants = parseParticipants(thread.participants_json);
  const unread = Number(thread.unread_count) > 0;
  const dateStr = formatMailListDate(thread.last_message_at);
  const preview = participants.slice(1).join(", ");

  return (
    <button
      type="button"
      className={`${styles.threadRow} ${selected ? styles.threadRowSelected : ""}`}
      onClick={onClick}
    >
      <div className={styles.threadRowTop}>
        <span className={`${styles.threadSender} ${unread ? styles.threadSenderUnread : ""}`}>
          {participants[0] || "Unknown sender"}
        </span>
        <span className={styles.threadDate}>{dateStr}</span>
      </div>
      <div className={`${styles.threadSubject} ${unread ? styles.threadSubjectUnread : ""}`}>{thread.subject || "(No subject)"}</div>
      {preview ? <div className={styles.threadPreview}>{preview}</div> : null}
      {unread || thread.assigned_user_id ? (
        <div className={styles.threadMeta}>
          {unread ? <span className={styles.badgeDot}>{thread.unread_count}</span> : null}
          {thread.assigned_user_id ? <span className={styles.threadPreview}>Assigned</span> : null}
        </div>
      ) : null}
    </button>
  );
}
