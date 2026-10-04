import {
	Button,
	Center,
	Code,
	Group,
	Loader,
	Modal,
	Pill,
	ScrollArea,
	SegmentedControl,
	Stack,
	Table,
	Text,
} from "@mantine/core";
import type { Address, Attachment } from "postal-mime";
import { useCallback, useState } from "react";
import Icon from "@/lib/ui/Icon";
import { mountSafeHtml } from "@/lib/ui/safe-html";
import type { ParsedEmail } from "@/lib/utils/mbox/browser-mbox";
import { formatAddress, formatDate } from "./format";
import styles from "./styles.module.scss";

type BodyView = "Raw" | "Text" | "HTML";

function attachmentBlob(attachment: Attachment): Blob {
	const content = attachment.content;
	if (typeof content === "string") {
		return new Blob([content], { type: attachment.mimeType });
	}
	if (content instanceof ArrayBuffer) {
		return new Blob([content], { type: attachment.mimeType });
	}
	const copy = new Uint8Array(content.byteLength);
	copy.set(content);
	return new Blob([copy], { type: attachment.mimeType });
}

function AttachmentButton({ attachment }: { attachment: Attachment }) {
	const name = attachment.filename ? attachment.filename : "attachment";
	const saveAttachment = useCallback(() => {
		downloadAttachment(attachment);
	}, [attachment]);
	return (
		<Button
			size="compact-xs"
			variant="light"
			rightSection={
				<Icon
					icon="download"
					title={`Download ${name}`}
					width={12}
					height={12}
				/>
			}
			onClick={saveAttachment}
		>
			{name}
		</Button>
	);
}

function contentSize(content: Attachment["content"]): number {
	if (typeof content === "string") return content.length;
	return content.byteLength;
}

function downloadAttachment(attachment: Attachment) {
	const url = URL.createObjectURL(attachmentBlob(attachment));
	const link = document.createElement("a");
	link.href = url;
	link.download = attachment.filename ? attachment.filename : "attachment";
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AddressPills({ addresses }: { addresses?: Address[] }) {
	const labels = (addresses ?? [])
		.map((address) => formatAddress(address))
		.filter((label) => label.length > 0);
	if (labels.length === 0) return null;
	const seen = new Map<string, number>();
	return (
		<Pill.Group>
			{labels.map((label) => {
				const count = seen.get(label) ?? 0;
				seen.set(label, count + 1);
				const shown = label.length > 42 ? `${label.slice(0, 42)}…` : label;
				return (
					<Pill key={`${label}#${count}`} title={label}>
						{shown}
					</Pill>
				);
			})}
		</Pill.Group>
	);
}

function HtmlMessage({ html }: { html: string }) {
	const setHost = useCallback(
		(node: HTMLDivElement | null) => {
			if (node) mountSafeHtml(node, html, { allowStylesheets: false });
		},
		[html],
	);
	return <div ref={setHost} className={styles.html} />;
}

function MessageBody({ data }: { data: ParsedEmail }) {
	const [view, setView] = useState<BodyView>(() => {
		if (data.html) return "HTML";
		if (data.text) return "Text";
		return "Raw";
	});
	const choices = ["Raw"];
	if (data.text) choices.push("Text");
	if (data.html) choices.push("HTML");
	const handleView = useCallback((next: string) => {
		setView(next as BodyView);
	}, []);

	let body = <Code block>{data.raw ?? ""}</Code>;
	if (view === "Text" && data.text) {
		body = <Text className={styles.body}>{data.text}</Text>;
	} else if (view === "HTML" && data.html) {
		body = <HtmlMessage html={data.html} />;
	}

	return (
		<Stack gap="sm">
			<SegmentedControl
				aria-label="Message body format"
				data={choices}
				value={view}
				onChange={handleView}
			/>
			<ScrollArea.Autosize mah="50vh">{body}</ScrollArea.Autosize>
		</Stack>
	);
}

export function MessagePreview({
	data,
	error,
	loading,
	opened,
	onClose,
}: {
	data?: ParsedEmail;
	error: string;
	loading: boolean;
	opened: boolean;
	onClose: () => void;
}) {
	let content = <Text c="dimmed">Empty message</Text>;
	if (loading) {
		content = (
			<Center py="xl" role="status" aria-label="Loading…">
				<Loader type="dots" color="gray" />
			</Center>
		);
	} else if (error) {
		content = (
			<Text c="red" role="alert">
				{error}
			</Text>
		);
	} else if (data) {
		content = (
			<Stack gap="sm">
				<Table>
					<Table.Tbody>
						<Table.Tr>
							<Table.Th w={110}>From</Table.Th>
							<Table.Td>
								<AddressPills addresses={data.from ? [data.from] : undefined} />
							</Table.Td>
						</Table.Tr>
						{data.to?.length ? (
							<Table.Tr>
								<Table.Th>To</Table.Th>
								<Table.Td>
									<AddressPills addresses={data.to} />
								</Table.Td>
							</Table.Tr>
						) : null}
						{data.cc?.length ? (
							<Table.Tr>
								<Table.Th>CC</Table.Th>
								<Table.Td>
									<AddressPills addresses={data.cc} />
								</Table.Td>
							</Table.Tr>
						) : null}
						<Table.Tr>
							<Table.Th>Subject</Table.Th>
							<Table.Td>{data.subject ? data.subject : "-"}</Table.Td>
						</Table.Tr>
						<Table.Tr>
							<Table.Th>Date</Table.Th>
							<Table.Td>{formatDate(data.date)}</Table.Td>
						</Table.Tr>
						{data.attachments.length > 0 ? (
							<Table.Tr>
								<Table.Th>Attachments</Table.Th>
								<Table.Td>
									<Group gap={4}>
										{data.attachments.map((attachment) => {
											const name = attachment.filename || "attachment";
											return (
												<AttachmentButton
													key={`${name}-${attachment.contentId ?? ""}-${attachment.mimeType}-${contentSize(attachment.content)}`}
													attachment={attachment}
												/>
											);
										})}
									</Group>
								</Table.Td>
							</Table.Tr>
						) : null}
					</Table.Tbody>
				</Table>
				<MessageBody key={data.messageId ?? data.subject} data={data} />
			</Stack>
		);
	}

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			size="xl"
			title={data?.subject ? data.subject : "Message"}
		>
			{content}
		</Modal>
	);
}
