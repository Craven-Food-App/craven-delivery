import { Group, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export default function MailSearchBar({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <Group mb="sm">
      <TextInput
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        leftSection={<IconSearch size={14} />}
        placeholder="Search subject, sender, recipient, preview..."
        w="100%"
      />
    </Group>
  );
}
