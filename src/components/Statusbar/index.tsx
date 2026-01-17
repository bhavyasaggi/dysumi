import { ActionIcon, Group, Space } from "@mantine/core";

import StatusbarActionHelp from "./ActionHelp";
import StatusbarActionLanguage from "./ActionLanguage";
import StatusbarActionMode from "./ActionMode";
import StatusbarActionNotification from "./ActionNotification";
import StatusbarActionTheme from "./ActionTheme";

export default function Statusbar() {
  return (
    <Group
      wrap="nowrap"
      align="center"
      gap={0}
      justify="start"
      h="100%"
      w="100%"
    >
      <StatusbarActionHelp />
      <Space flex="1 1 auto" />
      <StatusbarActionLanguage />
      <StatusbarActionMode />
      <ActionIcon.Group me="xs">
        <StatusbarActionTheme />
        <StatusbarActionNotification />
      </ActionIcon.Group>
    </Group>
  );
}
