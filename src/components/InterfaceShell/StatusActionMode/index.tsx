import { Button, Menu, Space, Text } from "@mantine/core";
import { useCallback, useState } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceOpenFile,
	selectorInterfaceGetActiveFile,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default function InterfaceShellStatusActionMode() {
	const dispatch = useReduxDispatch();

	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const mode = activeFile?.mode || "normal";

	const [isHidden, setIsHidden] = useState(true);

	const dismissMenu = useCallback(() => {
		setIsHidden(true);
	}, []);

	const toggleMenu = useCallback(() => {
		setIsHidden((hidden) => !hidden);
	}, []);

	const selectMode = useCallback(
		(nextMode: "hex" | "normal") => {
			if (activeFile) {
				dispatch(actionInterfaceOpenFile({ ...activeFile, mode: nextMode }));
			}
		},
		[activeFile, dispatch],
	);

	const selectHex = useCallback(() => {
		selectMode("hex");
	}, [selectMode]);

	const selectNormal = useCallback(() => {
		selectMode("normal");
	}, [selectMode]);

	return (
		<Menu
			closeOnClickOutside={true}
			closeOnEscape={true}
			onDismiss={dismissMenu}
			shadow="sm"
			opened={!isHidden}
			position="top-end"
			middlewares={{
				flip: false,
				shift: false,
				inline: false,
				size: false,
			}}
			styles={{ dropdown: { padding: 0 } }}
		>
			<Menu.Target>
				<Button
					justify="start"
					leftSection={
						<Icon
							icon="monitor"
							height={16}
							width={16}
							title={`Mode: ${mode}`}
						/>
					}
					size="compact-sm"
					color="gray"
					variant="subtle"
					onClick={toggleMenu}
				>
					<code>{mode}</code>
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				{(["hex", "normal"] as const).map((m) => {
					return (
						<Menu.Item
							px={4}
							py={2}
							key={m}
							component="code"
							disabled={m === mode}
							leftSection={
								m === mode ? (
									<Icon
										icon="check"
										title="Icon active"
										height={12}
										width={12}
									/>
								) : (
									<Space h={12} w={12} />
								)
							}
							onClick={m === "hex" ? selectHex : selectNormal}
							color="gray"
						>
							<Text component="code" size="sm" truncate="end">
								{m}
							</Text>
						</Menu.Item>
					);
				})}
			</Menu.Dropdown>
		</Menu>
	);
}
