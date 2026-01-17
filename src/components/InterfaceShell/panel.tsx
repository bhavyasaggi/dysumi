import {
	ActionIcon,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Text,
} from "@mantine/core";
import type React from "react";
import { useReduxDispatch } from "@/lib/redux/hooks";
import { actionInterfaceUpdate } from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default function InterfaceShellPanel(props: {
	title?: string;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	const dispatch = useReduxDispatch();

	return (
		<Stack h="100%" gap={0} className={props.className} style={props.style}>
			<Group
				mih="28px"
				flex="0 0 auto"
				wrap="nowrap"
				bg="var(--mantine-color-disabled)"
				gap={0}
			>
				<Text size="sm" px="sm" flex="1 1 auto" truncate="end">
					{props.title || ""}
				</Text>
				<ActionIcon
					variant="subtle"
					color="gray"
					onClick={() => {
						dispatch(actionInterfaceUpdate({ viewPanel: undefined }));
					}}
				>
					<Icon icon="columns" title="Toggle Panel" height={16} width={16} />
				</ActionIcon>
			</Group>
			<Divider />
			<ScrollArea flex="1 1 auto" scrollbars="y">
				{props.children}
			</ScrollArea>
		</Stack>
	);
}
