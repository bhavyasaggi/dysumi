import {
	Badge,
	Box,
	Code,
	Divider,
	Group,
	Progress,
	ScrollArea,
	Stack,
	Table,
	Tabs,
	Text,
	Tooltip,
} from "@mantine/core";
import { useMemo, useState } from "react";

import {
	formatBytes,
	formatTime,
	type HarEntry,
	type HarSummary,
	METHOD_COLORS,
	statusColor,
	tryPrettyJson,
} from "@/lib/utils/har";
import styles from "./styles.module.scss";

interface ViewerHarProps {
	entries: HarEntry[];
	summary: HarSummary;
}

const TIMING_SEGMENTS = [
	{ key: "blocked", label: "Stalled", color: "gray" },
	{ key: "dns", label: "DNS", color: "teal" },
	{ key: "connect", label: "Connect", color: "orange" },
	{ key: "ssl", label: "SSL", color: "grape" },
	{ key: "send", label: "Send", color: "blue" },
	{ key: "wait", label: "TTFB", color: "green" },
	{ key: "receive", label: "Download", color: "cyan" },
] as const;

function WaterfallBar({
	entry,
	totalDuration,
}: {
	entry: HarEntry;
	totalDuration: number;
}) {
	const total = totalDuration || 1;
	const offsetPct = (entry.startOffset / total) * 100;
	const t = entry.timings;
	const entryTotal = entry.time || 1;
	const barPct = Math.max((entry.time / total) * 100, 0.5);
	const gapPct = 100 - offsetPct - barPct;
	const isError = entry.status >= 400;

	const tooltipLabel = TIMING_SEGMENTS.filter((s) => t[s.key] > 0)
		.map((s) => `${s.label}: ${formatTime(t[s.key])}`)
		.concat(`Total: ${formatTime(entry.time)}`)
		.join("\n");

	return (
		<Tooltip
			label={tooltipLabel}
			multiline
			withArrow
			position="left"
			style={{ whiteSpace: "pre" }}
		>
			<Progress.Root size={8} className={styles.waterfallTrack}>
				{offsetPct > 0 ? (
					<Progress.Section value={offsetPct} color="transparent" />
				) : null}
				{isError ? (
					<Progress.Section value={barPct} color="red.4" />
				) : (
					TIMING_SEGMENTS.map((s) => {
						const v = t[s.key];
						if (v <= 0) return null;
						return (
							<Progress.Section
								key={s.key}
								value={(v / entryTotal) * barPct}
								color={`${s.color}.4`}
							/>
						);
					})
				)}
				{gapPct > 0 ? (
					<Progress.Section value={gapPct} color="transparent" />
				) : null}
			</Progress.Root>
		</Tooltip>
	);
}

function TimingDetail({ entry }: { entry: HarEntry }) {
	const t = entry.timings;
	const total = entry.time || 1;

	return (
		<Stack gap="sm">
			<Progress.Root size={16}>
				{TIMING_SEGMENTS.map((s) => {
					const v = t[s.key];
					if (v <= 0) return null;
					return (
						<Tooltip key={s.key} label={`${s.label}: ${formatTime(v)}`}>
							<Progress.Section value={(v / total) * 100} color={s.color}>
								{v / total > 0.12 ? (
									<Progress.Label>{s.label}</Progress.Label>
								) : null}
							</Progress.Section>
						</Tooltip>
					);
				})}
			</Progress.Root>
			<Table striped>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Phase</Table.Th>
						<Table.Th ta="right">Duration</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{TIMING_SEGMENTS.map((s) => (
						<Table.Tr key={s.key}>
							<Table.Td>
								<Group gap="xs" wrap="nowrap">
									<Box
										w={10}
										h={10}
										style={{
											borderRadius: 2,
											backgroundColor: `var(--mantine-color-${s.color}-4)`,
											flexShrink: 0,
										}}
									/>
									<Text size="xs">{s.label}</Text>
								</Group>
							</Table.Td>
							<Table.Td ta="right">
								<Text size="xs">{formatTime(t[s.key])}</Text>
							</Table.Td>
						</Table.Tr>
					))}
					<Table.Tr>
						<Table.Td fw={600}>
							<Text size="xs" fw={600}>
								Total
							</Text>
						</Table.Td>
						<Table.Td ta="right">
							<Text size="xs" fw={600}>
								{formatTime(entry.time)}
							</Text>
						</Table.Td>
					</Table.Tr>
				</Table.Tbody>
			</Table>
		</Stack>
	);
}

function HeadersTable({
	headers,
}: {
	headers: { name: string; value: string }[];
}) {
	if (headers.length === 0) {
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
				{headers.map((h, i) => (
					<Table.Tr key={`${h.name}-${i.toString()}`}>
						<Table.Td fw={500} className={styles.headerName}>
							{h.name}
						</Table.Td>
						<Table.Td className={styles.headerValue}>{h.value}</Table.Td>
					</Table.Tr>
				))}
			</Table.Tbody>
		</Table>
	);
}

function ResponseBody({ content }: { content: string }) {
	const display = useMemo(() => {
		const text =
			content.length > 100_000
				? `${content.slice(0, 100_000)}\n\n... (truncated)`
				: content;
		return tryPrettyJson(text);
	}, [content]);

	return (
		<Code block className={styles.codeBlock}>
			{display}
		</Code>
	);
}

function EntryDetail({ entry }: { entry: HarEntry }) {
	return (
		<Box className={styles.detail}>
			<Stack gap={4} px="sm" py="xs" className={styles.detailHeader}>
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
								return (
									<Table.Tr
										key={entry.index}
										className={styles.row}
										data-selected={selectedIndex === entry.index || undefined}
										data-error={isError || undefined}
										onClick={() =>
											setSelectedIndex(
												selectedIndex === entry.index ? null : entry.index,
											)
										}
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
										<Table.Td title={entry.path} className={styles.ellipsisCell}>
											<Text size="xs" truncate="end">
												{entry.filename}
											</Text>
										</Table.Td>
										<Table.Td title={entry.domain} className={styles.ellipsisCell}>
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
