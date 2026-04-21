import { ScrollArea, Stack, Text } from "@mantine/core";

export default function MailActivityPanel({ activity }: any) {
  return (
    <ScrollArea h={320}>
      <Stack gap="xs">
        {(activity || []).map((item: any) => (
          <Text key={item.id} size="sm">
            {item.activity_type} - {new Date(item.created_at).toLocaleString()}
          </Text>
        ))}
      </Stack>
    </ScrollArea>
  );
}
