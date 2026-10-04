import {
	Badge,
	Box,
	Code,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Table,
	Tabs,
	Text,
} from "@mantine/core";
import { useState } from "react";
import RequestCopy from "@/lib/ui/RequestCopy";
import { fromHttpRequest } from "@/lib/utils/http/copyRequest";
import type { HttpFile, HttpRequest } from "@/lib/utils/http/types.d";
import styles from "./styles.module.scss";

const METHOD_COLORS: Record<string, string> = {
	GET: "blue",
	POST: "green",
	PUT: "orange",
	PATCH: "yellow",
	DELETE: "red",
	HEAD: "gray",
	OPTIONS: "cyan",
	QUERY: "blue",
	MUTATION: "orange",
	SUBSCRIPTION: "grape",
	FRAGMENT: "teal",
	SCHEMA: "indigo",
	EXTEND: "cyan",
};

function requestKey(request: HttpRequest): string {
	return [request.method, request.name, request.url, request.body].join("\n");
}

function filled(value?: string): string | undefined {
	return value ? value : undefined;
}

function requestLabel(request: HttpRequest): string {
	return (
		filled(request.name) ??
		filled(request.title) ??
		filled(request.url) ??
		request.method
	);
}

function HeaderRows({ headers }: { headers: Record<string, string> }) {
	const names = Object.keys(headers);
	if (names.length === 0) {
		return (
			<Text size="xs" c="dimmed">
				No headers
			</Text>
		);
	}
	return (
		<Table striped>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Name</Table.Th>
					<Table.Th>Value</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>
				{names.map((name) => (
					<Table.Tr key={name}>
						<Table.Td fw={500}>{name}</Table.Td>
						<Table.Td className={styles.headerValue}>{headers[name]}</Table.Td>
					</Table.Tr>
				))}
			</Table.Tbody>
		</Table>
	);
}

function namedEntries(record: Record<string, string>): string[] {
	return Object.keys(record);
}

function RequestDetail({
	request,
	fileVariables,
	bodyLabel,
}: {
	request: HttpRequest;
	fileVariables: Record<string, string>;
	bodyLabel: string;
}) {
	const fileNames = namedEntries(fileVariables);
	const requestNames = namedEntries(request.variables);
	const metaNames = namedEntries(request.meta).filter(
		(name) => name !== "name",
	);
	const showVariables = fileNames.length > 0 || requestNames.length > 0;
	return (
		<Box className={styles.detail}>
			<Stack gap={4} px="sm" py="xs" className={styles.detailHeader}>
				<Group gap="xs" justify="space-between" wrap="nowrap">
					<Group gap="xs" wrap="nowrap" miw={0}>
						<Badge
							color={METHOD_COLORS[request.method] ?? "gray"}
							variant="filled"
							size="sm"
						>
							{request.method}
						</Badge>
						{request.title ? (
							<Badge variant="light" size="sm" color="gray">
								{request.title}
							</Badge>
						) : null}
						{request.name && request.name !== request.title ? (
							<Text size="xs" truncate="end">
								{request.name}
							</Text>
						) : null}
					</Group>
					<RequestCopy request={fromHttpRequest(request, fileVariables)} />
				</Group>
				{request.url ? (
					<Text size="xs" className={styles.detailUrl}>
						{request.url}
					</Text>
				) : null}
			</Stack>
			<Divider />
			<Tabs
				defaultValue={request.body ? "body" : "headers"}
				className={styles.detailTabs}
			>
				<Tabs.List>
					<Tabs.Tab value="headers">Headers</Tabs.Tab>
					{request.body ? <Tabs.Tab value="body">{bodyLabel}</Tabs.Tab> : null}
					{showVariables ? (
						<Tabs.Tab value="variables">Variables</Tabs.Tab>
					) : null}
					{metaNames.length > 0 ? <Tabs.Tab value="meta">Meta</Tabs.Tab> : null}
				</Tabs.List>
				<ScrollArea flex="1 1 auto" scrollbars="y">
					<Tabs.Panel value="headers" p="sm">
						<HeaderRows headers={request.headers} />
					</Tabs.Panel>
					{request.body ? (
						<Tabs.Panel value="body" p="sm">
							<Code block className={styles.codeBlock}>
								{request.body}
							</Code>
						</Tabs.Panel>
					) : null}
					{showVariables ? (
						<Tabs.Panel value="variables" p="sm">
							<Stack gap="md">
								{fileNames.length > 0 ? (
									<div>
										<Text size="xs" fw={700} mb="xs">
											File
										</Text>
										<HeaderRows headers={fileVariables} />
									</div>
								) : null}
								{requestNames.length > 0 ? (
									<div>
										<Text size="xs" fw={700} mb="xs">
											Request
										</Text>
										<HeaderRows headers={request.variables} />
									</div>
								) : null}
							</Stack>
						</Tabs.Panel>
					) : null}
					{metaNames.length > 0 ? (
						<Tabs.Panel value="meta" p="sm">
							<HeaderRows
								headers={Object.fromEntries(
									metaNames.map((name) => [name, request.meta[name] ?? ""]),
								)}
							/>
						</Tabs.Panel>
					) : null}
				</ScrollArea>
			</Tabs>
		</Box>
	);
}

export default function ViewerRequests({
	file,
	bodyLabel = "Body",
}: {
	file: HttpFile;
	bodyLabel?: string;
}) {
	const firstKey = file.requests[0] ? requestKey(file.requests[0]) : null;
	const [selectedKey, setSelectedKey] = useState<string | null>(firstKey);
	const selected =
		file.requests.find((request) => requestKey(request) === selectedKey) ??
		null;
	const fileNames = namedEntries(file.variables);

	return (
		<Box className={styles.container}>
			<Stack gap={0} flex="1 1 auto" mih={0}>
				{fileNames.length > 0 ? (
					<Box className={styles.variables}>
						<Text size="xs" fw={700} px="sm" pt="xs">
							Variables
						</Text>
						<HeaderRows headers={file.variables} />
					</Box>
				) : null}
				<ScrollArea flex="1 1 auto" scrollbars="xy">
					<Table striped highlightOnHover stickyHeader className={styles.table}>
						<Table.Thead>
							<Table.Tr>
								<Table.Th miw={88}>Method</Table.Th>
								<Table.Th miw={160}>Name</Table.Th>
								<Table.Th miw={240}>URL</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{file.requests.map((request) => {
								const key = requestKey(request);
								const toggleRequest = () => {
									setSelectedKey(selectedKey === key ? null : key);
								};
								return (
									<Table.Tr
										key={key}
										className={styles.row}
										data-selected={selectedKey === key || undefined}
										onClick={toggleRequest}
									>
										<Table.Td>
											<Badge
												size="xs"
												variant="filled"
												color={METHOD_COLORS[request.method] ?? "gray"}
											>
												{request.method}
											</Badge>
										</Table.Td>
										<Table.Td className={styles.ellipsisCell}>
											<Text size="xs" truncate="end">
												{requestLabel(request)}
											</Text>
											{request.title &&
											request.title !== requestLabel(request) ? (
												<Text size="xs" c="dimmed" truncate="end">
													{request.title}
												</Text>
											) : null}
										</Table.Td>
										<Table.Td
											title={request.url}
											className={styles.ellipsisCell}
										>
											<Text size="xs" c="dimmed" truncate="end">
												{request.url || "—"}
											</Text>
										</Table.Td>
									</Table.Tr>
								);
							})}
						</Table.Tbody>
					</Table>
					{file.requests.length === 0 ? (
						<Text size="sm" c="dimmed" ta="center" py="xl">
							No requests
						</Text>
					) : null}
				</ScrollArea>
				<Divider />
				<Group gap="md" px="sm" py={6} className={styles.summaryBar}>
					<Text size="xs">
						<Text span fw={600}>
							{file.requests.length}
						</Text>{" "}
						{file.requests.length === 1 ? "request" : "requests"}
					</Text>
				</Group>
			</Stack>
			{selected ? (
				<RequestDetail
					request={selected}
					fileVariables={file.variables}
					bodyLabel={bodyLabel}
				/>
			) : null}
		</Box>
	);
}
