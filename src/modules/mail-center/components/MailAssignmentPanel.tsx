import { Button, Group, Select } from "@mantine/core";
import { useState } from "react";
import styles from "../mailCenterICloud.module.css";

export default function MailAssignmentPanel({ onAssign }: { onAssign: (userId: string) => Promise<void> }) {
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  return (
    <Group gap="xs" wrap="nowrap" className={styles.assignSelect}>
      <Select
        placeholder="Assign…"
        value={assignedUserId}
        onChange={setAssignedUserId}
        data={[]}
        comboboxProps={{ withinPortal: true }}
        w={180}
        size="xs"
      />
      <Button
        variant="default"
        size="xs"
        onClick={() => {
          if (assignedUserId) onAssign(assignedUserId);
        }}
      >
        Assign
      </Button>
    </Group>
  );
}
