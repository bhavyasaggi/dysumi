import { ActionIcon, Group, Space } from "@mantine/core";

import InterfaceShellStatusActionHelp from "../StatusActionHelp";
import InterfaceShellStatusActionLanguage from "../StatusActionLanguage";
import InterfaceShellStatusActionMode from "../StatusActionMode";
import InterfaceShellStatusActionNotification from "../StatusActionNotification";
import InterfaceShellStatusActionTheme from "../StatusActionTheme";

export default function InterfaceShellStatus() {
	return (
		<Group
			wrap="nowrap"
			align="center"
			gap={0}
			justify="start"
			h="100%"
			w="100%"
		>
			<InterfaceShellStatusActionHelp />
			<Space flex="1 1 auto" />
			<InterfaceShellStatusActionLanguage />
			<InterfaceShellStatusActionMode />
			<ActionIcon.Group me="xs">
				<InterfaceShellStatusActionTheme />
				<InterfaceShellStatusActionNotification />
			</ActionIcon.Group>
		</Group>
	);
}
