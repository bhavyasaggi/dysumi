import {
	Box,
	Code,
	Group,
	Progress,
	Stack,
	Table,
	Text,
	Tooltip,
} from "@mantine/core";
import { useMemo } from "react";
import {
	formatTime,
	type HarCookie,
	type HarEntry,
	tryPrettyJson,
} from "@/lib/utils/har";
import styles from "./styles.module.scss";

const TIMING_SEGMENTS = [
	{ key: "blocked", label: "Stalled", color: "gray" },
	{ key: "dns", label: "DNS", color: "teal" },
	{ key: "connect", label: "Connect", color: "orange" },
	{ key: "ssl", label: "SSL", color: "grape" },
	{ key: "send", label: "Send", color: "blue" },
	{ key: "wait", label: "TTFB", color: "green" },
	{ key: "receive", label: "Download", color: "cyan" },
] as const;

export function WaterfallBar({
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

export function TimingDetail({ entry }: { entry: HarEntry }) {
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

export function HeadersTable({
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

function cookieExtra(cookie: HarCookie): string {
	const flags = [
		cookie.httpOnly ? "HttpOnly" : "",
		cookie.secure ? "Secure" : "",
	].filter((flag) => flag !== "");
	return [cookie.domain, cookie.path, cookie.expires, flags.join(" ")]
		.filter((part) => part)
		.join(" · ");
}

export function CookieTable({ cookies }: { cookies: HarCookie[] }) {
	return (
		<Table striped>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Name</Table.Th>
					<Table.Th>Value</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>
				{cookies.map((cookie) => {
					const extra = cookieExtra(cookie);
					return (
						<Table.Tr
							key={[
								cookie.name,
								cookie.value,
								cookie.domain,
								cookie.path,
								cookie.expires,
							].join("\n")}
						>
							<Table.Td fw={500}>{cookie.name}</Table.Td>
							<Table.Td className={styles.headerValue}>
								<Text size="xs">{cookie.value}</Text>
								{extra ? (
									<Text size="xs" c="dimmed">
										{extra}
									</Text>
								) : null}
							</Table.Td>
						</Table.Tr>
					);
				})}
			</Table.Tbody>
		</Table>
	);
}

export function ResponseBody({ content }: { content: string }) {
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
