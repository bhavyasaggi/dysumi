import { useEffect, useRef, useState } from "react";
import type { Torrent, TorrentFile } from "webtorrent";
import { addTorrentFile, webrtcSupported } from "@/lib/utils/torrent/client";
import { previewKind } from "@/lib/utils/torrent/format";
import { readTorrentMeta, type TorrentMeta } from "@/lib/utils/torrent/meta";
import {
	downloadNamedFile,
	messageOf,
	previewForFile,
	saveBlob,
	watchTorrent,
	zipNamedFiles,
} from "./actions";
import type { Preview } from "./pieces";

function watchTorrentSource(
	source: Uint8Array,
	refs: {
		previewRef: { current: Preview | null };
		previewRequest: { current: number };
	},
	set: {
		setTick: (value: number | ((value: number) => number)) => void;
		setMeta: (value: TorrentMeta | null) => void;
		setTorrent: (value: Torrent | null) => void;
		setParseError: (value: string) => void;
		setSwarmError: (value: string) => void;
		setSwarmWarning: (value: string) => void;
	},
) {
	const bytes = source.slice();
	let stopped = false;
	let active: Torrent | null = null;
	let unwatch: (() => void) | null = null;
	const timer = window.setInterval(() => {
		if (!stopped) set.setTick((value) => value + 1);
	}, 500);

	async function start() {
		try {
			const next = await readTorrentMeta(bytes);
			if (stopped) return;
			set.setMeta(next);
			if (!webrtcSupported()) {
				set.setSwarmError(
					"This browser has no WebRTC support, so peers stay disconnected.",
				);
				return;
			}
			active = addTorrentFile(bytes);
			if (stopped) {
				active.destroy({ destroyStore: true });
				active = null;
				return;
			}
			unwatch = watchTorrent(active, {
				isStopped: () => stopped,
				onError: set.setSwarmError,
				onWarning: set.setSwarmWarning,
			});
			set.setTorrent(active);
		} catch (error) {
			if (!stopped) set.setParseError(messageOf(error));
		}
	}

	start().catch((error: unknown) => {
		if (!stopped) set.setParseError(messageOf(error));
	});
	return () => {
		stopped = true;
		refs.previewRequest.current += 1;
		window.clearInterval(timer);
		unwatch?.();
		active?.destroy({ destroyStore: true });
		const current = refs.previewRef.current;
		if (current?.url) URL.revokeObjectURL(current.url);
	};
}

export function useTorrentControls(input: {
	source: Uint8Array;
	fileName: string;
	meta: TorrentMeta | null;
	torrent: Torrent | null;
	setTick: (value: number | ((value: number) => number)) => void;
	setMeta: (value: TorrentMeta | null) => void;
	setTorrent: (value: Torrent | null) => void;
	setParseError: (value: string) => void;
	setSwarmError: (value: string) => void;
	setSwarmWarning: (value: string) => void;
}) {
	const {
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
	} = input;
	const [busyPath, setBusyPath] = useState("");
	const [zipping, setZipping] = useState(false);
	const [preview, setPreview] = useState<Preview | null>(null);
	const previewRef = useRef<Preview | null>(null);
	const previewRequest = useRef(0);
	previewRef.current = preview;

	useEffect(
		() =>
			watchTorrentSource(
				source,
				{ previewRef, previewRequest },
				{
					setTick,
					setMeta,
					setTorrent,
					setParseError,
					setSwarmError,
					setSwarmWarning,
				},
			),
		[
			setMeta,
			setParseError,
			setSwarmError,
			setSwarmWarning,
			setTick,
			setTorrent,
			source,
		],
	);

	function replacePreview(next: Preview | null) {
		const current = previewRef.current;
		if (current?.url && current.url !== next?.url) {
			URL.revokeObjectURL(current.url);
		}
		setPreview(next);
	}

	function nextAction(): () => boolean {
		const request = previewRequest.current + 1;
		previewRequest.current = request;
		return () => request === previewRequest.current;
	}

	async function openFile(file: TorrentFile) {
		const kind = previewKind(file.name, file.type);
		if (!kind) return;
		const isCurrent = nextAction();
		setBusyPath(file.path);
		setSwarmError("");
		try {
			const next = await previewForFile(file, kind, isCurrent);
			if (!isCurrent()) {
				if (next?.url) URL.revokeObjectURL(next.url);
				return;
			}
			if (next) replacePreview(next);
		} catch (error) {
			if (isCurrent()) setSwarmError(messageOf(error));
		} finally {
			if (isCurrent()) setBusyPath("");
		}
	}

	async function downloadFile(file: TorrentFile) {
		const isCurrent = nextAction();
		setBusyPath(file.path);
		setSwarmError("");
		const error = await downloadNamedFile(file, isCurrent);
		if (!isCurrent()) return;
		if (error) setSwarmError(error);
		setBusyPath("");
	}

	async function downloadZip() {
		if (!torrent) return;
		const isCurrent = nextAction();
		const files = torrent.files;
		const base = torrent.name.replace(/\.torrent$/i, "") || "torrent";
		setZipping(true);
		setSwarmError("");
		const error = await zipNamedFiles(files, `${base}.zip`, isCurrent);
		if (!isCurrent()) return;
		if (error) setSwarmError(error);
		setZipping(false);
	}

	function downloadTorrent() {
		const blob =
			torrent?.torrentFileBlob ??
			new Blob([source.slice()], { type: "application/x-bittorrent" });
		const name = fileName.toLowerCase().endsWith(".torrent")
			? fileName
			: `${meta?.name ?? "download"}.torrent`;
		saveBlob(blob, name);
	}

	function togglePause() {
		if (!torrent) return;
		if (torrent.paused) torrent.resume();
		else torrent.pause();
		setTick((value) => value + 1);
	}

	function onDownloadZip() {
		downloadZip().catch((error: unknown) => {
			setSwarmError(messageOf(error));
		});
	}

	return {
		busyPath,
		zipping,
		preview,
		openFile,
		downloadFile,
		downloadTorrent,
		togglePause,
		onDownloadZip,
	};
}
