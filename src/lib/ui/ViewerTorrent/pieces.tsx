import { Button, Code, Group, Table, Text } from "@mantine/core";
import { useCallback } from "react";
import type { TorrentFile } from "webtorrent";
import {
	formatBytes,
	type PreviewKind,
	previewKind,
} from "@/lib/utils/torrent/format";
import styles from "./styles.module.scss";

export interface Preview {
	path: string;
	kind: PreviewKind;
	url: string;
	text: string;
}

export function ListedFile({
	file,
	busy,
	onOpen,
	onDownload,
}: {
	file: TorrentFile;
	busy: boolean;
	onOpen: (file: TorrentFile) => void;
	onDownload: (file: TorrentFile) => void;
}) {
	const kind = previewKind(file.name, file.type);
	const percent = Math.min(100, Math.round(file.progress * 1000) / 10);
	const handleOpen = useCallback(() => {
		onOpen(file);
	}, [file, onOpen]);
	const handleDownload = useCallback(() => {
		onDownload(file);
	}, [file, onDownload]);
	return (
		<Table.Tr>
			<Table.Td>
				<Text className={styles.path} title={file.path}>
					{file.path}
				</Text>
			</Table.Td>
			<Table.Td w={90}>{formatBytes(file.length)}</Table.Td>
			<Table.Td w={70}>{percent}%</Table.Td>
			<Table.Td w={150}>
				<Group gap={4} wrap="nowrap">
					{kind ? (
						<Button
							size="compact-xs"
							variant="light"
							loading={busy}
							onClick={handleOpen}
						>
							Open
						</Button>
					) : null}
					<Button
						size="compact-xs"
						variant="default"
						loading={busy}
						onClick={handleDownload}
					>
						Download
					</Button>
				</Group>
			</Table.Td>
		</Table.Tr>
	);
}

export function PreviewPane({ preview }: { preview: Preview }) {
	if (preview.kind === "text") {
		return (
			<Code block className={styles.magnet}>
				{preview.text}
			</Code>
		);
	}
	if (preview.kind === "image") {
		return (
			<img className={styles.preview} src={preview.url} alt={preview.path} />
		);
	}
	if (preview.kind === "audio") {
		return (
			<audio className={styles.preview} src={preview.url} controls>
				<track kind="captions" />
			</audio>
		);
	}
	return (
		<video className={styles.preview} src={preview.url} controls>
			<track kind="captions" />
		</video>
	);
}
