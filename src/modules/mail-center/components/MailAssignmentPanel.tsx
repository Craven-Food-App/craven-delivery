import { Button, Group, Select } from "@mantine/core";
import { useState } from "react";

export default function MailAssignmentPanel({ onAssign }: { onAssign: (userId: string) => Promise<void> }) {
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  return (
    <Group>
      <Select
        placeholder="Assign thread owner"
        value={assignedUserId}
        onChange={setAssignedUserId}
        data={[]}
        comboboxProps={{ withinPortal: true }}
        w={220}
      />
      <Button
        variant="default"
        onClick={() => {
          if (assignedUserId) onAssign(assignedUserId);
        }}
      >
        Assign
      </Button>
    </Group>
  );
}
