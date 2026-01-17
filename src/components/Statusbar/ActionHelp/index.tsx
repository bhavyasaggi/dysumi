import {
	ActionIcon,
	Divider,
	Group,
	HoverCard,
	Kbd,
	Table,
	Text,
} from "@mantine/core";
import React from "react";
import Icon from "@/lib/ui/Icon";

const SHORTCUTS = [
	{ value: ["Ctrl", "N"], label: "New File" },
	{ value: ["Ctrl", "O"], label: "Open Folder" },
	{ value: ["Ctrl", "F"], label: "Search" },
	{ value: ["Ctrl", "S"], label: "Save" },
	{ value: ["Ctrl", "Shift", "S"], label: "Save As..." },
];

export default function StatusbarActionHelp() {
	return (
		<HoverCard position="top-start" shadow="sm">
			<HoverCard.Target>
				<ActionIcon
					variant="subtle"
					color="gray"
					w={46}
					flex="0 0 auto"
					onClick={() => {
						window.alert("dysumi: Notes everywhere.\nVersion: 0.0.0-alpha");
					}}
				>
					<Icon title="Icon Help" icon="help-circle" height={16} width={16} />
				</ActionIcon>
			</HoverCard.Target>
			<HoverCard.Dropdown p={0}>
				<Table.ScrollContainer minWidth="100%" type="native">
					<Table
						variant="vertical"
						withTableBorder={false}
						withColumnBorders={false}
						withRowBorders={false}
					>
						<Table.Tbody>
							{SHORTCUTS.map((item) => (
								<Table.Tr key={item.label}>
									<Table.Th ta="right">
										<Text span size="xs" c="gray" fw="bold">
											{item.label}
										</Text>
									</Table.Th>
									<Table.Td dir="ltr">
										<Group wrap="nowrap" gap={4}>
											{item.value.map((key, keyIndex) => (
												<React.Fragment key={key}>
													<Text component="code" size="xs" c="gray">
														{keyIndex ? "+" : null}
													</Text>
													<Kbd size="xs">{key}</Kbd>
												</React.Fragment>
											))}
										</Group>
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Table.ScrollContainer>
			</HoverCard.Dropdown>
		</HoverCard>
	);
}
