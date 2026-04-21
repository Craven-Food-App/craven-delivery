import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import styles from "../mailCenterICloud.module.css";

export default function MailSearchBar({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <div className={styles.searchInput}>
      <TextInput
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        leftSection={<IconSearch size={16} stroke={1.5} />}
        placeholder="Search mail"
        w="100%"
      />
    </div>
  );
}
