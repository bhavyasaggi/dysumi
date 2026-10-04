import {
	ActionIcon,
	Box,
	Button,
	CloseButton,
	Divider,
	Group,
	Indicator,
	Popover,
	ScrollAreaAutosize,
	Text,
	VisuallyHidden,
} from "@mantine/core";
import { useCallback, useState } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceClearNotifications,
	actionInterfaceDismissNotification,
	actionInterfaceMarkNotificationsRead,
	actionInterfaceUpdate,
	selectorInterfaceGetNotifications,
	selectorInterfaceGetViewNotificationMuted,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

function timeLabel(at: number) {
	return new Date(at).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function NotificationRow(props: {
	id: string;
	title: string;
	detail?: string;
	tone: "success" | "error" | "info";
	at: number;
}) {
	const dispatch = useReduxDispatch();
	const dismiss = useCallback(() => {
		dispatch(actionInterfaceDismissNotification(props.id));
	}, [dispatch, props.id]);
	return (
		<Group wrap="nowrap" align="flex-start" px="xs" py={6}>
			<Box flex="1 1 auto">
				<Text size="sm" c={props.tone === "error" ? "red" : undefined}>
					{props.title}
				</Text>
				{props.detail ? (
					<Text size="xs" c="dimmed">
						{props.detail}
					</Text>
				) : null}
				<Text size="xs" c="dimmed">
					{timeLabel(props.at)}
				</Text>
			</Box>
			<CloseButton aria-label={`Dismiss ${props.title}`} onClick={dismiss} />
		</Group>
	);
}

export default function InterfaceShellStatusActionNotification() {
	const dispatch = useReduxDispatch();
	const notifications = useReduxSelector(selectorInterfaceGetNotifications);
	const muted =
		useReduxSelector(selectorInterfaceGetViewNotificationMuted) === true;
	const [isHidden, setHidden] = useState(true);
	const unread = notifications.some((item) => !item.read);
	const latest = notifications.find((item) => !item.read);

	const toggleHidden = useCallback(() => {
		if (isHidden) dispatch(actionInterfaceMarkNotificationsRead());
		setHidden((hidden) => !hidden);
	}, [dispatch, isHidden]);

	const toggleMuted = useCallback(() => {
		dispatch(actionInterfaceUpdate({ viewNotificationMuted: !muted }));
	}, [dispatch, muted]);

	const hideNotifications = useCallback(() => {
		setHidden(true);
	}, []);

	const clearNotifications = useCallback(() => {
		dispatch(actionInterfaceClearNotifications());
	}, [dispatch]);

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
				<Box component="span" display="inline-flex">
					<Indicator disabled={!unread} color="blue" size={8} offset={4}>
						<ActionIcon
							variant={unread && !muted ? "light" : "subtle"}
							color="gray"
							onClick={toggleHidden}
							aria-label={
								unread && !muted
									? `Notifications, ${notifications.filter((item) => !item.read).length} unread`
									: "Notifications"
							}
							aria-expanded={!isHidden}
						>
							<Icon
								title="Notifications"
								icon={muted ? "bell-off" : "bell"}
								height={16}
								width={16}
							/>
						</ActionIcon>
					</Indicator>
				</Box>
			</Popover.Target>
			<Popover.Dropdown w="320px">
				<Group wrap="nowrap" p="xs">
					<Text size="sm" c="gray" span flex="1 1 auto">
						Notifications
					</Text>
					{notifications.length > 0 ? (
						<Button
							variant="subtle"
							color="gray"
							size="compact-xs"
							onClick={clearNotifications}
						>
							Clear
						</Button>
					) : null}
					<ActionIcon.Group flex="0 0 auto">
						<ActionIcon
							color="gray"
							variant="subtle"
							onClick={toggleMuted}
							aria-pressed={muted}
							aria-label={muted ? "Unmute notifications" : "Mute notifications"}
						>
							<Icon
								icon={muted ? "bell" : "bell-off"}
								title="Mute notifications"
								height="16"
								width="16"
							/>
						</ActionIcon>
						<ActionIcon
							color="gray"
							variant="subtle"
							onClick={hideNotifications}
							aria-label="Hide notifications"
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
					{notifications.length === 0 ? (
						<Divider my="lg" label="Empty notifications" />
					) : (
						notifications.map((item) => (
							<NotificationRow
								key={item.id}
								id={item.id}
								title={item.title}
								detail={item.detail}
								tone={item.tone}
								at={item.at}
							/>
						))
					)}
				</ScrollAreaAutosize>
			</Popover.Dropdown>
			<VisuallyHidden role="status">{latest?.title ?? ""}</VisuallyHidden>
		</Popover>
	);
}
