import { Button, Menu } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useCallback } from "react";
import {
	type CopyableRequest,
	toCurl,
	toFetch,
} from "@/lib/utils/http/copyRequest";

const ACTIONS = [
	{
		label: "Copy as fetch",
		value: (request: CopyableRequest) => toFetch(request, false),
	},
	{
		label: "Copy as fetch (node)",
		value: (request: CopyableRequest) => toFetch(request, true),
	},
	{
		label: "Copy as curl (cmd)",
		value: (request: CopyableRequest) => toCurl(request, "cmd"),
	},
	{
		label: "Copy as curl (bash)",
		value: (request: CopyableRequest) => toCurl(request, "bash"),
	},
];

function CopyMenuItem({
	action,
	request,
	copy,
}: {
	action: (typeof ACTIONS)[number];
	request: CopyableRequest;
	copy: (value: string) => void;
}) {
	const handleCopy = useCallback(() => {
		copy(action.value(request));
	}, [action, copy, request]);

	return <Menu.Item onClick={handleCopy}>{action.label}</Menu.Item>;
}

export default function RequestCopy({ request }: { request: CopyableRequest }) {
	const clipboard = useClipboard({ timeout: 1200 });

	return (
		<Menu position="bottom-end" withinPortal>
			<Menu.Target>
				<Button size="compact-xs" variant="default">
					{clipboard.copied ? "Copied" : "Copy as"}
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				{ACTIONS.map((action) => (
					<CopyMenuItem
						key={action.label}
						action={action}
						request={request}
						copy={clipboard.copy}
					/>
				))}
			</Menu.Dropdown>
		</Menu>
	);
}
