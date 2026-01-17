import {
  ActionIcon,
  Box,
  Divider,
  Group,
  Popover,
  ScrollAreaAutosize,
  Text,
} from "@mantine/core";
import { useState } from "react";
import Icon from "@/lib/ui/Icon";

export default function StatusbarActionNotification() {
  const [isHidden, setHidden] = useState(true);
  const [isMuted, setMuted] = useState(false);

  return (
    <Popover
      opened={!isHidden}
      position="top-end"
      middlewares={{
        flip: false,
        shift: false,
        inline: false,
        size: false,
      }}
      styles={{
        dropdown: {
          padding: 0,
        },
      }}
      shadow="sm"
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => {
            setHidden(!isHidden);
          }}
        >
          <Icon
            title="Notifications"
            icon={isMuted ? "bell-off" : "bell"}
            height={16}
            width={16}
          />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown w="320px">
        <Group wrap="nowrap" p="xs">
          <Text size="sm" c="gray" span flex="1 1 auto">
            Notifications
          </Text>
          <ActionIcon.Group flex="0 0 auto">
            <ActionIcon color="gray" variant="subtle">
              <Icon
                icon="delete"
                title="Clear all notifications"
                height="16"
                width="16"
              />
            </ActionIcon>
            <ActionIcon
              color="gray"
              variant="subtle"
              onClick={() => {
                setMuted(!isMuted);
              }}
            >
              <Icon
                icon={isMuted ? "bell" : "bell-off"}
                title="Mute notifications"
                height="16"
                width="16"
              />
            </ActionIcon>
            <ActionIcon
              color="gray"
              variant="subtle"
              onClick={() => {
                setHidden(true);
              }}
            >
              <Icon
                icon="chevron-down"
                title="Hide notifications"
                height="16"
                width="16"
              />
            </ActionIcon>
          </ActionIcon.Group>
        </Group>
        <Divider />
        <ScrollAreaAutosize mah="70dvh">
          <Box>
            <Divider my="lg" label="Empty Notifications" />
          </Box>
        </ScrollAreaAutosize>
      </Popover.Dropdown>
    </Popover>
  );
}
