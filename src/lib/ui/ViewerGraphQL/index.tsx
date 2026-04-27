import { Badge, Card, Code, Group, Stack, Text } from "@mantine/core";
import { useMemo } from "react";

import { parseGraphQLFile } from "@/lib/utils/http/parseGraphQL";
import type { HttpRequest } from "@/lib/utils/http/types.d";

interface ViewerGraphQLProps {
	source: string;
}

const METHOD_COLORS: Record<string, string> = {
	QUERY: "blue",
	MUTATION: "orange",
	SUBSCRIPTION: "grape",
	FRAGMENT: "teal",
	SCHEMA: "indigo",
	EXTEND: "cyan",
};

function getColor(method: string): string {
	return METHOD_COLORS[method] || "gray";
}

function DefinitionCard({ request }: { request: HttpRequest }) {
	const color = getColor(request.method);

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

				{request.body ? (
					<div>
						<Text size="xs" fw={600} c="dimmed" mb={4}>
							Definition
						</Text>
						<Code block>{request.body}</Code>
					</div>
				) : null}
			</Stack>
		</Card>
	);
}

export default function ViewerGraphQL({ source }: ViewerGraphQLProps) {
	const file = useMemo(() => parseGraphQLFile(source), [source]);

	return (
		<Stack gap="md" maw={700} mx="auto" pb="xl">
			{file.requests.length === 0 ? (
				<Text c="dimmed" ta="center" py="xl">
					No definitions found
				</Text>
			) : null}

			{file.requests.map((req, i) => (
				<DefinitionCard key={`def-${i.toString()}`} request={req} />
			))}
		</Stack>
	);
}
