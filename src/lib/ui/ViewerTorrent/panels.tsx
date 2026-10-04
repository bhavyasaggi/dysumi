import {
	Badge,
	Button,
	Code,
	CopyButton,
	Divider,
	Group,
	Progress,
	ScrollArea,
	Stack,
	Table,
	Text,
} from "@mantine/core";
import type { Torrent, TorrentFile } from "webtorrent";
import { WEB_TRACKERS } from "@/lib/utils/torrent/client";
import { formatBytes, formatRemaining } from "@/lib/utils/torrent/format";
import type { TorrentFileMeta, TorrentMeta } from "@/lib/utils/torrent/meta";
import { ListedFile } from "./pieces";
import styles from "./styles.module.scss";

export function TorrentStatus({
	meta,
	torrent,
	swarmError,
	swarmWarning,
	onTogglePause,
}: {
	meta: TorrentMeta;
	torrent: Torrent | null;
	swarmError: string;
	swarmWarning: string;
	onTogglePause: () => void;
}) {
	const live = torrent?.ready ? torrent : null;
	const progress = live ? live.progress : 0;
	const peers = live ? live.numPeers : 0;
	const down = live ? live.downloadSpeed : (torrent?.downloadSpeed ?? 0);
	const up = live ? live.uploadSpeed : (torrent?.uploadSpeed ?? 0);
	const remaining = formatRemaining(
		live?.timeRemaining ?? Number.POSITIVE_INFINITY,
		Boolean(live?.done),
	);
	const percent = Math.min(100, Math.round(progress * 1000) / 10);
	return (
		<>
			<Group className={styles.bar} justify="space-between" px="sm" py={4}>
				<Group gap={6} wrap="wrap">
					<Badge variant="light">{meta.name}</Badge>
					<Badge color="gray">{formatBytes(meta.length)}</Badge>
					<Badge color="gray">
						{meta.files.length} {meta.files.length === 1 ? "file" : "files"}
					</Badge>
					{meta.private ? <Badge color="yellow">Private</Badge> : null}
					{torrent?.paused ? <Badge color="yellow">Paused</Badge> : null}
					{live?.done ? <Badge color="teal">Done</Badge> : null}
				</Group>
				<Group gap={6}>
					<Button
						size="compact-xs"
						variant="default"
						disabled={!torrent}
						onClick={onTogglePause}
					>
						{torrent?.paused ? "Resume" : "Pause"}
					</Button>
				</Group>
			</Group>
			<Divider />
			<Stack gap={4} px="sm" py={6}>
				<Progress value={percent} size="sm" aria-label="Download progress" />
				<Text size="xs" c="dimmed">
					Peers: {peers} · Progress: {percent}% · Down: {formatBytes(down)}/s ·
					Up: {formatBytes(up)}/s · {remaining}
				</Text>
				{swarmError ? (
					<Text size="xs" c="red" role="alert">
						{swarmError}
					</Text>
				) : null}
				{swarmWarning ? (
					<Text size="xs" c="dimmed">
						{swarmWarning}
					</Text>
				) : null}
			</Stack>
		</>
	);
}

export function TorrentFiles({
	torrent,
	pending,
	busyPath,
	onOpen,
	onDownload,
}: {
	torrent: Torrent | null;
	pending: TorrentFileMeta[];
	busyPath: string;
	onOpen: (file: TorrentFile) => void;
	onDownload: (file: TorrentFile) => void;
}) {
	const files = torrent?.ready ? torrent.files : [];
	return (
		<ScrollArea className={styles.scroll} scrollbars="y">
			<Table horizontalSpacing="sm" verticalSpacing={6}>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>File</Table.Th>
						<Table.Th>Size</Table.Th>
						<Table.Th>Progress</Table.Th>
						<Table.Th />
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{files.length > 0
						? files.map((file) => (
								<ListedFile
									key={file.path}
									file={file}
									busy={busyPath === file.path}
									onOpen={onOpen}
									onDownload={onDownload}
								/>
							))
						: pending.map((file) => (
								<Table.Tr key={file.path}>
									<Table.Td>
										<Text className={styles.path} title={file.path}>
											{file.path}
										</Text>
									</Table.Td>
									<Table.Td>{formatBytes(file.length)}</Table.Td>
									<Table.Td>0%</Table.Td>
									<Table.Td />
								</Table.Tr>
							))}
				</Table.Tbody>
			</Table>
		</ScrollArea>
	);
}

function CopyHash({ value }: { value: string }) {
	return (
		<CopyButton value={value}>
			{({ copied, copy }) => (
				<Button size="compact-xs" variant="default" onClick={copy}>
					{copied ? "Copied" : "Copy"}
				</Button>
			)}
		</CopyButton>
	);
}

export function TorrentSide({
	meta,
	torrent,
	zipping,
	onDownloadTorrent,
	onDownloadZip,
}: {
	meta: TorrentMeta;
	torrent: Torrent | null;
	zipping: boolean;
	onDownloadTorrent: () => void;
	onDownloadZip: () => void;
}) {
	const live = Boolean(torrent?.ready);
	const extraTrackers = meta.private
		? []
		: WEB_TRACKERS.filter((url) => !meta.announce.includes(url));
	return (
		<aside className={styles.side}>
			<Group className={styles.bar}>
				<Text size="sm" px="sm">
					Torrent
				</Text>
			</Group>
			<Divider />
			<ScrollArea className={styles.scroll} scrollbars="y">
				<Stack gap="sm" p="sm">
					<div>
						<Text size="xs" c="dimmed">
							Info hash
						</Text>
						<Group gap={6} wrap="nowrap">
							<Text className={styles.path} title={meta.infoHash}>
								{meta.infoHash}
							</Text>
							<CopyHash value={meta.infoHash} />
						</Group>
					</div>
					{meta.comment ? (
						<div>
							<Text size="xs" c="dimmed">
								Comment
							</Text>
							<Text size="sm">{meta.comment}</Text>
						</div>
					) : null}
					{meta.created ? (
						<Text size="xs" c="dimmed">
							Created {meta.created.toLocaleString()}
							{meta.createdBy ? ` · ${meta.createdBy}` : ""}
						</Text>
					) : null}
					{meta.pieceLength > 0 ? (
						<Text size="xs" c="dimmed">
							Piece length {formatBytes(meta.pieceLength)}
						</Text>
					) : null}
					<div>
						<Text size="xs" c="dimmed">
							Trackers
						</Text>
						{meta.announce.length === 0 ? (
							<Text size="xs">No trackers in this file</Text>
						) : (
							meta.announce.map((url) => (
								<Text key={url} className={styles.path} title={url}>
									{url}
								</Text>
							))
						)}
						{extraTrackers.length > 0 ? (
							<Text size="xs" c="dimmed" mt={6}>
								WebRTC trackers
							</Text>
						) : null}
						{extraTrackers.map((url) => (
							<Text key={url} className={styles.path} title={url}>
								{url}
							</Text>
						))}
					</div>
					{meta.urlList.length > 0 ? (
						<div>
							<Text size="xs" c="dimmed">
								Web seeds
							</Text>
							{meta.urlList.map((url) => (
								<Text key={url} className={styles.path} title={url}>
									{url}
								</Text>
							))}
						</div>
					) : null}
					<div>
						<Group justify="space-between">
							<Text size="xs" c="dimmed">
								Magnet
							</Text>
							<CopyHash value={meta.magnet} />
						</Group>
						<Code block className={styles.magnet}>
							{meta.magnet}
						</Code>
					</div>
					<Group gap="xs">
						<Button size="xs" variant="default" onClick={onDownloadTorrent}>
							Download .torrent
						</Button>
						<Button
							size="xs"
							variant="light"
							loading={zipping}
							disabled={!live}
							onClick={onDownloadZip}
						>
							Download zip
						</Button>
					</Group>
					<Text size="xs" c="dimmed">
						Files download in this browser and can be saved or zipped. Pause
						stops the swarm.
					</Text>
				</Stack>
			</ScrollArea>
		</aside>
	);
}
