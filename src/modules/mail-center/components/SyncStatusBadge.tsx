import { Badge } from "@mantine/core";

export default function SyncStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "unknown").toLowerCase();
  const color = normalized === "ok" ? "green" : normalized === "never" ? "gray" : "red";
  return (
    <Badge variant="light" color={color}>
      Sync: {status || "unknown"}
    </Badge>
  );
}
