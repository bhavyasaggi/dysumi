import { Divider, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { Torrent } from "webtorrent";
import type { TorrentMeta } from "@/lib/utils/torrent/meta";
import { useTorrentControls } from "./controls";
import { TorrentFiles, TorrentSide, TorrentStatus } from "./panels";
import { PreviewPane } from "./pieces";
import styles from "./styles.module.scss";

export default function ViewerTorrent({
	source,
	fileName,
}: {
	source: Uint8Array;
	fileName: string;
}) {
	const [meta, setMeta] = useState<TorrentMeta | null>(null);
	const [torrent, setTorrent] = useState<Torrent | null>(null);
	const [parseError, setParseError] = useState("");
	const [swarmError, setSwarmError] = useState("");
	const [swarmWarning, setSwarmWarning] = useState("");
	const [tick, setTick] = useState(0);
	const controls = useTorrentControls({
		source,
		fileName,
		meta,
		torrent,
		setTick,
		setMeta,
		setTorrent,
		setParseError,
		setSwarmError,
		setSwarmWarning,
	});

	if (parseError) {
		return (
			<Stack align="center" justify="center" h="100%" p="md">
				<Text c="red" role="alert">
					{parseError}
				</Text>
			</Stack>
		);
	}

	if (!meta) {
		return (
			<Stack align="center" justify="center" h="100%" p="md">
				<Text c="dimmed" role="status">
					Reading torrent…
				</Text>
			</Stack>
		);
	}

	return (
		<div className={styles.layout} data-tick={tick}>
			<div className={styles.main}>
				<TorrentStatus
					meta={meta}
					torrent={torrent}
					swarmError={swarmError}
					swarmWarning={swarmWarning}
					onTogglePause={controls.togglePause}
				/>
				<Divider />
				{controls.preview ? (
					<Stack gap={4} px="sm" py="sm">
						<Text size="xs" fw={600}>
							{controls.preview.path}
						</Text>
						<PreviewPane preview={controls.preview} />
					</Stack>
				) : null}
				<TorrentFiles
					torrent={torrent}
					pending={meta.files}
					busyPath={controls.busyPath}
					onOpen={controls.openFile}
					onDownload={controls.downloadFile}
				/>
			</div>
			<TorrentSide
				meta={meta}
				torrent={torrent}
				zipping={controls.zipping}
				onDownloadTorrent={controls.downloadTorrent}
				onDownloadZip={controls.onDownloadZip}
			/>
		</div>
	);
}
