import {
	SegmentedControl,
	Stack,
	Switch,
	Text,
	useMantineColorScheme,
} from "@mantine/core";
import { type ChangeEvent, useCallback } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceUpdate,
	selectorInterfaceGetViewNotificationMuted,
} from "@/lib/redux/slices/interface";

export default function PanelSettings() {
	const dispatch = useReduxDispatch();
	const muted = useReduxSelector(selectorInterfaceGetViewNotificationMuted);
	const { colorScheme, setColorScheme } = useMantineColorScheme();
	const onScheme = useCallback(
		(value: string) => {
			if (value === "light" || value === "dark" || value === "auto") {
				setColorScheme(value);
			}
		},
		[setColorScheme],
	);
	const onMute = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			dispatch(
				actionInterfaceUpdate({
					viewNotificationMuted: event.currentTarget.checked,
				}),
			);
		},
		[dispatch],
	);

	return (
		<Stack gap="md" p="sm">
			<Stack gap={4}>
				<Text size="sm">Color scheme</Text>
				<SegmentedControl
					aria-label="Color scheme"
					value={colorScheme}
					onChange={onScheme}
					data={[
						{ label: "Light", value: "light" },
						{ label: "Dark", value: "dark" },
						{ label: "System", value: "auto" },
					]}
				/>
			</Stack>
			<Switch
				label="Mute success and info notifications"
				checked={Boolean(muted)}
				onChange={onMute}
			/>
			<Text size="xs" c="dimmed">
				Errors still appear. This choice is kept on this device.
			</Text>
		</Stack>
	);
}
