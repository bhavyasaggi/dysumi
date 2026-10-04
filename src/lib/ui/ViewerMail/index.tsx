import {
	ActionIcon,
	Badge,
	Button,
	Center,
	Group,
	Loader,
	Progress,
	Select,
	Stack,
	Table,
	Text,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/lib/ui/Icon";
import {
	BrowserMBox,
	BrowserMBoxEvent,
	type MailSummary,
	type ParsedEmail,
} from "@/lib/utils/mbox/browser-mbox";
import { formatAddress, formatDate } from "./format";
import { MessagePreview } from "./message";
import styles from "./styles.module.scss";
export default function ViewerMail({
	source,
	kind,
}: {
	source: string;
	kind: "mbox" | "eml";
}) {
	const [parser, setParser] = useState<BrowserMBox | null>(null);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState("");
	const [pageSize, setPageSize] = useState(10);
	const [position, setPosition] = useState(0);
	const [rows, setRows] = useState<MailSummary[]>([]);
	const [total, setTotal] = useState(0);
	const [listLoading, setListLoading] = useState(false);
	const [selected, setSelected] = useState<number | null>(null);
	const [detail, setDetail] = useState<ParsedEmail | undefined>();
	const [detailError, setDetailError] = useState("");
	const [detailLoading, setDetailLoading] = useState(false);

	useEffect(() => {
		const mailbox = new BrowserMBox();
		let cancelled = false;
		setParser(mailbox);
		setProgress(0);
		setError("");
		setRows([]);
		setTotal(0);
		setPosition(0);
		setSelected(null);
		const onProgress = (event: CustomEvent<number>) => {
			if (!cancelled) setProgress(event.detail);
		};
		mailbox.addEventListener(BrowserMBoxEvent.PROGRESS, onProgress);
		mailbox
			.open({
				chunkSize: 2.5e7,
				maxChunkSize: 2.5e8,
				single: kind === "eml",
				text: source,
			})
			.catch((openError: unknown) => {
				if (!cancelled) {
					setError(
						openError instanceof Error
							? openError.message
							: "Could not read this mailbox",
					);
				}
			});
		return () => {
			cancelled = true;
			mailbox.removeEventListener(BrowserMBoxEvent.PROGRESS, onProgress);
			mailbox.destroy();
		};
	}, [kind, source]);

	useEffect(() => {
		if (!parser || progress < 100) return;
		let cancelled = false;
		setListLoading(true);
		Promise.all([parser.count(), parser.list(position, pageSize)])
			.then(([totalCount, list]) => {
				if (cancelled) return;
				setTotal(totalCount);
				setRows(list);
				setListLoading(false);
				const only = list[0];
				if (kind === "eml" && totalCount === 1 && only?.id != null) {
					setSelected(only.id);
				}
			})
			.catch((listError: unknown) => {
				if (cancelled) return;
				setError(
					listError instanceof Error
						? listError.message
						: "Could not list messages",
				);
				setListLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [kind, pageSize, parser, position, progress]);

	useEffect(() => {
		if (!parser || selected == null) {
			setDetail(undefined);
			return;
		}
		let cancelled = false;
		setDetailLoading(true);
		setDetailError("");
		parser
			.get(selected)
			.then((message) => {
				if (cancelled) return;
				setDetail(message);
				setDetailLoading(false);
			})
			.catch((detailFailure: unknown) => {
				if (cancelled) return;
				setDetailError(
					detailFailure instanceof Error
						? detailFailure.message
						: "Could not open this message",
				);
				setDetailLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [parser, selected]);

	const pageEnd = Math.min(total, position + rows.length);
	const atStart = position === 0;
	const atEnd = position + pageSize >= total;
	const changePageSize = useCallback((value: string | null) => {
		setPageSize(Number(value) || 10);
		setPosition(0);
	}, []);
	const goToFirstPage = useCallback(() => {
		setPosition(0);
	}, []);
	const goToPreviousPage = useCallback(() => {
		setPosition(Math.max(0, position - pageSize));
	}, [pageSize, position]);
	const goToNextPage = useCallback(() => {
		setPosition(position + pageSize);
	}, [pageSize, position]);
	const goToLastPage = useCallback(() => {
		setPosition(Math.max(0, total - (total % pageSize || pageSize)));
	}, [pageSize, total]);
	const closeMessage = useCallback(() => {
		setSelected(null);
	}, []);

	return (
		<div className={styles.layout}>
			<Stack className={styles.toolbar} gap="xs">
				<Group justify="space-between">
					<Group gap="xs">
						<Badge variant="light" color="gray">
							{kind === "eml" ? "EML" : "MBOX"}
						</Badge>
						<Select
							aria-label="Messages per page"
							data={["10", "50", "100"]}
							value={String(pageSize)}
							w={90}
							onChange={changePageSize}
						/>
					</Group>
					<Group gap="xs">
						<Text size="xs" c="dimmed">
							{total === 0
								? "0 messages"
								: `${position + 1}–${pageEnd} of ${total}`}
						</Text>
						<ActionIcon.Group>
							<ActionIcon
								variant="default"
								disabled={atStart}
								onClick={goToFirstPage}
								aria-label="First page"
							>
								<Icon
									icon="chevrons-left"
									title="First page"
									width={16}
									height={16}
								/>
							</ActionIcon>
							<ActionIcon
								variant="default"
								disabled={atStart}
								onClick={goToPreviousPage}
								aria-label="Previous page"
							>
								<Icon
									icon="chevron-left"
									title="Previous page"
									width={16}
									height={16}
								/>
							</ActionIcon>
							<ActionIcon
								variant="default"
								disabled={atEnd || total === 0}
								onClick={goToNextPage}
								aria-label="Next page"
							>
								<Icon
									icon="chevron-right"
									title="Next page"
									width={16}
									height={16}
								/>
							</ActionIcon>
							<ActionIcon
								variant="default"
								disabled={atEnd || total === 0}
								onClick={goToLastPage}
								aria-label="Last page"
							>
								<Icon
									icon="chevrons-right"
									title="Last page"
									width={16}
									height={16}
								/>
							</ActionIcon>
						</ActionIcon.Group>
					</Group>
				</Group>
				{progress < 100 ? (
					<Progress
						value={error ? 100 : progress}
						color={error ? "red" : "blue"}
						aria-label="Mailbox indexing"
					/>
				) : null}
				{error ? (
					<Text c="red" size="sm" role="alert">
						{error}
					</Text>
				) : null}
			</Stack>
			<div className={styles.tableWrap}>
				<Table striped highlightOnHover stickyHeader>
					<Table.Thead>
						<Table.Tr>
							<Table.Th w={240}>From</Table.Th>
							<Table.Th w={180}>Date</Table.Th>
							<Table.Th>Subject</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{rows.map((row) => {
							const openMessage = () => {
								if (row.id != null) setSelected(row.id);
							};
							return (
								<Table.Tr key={row.id ?? `${row.offset}-${row.subject ?? ""}`}>
									<Table.Td>{formatAddress(row.from) || "-"}</Table.Td>
									<Table.Td>{formatDate(row.date)}</Table.Td>
									<Table.Td>
										<Button
											className={styles.subject}
											variant="transparent"
											size="compact-sm"
											onClick={openMessage}
											aria-label={
												row.subject ? `Open ${row.subject}` : "Open message"
											}
										>
											{row.subject || "(No subject)"}
										</Button>
									</Table.Td>
								</Table.Tr>
							);
						})}
					</Table.Tbody>
				</Table>
				{listLoading ? (
					<Center py="xl" role="status" aria-label="Loading…">
						<Loader type="dots" color="gray" />
					</Center>
				) : null}
				{!listLoading && progress === 100 && rows.length === 0 ? (
					<Text c="dimmed" ta="center" py="xl">
						No messages
					</Text>
				) : null}
			</div>
			<MessagePreview
				data={detail}
				error={detailError}
				loading={detailLoading}
				opened={selected != null}
				onClose={closeMessage}
			/>
		</div>
	);
}
