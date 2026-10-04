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
import {
	formatBytes,
	formatTime,
	type HarEntry,
	type HarSummary,
	METHOD_COLORS,
	statusColor,
	tryPrettyJson,
} from "@/lib/utils/har";
import { fromHarEntry } from "@/lib/utils/http/copyRequest";
import styles from "./styles.module.scss";

interface ViewerHarProps {
	entries: HarEntry[];
	summary: HarSummary;
}

import {
	CookieTable,
	HeadersTable,
	ResponseBody,
	TimingDetail,
	WaterfallBar,
} from "./parts";

function EntryDetail({ entry }: { entry: HarEntry }) {
	return (
		<Box className={styles.detail}>
			<Stack gap={4} px="sm" py="xs" className={styles.detailHeader}>
				<Group gap="xs" justify="space-between" wrap="nowrap">
					<Group gap="xs" wrap="nowrap">
						<Badge
							color={METHOD_COLORS[entry.method] ?? "gray"}
							variant="filled"
							size="sm"
						>
							{entry.method}
						</Badge>
						<Badge color={statusColor(entry.status)} variant="light" size="sm">
							{entry.status} {entry.statusText}
						</Badge>
						<Text size="xs" c="dimmed">
							{formatTime(entry.time)}
						</Text>
					</Group>
					<RequestCopy request={fromHarEntry(entry)} />
				</Group>
				<Text size="xs" className={styles.detailUrl}>
					{entry.url}
				</Text>
			</Stack>
			<Divider />
			<Tabs defaultValue="headers" className={styles.detailTabs}>
				<Tabs.List>
					<Tabs.Tab value="headers">Headers</Tabs.Tab>
					{entry.queryString.length > 0 ? (
						<Tabs.Tab value="query">Query</Tabs.Tab>
					) : null}
					{entry.postData ? <Tabs.Tab value="request">Request</Tabs.Tab> : null}
					{entry.responseContent ? (
						<Tabs.Tab value="response">Response</Tabs.Tab>
					) : null}
					<Tabs.Tab value="timings">Timings</Tabs.Tab>
					{entry.requestCookies.length > 0 ||
					entry.responseCookies.length > 0 ? (
						<Tabs.Tab value="cookies">Cookies</Tabs.Tab>
					) : null}
				</Tabs.List>

				<ScrollArea flex="1 1 auto" scrollbars="y">
					<Tabs.Panel value="headers" p="sm">
						<Stack gap="md">
							<div>
								<Text size="xs" fw={700} mb="xs">
									General
								</Text>
								<Table striped>
									<Table.Tbody>
										<Table.Tr>
											<Table.Td fw={500}>URL</Table.Td>
											<Table.Td className={styles.headerValue}>
												{entry.url}
											</Table.Td>
										</Table.Tr>
										<Table.Tr>
											<Table.Td fw={500}>Method</Table.Td>
											<Table.Td>{entry.method}</Table.Td>
										</Table.Tr>
										<Table.Tr>
											<Table.Td fw={500}>Status</Table.Td>
											<Table.Td>
												{entry.status} {entry.statusText}
											</Table.Td>
										</Table.Tr>
										{entry.startedDateTime ? (
											<Table.Tr>
												<Table.Td fw={500}>Started</Table.Td>
												<Table.Td>{entry.startedDateTime}</Table.Td>
											</Table.Tr>
										) : null}
									</Table.Tbody>
								</Table>
							</div>
							<div>
								<Text size="xs" fw={700} mb="xs">
									Response Headers
								</Text>
								<HeadersTable headers={entry.responseHeaders} />
							</div>
							<div>
								<Text size="xs" fw={700} mb="xs">
									Request Headers
								</Text>
								<HeadersTable headers={entry.requestHeaders} />
							</div>
						</Stack>
					</Tabs.Panel>

					{entry.queryString.length > 0 ? (
						<Tabs.Panel value="query" p="sm">
							<HeadersTable headers={entry.queryString} />
						</Tabs.Panel>
					) : null}

					{entry.postData ? (
						<Tabs.Panel value="request" p="sm">
							<Code block className={styles.codeBlock}>
								{tryPrettyJson(entry.postData)}
							</Code>
						</Tabs.Panel>
					) : null}

					{entry.responseContent ? (
						<Tabs.Panel value="response" p="sm">
							<ResponseBody content={entry.responseContent} />
						</Tabs.Panel>
					) : null}

					<Tabs.Panel value="timings" p="sm">
						<TimingDetail entry={entry} />
					</Tabs.Panel>

					{entry.requestCookies.length > 0 ||
					entry.responseCookies.length > 0 ? (
						<Tabs.Panel value="cookies" p="sm">
							<Stack gap="md">
								{entry.requestCookies.length > 0 ? (
									<div>
										<Text size="xs" fw={700} mb="xs">
											Request cookies
										</Text>
										<CookieTable cookies={entry.requestCookies} />
									</div>
								) : null}
								{entry.responseCookies.length > 0 ? (
									<div>
										<Text size="xs" fw={700} mb="xs">
											Response cookies
										</Text>
										<CookieTable cookies={entry.responseCookies} />
									</div>
								) : null}
							</Stack>
						</Tabs.Panel>
					) : null}
				</ScrollArea>
			</Tabs>
		</Box>
	);
}

export default function ViewerHar({ entries, summary }: ViewerHarProps) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const selectedEntry =
		selectedIndex === null ? null : (entries[selectedIndex] ?? null);

	return (
		<Box className={styles.container}>
			<Stack gap={0} flex="1 1 auto" mih={0}>
				{/* Network table */}
				<ScrollArea flex="1 1 auto" scrollbars="xy">
					<Table striped highlightOnHover stickyHeader className={styles.table}>
						<Table.Thead>
							<Table.Tr>
								<Table.Th miw={52}>Status</Table.Th>
								<Table.Th miw={56}>Method</Table.Th>
								<Table.Th miw={200}>File</Table.Th>
								<Table.Th miw={140}>Domain</Table.Th>
								<Table.Th miw={70} ta="right">
									Size
								</Table.Th>
								<Table.Th miw={60} ta="right">
									Time
								</Table.Th>
								<Table.Th miw={200}>Waterfall</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{entries.map((entry) => {
								const isError = entry.status >= 400;
								const toggleEntry = () => {
									setSelectedIndex(
										selectedIndex === entry.index ? null : entry.index,
									);
								};
								return (
									<Table.Tr
										key={entry.index}
										className={styles.row}
										data-selected={selectedIndex === entry.index || undefined}
										data-error={isError || undefined}
										onClick={toggleEntry}
									>
										<Table.Td>
											<Badge
												size="xs"
												variant="light"
												color={statusColor(entry.status)}
											>
												{entry.status}
											</Badge>
										</Table.Td>
										<Table.Td>
											<Badge
												size="xs"
												variant="filled"
												color={METHOD_COLORS[entry.method] ?? "gray"}
											>
												{entry.method}
											</Badge>
										</Table.Td>
										<Table.Td
											title={entry.path}
											className={styles.ellipsisCell}
										>
											<Text size="xs" truncate="end">
												{entry.filename}
											</Text>
										</Table.Td>
										<Table.Td
											title={entry.domain}
											className={styles.ellipsisCell}
										>
											<Text size="xs" c="dimmed" truncate="end">
												{entry.domain}
											</Text>
										</Table.Td>
										<Table.Td ta="right">
											<Text size="xs">{formatBytes(entry.size)}</Text>
										</Table.Td>
										<Table.Td ta="right">
											<Text size="xs">{formatTime(entry.time)}</Text>
										</Table.Td>
										<Table.Td>
											<WaterfallBar
												entry={entry}
												totalDuration={summary.finishTime}
											/>
										</Table.Td>
									</Table.Tr>
								);
							})}
						</Table.Tbody>
					</Table>
					{entries.length === 0 ? (
						<Text size="sm" c="dimmed" ta="center" py="xl">
							No requests
						</Text>
					) : null}
				</ScrollArea>

				{/* Footer stats */}
				<Divider />
				<Group gap="md" px="sm" py={6} className={styles.summaryBar}>
					<Text size="xs">
						<Text span fw={600}>
							{summary.totalEntries}
						</Text>{" "}
						requests
					</Text>
					<Text size="xs">
						<Text span fw={600}>
							{formatBytes(summary.totalTransferSize)}
						</Text>{" "}
						transferred
					</Text>
					<Text size="xs">
						<Text span fw={600}>
							{formatBytes(summary.totalSize)}
						</Text>{" "}
						resources
					</Text>
					<Text size="xs">
						Finish:{" "}
						<Text span fw={600}>
							{formatTime(summary.finishTime)}
						</Text>
					</Text>
					{summary.pageTiming?.onContentLoad
						? summary.pageTiming.onContentLoad > 0 && (
								<Text size="xs">
									DOMContentLoaded:{" "}
									<Text span fw={600} c="blue">
										{formatTime(summary.pageTiming.onContentLoad)}
									</Text>
								</Text>
							)
						: null}
					{summary.pageTiming?.onLoad
						? summary.pageTiming.onLoad > 0 && (
								<Text size="xs">
									Load:{" "}
									<Text span fw={600} c="red">
										{formatTime(summary.pageTiming.onLoad)}
									</Text>
								</Text>
							)
						: null}
				</Group>
			</Stack>

			{selectedEntry ? <EntryDetail entry={selectedEntry} /> : null}
		</Box>
	);
}
