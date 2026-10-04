import JSZip from "jszip";
import type { Torrent, TorrentFile } from "webtorrent";
import type { PreviewKind } from "@/lib/utils/torrent/format";
import type { Preview } from "./pieces";

export function messageOf(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

export function saveBlob(blob: Blob, name: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function watchTorrent(
	torrent: Torrent,
	handlers: {
		isStopped: () => boolean;
		onError: (message: string) => void;
		onWarning: (message: string) => void;
	},
): () => void {
	const { isStopped, onError, onWarning } = handlers;
	const handleError = (error: Error | string) => {
		if (!isStopped()) onError(messageOf(error));
	};
	const handleWarning = (error: Error | string) => {
		if (!isStopped()) onWarning(messageOf(error));
	};
	torrent.on("error", handleError);
	torrent.on("warning", handleWarning);
	return () => {
		torrent.off("error", handleError);
		torrent.off("warning", handleWarning);
	};
}

export async function downloadNamedFile(
	file: TorrentFile,
	isCurrent: () => boolean,
): Promise<string | null> {
	try {
		const blob = await file.blob();
		if (!isCurrent()) return null;
		saveBlob(blob, file.name);
		return null;
	} catch (error) {
		if (!isCurrent()) return null;
		return messageOf(error);
	}
}

export async function zipNamedFiles(
	files: readonly TorrentFile[],
	name: string,
	isCurrent: () => boolean,
): Promise<string | null> {
	try {
		const zip = new JSZip();
		for (const file of files) {
			const blob = await file.blob();
			if (!isCurrent()) return null;
			zip.file(file.path.replace(/^[/\\]+/, ""), blob);
		}
		const blob = await zip.generateAsync({ type: "blob" });
		if (!isCurrent()) return null;
		saveBlob(blob, name);
		return null;
	} catch (error) {
		if (!isCurrent()) return null;
		return messageOf(error);
	}
}

export async function previewForFile(
	file: TorrentFile,
	kind: PreviewKind,
	isCurrent: () => boolean,
): Promise<Preview | null> {
	const blob = await file.blob();
	if (!isCurrent()) return null;
	if (kind === "text") {
		const text = await blob.text();
		if (!isCurrent()) return null;
		return {
			path: file.path,
			kind,
			url: "",
			text: text.length > 200_000 ? `${text.slice(0, 200_000)}…` : text,
		};
	}
	const url = URL.createObjectURL(blob);
	if (!isCurrent()) {
		URL.revokeObjectURL(url);
		return null;
	}
	return { path: file.path, kind, url, text: "" };
}
