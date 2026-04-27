import { Badge, Card, Code, Group, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";

import { parseHttpFile } from "@/lib/utils/http/parseHttp";
import type { HttpRequest } from "@/lib/utils/http/types.d";

interface ViewerRestProps {
	source: string;
}

const METHOD_COLORS: Record<string, string> = {
	GET: "blue",
	POST: "green",
	PUT: "orange",
	PATCH: "yellow",
	DELETE: "red",
	HEAD: "gray",
	OPTIONS: "cyan",
};

function RequestCard({ request }: { request: HttpRequest }) {
	const color = METHOD_COLORS[request.method] || "gray";

	return (
		<Card withBorder shadow="xs" padding="md" radius="sm">
			<Stack gap="sm">
				<Group gap="sm" wrap="nowrap">
					<Badge color={color} variant="filled" size="lg" radius="sm">
						{request.method}
					</Badge>
					{request.title ? (
						<Text size="sm" fw={600} c="dimmed">
							{request.title}
						</Text>
					) : null}
					{request.name ? (
						<Text size="sm" fw={500} truncate>
							{request.name}
						</Text>
					) : null}
				</Group>

				{Object.keys(request.variables).length > 0 ? (
					<Code block>
						{Object.entries(request.variables)
							.map(([k, v]) => `@${k} = ${v}`)
							.join("\n")}
					</Code>
				) : null}

				{request.url ? (
					<div>
						<Text size="xs" fw={600} c="dimmed" mb={4}>
							URL
						</Text>
						<Code block style={{ wordBreak: "break-all" }}>
							{request.url}
						</Code>
					</div>
				) : null}

				{Object.keys(request.headers).length > 0 ? (
					<div>
						<Text size="xs" fw={600} c="dimmed" mb={4}>
							Headers
						</Text>
						<Code block>
							{Object.entries(request.headers)
								.map(([k, v]) => `${k}: ${v}`)
								.join("\n")}
						</Code>
					</div>
				) : null}

				{request.body ? (
					<div>
						<Text size="xs" fw={600} c="dimmed" mb={4}>
							Body
						</Text>
						<Code block>{request.body}</Code>
					</div>
				) : null}
			</Stack>
		</Card>
	);
}

export default function ViewerRest({ source }: ViewerRestProps) {
	const file = useMemo(() => parseHttpFile(source), [source]);

	return (
		<Stack gap="md" maw={700} mx="auto" pb="xl">
			{Object.keys(file.variables).length > 0 ? (
				<Card withBorder padding="md" radius="sm">
					<Title order={5} mb="xs">
						Variables
					</Title>
					<Code block>
						{Object.entries(file.variables)
							.map(([k, v]) => `@${k} = ${v}`)
							.join("\n")}
					</Code>
				</Card>
			) : null}

			{file.requests.length === 0 ? (
				<Text c="dimmed" ta="center" py="xl">
					No requests found
				</Text>
			) : null}

			{file.requests.map((req, i) => (
				<RequestCard key={`req-${i.toString()}`} request={req} />
			))}
		</Stack>
	);
}
