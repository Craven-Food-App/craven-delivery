import styles from "../mailCenterICloud.module.css";

export default function SyncStatusBadge({ status }: { status?: string | null }) {
  const label = status == null || status === "" ? "Never" : status;
  const normalized = (status || "never").toLowerCase();
  const extra =
    normalized === "ok"
      ? styles.syncPillOk
      : normalized === "never" || status == null || status === ""
        ? ""
        : styles.syncPillWarn;
  return <span className={[styles.syncPill, extra].filter(Boolean).join(" ")}>{label}</span>;
}
